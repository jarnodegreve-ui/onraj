"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ListTodo,
  NotebookPen,
  Repeat,
  Search,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  loadSearchIndex,
  type SearchItem,
  type SearchType,
} from "@/lib/actions/search";

const TYPE_META: Record<SearchType, { label: string; icon: LucideIcon }> = {
  taak: { label: "Taken", icon: ListTodo },
  notitie: { label: "Notities", icon: NotebookPen },
  transactie: { label: "Transacties", icon: Wallet },
  belegging: { label: "Beleggingen", icon: TrendingUp },
  abonnement: { label: "Abonnementen", icon: Repeat },
};

const TYPE_ORDER: SearchType[] = [
  "taak",
  "notitie",
  "transactie",
  "belegging",
  "abonnement",
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SearchItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  const ensureIndex = useCallback(async () => {
    if (items !== null || loading) return;
    setLoading(true);
    try {
      setItems(await loadSearchIndex());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [items, loading]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
        void ensureIndex();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [ensureIndex]);

  function openPalette() {
    setOpen(true);
    void ensureIndex();
  }

  function handleSelect(href: string) {
    setOpen(false);
    router.push(href);
  }

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    items: (items ?? []).filter((item) => item.type === type),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      <button
        type="button"
        onClick={openPalette}
        aria-label="Zoeken (⌘K)"
        className="flex h-8 items-center gap-2 rounded-md border bg-background px-2.5 text-sm text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <Search className="size-4" />
        <span className="hidden md:inline">Zoeken…</span>
        <kbd className="ml-1 hidden rounded border bg-muted px-1 font-mono text-[10px] md:inline">
          ⌘K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) void ensureIndex();
        }}
        title="Snelzoeken"
        description="Zoek in taken, notities, transacties, beleggingen en abonnementen."
      >
        <Command>
          <CommandInput placeholder="Zoek in alles…" />
          <CommandList>
            <CommandEmpty>
              {loading ? "Laden…" : "Niets gevonden."}
            </CommandEmpty>
          {grouped.map((group) => {
            const Icon = TYPE_META[group.type].icon;
            return (
              <CommandGroup
                key={group.type}
                heading={TYPE_META[group.type].label}
              >
                {group.items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.label} ${item.sublabel}`}
                    onSelect={() => handleSelect(item.href)}
                  >
                    <Icon className="text-muted-foreground" />
                    <span className="truncate">{item.label}</span>
                    {item.sublabel && (
                      <span className="ml-auto truncate pl-2 text-xs text-muted-foreground">
                        {item.sublabel}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
