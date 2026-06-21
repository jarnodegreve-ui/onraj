"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./result";

const balanceInput = z.object({
  account: z.string().trim().min(1).max(60),
  month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ongeldige maand."),
  amount: z.number().finite(),
});

function revalidate() {
  revalidatePath("/financien");
  revalidatePath("/dashboard");
}

// Voegt een saldo toe of werkt het bij (uniek per rekening + maand).
export async function upsertAccountBalance(
  input: z.infer<typeof balanceInput>,
): Promise<ActionResult> {
  const parsed = balanceInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Ongeldige invoer.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Niet ingelogd." };

  const { error } = await supabase.from("account_balances").upsert(
    {
      user_id: user.id,
      account: parsed.data.account,
      month: parsed.data.month,
      amount: parsed.data.amount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,account,month" },
  );
  if (error) return { ok: false, error: error.message };

  revalidate();
  return { ok: true };
}

export async function deleteAccountBalance(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("account_balances")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidate();
  return { ok: true };
}
