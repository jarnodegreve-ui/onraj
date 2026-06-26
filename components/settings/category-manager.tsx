"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  ListTodo,
  NotebookPen,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCategory,
  deleteCategory,
  reorderCategories,
  updateCategory,
} from "@/lib/actions/categories";
import type { Category, CategoryScope } from "@/lib/types";
import { cn } from "@/lib/utils";

// Vaste kleurkeuzes — warm huisstijlpalet rond denim.
const PALETTE = [
  "#3d68be", // denim
  "#be5b3c", // terracotta
  "#c98a3d", // warme amber
  "#5b8c5a", // salie-groen
  "#4f9e8f", // teal
  "#c0566b", // rozerood
  "#7a6cae", // violet
  "#b5618a", // mauve
  "#6b7280", // leigrijs
  "#2c3346", // inkt-slate
];

export function CategoryManager({
  scope,
  title,
  accent,
  categories,
}: {
  scope: CategoryScope;
  title: string;
  accent: string;
  categories: Category[];
}) {
  // Icoon hoort bij de scope — binnen de client-component gekozen, zodat we geen
  // (niet-serialiseerbare) component-functie over de server→client-grens geven.
  const Icon = scope === "task" ? ListTodo : NotebookPen;
  const router = useRouter();
  const [items, setItems] = useState(categories);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [, startTransition] = useTransition();

  // Synchroniseer de lokale lijst zodra de server nieuwe data levert (na een
  // refresh bij toevoegen/bewerken/wissen) — afgeleid tijdens render i.p.v. in
  // een effect, zodat optimistisch verslepen behouden blijft.
  const [prevCategories, setPrevCategories] = useState(categories);
  if (prevCategories !== categories) {
    setPrevCategories(categories);
    setItems(categories);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setDialogOpen(true);
  }

  function remove(category: Category) {
    if (
      !window.confirm(
        `Categorie "${category.name}" verwijderen? Items met deze categorie worden categorieloos.`,
      )
    )
      return;
    startTransition(async () => {
      const result = await deleteCategory(category.id);
      if (result.ok) {
        toast.success("Categorie verwijderd");
        router.refresh();
      } else {
        toast.error("Verwijderen mislukt", { description: result.error });
      }
    });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = items.map((category) => category.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);
    void reorderCategories(
      scope,
      reordered.map((category) => category.id),
    ).then((result) => {
      if (!result.ok) {
        toast.error("Volgorde opslaan mislukt", { description: result.error });
      }
    });
  }

  return (
    <Card>
      <div className="flex items-center gap-3 px-(--card-spacing)">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${accent}1a`, color: accent }}
        >
          <Icon className="size-5" />
        </div>
        <h3 className="flex-1 font-heading text-base font-medium">{title}</h3>
        <Button size="sm" variant="outline" onClick={openNew}>
          <Plus className="size-4" /> Toevoegen
        </Button>
      </div>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nog geen categorieën. Voeg er een toe.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={items.map((category) => category.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="divide-y">
                {items.map((category) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    onEdit={() => openEdit(category)}
                    onDelete={() => remove(category)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>

      <CategoryDialog
        key={editing?.id ?? "nieuw"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        scope={scope}
        category={editing}
        onSaved={() => router.refresh()}
      />
    </Card>
  );
}

function CategoryRow({
  category,
  onEdit,
  onDelete,
}: {
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2.5 py-2.5",
        isDragging && "relative z-10 opacity-80",
      )}
    >
      <button
        type="button"
        className="-ml-1 cursor-grab touch-none text-muted-foreground/60 hover:text-foreground"
        aria-label="Versleep categorie"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      {category.color ? (
        <span
          className="size-3.5 shrink-0 rounded-full"
          style={{ backgroundColor: category.color }}
        />
      ) : (
        <span className="size-3.5 shrink-0 rounded-full border border-muted-foreground/40" />
      )}
      <span className="min-w-0 flex-1 truncate text-sm">{category.name}</span>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={onEdit}
        aria-label="Bewerken"
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
        aria-label="Verwijderen"
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
}

function CategoryDialog({
  open,
  onOpenChange,
  scope,
  category,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: CategoryScope;
  category: Category | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [color, setColor] = useState<string | null>(category?.color ?? null);
  const [pending, startTransition] = useTransition();

  function save() {
    if (!name.trim()) {
      toast.error("Geef een naam.");
      return;
    }
    startTransition(async () => {
      const result = category
        ? await updateCategory(category.id, { name: name.trim(), color })
        : await createCategory({ scope, name: name.trim(), color });
      if (result.ok) {
        toast.success(category ? "Categorie bijgewerkt" : "Categorie toegevoegd");
        onSaved();
        onOpenChange(false);
      } else {
        toast.error("Opslaan mislukt", { description: result.error });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {category ? "Categorie bewerken" : "Nieuwe categorie"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="cat-name">Naam</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Bv. Werk, Privé…"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") save();
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label>Kleur</Label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setColor(null)}
                aria-label="Geen kleur"
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border-2",
                  color === null ? "border-foreground" : "border-transparent",
                )}
              >
                <span className="size-5 rounded-full border border-muted-foreground/40" />
              </button>
              {PALETTE.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => setColor(swatch)}
                  aria-label={`Kleur ${swatch}`}
                  className={cn(
                    "size-7 rounded-full border-2",
                    color === swatch ? "border-foreground" : "border-transparent",
                  )}
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Annuleren
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending ? "Opslaan…" : "Opslaan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
