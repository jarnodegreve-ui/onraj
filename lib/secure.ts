import { timingSafeEqual } from "crypto";

/**
 * Constant-time vergelijking van twee geheimen — voorkomt timing-aanvallen
 * waarbij een aanvaller het geheim teken voor teken kan afleiden uit de
 * responstijd. Geeft false bij een lengteverschil (zonder vroege exit op inhoud).
 */
export function secureEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
