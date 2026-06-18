"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { monthLabel, shiftMonth } from "@/lib/month";

export function MonthSelector({
  month,
  onChange,
}: {
  month: string;
  onChange: (month: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border bg-card p-0.5">
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={() => onChange(shiftMonth(month, -1))}
        aria-label="Vorige maand"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-28 text-center text-sm font-medium capitalize">
        {monthLabel(month)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={() => onChange(shiftMonth(month, 1))}
        aria-label="Volgende maand"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
