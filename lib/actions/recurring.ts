"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { currentMonthKey } from "@/lib/month";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./result";

const recurringInput = z.object({
  amount: z.number().positive("Bedrag moet groter zijn dan 0."),
  direction: z.enum(["inkomst", "uitgave"]),
  category: z.string().trim().max(60),
  description: z.string().trim().max(200),
  account: z.string().trim().max(60),
  dayOfMonth: z.number().int().min(1).max(28),
});

export type RecurringInput = z.infer<typeof recurringInput>;

function revalidateFinance() {
  revalidatePath("/financien");
  revalidatePath("/dashboard");
}

function parse(input: RecurringInput) {
  const result = recurringInput.safeParse(input);
  if (result.success) return { ok: true as const, data: result.data };
  return {
    ok: false as const,
    error: result.error.issues[0]?.message ?? "Ongeldige invoer.",
  };
}

export async function createRecurring(
  input: RecurringInput,
): Promise<ActionResult> {
  const parsed = parse(input);
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const { error } = await supabase.from("recurring_transactions").insert({
    amount: parsed.data.amount,
    direction: parsed.data.direction,
    category: parsed.data.category,
    description: parsed.data.description,
    account: parsed.data.account || null,
    day_of_month: parsed.data.dayOfMonth,
    start_month: currentMonthKey(),
  });
  if (error) return { ok: false, error: error.message };

  revalidateFinance();
  return { ok: true };
}

export async function updateRecurring(
  id: string,
  input: RecurringInput,
): Promise<ActionResult> {
  const parsed = parse(input);
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const { error } = await supabase
    .from("recurring_transactions")
    .update({
      amount: parsed.data.amount,
      direction: parsed.data.direction,
      category: parsed.data.category,
      description: parsed.data.description,
      account: parsed.data.account || null,
      day_of_month: parsed.data.dayOfMonth,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateFinance();
  return { ok: true };
}

export async function setRecurringActive(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("recurring_transactions")
    .update({ active })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateFinance();
  return { ok: true };
}

export async function deleteRecurring(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("recurring_transactions")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateFinance();
  return { ok: true };
}
