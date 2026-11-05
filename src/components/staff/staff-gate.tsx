import { useState, type ReactNode } from "react";
import { Coins, UserRound } from "lucide-react";
import { toast } from "sonner";

import { PinPad } from "@/components/staff/pin-pad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hashPin, isValidPin, verifyPin } from "@/lib/pin";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";

/** Shows a PIN lock screen until a staff member signs in on this device. */
export function StaffGate({ children }: { children: ReactNode }) {
  const staff = useStore((s) => s.staff);
  const activeStaffId = useStore((s) => s.activeStaffId);
  const active = staff.find((x) => x.id === activeStaffId);

  if (active) return <>{children}</>;
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-card">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Coins className="size-5" />
          </span>
          <div>
            <div className="text-sm font-bold">Golden Nest Egg Depot</div>
            <div className="text-[11px] text-muted-foreground">{staff.length ? "Who's at the counter?" : "Set up the owner account"}</div>
          </div>
        </div>
        {staff.length === 0 ? <FirstOwnerSetup /> : <PinSignIn />}
      </div>
    </div>
  );
}

function FirstOwnerSetup() {
  const addStaff = useStore((s) => s.addStaff);
  const signInStaff = useStore((s) => s.signInStaff);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");

  const save = async () => {
    if (!name.trim()) { toast.error("Enter the owner's name."); return; }
    if (!isValidPin(pin)) { toast.error("PIN must be 4 to 6 digits."); return; }
    if (pin !== confirm) { toast.error("PINs do not match."); return; }
    const id = `st-${Math.random().toString(36).slice(2, 10)}`;
    addStaff({ id, name: name.trim(), role: "owner", pinHash: await hashPin(id, pin) });
    signInStaff(id);
    toast.success("Owner PIN saved. Add cashiers in Settings.");
  };

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-muted-foreground">
        The owner PIN unlocks Settings, clearing data, cancelling orders, and approving below-cost prices or big discounts.
      </p>
      <div>
        <Label className="text-xs">Owner name</Label>
        <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">PIN (4–6 digits)</Label>
          <Input className="mt-1" type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
        </div>
        <div>
          <Label className="text-xs">Repeat PIN</Label>
          <Input className="mt-1" type="password" inputMode="numeric" maxLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))} />
        </div>
      </div>
      <Button className="w-full" onClick={() => void save()}>Save and start</Button>
    </div>
  );
}

function PinSignIn() {
  const staff = useStore((s) => s.staff);
  const signInStaff = useStore((s) => s.signInStaff);
  const [selected, setSelected] = useState<string | null>(staff.length === 1 ? staff[0]!.id : null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const member = staff.find((x) => x.id === selected);

  const submit = async () => {
    if (!member) return;
    setBusy(true);
    const ok = await verifyPin(member, pin);
    setBusy(false);
    if (!ok) {
      setError("Wrong PIN. Try again.");
      setPin("");
      return;
    }
    signInStaff(member.id);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {staff.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => { setSelected(m.id); setPin(""); setError(""); }}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-[13px] font-semibold transition-colors",
              selected === m.id ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent",
            )}
          >
            <UserRound className="size-4 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate">{m.name}</span>
              <span className="block text-[10px] font-normal uppercase text-muted-foreground">{m.role}</span>
            </span>
          </button>
        ))}
      </div>
      {member ? (
        <>
          <PinPad value={pin} onChange={(v) => { setPin(v); setError(""); }} onSubmit={() => void submit()} disabled={busy} />
          {error ? <p className="text-center text-[12px] font-semibold text-destructive">{error}</p> : null}
        </>
      ) : (
        <p className="text-center text-[12px] text-muted-foreground">Tap your name, then enter your PIN.</p>
      )}
    </div>
  );
}
