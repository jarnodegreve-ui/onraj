"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, ShieldPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

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

type Enrolling = { factorId: string; qrCode: string; secret: string };

// Beheer van twee-factor-authenticatie (TOTP) via Supabase Auth. Opt-in: pas
// wanneer er een geverifieerde factor is, dwingt proxy.ts de codestap af.
export function MfaManager() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState<Enrolling | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    setFactorId(error ? null : (data?.totp?.[0]?.id ?? null));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    // Eénmalige status-fetch bij mount — een legitiem effect (sync met Supabase).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  async function startEnroll() {
    setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
    });
    setBusy(false);
    if (error || !data) {
      toast.error("Instellen mislukt", { description: error?.message });
      return;
    }
    setCode("");
    setEnrolling({
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    });
  }

  async function confirmEnroll() {
    if (!enrolling) return;
    const clean = code.replace(/\D/g, "");
    if (clean.length < 6) {
      toast.error("Vul de 6-cijferige code in.");
      return;
    }
    setBusy(true);
    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({
      factorId: enrolling.factorId,
    });
    if (cErr || !challenge) {
      setBusy(false);
      toast.error("Verifiëren mislukt", { description: cErr?.message });
      return;
    }
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId: enrolling.factorId,
      challengeId: challenge.id,
      code: clean,
    });
    setBusy(false);
    if (vErr) {
      toast.error("De code klopt niet", { description: "Probeer opnieuw." });
      return;
    }
    toast.success("Twee-factor-authenticatie staat aan 🔐");
    setEnrolling(null);
    setCode("");
    await refresh();
    router.refresh();
  }

  async function cancelEnroll() {
    if (enrolling) {
      await supabase.auth.mfa.unenroll({ factorId: enrolling.factorId });
    }
    setEnrolling(null);
    setCode("");
  }

  async function disable() {
    if (!factorId) return;
    if (!window.confirm("Twee-factor-authenticatie uitschakelen?")) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (error) {
      toast.error("Uitschakelen mislukt", { description: error.message });
      return;
    }
    toast.success("Twee-factor-authenticatie uitgeschakeld");
    await refresh();
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="size-4" /> Twee-factor-authenticatie
        </CardTitle>
        <CardDescription>
          Beveilig je login met een extra code uit een authenticator-app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Laden…</p>
        ) : enrolling ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Scan deze QR-code met je authenticator-app (Google/Microsoft
              Authenticator, 1Password, Bitwarden…) en vul daarna de
              6-cijferige code in.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={enrolling.qrCode}
              alt="QR-code voor je authenticator-app"
              className="size-44 rounded-lg border bg-white p-2"
            />
            <p className="text-xs text-muted-foreground">
              Scannen lukt niet? Voer handmatig in:{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] break-all">
                {enrolling.secret}
              </code>
            </p>
            <div className="grid gap-2">
              <Label htmlFor="mfa-code">Code uit de app</Label>
              <Input
                id="mfa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={confirmEnroll} disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" />} Activeren
              </Button>
              <Button variant="outline" onClick={cancelEnroll} disabled={busy}>
                Annuleren
              </Button>
            </div>
          </div>
        ) : factorId ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 text-sm">
              <span className="inline-flex size-2 rounded-full bg-emerald-500" />
              Actief — je login is beveiligd met 2FA.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={disable}
              disabled={busy}
            >
              <Trash2 className="size-4" /> Uitschakelen
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Nog niet ingesteld.</p>
            <Button onClick={startEnroll} disabled={busy}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShieldPlus className="size-4" />
              )}
              Instellen
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
