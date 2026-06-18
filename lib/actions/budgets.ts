"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./result";

const budgetInput = z.object({
  category: z.string().trim().min(1, "Geef een categorie.").max(60),
  amount: z.number().positive("Bedrag moet groter zijn dan 0."),
});

export type BudgetInput = z.infer<typeof budgetInput>;

function revalidateBudgets() {
  revalidatePath("/financien");
  revalidatePath("/dashboard");
}

function mapError(error: { code?: string; message: string }): string {
  if (error.code === "23505") {
    return "Er bestaat al een budget voor deze categorie.";
  }
  return error.message;
}

export async function createBudget(input: BudgetInput): Promise<ActionResult> {
  const parsed = budgetInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ongeldige invoer.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("budgets").insert(parsed.data);
  if (error) return { ok: false, error: mapError(error) };

  revalidateBudgets();
  return { ok: true };
}

export async function updateBudget(
  id: string,
  input: BudgetInput,
): Promise<ActionResult> {
  const parsed = budgetInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ongeldige invoer.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("budgets")
    .update(parsed.data)
    .eq("id", id);
  if (error) return { ok: false, error: mapError(error) };

  revalidateBudgets();
  return { ok: true };
}

export async function deleteBudget(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateBudgets();
  return { ok: true };
}
