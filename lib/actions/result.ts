/** Resultaat van een Server Action — leesbaar afhandelbaar in de client. */
export type ActionResult = { ok: true } | { ok: false; error: string };
