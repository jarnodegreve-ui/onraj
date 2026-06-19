"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./result";

const goalInput = z.object({
  name: z.string().trim().min(1, "Geef een naam.").max(80),
  targetAmount: z.number().positive("Doelbedrag moet groter zijn dan 0."),
  savedAmount: z
    .number()
    .nonnegative("Gespaard bedrag mag niet negatief zijn."),
  color: z.string().trim().max(20),
});

export type SavingsGoalInput = z.infer<typeof goalInput>;

function revalidateSavings() {
  revalidatePath("/financien");
  revalidatePath("/dashboard");
}

function toRow(input: SavingsGoalInput) {
  return {
    name: input.name,
    target_amount: input.targetAmount,
    saved_amount: input.savedAmount,
    color: input.color || null,
  };
}

function parse(input: SavingsGoalInput) {
  const result = goalInput.safeParse(input);
  if (result.success) return { ok: true as const, data: result.data };
  return {
    ok: false as const,
    error: result.error.issues[0]?.message ?? "Ongeldige invoer.",
  };
}

export async function createSavingsGoal(
  input: SavingsGoalInput,
): Promise<ActionResult> {
  const parsed = parse(input);
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const { error } = await supabase
    .from("savings_goals")
    .insert(toRow(parsed.data));
  if (error) return { ok: false, error: error.message };

  revalidateSavings();
  return { ok: true };
}

export async function updateSavingsGoal(
  id: string,
  input: SavingsGoalInput,
): Promise<ActionResult> {
  const parsed = parse(input);
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const { error } = await supabase
    .from("savings_goals")
    .update(toRow(parsed.data))
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateSavings();
  return { ok: true };
}

export async function deleteSavingsGoal(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("savings_goals").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateSavings();
  return { ok: true };
}
