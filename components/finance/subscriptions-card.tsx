"use client";

import { useState, useTransition } from "react";
import { MoreVertical, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { SubscriptionEditor } from "@/components/finance/subscription-editor";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteSubscription } from "@/lib/actions/subscriptions";
import { formatDate, formatEuro } from "@/lib/format";
import { monthlyAmount, subscriptionTotals } from "@/lib/subscriptions";
import type { Subscription } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SubscriptionsCard({
  subscriptions,
}: {
  subscriptions: Subscription[];
}) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);

  const totals = subscriptionTotals(subscriptions);

  function openNew() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(subscription: Subscription) {
    setEditing(subscription);
    setEditorOpen(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Repeat className="size-4 text-muted-foreground" /> Abonnementen
        </CardTitle>
        <CardAction>
          <Button variant="outline" size="sm" onClick={openNew}>
            <Plus className="size-4" /> Abonnement
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {subscriptions.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Nog geen abonnementen — voeg je vaste diensten toe om te zien wat ze
            samen per maand kosten.
          </p>
        ) : (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Per maand</p>
                <p className="font-mono text-2xl font-semibold tabular-nums">
                  {formatEuro(totals.perMonth)}
                </p>
              </div>
              <p className="text-sm tabular-nums text-muted-foreground">
                {formatEuro(totals.perYear)} / jaar
              </p>
            </div>

            <ul className="divide-y">
              {subscriptions.map((sub) => (
                <li
                  key={sub.id}
                  className={cn(
                    "flex items-center gap-3 py-2.5",
                    !sub.active && "opacity-50",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {sub.name}
                      {!sub.active && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          gepauzeerd
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {sub.category ? `${sub.category} · ` : ""}
                      {sub.nextRenewal
                        ? `volgende: ${formatDate(sub.nextRenewal)}`
                        : sub.cycle}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm font-medium tabular-nums">
                      {formatEuro(sub.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sub.cycle === "jaarlijks"
                        ? `≈ ${formatEuro(monthlyAmount(sub))}/mnd`
                        : "/ maand"}
                    </p>
                  </div>
                  <SubMenu subscription={sub} onEdit={openEdit} />
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>

      <SubscriptionEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        subscription={editing}
      />
    </Card>
  );
}

function SubMenu({
  subscription,
  onEdit,
}: {
  subscription: Subscription;
  onEdit: (subscription: Subscription) => void;
}) {
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!window.confirm("Dit abonnement verwijderen?")) return;
    startTransition(async () => {
      const result = await deleteSubscription(subscription.id);
      if (result.ok) toast.success("Abonnement verwijderd");
      else toast.error("Verwijderen mislukt", { description: result.error });
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-6 shrink-0"
            aria-label="Acties"
            disabled={pending}
          >
            <MoreVertical className="size-3.5" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(subscription)}>
          <Pencil />
          Bewerken
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={remove}>
          <Trash2 />
          Verwijderen
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
