import { cn } from "@/lib/utils";

/**
 * ONRAJ-wordmark: `ONRAJ●` — Schibsted Grotesk (extrabold, uppercase) met een
 * kleine denim-dot als accent. Schaalt mee met de font-size van className en
 * erft de tekstkleur (text-current), zodat hij op elke drager past.
 */
export function BrandLockup({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-end font-heading leading-none font-extrabold tracking-[-0.02em]",
        className,
      )}
      aria-label="ONRAJ"
    >
      <span aria-hidden>ONRAJ</span>
      <span
        aria-hidden
        className="mb-[0.22em] ml-[0.14em] inline-block size-[0.19em] rounded-full bg-primary"
      />
    </span>
  );
}
