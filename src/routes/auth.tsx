import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Coins } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Golden Nest Egg Depot" },
      { name: "description", content: "Sign in to the Golden Nest Egg Depot wholesale POS. Your records are saved securely in the cloud." },
      { property: "og:title", content: "Sign in — Golden Nest Egg Depot" },
      { property: "og:description", content: "Secure sign-in for the depot's wholesale POS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) void navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        void navigate({ to: "/", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        if (data.session) void navigate({ to: "/", replace: true });
        else setSent(true);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-6 shadow-card">
        <div className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Coins className="size-5" /></span>
          <div>
            <div className="text-sm font-bold">Golden Nest Egg Depot</div>
            <div className="text-[11px] text-muted-foreground">{mode === "signin" ? "Sign in to the depot account" : "Create the depot account"}</div>
          </div>
        </div>
        {sent ? (
          <p className="text-[13px]">Check <b>{email}</b> for a confirmation link, then come back and sign in.</p>
        ) : (
          <>
            <div><Label className="text-xs">Email</Label><Input className="mt-1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label className="text-xs">Password</Label><Input className="mt-1" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <Button type="submit" className="w-full" disabled={busy}>{mode === "signin" ? "Sign in" : "Create account"}</Button>
          </>
        )}
        <button type="button" className="w-full text-center text-[12px] text-muted-foreground hover:text-foreground" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setSent(false); }}>
          {mode === "signin" ? "First time? Create the depot account" : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
