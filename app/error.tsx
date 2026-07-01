"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Vangnet voor onverwachte fouten (bv. een DB-hapering tijdens het renderen):
 * nette melding + opnieuw-proberen, i.p.v. de kale Next.js-crashpagina. De
 * root-layout (thema, fonts) blijft gewoon staan.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] onverwachte fout:", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="font-heading text-lg font-semibold">Er ging iets mis</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Waarschijnlijk een tijdelijke hapering. Probeer het opnieuw — als het
        blijft gebeuren, herlaad dan de app.
      </p>
      <Button onClick={reset} variant="outline">
        <RotateCcw className="size-4" /> Opnieuw proberen
      </Button>
    </div>
  );
}
