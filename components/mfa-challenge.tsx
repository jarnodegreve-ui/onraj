"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, ShieldCheck } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

// Login-stap 2: de 6-cijferige TOTP-code na een geslaagd wachtwoord. Bij succes
// gaat de sessie naar aal2 en stuurt proxy.ts de gebruiker door.
export function MfaChallenge({ next }: { next: string }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    const clean = code.replace(/\D/g, "");
    if (clean.length < 6) {
      setMessage("Vul de 6-cijferige code in.");
      return;
    }
    setBusy(true);
    setMessage(null);

    const { data: factors, error: fErr } =
      await supabase.auth.mfa.listFactors();
    const factorId = factors?.totp?.[0]?.id;
    if (fErr || !factorId) {
      setBusy(false);
      setMessage("Geen authenticator gevonden. Log opnieuw in.");
      return;
    }
    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({
      factorId,
    });
    if (cErr || !challenge) {
      setBusy(false);
      setMessage(cErr?.message ?? "Er ging iets mis.");
      return;
    }
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: clean,
    });
    if (vErr) {
      setBusy(false);
      setCode("");
      setMessage("De code klopt niet. Probeer opnieuw.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  function signOut() {
    // Server-route onder /auth → buiten de MFA-proxy, geen race.
    window.location.href = "/auth/signout";
  }

  return (
    <Card className="w-full max-w-sm shadow-xl">
      <CardHeader className="items-center text-center">
        <BrandMark className="mx-auto mb-1 size-12" />
        <CardTitle className="flex items-center justify-center gap-2 text-xl">
          <ShieldCheck className="size-5" /> Verificatie
        </CardTitle>
        <CardDescription>
          Vul de 6-cijferige code uit je authenticator-app in.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={verify} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="otp">Code</Label>
            <Input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder="123456"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          {message && <p className="text-sm text-destructive">{message}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Controleren…
              </>
            ) : (
              <>
                <LogIn className="size-4" /> Bevestigen
              </>
            )}
          </Button>
          <button
            type="button"
            onClick={signOut}
            className="text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Uitloggen
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
