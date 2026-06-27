/**
 * Micro-haptiek (trilfeedback) voor kerninteracties. iOS Safari ondersteunt de
 * Vibration API niet → daar is dit een veilige no-op. Op Android/Chrome voel je
 * korte trilpatronen. Feature-detected en in try/catch: nooit een fout, nooit
 * console-ruis.
 */
type Haptic = "light" | "success" | "warning";

const PATTERNS: Record<Haptic, number | number[]> = {
  light: 10, // subtiel tikje
  success: [10, 40, 10], // korte succespuls
  warning: 30, // iets langer voor verwijderen/waarschuwing
};

export function haptic(type: Haptic): void {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(PATTERNS[type]);
  } catch {
    // Stil: vibrate kan falen (uitgeschakeld of niet ondersteund).
  }
}
