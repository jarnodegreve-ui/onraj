import { listTransactions } from "@/lib/data/transactions";
import { isFinanceLocked } from "@/lib/finance-lock";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { Transaction } from "@/lib/types";

// CSV-veld: quotes verdubbelen en het veld tussen quotes zetten.
function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function toCsv(transactions: Transaction[]): string {
  const header = [
    "Datum",
    "Richting",
    "Bedrag",
    "Categorie",
    "Omschrijving",
    "Rekening",
  ];
  const rows = transactions.map((tx) =>
    [
      tx.occurredOn,
      tx.direction,
      tx.amount.toFixed(2).replace(".", ","), // Belgische komma
      tx.category,
      tx.description,
      tx.account ?? "",
    ]
      .map((value) => csvField(String(value)))
      .join(";"),
  );
  // BOM (Excel-UTF-8) + puntkomma als scheidingsteken (NL/BE Excel).
  return `﻿${[header.map(csvField).join(";"), ...rows].join("\r\n")}`;
}

/** Exporteert transacties als CSV. ?scope=month|year|all (+ month=YYYY-MM / year=YYYY). */
export async function GET(request: Request) {
  if (!supabaseConfigured) {
    return new Response("Supabase is niet geconfigureerd.", { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Niet aangemeld.", { status: 401 });
  }
  if (await isFinanceLocked()) {
    return new Response("Financiën zijn vergrendeld.", { status: 403 });
  }

  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") ?? "all";
  const month = url.searchParams.get("month") ?? "";
  const year = url.searchParams.get("year") ?? "";

  let transactions = await listTransactions();
  let label = "alles";
  if (scope === "month" && /^\d{4}-\d{2}$/.test(month)) {
    transactions = transactions.filter((tx) => tx.occurredOn.slice(0, 7) === month);
    label = month;
  } else if (scope === "year" && /^\d{4}$/.test(year)) {
    transactions = transactions.filter((tx) => tx.occurredOn.slice(0, 4) === year);
    label = year;
  }
  // Oudste eerst, leesbaar voor een export.
  transactions = [...transactions].sort((a, b) =>
    a.occurredOn.localeCompare(b.occurredOn),
  );

  return new Response(toCsv(transactions), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="onraj-financien-${label}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
