import { useEffect } from "react";
import { create } from "zustand";

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { pickSynced, useStore, type SyncedState } from "@/store/useStore";

export type SyncStatus = "loading" | "synced" | "saving" | "offline" | "error";

export const useSyncStatus = create<{ status: SyncStatus; lastSaved: string | null; ready: boolean }>(() => ({
  status: "loading",
  lastSaved: null,
  ready: false,
}));

const SAVE_DEBOUNCE_MS = 1200;
/** Set when this browser has changes not yet saved to the cloud (e.g. tab closed or offline). */
const DIRTY_KEY = "golden-nest-unsaved-since";
const AUTO_BACKUP_EVERY_MS = 24 * 60 * 60 * 1000;

function clientId(): string {
  const key = "golden-nest-client-id";
  let id = window.sessionStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).slice(2, 12);
    window.sessionStorage.setItem(key, id);
  }
  return id;
}

/**
 * Whose business data this login works on. Normally the signed-in user's own id; a login linked
 * in `pos_members` works on the owner's data instead, so several logins can share one business.
 */
export async function resolveDataOwnerId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const { data: membership, error } = await supabase
    .from("pos_members")
    .select("owner_id")
    .eq("member_id", user.id)
    .maybeSingle();
  if (error) console.error("Membership lookup failed", error);
  return membership?.owner_id ?? user.id;
}

/** Save the current business data now (also used by the debounced saver). */
export async function saveNow(ownerId: string): Promise<boolean> {
  useSyncStatus.setState({ status: "saving" });
  const { error } = await supabase.from("pos_state").upsert({
    owner_id: ownerId,
    data: pickSynced(useStore.getState()) as unknown as Json,
    client_id: clientId(),
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("Cloud save failed", error);
    useSyncStatus.setState({ status: navigator.onLine ? "error" : "offline" });
    return false;
  }
  window.localStorage.removeItem(DIRTY_KEY);
  useSyncStatus.setState({ status: "synced", lastSaved: new Date().toISOString() });
  return true;
}

export async function createBackup(ownerId: string): Promise<boolean> {
  const { error } = await supabase.from("pos_backups").insert({
    owner_id: ownerId,
    data: pickSynced(useStore.getState()) as unknown as Json,
  });
  if (error) console.error("Backup failed", error);
  return !error;
}

export async function listBackups() {
  const { data, error } = await supabase
    .from("pos_backups")
    .select("id, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data;
}

export async function restoreBackup(ownerId: string, backupId: string): Promise<void> {
  const { data, error } = await supabase.from("pos_backups").select("data").eq("id", backupId).single();
  if (error) throw error;
  // Keep a safety copy of the current state before overwriting it.
  await createBackup(ownerId);
  useStore.getState().applySnapshot(data.data as unknown as Partial<SyncedState>);
  await saveNow(ownerId);
}

/**
 * Keeps the store in sync with Lovable Cloud for the signed-in depot account:
 * loads the cloud copy (or uploads this browser's data the first time),
 * saves every change, and applies changes made on other devices live.
 */
export function useCloudSync(ownerId: string) {
  useEffect(() => {
    let cancelled = false;
    let applyingRemote = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const me = clientId();

    const schedule = () => {
      if (applyingRemote || !useSyncStatus.getState().ready) return;
      useSyncStatus.setState({ status: "saving" });
      if (!window.localStorage.getItem(DIRTY_KEY)) window.localStorage.setItem(DIRTY_KEY, new Date().toISOString());
      clearTimeout(timer);
      timer = setTimeout(() => void saveNow(ownerId), SAVE_DEBOUNCE_MS);
    };

    const applyRemote = (data: unknown) => {
      applyingRemote = true;
      useStore.getState().applySnapshot(data as Partial<SyncedState>);
      applyingRemote = false;
    };

    void (async () => {
      useSyncStatus.setState({ status: "loading", ready: false });
      await useStore.persist.rehydrate();
      const { data, error } = await supabase.from("pos_state").select("data, updated_at").eq("owner_id", ownerId).maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("Cloud load failed", error);
        useSyncStatus.setState({ status: "error", ready: false });
        return;
      }
      const unsavedSince = window.localStorage.getItem(DIRTY_KEY);
      if (data && unsavedSince && new Date(unsavedSince) > new Date(data.updated_at)) {
        // This browser has newer unsaved work — keep it and push it up.
        useSyncStatus.setState({ ready: true });
        await saveNow(ownerId);
      } else if (data) {
        applyRemote(data.data);
        useSyncStatus.setState({ status: "synced", ready: true, lastSaved: data.updated_at });
      } else {
        // First sign-in: move this browser's existing records into the cloud.
        useSyncStatus.setState({ ready: true });
        await saveNow(ownerId);
        await createBackup(ownerId);
      }
      // Daily automatic backup.
      const { data: last } = await supabase
        .from("pos_backups")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && (!last || Date.now() - new Date(last.created_at).getTime() > AUTO_BACKUP_EVERY_MS)) {
        await createBackup(ownerId);
      }
    })();

    const unsub = useStore.subscribe((s, prev) => {
      // Ignore changes that only touch this device's cart or signed-in staff.
      const changed = (["products", "customers", "suppliers", "orders", "expenses", "accounts", "cashEntries", "purchases", "auditLog", "settings", "nextSeqOrder", "nextSeqPurchase", "staff", "shifts"] as const).some(
        (k) => s[k] !== prev[k],
      );
      if (changed) schedule();
    });

    const channel = supabase
      .channel(`pos-state-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pos_state", filter: `owner_id=eq.${ownerId}` },
        (payload) => {
          const row = payload.new as { data?: unknown; client_id?: string; updated_at?: string } | undefined;
          if (!row?.data || row.client_id === me) return;
          applyRemote(row.data);
          useSyncStatus.setState({ status: "synced", lastSaved: row.updated_at ?? null });
        },
      )
      .subscribe();

    const onOffline = () => useSyncStatus.setState({ status: "offline" });
    const onOnline = () => schedule();
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsub();
      void supabase.removeChannel(channel);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [ownerId]);
}
