"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { AttachmentEntity, AttachmentView } from "@/lib/types";
import type { ActionResult } from "./result";

const recordInput = z.object({
  entityType: z.enum(["note", "transaction"]),
  entityId: z.string().min(1).max(64),
  path: z.string().min(1).max(400),
  name: z.string().min(1).max(255),
  mime: z.string().max(120),
  size: z.number().int().nonnegative(),
});

export type AttachmentRecordInput = z.infer<typeof recordInput>;

/** Bijlagen van één entiteit, met een tijdelijke (signed) download-URL. */
export async function listAttachments(
  entityType: AttachmentEntity,
  entityId: string,
): Promise<AttachmentView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attachments")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  const views: AttachmentView[] = [];
  for (const row of data) {
    // Korte TTL (5 min): een gemorste link werkt niet uren lang zonder sessie.
    const { data: signed } = await supabase.storage
      .from("attachments")
      .createSignedUrl(row.path, 300);
    views.push({
      id: row.id,
      name: row.name,
      mime: row.mime,
      size: row.size,
      url: signed?.signedUrl ?? "",
    });
  }
  return views;
}

export async function createAttachmentRecord(
  input: AttachmentRecordInput,
): Promise<ActionResult> {
  const parsed = recordInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ongeldige bijlage." };

  const supabase = await createClient();
  const { error } = await supabase.from("attachments").insert({
    entity_type: parsed.data.entityType,
    entity_id: parsed.data.entityId,
    path: parsed.data.path,
    name: parsed.data.name,
    mime: parsed.data.mime || null,
    size: parsed.data.size,
  });
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export async function deleteAttachment(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("attachments")
    .select("path")
    .eq("id", id)
    .single();

  if (row?.path) {
    await supabase.storage.from("attachments").remove([row.path]);
  }

  const { error } = await supabase.from("attachments").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}
