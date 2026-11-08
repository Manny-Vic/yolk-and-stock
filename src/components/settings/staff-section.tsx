import { useEffect, useState } from "react";
import { DatabaseBackup, KeyRound, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_MAX_CASHIER_DISCOUNT_PCT } from "@/lib/approval";
import { createBackup, listBackups, resolveDataOwnerId, restoreBackup, saveNow } from "@/lib/cloud-sync";
import { hashPin, isValidPin } from "@/lib/pin";
import type { StaffRole } from "@/lib/types";
import { useStore } from "@/store/useStore";

export function StaffSection() {
  const staff = useStore((s) => s.staff);
  const addStaff = useStore((s) => s.addStaff);
  const removeStaff = useStore((s) => s.removeStaff);
  const setStaffPinHash = useStore((s) => s.setStaffPinHash);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const [name, setName] = useState("");
  const [role, setRole] = useState<StaffRole>("cashier");
  const [pin, setPin] = useState("");
  const [maxPct, setMaxPct] = useState(String(settings.maxCashierDiscountPct ?? DEFAULT_MAX_CASHIER_DISCOUNT_PCT));
  const owners = staff.filter((x) => x.role === "owner").length;

  const add = async () => {
    if (!name.trim()) { toast.error("Enter a name."); return; }
    if (!isValidPin(pin)) { toast.error("PIN must be 4 to 6 digits."); return; }
    const id = `st-${Math.random().toString(36).slice(2, 10)}`;
    addStaff({ id, name: name.trim(), role, pinHash: await hashPin(id, pin) });
    setName(""); setPin("");
    toast.success(`${name.trim()} added`);
  };

  const changePin = async (id: string) => {
    const next = window.prompt("New PIN (4–6 digits)") ?? "";
    if (!next) return;
    if (!isValidPin(next)) { toast.error("PIN must be 4 to 6 digits."); return; }
    setStaffPinHash(id, await hashPin(id, next));
    toast.success("PIN changed");
  };

  return (
    <section className="rounded-xl border bg-card p-4 shadow-card">
      <h2 className="mb-1 text-sm font-bold">Staff & PINs</h2>
      <p className="mb-3 text-xs text-muted-foreground">Everyone signs in with their own PIN so every order, discount, and drawer count shows who did it.</p>
      <ul className="mb-3 divide-y rounded-lg border">
        {staff.map((m) => (
          <li key={m.id} className="flex items-center gap-2 px-3 py-2 text-[13px]">
            <span className="font-semibold">{m.name}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">{m.role}</span>
            <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={() => void changePin(m.id)}><KeyRound className="mr-1 size-3.5" />Change PIN</Button>
            <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" aria-label={`Remove ${m.name}`} disabled={m.role === "owner" && owners <= 1}
              onClick={() => { if (window.confirm(`Remove ${m.name}?`)) removeStaff(m.id); }}>
              <Trash2 className="size-3.5" />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-40"><Label className="text-xs">Name</Label><Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="w-32">
          <Label className="text-xs">Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as StaffRole)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="cashier">Cashier</SelectItem><SelectItem value="owner">Owner</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="w-28"><Label className="text-xs">PIN</Label><Input className="mt-1" type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} /></div>
        <Button variant="outline" onClick={() => void add()}><UserPlus className="mr-1.5 size-4" />Add staff</Button>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-2 border-t pt-4">
        <div className="w-48"><Label className="text-xs">Cashier discount limit (%)</Label><Input inputMode="decimal" className="mt-1 text-right" value={maxPct} onChange={(e) => setMaxPct(e.target.value)} /></div>
        <Button variant="outline" size="sm" onClick={() => {
          const v = Number(maxPct);
          if (!Number.isFinite(v) || v < 0 || v > 100) { toast.error("Enter a percent from 0 to 100."); return; }
          updateSettings({ maxCashierDiscountPct: v });
          toast.success("Discount limit saved");
        }}>Save limit</Button>
        <p className="text-[11px] text-muted-foreground">Bigger discounts, prices below cost, and credit over a customer's limit need an owner PIN.</p>
      </div>
    </section>
  );
}

export function BackupSection() {
  const [rows, setRows] = useState<{ id: string; created_at: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const refresh = () => void listBackups().then(setRows).catch(() => toast.error("Could not load backups."));
  useEffect(refresh, []);

  const owner = resolveDataOwnerId;

  return (
    <section className="rounded-xl border bg-card p-4 shadow-card">
      <h2 className="mb-1 text-sm font-bold">Cloud backups</h2>
      <p className="mb-3 text-xs text-muted-foreground">Every change is saved to the cloud automatically, and a full backup is kept each day. Restoring first backs up the current data.</p>
      <div className="mb-3 flex gap-2">
        <Button variant="outline" size="sm" disabled={busy} onClick={async () => {
          const id = await owner(); if (!id) return;
          setBusy(true); await saveNow(id); const ok = await createBackup(id); setBusy(false);
          if (ok) { toast.success("Backup saved"); refresh(); } else toast.error("Backup failed");
        }}><DatabaseBackup className="mr-1.5 size-3.5" />Back up now</Button>
      </div>
      <ul className="max-h-48 divide-y overflow-y-auto rounded-lg border text-[12px]">
        {rows.length === 0 ? <li className="px-3 py-2 text-muted-foreground">No backups yet.</li> : rows.map((r) => (
          <li key={r.id} className="flex items-center px-3 py-1.5">
            <span>{new Date(r.created_at).toLocaleString("en-PH")}</span>
            <Button variant="ghost" size="sm" className="ml-auto h-7" disabled={busy} onClick={async () => {
              if (!window.confirm("Replace all current records with this backup? Your current data is backed up first.")) return;
              const id = await owner(); if (!id) return;
              setBusy(true);
              try { await restoreBackup(id, r.id); toast.success("Backup restored"); refresh(); } catch { toast.error("Restore failed"); }
              setBusy(false);
            }}>Restore</Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
