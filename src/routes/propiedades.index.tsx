import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Grid3x3, List, X } from "lucide-react";
import { PROPERTIES, ZONES, PROPERTY_TYPES, formatGTQ, type Operation, type Property } from "@/lib/properties";
import { PropertyCard } from "@/components/property-card";
import { fetchPublishedProperties } from "@/lib/properties-db";

export const Route = createFileRoute("/propiedades/")({
  validateSearch: (s: Record<string, unknown>) => ({
    zone: (s.zone as string) || "",
    type: (s.type as string) || "",
    price: (s.price as string) || "",
    op: ((s.op as string) || "") as Operation | "",
  }),
  head: () => ({
    meta: [
      { title: "Propiedades — ALTUM GROUP" },
      { name: "description", content: "Catálogo de propiedades de lujo en Guatemala. Filtra por zona, tipo y precio." },
      { property: "og:title", content: "Propiedades — ALTUM GROUP" },
      { property: "og:url", content: "/propiedades" },
    ],
    links: [{ rel: "canonical", href: "/propiedades" }],
  }),
  component: PropertiesPage,
});

function PropertiesPage() {
  const initial = Route.useSearch();
  const [zones, setZones] = useState<string[]>(initial.zone ? [initial.zone] : []);
  const [types, setTypes] = useState<string[]>(initial.type ? [initial.type] : []);
  const [maxPrice, setMaxPrice] = useState<number>(initial.price ? Number(initial.price) : 6000000);
  const [minBeds, setMinBeds] = useState(0);
  const [minBaths, setMinBaths] = useState(0);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<"recent" | "price-asc" | "price-desc">("recent");

  const [dbProps, setDbProps] = useState<Property[] | null>(null);
  useEffect(() => { fetchPublishedProperties().then(setDbProps).catch(() => setDbProps([])); }, []);
  const source = dbProps && dbProps.length > 0 ? dbProps : (dbProps === null ? PROPERTIES : PROPERTIES);

  const filtered = useMemo(() => {
    let r = source.filter((p) => {
      if (initial.op && p.operation !== initial.op) return false;
      if (zones.length && !zones.includes(p.zone)) return false;
      if (types.length && !types.includes(p.type)) return false;
      if (p.price > maxPrice) return false;
      if (p.beds < minBeds) return false;
      if (p.baths < minBaths) return false;
      return true;
    });
    if (sort === "price-asc") r = [...r].sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") r = [...r].sort((a, b) => b.price - a.price);
    return r;
  }, [zones, types, maxPrice, minBeds, minBaths, sort, initial.op, source]);

  const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) =>
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  const clear = () => { setZones([]); setTypes([]); setMaxPrice(6000000); setMinBeds(0); setMinBaths(0); };

  return (
    <div className="container-altum py-12">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.25em] text-secondary font-semibold mb-2">Catálogo</p>
        <h1 className="font-display text-4xl md:text-5xl text-primary">Propiedades disponibles</h1>
        <p className="text-muted-foreground mt-2">{filtered.length} propiedades encontradas</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        {/* FILTERS */}
        <aside className="bg-muted p-6 rounded-sm border border-border h-fit lg:sticky lg:top-24">
          <h2 className="font-display font-semibold text-primary mb-5 text-sm uppercase tracking-wider">Filtros</h2>

          <FilterGroup label="Zona">
            {ZONES.map((z) => (
              <label key={z} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                <input type="checkbox" checked={zones.includes(z)} onChange={() => toggle(zones, setZones, z)} className="accent-[--secondary]" />
                <span className="text-primary/85">{z}</span>
              </label>
            ))}
          </FilterGroup>

          <FilterGroup label="Tipo">
            {PROPERTY_TYPES.map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                <input type="checkbox" checked={types.includes(t)} onChange={() => toggle(types, setTypes, t)} className="accent-[--secondary]" />
                <span className="text-primary/85">{t}</span>
              </label>
            ))}
          </FilterGroup>

          <FilterGroup label={`Precio máximo: ${formatGTQ(maxPrice)}`}>
            <input
              type="range"
              min={200000}
              max={6000000}
              step={50000}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-[--secondary]"
            />
          </FilterGroup>

          <FilterGroup label="Habitaciones (mín)">
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4].map((n) => (
                <button key={n} onClick={() => setMinBeds(n)} className={`flex-1 py-1.5 text-xs rounded-sm border ${minBeds === n ? "bg-secondary text-primary border-secondary" : "border-border text-primary/70"}`}>
                  {n === 0 ? "Cualquier" : `${n}+`}
                </button>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup label="Baños (mín)">
            <div className="flex gap-2">
              {[0, 1, 2, 3].map((n) => (
                <button key={n} onClick={() => setMinBaths(n)} className={`flex-1 py-1.5 text-xs rounded-sm border ${minBaths === n ? "bg-secondary text-primary border-secondary" : "border-border text-primary/70"}`}>
                  {n === 0 ? "Cualquier" : `${n}+`}
                </button>
              ))}
            </div>
          </FilterGroup>

          <button onClick={clear} className="mt-2 inline-flex items-center gap-1 text-sm text-destructive hover:underline">
            <X size={14} /> Limpiar filtros
          </button>
        </aside>

        {/* RESULTS */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <button onClick={() => setView("grid")} className={`p-2 rounded-sm border ${view === "grid" ? "border-secondary bg-secondary/20 text-primary" : "border-border text-primary/60"}`} aria-label="Vista grid">
                <Grid3x3 size={16} />
              </button>
              <button onClick={() => setView("list")} className={`p-2 rounded-sm border ${view === "list" ? "border-secondary bg-secondary/20 text-primary" : "border-border text-primary/60"}`} aria-label="Vista lista">
                <List size={16} />
              </button>
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-10 px-3 text-sm border border-border rounded-sm bg-background">
              <option value="recent">Más recientes</option>
              <option value="price-asc">Mejor precio</option>
              <option value="price-desc">Mayor precio</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="py-24 text-center text-muted-foreground">No hay propiedades que coincidan con tus filtros.</div>
          ) : view === "grid" ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p) => <PropertyCard key={p.id} p={p} />)}
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((p) => (
                <Link key={p.id} to="/propiedades/$id" params={{ id: p.id }} className="flex gap-4 bg-card border border-border rounded-sm overflow-hidden hover:shadow-card transition">
                  <img src={p.image} alt={p.title} loading="lazy" width={400} height={300} className="w-48 h-36 object-cover" />
                  <div className="flex-1 p-4">
                    <p className="text-xl price-text">{formatGTQ(p.price)}{p.operation === "renta" && <span className="text-xs text-muted-foreground font-normal">/mes</span>}</p>
                    <h3 className="font-display font-semibold text-primary">{p.title}</h3>
                    <p className="text-sm text-muted-foreground">{p.zone}</p>
                    <p className="text-xs text-primary/70 mt-2">{p.beds > 0 && `${p.beds} hab · `}{p.baths > 0 && `${p.baths} baños · `}{p.area} m²</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 pb-5 border-b border-border last:border-0">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">{label}</p>
      {children}
    </div>
  );
}
