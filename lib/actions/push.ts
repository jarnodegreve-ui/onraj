"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./result";

const subInput = z.object({
  endpoint: z.string().url().max(2000),
  p256dh: z.string().min(1).max(500),
  auth: z.string().min(1).max(500),
});

export async function savePushSubscription(
  input: z.infer<typeof subInput>,
): Promise<ActionResult> {
  const parsed = subInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ongeldige subscription." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Niet ingelogd." };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function removePushSubscription(
  endpoint: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
