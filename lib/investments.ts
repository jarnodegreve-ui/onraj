import type { Holding, HoldingPrice } from "@/lib/types";

export interface HoldingValue {
  holding: Holding;
  latestPrice: number | null;
  latestDate: string | null; // 'YYYY-MM-DD' van de laatste koers
  value: number; // aantal × laatste koers (0 zonder koers)
  gain: number | null; // waarde − inleg (null zonder inleg of koers)
  gainPct: number | null;
}

/** Laatste koerssnapshot per positie (op recorded_on). */
export function latestPriceByHolding(
  prices: HoldingPrice[],
): Map<string, HoldingPrice> {
  const latest = new Map<string, HoldingPrice>();
  for (const price of prices) {
    const current = latest.get(price.holdingId);
    if (!current || price.recordedOn > current.recordedOn) {
      latest.set(price.holdingId, price);
    }
  }
  return latest;
}

/** Huidige waarde + rendement per positie. */
export function holdingValues(
  holdings: Holding[],
  prices: HoldingPrice[],
): HoldingValue[] {
  const latest = latestPriceByHolding(prices);
  return holdings.map((holding) => {
    const snapshot = latest.get(holding.id) ?? null;
    const latestPrice = snapshot ? snapshot.price : null;
    const value = latestPrice != null ? holding.quantity * latestPrice : 0;
    const gain =
      holding.costBasis != null && latestPrice != null
        ? value - holding.costBasis
        : null;
    const gainPct =
      gain != null && holding.costBasis ? (gain / holding.costBasis) * 100 : null;
    return {
      holding,
      latestPrice,
      latestDate: snapshot?.recordedOn ?? null,
      value,
      gain,
      gainPct,
    };
  });
}

export interface PortfolioTotals {
  value: number; // totale huidige waarde
  costBasis: number; // som van de inleg (enkel posities met inleg)
  gain: number; // waarde − inleg voor die posities
  gainPct: number | null;
}

/** Portefeuille-totalen. Rendement telt enkel posities met een bekende inleg. */
export function portfolioTotals(values: HoldingValue[]): PortfolioTotals {
  let value = 0;
  let costBasis = 0;
  let investedValue = 0;
  for (const item of values) {
    value += item.value;
    if (item.holding.costBasis != null) {
      costBasis += item.holding.costBasis;
      investedValue += item.value;
    }
  }
  const gain = investedValue - costBasis;
  const gainPct = costBasis > 0 ? (gain / costBasis) * 100 : null;
  return {
    value: round2(value),
    costBasis: round2(costBasis),
    gain: round2(gain),
    gainPct,
  };
}

/**
 * Waardeverloop: per datum waarop ergens een koers is ingevoerd, de totale
 * portefeuillewaarde — met de laatst bekende koers per positie op of vóór die
 * datum (carry-forward), zodat een week zonder nieuwe koers niet inzakt.
 */
export function portfolioHistory(
  holdings: Holding[],
  prices: HoldingPrice[],
): { date: string; value: number }[] {
  if (prices.length === 0) return [];

  const dates = [...new Set(prices.map((p) => p.recordedOn))].sort();
  const byHolding = new Map<string, HoldingPrice[]>();
  for (const price of prices) {
    const arr = byHolding.get(price.holdingId);
    if (arr) arr.push(price);
    else byHolding.set(price.holdingId, [price]);
  }
  for (const arr of byHolding.values()) {
    arr.sort((a, b) => a.recordedOn.localeCompare(b.recordedOn));
  }

  return dates.map((date) => {
    let value = 0;
    for (const holding of holdings) {
      const arr = byHolding.get(holding.id);
      if (!arr) continue;
      let price: number | null = null;
      for (const snapshot of arr) {
        if (snapshot.recordedOn <= date) price = snapshot.price;
        else break;
      }
      if (price != null) value += holding.quantity * price;
    }
    return { date, value: round2(value) };
  });
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
