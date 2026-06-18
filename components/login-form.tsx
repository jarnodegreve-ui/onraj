"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";

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

type Status = "idle" | "sending" | "sent" | "error";

// Vertaalt foutcodes uit de auth-callback naar leesbare meldingen.
const ERROR_MESSAGES: Record<string, string> = {
  "geen-toegang": "Dit account heeft geen toegang tot ONRAJ.",
  auth: "Aanmelden mislukt. Vraag de magische link opnieuw aan.",
};

export function LoginForm({ error }: { error?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(
    error ? (ERROR_MESSAGES[error] ?? "Er ging iets mis.") : null,
  );

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!supabaseConfigured) {
      setStatus("error");
      setMessage("Supabase is nog niet geconfigureerd.");
      return;
    }

    setStatus("sending");
    setMessage(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (signInError) {
      setStatus("error");
      setMessage(signInError.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <div className="mx-auto mb-1 flex size-11 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground">
          O
        </div>
        <CardTitle className="text-xl">ONRAJ</CardTitle>
        <CardDescription>
          Meld je aan met je e-mailadres — je ontvangt een magische link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === "sent" ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <CheckCircle2 className="size-8 text-primary" />
            <p className="font-medium">Check je mailbox</p>
            <p className="text-sm text-muted-foreground">
              We stuurden een aanmeldlink naar <strong>{email}</strong>.
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
                placeholder="jij@voorbeeld.be"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            {message && <p className="text-sm text-destructive">{message}</p>}
            <Button
              type="submit"
              className="w-full"
              disabled={status === "sending"}
            >
              {status === "sending" ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Versturen…
                </>
              ) : (
                <>
                  <Mail className="size-4" /> Stuur magische link
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
