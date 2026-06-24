import { cn } from "@/lib/utils";

/**
 * ONRAJ-wordmark (terminal-stijl): `❯ onraj▌` — prompt-chevron (lime) +
 * wordmark in Archivo + knipperende lime cursor. Alles in `em`, dus het hele
 * logo schaalt mee met de font-size van de meegegeven className. De wordmark
 * erft de tekstkleur (text-current), zodat hij past op elke (donkere) drager.
 */
export function BrandLockup({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[0.26em] font-heading leading-none font-bold tracking-[-0.015em]",
        className,
      )}
      aria-label="onraj"
    >
      <span className="text-primary" aria-hidden>
        ❯
      </span>
      <span aria-hidden>onraj</span>
      <span
        aria-hidden
        className="cursor-blink ml-[0.04em] inline-block h-[0.82em] w-[0.16em] bg-primary"
      />
    </span>
  );
}
