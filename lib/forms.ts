import type { KeyboardEvent } from "react";

/**
 * ⌘/Ctrl+Enter → opslaan, overal in een formulier. Hang de handler aan de
 * container; zo bevestig je zonder met de muis naar de opslaan-knop te reiken.
 * Plain Enter blijft vrij (bv. voor tag-invoer of een nieuwe regel).
 */
export function submitOnMetaEnter(onSubmit: () => void) {
  return (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      onSubmit();
    }
  };
}
