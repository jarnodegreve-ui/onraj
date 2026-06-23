"use server";

import type { TrashType } from "@/lib/data/trash";
import { restoreEvent, purgeEvent } from "./events";
import { restoreNote, purgeNote } from "./notes";
import type { ActionResult } from "./result";
import { restoreTask, purgeTask } from "./tasks";
import { restoreTransaction, purgeTransaction } from "./transactions";

// Zet een item uit de prullenbak terug (dispatcht op type).
export async function restoreTrashItem(
  type: TrashType,
  id: string,
): Promise<ActionResult> {
  switch (type) {
    case "taak":
      return restoreTask(id);
    case "notitie":
      return restoreNote(id);
    case "transactie":
      return restoreTransaction(id);
    case "afspraak":
      return restoreEvent(id);
  }
}

// Verwijdert een item definitief uit de prullenbak (dispatcht op type).
export async function purgeTrashItem(
  type: TrashType,
  id: string,
): Promise<ActionResult> {
  switch (type) {
    case "taak":
      return purgeTask(id);
    case "notitie":
      return purgeNote(id);
    case "transactie":
      return purgeTransaction(id);
    case "afspraak":
      return purgeEvent(id);
  }
}
