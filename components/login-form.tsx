"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, LogIn } from "lucide-react";

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
import { supabaseConfigured } from "@/lib/supabase/env";

type Status = "idle" | "signing" | "resetSent";

// Vertaalt foutcodes uit de proxy/callback naar leesbare meldingen.
const ERROR_MESSAGES: Record<string, string> = {
  "geen-toegang": "Dit account heeft geen toegang tot ONRAJ.",
  auth: "Aanmelden mislukt. Probeer opnieuw.",
};

export function LoginForm({ error }: { error?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(
    error ? (ERROR_MESSAGES[error] ?? "Er ging iets mis.") : null,
  );

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabaseConfigured) {
      setMessage("Supabase is nog niet geconfigureerd.");
      return;
    }

    setStatus("signing");
    setMessage(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setStatus("idle");
      setMessage(
        signInError.message === "Invalid login credentials"
          ? "Onjuist e-mailadres of wachtwoord."
          : signInError.message,
      );
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  async function onReset() {
    if (!supabaseConfigured) {
      setMessage("Supabase is nog niet geconfigureerd.");
      return;
    }
    if (!email) {
      setMessage("Vul eerst je e-mailadres in.");
      return;
    }

    setMessage(null);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${window.location.origin}/auth/callback?next=/wachtwoord` },
    );

    if (resetError) setMessage(resetError.message);
    else setStatus("resetSent");
  }

  return (
    <Card className="w-full max-w-sm shadow-xl">
      <CardHeader className="items-center text-center">
        <BrandMark className="mx-auto mb-1 size-12" />
        <CardTitle className="text-xl">ONRAJ</CardTitle>
        <CardDescription>
          Meld je aan met je e-mailadres en wachtwoord.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === "resetSent" ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <CheckCircle2 className="size-8 text-primary" />
            <p className="font-medium">Check je mailbox</p>
            <p className="text-sm text-muted-foreground">
              We stuurden een link om je wachtwoord in te stellen naar{" "}
              <strong>{email}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">E-mailadres</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="jij@voorbeeld.be"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Wachtwoord</Label>
                <button
                  type="button"
                  onClick={onReset}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Wachtwoord vergeten?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {message && <p className="text-sm text-destructive">{message}</p>}
            <Button
              type="submit"
              className="w-full"
              disabled={status === "signing"}
            >
              {status === "signing" ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Aanmelden…
                </>
              ) : (
                <>
                  <LogIn className="size-4" /> Aanmelden
                </>
              )}
            </Button>
            {!supabaseConfigured && (
              <p className="text-center text-xs text-muted-foreground">
                Supabase nog niet gekoppeld — login is uitgeschakeld.
              </p>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
