"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./result";

const transactionInput = z.object({
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Kies een geldige datum."),
  amount: z.number().positive("Bedrag moet groter zijn dan 0."),
  direction: z.enum(["inkomst", "uitgave"]),
  category: z.string().trim().max(60),
  description: z.string().trim().max(200),
  account: z.string().trim().max(60),
});

export type TransactionInput = z.infer<typeof transactionInput>;

function toRow(input: TransactionInput) {
  return {
    occurred_on: input.occurredOn,
    amount: input.amount,
    direction: input.direction,
    category: input.category,
    description: input.description,
    account: input.account || null,
  };
}

function revalidateFinance() {
  revalidatePath("/financien");
  revalidatePath("/dashboard");
}

function firstError(input: TransactionInput) {
  const parsed = transactionInput.safeParse(input);
  if (parsed.success) return { ok: true as const, data: parsed.data };
  return {
    ok: false as const,
    error: parsed.error.issues[0]?.message ?? "Ongeldige invoer.",
  };
}

export async function createTransaction(
  input: TransactionInput,
): Promise<ActionResult> {
  const parsed = firstError(input);
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const { error } = await supabase.from("transactions").insert(toRow(parsed.data));
  if (error) return { ok: false, error: error.message };

  revalidateFinance();
  return { ok: true };
}

export async function updateTransaction(
  id: string,
  input: TransactionInput,
): Promise<ActionResult> {
  const parsed = firstError(input);
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const { error } = await supabase
    .from("transactions")
    .update(toRow(parsed.data))
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateFinance();
  return { ok: true };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateFinance();
  return { ok: true };
}
