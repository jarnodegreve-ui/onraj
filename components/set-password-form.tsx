"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function SetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setMessage("Gebruik minstens 8 tekens.");
      return;
    }
    if (password !== confirm) {
      setMessage("De wachtwoorden komen niet overeen.");
      return;
    }

    setSaving(true);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setSaving(false);
      setMessage(error.message);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <Card className="w-full max-w-sm shadow-xl">
      <CardHeader className="items-center text-center">
        <BrandMark className="mx-auto mb-1 size-12" />
        <div className="font-heading text-xl font-semibold tracking-tight">Wachtwoord instellen</div>
        <CardDescription>
          Kies een nieuw wachtwoord voor je account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="new-password">Nieuw wachtwoord</Label>
            <Input
              id="new-password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm-password">Bevestig wachtwoord</Label>
            <Input
              id="confirm-password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </div>
          {message && <p className="text-sm text-destructive">{message}</p>}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Opslaan…
              </>
            ) : (
              "Wachtwoord opslaan"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
