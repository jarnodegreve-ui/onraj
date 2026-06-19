"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./result";

export async function disconnectGoogle(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Niet aangemeld." };

  const { error } = await supabase
    .from("google_tokens")
    .delete()
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/agenda");
  return { ok: true };
}
