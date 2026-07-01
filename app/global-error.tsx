"use client";

import "./globals.css";

/**
 * Laatste redmiddel: vangt fouten in de root-layout zelf. Moet een eigen
 * <html>/<body> leveren (de layout is dan al gesneuveld); bewust dependency-vrij
 * en donker gestyled zodat hij altijd rendert.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="nl" style={{ backgroundColor: "#141416" }}>
      <body
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          backgroundColor: "#141416",
          color: "#f4f2ee",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <p style={{ fontSize: "1.125rem", fontWeight: 600 }}>
          Er ging iets mis
        </p>
        <p style={{ maxWidth: "24rem", fontSize: "0.875rem", opacity: 0.7 }}>
          De app kon niet laden. Probeer het opnieuw.
        </p>
        <button
          onClick={reset}
          style={{
            borderRadius: "0.5rem",
            border: "1px solid rgba(244,242,238,0.25)",
            background: "transparent",
            color: "inherit",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          Opnieuw proberen
        </button>
      </body>
    </html>
  );
}
