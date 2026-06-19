"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  createAttachmentRecord,
  deleteAttachment,
  listAttachments,
} from "@/lib/actions/attachments";
import { createClient } from "@/lib/supabase/client";
import type { AttachmentEntity, AttachmentView } from "@/lib/types";

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

function sanitize(name: string) {
  return name.replace(/[^\w.-]+/g, "_").slice(-80) || "bestand";
}

function isImage(mime: string | null) {
  return !!mime && mime.startsWith("image/");
}

export function Attachments({
  entityType,
  entityId,
}: {
  entityType: AttachmentEntity;
  entityId: string;
}) {
  const [items, setItems] = useState<AttachmentView[] | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    listAttachments(entityType, entityId)
      .then((data) => {
        if (active) setItems(data);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, [entityType, entityId]);

  async function refresh() {
    setItems(await listAttachments(entityType, entityId));
  }

  async function onFile(file: File) {
    if (file.size > MAX_BYTES) {
      toast.error("Bestand te groot (max 20 MB).");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Niet aangemeld.");
        return;
      }

      const path = `${user.id}/${entityType}/${crypto.randomUUID()}-${sanitize(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(path, file, {
          contentType: file.type || undefined,
          upsert: false,
        });
      if (uploadError) {
        toast.error("Upload mislukt", { description: uploadError.message });
        return;
      }

      const result = await createAttachmentRecord({
        entityType,
        entityId,
        path,
        name: file.name,
        mime: file.type,
        size: file.size,
      });
      if (!result.ok) {
        toast.error("Opslaan mislukt", { description: result.error });
        return;
      }

      await refresh();
      toast.success("Bijlage toegevoegd");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Bijlage verwijderen?")) return;
    setBusy(true);
    const result = await deleteAttachment(id);
    setBusy(false);
    if (result.ok) await refresh();
    else toast.error("Verwijderen mislukt", { description: result.error });
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Bijlagen</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          Uploaden
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onFile(file);
          }}
        />
      </div>

      {items === null ? (
        <p className="text-xs text-muted-foreground">Laden…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nog geen bijlagen.</p>
      ) : (
        <ul className="grid gap-2">
          {items.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center gap-2 rounded-md border p-2"
            >
              {isImage(attachment.mime) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="size-10 shrink-0 rounded object-cover"
                />
              ) : (
                <span className="flex size-10 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                  <Paperclip className="size-4" />
                </span>
              )}
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate text-sm hover:underline"
              >
                {attachment.name}
              </a>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                disabled={busy}
                onClick={() => remove(attachment.id)}
                aria-label="Verwijderen"
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
