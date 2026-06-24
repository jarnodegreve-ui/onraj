import "server-only";

import Anthropic from "@anthropic-ai/sdk";

// Slimme routering van captures via Claude Haiku — snel en goedkoop. Optioneel:
// zonder ANTHROPIC_API_KEY valt de webhook terug op "alles wordt een taak".
const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
const model = process.env.ANTHROPIC_CLASSIFY_MODEL || "claude-haiku-4-5";

export const classifyConfigured = Boolean(apiKey);

export type CaptureKind = "taak" | "notitie" | "uitgave" | "inkomst";

export interface CaptureRoute {
  kind: CaptureKind;
  title: string;
  amount: number | null;
  category: string | null;
  dueOn: string | null; // YYYY-MM-DD of null
  priority: "laag" | "middel" | "hoog" | null;
}

const TOOL_SCHEMA = {
  type: "object" as const,
  properties: {
    kind: {
      type: "string",
      enum: ["taak", "notitie", "uitgave", "inkomst"],
      description:
        "Type capture. 'uitgave'/'inkomst' enkel bij een echt geldbedrag dat al uitgegeven/ontvangen is. Bij twijfel 'taak'.",
    },
    title: {
      type: "string",
      description:
        "Korte, nette titel/omschrijving zonder datumwoorden en zonder het los vermelde bedrag.",
    },
    amount: {
      type: ["number", "null"],
      description:
        "Bedrag in euro (positief getal) bij uitgave/inkomst, anders null.",
    },
    category: {
      type: ["string", "null"],
      description:
        "Korte Nederlandse categorie (bv. Vervoer, Boodschappen, Horeca, Inkomen, Werk, Privé) of null.",
    },
    due_on: {
      type: ["string", "null"],
      description:
        "Deadline als ISO-datum YYYY-MM-DD, berekend uit relatieve termen t.o.v. vandaag. Geen datum → null.",
    },
    priority: {
      type: ["string", "null"],
      enum: ["laag", "middel", "hoog", null],
      description: "Prioriteit voor een taak, of null.",
    },
  },
  required: ["kind", "title"],
  additionalProperties: false,
};

/**
 * Classificeert een snelle capture (getypt of ingesproken) naar het juiste type
 * met gestructureerde velden. Geforceerde tool-use → betrouwbare JSON. Geeft
 * null terug bij een ontbrekende key of fout, zodat de webhook kan terugvallen.
 */
export async function classifyCapture(
  text: string,
  today: string,
  weekday: string,
): Promise<CaptureRoute | null> {
  if (!apiKey) return null;
  const clean = text.trim();
  if (!clean) return null;

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model,
      max_tokens: 400,
      system:
        `Je sorteert een snelle capture (Nederlands, België) voor een persoonlijke productiviteitsapp naar het juiste type.\n` +
        `Vandaag is ${weekday} ${today} (tijdzone Europe/Brussels).\n` +
        `Regels:\n` +
        `- 'uitgave'/'inkomst' ALLEEN bij een echt geldbedrag dat al uitgegeven of ontvangen is (bv. "40 euro getankt", "loon 2400 ontvangen"). Er moet een bedrag zijn.\n` +
        `- Een herinnering om iets te betalen ("huur betalen vrijdag") is GEEN uitgave maar een 'taak'.\n` +
        `- 'taak' voor iets dat gedaan moet worden, eventueel met deadline (due_on).\n` +
        `- 'notitie' voor een idee of info om te bewaren zonder actie.\n` +
        `- Bij twijfel: 'taak'.\n` +
        `- due_on: bereken de ISO-datum uit "morgen", "vrijdag", "volgende maandag", enz. t.o.v. vandaag.`,
      tools: [
        {
          name: "route_capture",
          description: "Sorteer de capture naar het juiste type met velden.",
          input_schema: TOOL_SCHEMA,
        },
      ],
      tool_choice: { type: "tool", name: "route_capture" },
      messages: [{ role: "user", content: clean }],
    });

    const block = message.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") return null;
    const input = block.input as Record<string, unknown>;

    const kind = input.kind;
    if (
      kind !== "taak" &&
      kind !== "notitie" &&
      kind !== "uitgave" &&
      kind !== "inkomst"
    ) {
      return null;
    }
    const title = typeof input.title === "string" ? input.title.trim() : "";
    if (!title) return null;

    const amountRaw = input.amount;
    const amount =
      typeof amountRaw === "number" &&
      Number.isFinite(amountRaw) &&
      amountRaw > 0
        ? amountRaw
        : null;
    const category =
      typeof input.category === "string" && input.category.trim()
        ? input.category.trim().slice(0, 60)
        : null;
    const dueOn =
      typeof input.due_on === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(input.due_on)
        ? input.due_on
        : null;
    const priority =
      input.priority === "laag" ||
      input.priority === "middel" ||
      input.priority === "hoog"
        ? input.priority
        : null;

    // Veiligheid: een geldtype zonder geldig bedrag is geen transactie → taak.
    if ((kind === "uitgave" || kind === "inkomst") && amount === null) {
      return { kind: "taak", title, amount: null, category, dueOn, priority };
    }

    return { kind, title, amount, category, dueOn, priority };
  } catch (error) {
    console.error("[classify] fout:", error);
    return null;
  }
}
