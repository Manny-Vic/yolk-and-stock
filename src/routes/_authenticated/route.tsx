import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { Cloud, CloudOff, Loader2, Lock, LogOut } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { OwnerApprovalDialog } from "@/components/staff/owner-approval";
import { StaffGate } from "@/components/staff/staff-gate";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { resolveDataOwnerId, useCloudSync, useSyncStatus } from "@/lib/cloud-sync";
import { openShiftId, useStore } from "@/store/useStore";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    // Id of the business whose data to load: your own, or the owner's if this login was added as a member.
    return { userId: (await resolveDataOwnerId()) ?? data.user.id };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { userId } = Route.useRouteContext();
  useCloudSync(userId);
  const ready = useSyncStatus((s) => s.ready);
  const status = useSyncStatus((s) => s.status);

  if (!ready) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-2 bg-background text-sm text-muted-foreground">
        {status === "error" ? (
          <>
            <CloudOff className="size-6 text-destructive" />
            <p>Could not reach the cloud. Check the internet connection and reload.</p>
          </>
        ) : (
          <>
            <Loader2 className="size-6 animate-spin" />
            <p>Loading your depot records…</p>
          </>
        )}
      </div>
    );
  }

  return (
    <StaffGate>
      <SidebarProvider style={{ "--sidebar-width": "15rem", "--sidebar-width-icon": "3rem" } as React.CSSProperties}>
        <AppSidebar />
        <SidebarInset className="flex h-svh flex-col overflow-hidden">
          <TopBar />
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
      <OwnerApprovalDialog />
    </StaffGate>
  );
}

function TopBar() {
  const navigate = useNavigate();
  const storeName = useStore((s) => s.settings.storeName);
  const me = useStore((s) => s.staff.find((x) => x.id === s.activeStaffId));
  const shiftOpen = useStore((s) => !!openShiftId(s));
  const signOutStaff = useStore((s) => s.signOutStaff);
  const status = useSyncStatus((s) => s.status);

  const signOut = async () => {
    signOutStaff();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background px-3 sm:gap-3">
      <SidebarTrigger />
      <span className="min-w-0 truncate text-sm font-bold tracking-tight text-foreground">{storeName}</span>
      <div className="ml-auto flex shrink-0 items-center gap-1.5 text-[12px] sm:gap-2">
        <span className={shiftOpen ? "whitespace-nowrap rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary" : "whitespace-nowrap rounded-full bg-warning/15 px-2 py-0.5 font-semibold text-warning-foreground"}>
          {shiftOpen ? "Shift open" : <><span className="sm:hidden">No shift</span><span className="hidden sm:inline">No shift open</span></>}
        </span>
        <span className="flex items-center gap-1 text-muted-foreground" title="Cloud save status">
          {status === "saving" || status === "loading" ? <Loader2 className="size-3.5 animate-spin" /> : status === "synced" ? <Cloud className="size-3.5 text-primary" /> : <CloudOff className="size-3.5 text-destructive" />}
          <span className="hidden sm:inline">{status === "synced" ? "Saved" : status === "saving" ? "Saving…" : status === "offline" ? "Offline — will save when back" : status === "error" ? "Save failed" : "Loading"}</span>
        </span>
        <span className="hidden font-semibold sm:inline">{me?.name} <span className="font-normal text-muted-foreground">({me?.role})</span></span>
        <Button variant="outline" size="sm" className="h-8 px-2.5 sm:px-3" aria-label="Lock the screen" onClick={signOutStaff}><Lock className="size-3.5 sm:mr-1" /><span className="max-sm:sr-only">Lock</span></Button>
        <Button variant="ghost" size="icon" className="size-8" aria-label="Sign out of depot account" onClick={() => void signOut()}><LogOut className="size-3.5" /></Button>
      </div>
    </header>
  );
}
