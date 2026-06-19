"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getValidGoogleAccessToken } from "@/lib/data/google";
import { createGoogleEvent } from "@/lib/google";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./result";

const googleEventInput = z.object({
  title: z.string().trim().min(1, "Geef een titel.").max(200),
  startsAt: z.string().min(1),
  endsAt: z.string().nullable(),
  allDay: z.boolean(),
  location: z.string().max(200),
  notes: z.string().max(5000),
});

export type GoogleEventInput = z.infer<typeof googleEventInput>;

export async function createGoogleCalendarEvent(
  input: GoogleEventInput,
): Promise<ActionResult> {
  const parsed = googleEventInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ongeldige invoer." };

  const accessToken = await getValidGoogleAccessToken();
  if (!accessToken) {
    return {
      ok: false,
      error: "Geen geldige Google-koppeling. Koppel opnieuw.",
    };
  }

  try {
    await createGoogleEvent(accessToken, parsed.data);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Aanmaken mislukt.",
    };
  }

  revalidatePath("/agenda");
  return { ok: true };
}

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
