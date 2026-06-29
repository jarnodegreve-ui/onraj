"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./result";

const subscriptionInput = z.object({
  name: z.string().trim().min(1, "Geef een naam.").max(80),
  amount: z.number().nonnegative("Bedrag mag niet negatief zijn."),
  cycle: z.enum(["maandelijks", "jaarlijks"]),
  category: z.string().trim().max(60),
  nextRenewal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige datum.")
    .nullable(),
  active: z.boolean(),
  note: z.string().trim().max(200),
});

export type SubscriptionInput = z.infer<typeof subscriptionInput>;

function revalidate() {
  revalidatePath("/financien");
  revalidatePath("/dashboard");
}

function toRow(input: SubscriptionInput) {
  return {
    name: input.name,
    amount: input.amount,
    cycle: input.cycle,
    category: input.category || null,
    next_renewal: input.nextRenewal,
    active: input.active,
    note: input.note || null,
  };
}

function parse(input: SubscriptionInput) {
  const result = subscriptionInput.safeParse(input);
  if (result.success) return { ok: true as const, data: result.data };
  return {
    ok: false as const,
    error: result.error.issues[0]?.message ?? "Ongeldige invoer.",
  };
}

export async function createSubscription(
  input: SubscriptionInput,
): Promise<ActionResult> {
  const parsed = parse(input);
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const { error } = await supabase
    .from("subscriptions")
    .insert(toRow(parsed.data));
  if (error) return { ok: false, error: error.message };

  revalidate();
  return { ok: true };
}

export async function updateSubscription(
  id: string,
  input: SubscriptionInput,
): Promise<ActionResult> {
  const parsed = parse(input);
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({ ...toRow(parsed.data), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidate();
  return { ok: true };
}

export async function deleteSubscription(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidate();
  return { ok: true };
}
