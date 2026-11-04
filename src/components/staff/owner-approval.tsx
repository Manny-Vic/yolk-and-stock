import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { create } from "zustand";

import { PinPad } from "@/components/staff/pin-pad";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { verifyPin } from "@/lib/pin";
import { useStore } from "@/store/useStore";

interface ApprovalRequest {
  title: string;
  reasons: string[];
  resolve: (ok: boolean) => void;
}

const useApprovalQueue = create<{ req: ApprovalRequest | null }>(() => ({ req: null }));

/**
 * Ask for an owner PIN. Resolves true right away when an owner is the one signed in.
 * Returns the approving owner's name, or null when cancelled.
 */
export function requestOwnerApproval(title: string, reasons: string[] = []): Promise<boolean> {
  const st = useStore.getState();
  const me = st.staff.find((x) => x.id === st.activeStaffId);
  if (me?.role === "owner") return Promise.resolve(true);
  return new Promise((resolve) => useApprovalQueue.setState({ req: { title, reasons, resolve } }));
}

export function OwnerApprovalDialog() {
  const req = useApprovalQueue((s) => s.req);
  const staff = useStore((s) => s.staff);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const close = (ok: boolean) => {
    req?.resolve(ok);
    useApprovalQueue.setState({ req: null });
    setPin("");
    setError("");
  };

  const submit = async () => {
    setBusy(true);
    const owners = staff.filter((x) => x.role === "owner");
    let approver: string | null = null;
    for (const o of owners) if (await verifyPin(o, pin)) approver = o.name;
    setBusy(false);
    if (!approver) {
      setError("Wrong owner PIN.");
      setPin("");
      return;
    }
    useStore.setState((s) => ({
      auditLog: [{ ts: new Date().toISOString(), action: "Owner approval", detail: `${req?.title ?? ""} — approved by ${approver}`, by: s.staff.find((x) => x.id === s.activeStaffId)?.name }, ...s.auditLog].slice(0, 500),
    }));
    close(true);
  };

  return (
    <Dialog open={!!req} onOpenChange={(o) => !o && close(false)}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" /> Owner approval
          </DialogTitle>
          <DialogDescription>{req?.title}</DialogDescription>
        </DialogHeader>
        {req?.reasons.length ? (
          <ul className="list-disc space-y-0.5 pl-4 text-[12px] text-muted-foreground">
            {req.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        ) : null}
        <PinPad value={pin} onChange={(v) => { setPin(v); setError(""); }} onSubmit={() => void submit()} disabled={busy} submitLabel="Approve" />
        {error ? <p className="text-center text-[12px] font-semibold text-destructive">{error}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
