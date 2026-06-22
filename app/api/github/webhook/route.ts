import { createHmac, timingSafeEqual } from "crypto";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getFileContent, vaultDir } from "@/lib/github";
import {
  adminConfigured,
  createAdminClient,
  getOwnerUserId,
} from "@/lib/supabase/admin";
import { parseNoteMarkdown } from "@/lib/vault-parse";

const secret = process.env.GITHUB_WEBHOOK_SECRET ?? "";

interface PushCommit {
  added?: string[];
  modified?: string[];
}
interface PushPayload {
  commits?: PushCommit[];
}

// GitHub stuurt een push-event wanneer de notitie-repo wijzigt (o.a. via
// Obsidian Git). We lezen de gewijzigde .md's en werken de bijhorende notitie
// bij in Supabase. Loop-veilig: bij identieke inhoud (ONRAJ's eigen push) doen
// we niets, en we schrijven niet terug.
export async function POST(request: Request) {
  if (!secret) {
    return NextResponse.json({ ok: true, note: "webhook uit" });
  }

  const raw = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  const expected =
    "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  if (request.headers.get("x-github-event") !== "push") {
    return NextResponse.json({ ok: true }); // ping e.d.
  }
  if (!adminConfigured) return NextResponse.json({ ok: true });

  let payload: PushPayload;
  try {
    payload = JSON.parse(raw) as PushPayload;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const prefix = `${vaultDir}/`;
  const changed = new Set<string>();
  for (const commit of payload.commits ?? []) {
    for (const path of [...(commit.added ?? []), ...(commit.modified ?? [])]) {
      if (path.startsWith(prefix) && path.endsWith(".md")) changed.add(path);
    }
  }
  if (changed.size === 0) return NextResponse.json({ ok: true });

  try {
    const ownerId = await getOwnerUserId();
    if (!ownerId) return NextResponse.json({ ok: true });
    const admin = createAdminClient();
    let updated = 0;

    for (const path of changed) {
      const content = await getFileContent(path);
      if (!content) continue;
      const parsed = parseNoteMarkdown(content);
      if (!parsed.onrajId) continue; // v1: enkel bestaande notities (met id)

      const { data: note } = await admin
        .from("notes")
        .select("title, body, tags, category, pinned")
        .eq("id", parsed.onrajId)
        .eq("user_id", ownerId)
        .maybeSingle();
      if (!note) continue;

      const sameTags =
        JSON.stringify(note.tags ?? []) === JSON.stringify(parsed.tags);
      const unchanged =
        (note.title ?? "") === parsed.title &&
        (note.body ?? "").trim() === parsed.body.trim() &&
        (note.category ?? null) === parsed.category &&
        Boolean(note.pinned) === parsed.pinned &&
        sameTags;
      if (unchanged) continue;

      await admin
        .from("notes")
        .update({
          title: parsed.title,
          body: parsed.body,
          tags: parsed.tags,
          category: parsed.category,
          pinned: parsed.pinned,
        })
        .eq("id", parsed.onrajId)
        .eq("user_id", ownerId);
      updated += 1;
    }

    if (updated > 0) {
      revalidatePath("/notities");
      revalidatePath("/dashboard");
    }
    return NextResponse.json({ ok: true, updated });
  } catch (error) {
    console.error("[github-webhook] verwerking mislukt:", error);
    return NextResponse.json({ ok: true });
  }
}
