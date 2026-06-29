import type { Subscription } from "@/lib/types";

/** Maandbedrag van één abonnement (jaarlijks → gedeeld door 12). */
export function monthlyAmount(sub: Subscription): number {
  return sub.cycle === "jaarlijks" ? sub.amount / 12 : sub.amount;
}

export interface SubscriptionTotals {
  perMonth: number;
  perYear: number;
  activeCount: number;
}

/** Totalen over de actieve abonnementen (gepauzeerde tellen niet mee). */
export function subscriptionTotals(subs: Subscription[]): SubscriptionTotals {
  let perMonth = 0;
  let activeCount = 0;
  for (const sub of subs) {
    if (!sub.active) continue;
    perMonth += monthlyAmount(sub);
    activeCount += 1;
  }
  return {
    perMonth: Math.round(perMonth * 100) / 100,
    perYear: Math.round(perMonth * 12 * 100) / 100,
    activeCount,
  };
}
