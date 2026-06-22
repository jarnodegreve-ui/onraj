import { NextResponse } from "next/server";

import { toNote } from "@/lib/mappers";
import { secureEquals } from "@/lib/secure";
import {
  adminConfigured,
  createAdminClient,
  getOwnerUserId,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { syncNoteFile } from "@/lib/vault-sync";

const shareSecret = process.env.SHARE_SECRET ?? "";

// Wie deelt? Een ingelogde sessie (PWA share-target) of het gedeelde geheim
// (iOS-Shortcut zonder sessie).
async function resolveOwner(request: Request): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) return user.id;
  } catch {
    /* geen sessie — val terug op het geheim */
  }
  const url = new URL(request.url);
  const key = url.searchParams.get("key") ?? request.headers.get("x-onraj-key");
  if (shareSecret && key && secureEquals(key, shareSecret)) {
    return getOwnerUserId();
  }
  return null;
}

async function saveNote(ownerId: string, title: string, body: string) {
  const admin = createAdminClient();
  const noteTitle =
    (title || body).split("\n")[0].trim().slice(0, 80) || "Gedeeld";
  const { data, error } = await admin
    .from("notes")
    .insert({
      user_id: ownerId,
      title: noteTitle,
      body: body.trim(),
      tags: ["gedeeld"],
      pinned: false,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  await syncNoteFile(toNote(data), null);
  return noteTitle;
}

// GET = PWA share-target (manifest): maak een notitie en stuur door naar /notities.
export async function GET(request: Request) {
  const home = new URL("/notities", request.url);
  if (!adminConfigured) return NextResponse.redirect(home);

  const url = new URL(request.url);
  const title = url.searchParams.get("title") ?? "";
  const text = url.searchParams.get("text") ?? "";
  const link = url.searchParams.get("url") ?? "";
  const body = [text, link].filter(Boolean).join("\n\n");
  if (!title && !body) return NextResponse.redirect(home);

  const ownerId = await resolveOwner(request);
  if (!ownerId) return NextResponse.redirect(new URL("/login", request.url));
  try {
    await saveNote(ownerId, title, body || title);
  } catch {
    /* best-effort — stuur sowieso door */
  }
  return NextResponse.redirect(new URL("/notities?gedeeld=1", request.url));
}

// POST = iOS-Shortcut of externe trigger met het gedeelde geheim.
export async function POST(request: Request) {
  if (!adminConfigured) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  const ownerId = await resolveOwner(request);
  if (!ownerId) {
    return NextResponse.json(
      { ok: false, error: "niet gemachtigd" },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  let title = url.searchParams.get("title") ?? "";
  let text = url.searchParams.get("text") ?? "";
  const link = url.searchParams.get("url") ?? "";

  if (!text && !title) {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const json = (await request.json().catch(() => ({}))) as {
        text?: string;
        title?: string;
      };
      text = json.text ?? "";
      title = json.title ?? "";
    } else {
      text = (await request.text().catch(() => "")) ?? "";
    }
  }

  const body = [text, link].filter(Boolean).join("\n\n");
  if (!body && !title) {
    return NextResponse.json({ ok: false, error: "leeg" }, { status: 400 });
  }

  try {
    const saved = await saveNote(ownerId, title, body || title);
    return NextResponse.json({ ok: true, title: saved });
  } catch {
    return NextResponse.json(
      { ok: false, error: "opslaan mislukt" },
      { status: 500 },
    );
  }
}
