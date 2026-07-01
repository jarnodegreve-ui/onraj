/** Slanke paginakop: één titel, geen beschrijvingsregel — de enige gebruiker
 *  kent zijn modules. Acties (knoppen/filters) rechts. */
export function PageHeader({
  title,
  children,
}: {
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {children && (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      )}
    </div>
  );
}
