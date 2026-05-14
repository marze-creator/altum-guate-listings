import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Bath, BedDouble, Check, MapPin, Maximize, Star } from "lucide-react";
import { PROPERTIES, formatGTQ } from "@/lib/properties";
import { PropertyCard } from "@/components/property-card";

export const Route = createFileRoute("/propiedades/$id")({
  loader: ({ params }) => {
    const property = PROPERTIES.find((p) => p.id === params.id);
    if (!property) throw notFound();
    return { property };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.property.title} — ALTUM GROUP` },
          { name: "description", content: loaderData.property.description },
          { property: "og:title", content: loaderData.property.title },
          { property: "og:image", content: loaderData.property.image },
        ]
      : [],
  }),
  component: PropertyDetail,
  notFoundComponent: () => (
    <div className="container-altum py-32 text-center">
      <h1 className="font-display text-3xl text-primary">Propiedad no encontrada</h1>
      <Link to="/propiedades" className="mt-4 inline-block text-secondary hover:underline">Ver catálogo</Link>
    </div>
  ),
  errorComponent: () => <div className="container-altum py-32 text-center">Error cargando la propiedad.</div>,
});

function PropertyDetail() {
  const { property: p } = Route.useLoaderData();
  const similar = PROPERTIES.filter((x) => x.id !== p.id && x.type === p.type).slice(0, 3);

  return (
    <div className="container-altum py-10">
      <Link to="/propiedades" className="text-sm text-muted-foreground hover:text-primary">← Volver al catálogo</Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        {/* GALLERY */}
        <div>
          <div className="aspect-[16/10] overflow-hidden rounded-sm bg-muted">
            <img src={p.image} alt={p.title} width={1280} height={800} className="w-full h-full object-cover" />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {[p.image, p.image, p.image, p.image].map((src, i) => (
              <div key={i} className="aspect-[4/3] overflow-hidden rounded-sm border border-border opacity-80 hover:opacity-100 cursor-pointer">
                <img src={src} alt="" loading="lazy" width={400} height={300} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* INFO */}
        <aside className="space-y-6">
          <div>
            {p.badge && <span className="badge-altum mb-3">{p.badge}</span>}
            <h1 className="font-display text-3xl text-primary">{p.title}</h1>
            <p className="mt-2 flex items-center gap-1 text-muted-foreground"><MapPin size={16} className="text-secondary" /> {p.zone}, Guatemala</p>
            <p className="mt-5 text-4xl price-text">
              {formatGTQ(p.price)}
              {p.operation === "renta" && <span className="text-base text-muted-foreground font-normal">/mes</span>}
            </p>
          </div>

          <div className="bg-muted rounded-sm overflow-hidden">
            <Spec label="Habitaciones" value={p.beds || "-"} icon={<BedDouble size={16} />} />
            <Spec label="Baños" value={p.baths || "-"} icon={<Bath size={16} />} />
            <Spec label="Área" value={`${p.area} m²`} icon={<Maximize size={16} />} />
            <Spec label="Tipo" value={p.type} />
            <Spec label="Operación" value={p.operation === "venta" ? "Venta" : "Renta"} />
          </div>

          {/* AGENT */}
          <div className="p-6 bg-card border border-border rounded-sm">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Asesor Certificado ALTUM GROUP</p>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-secondary text-primary font-display font-bold text-lg flex items-center justify-center">
                {p.agent.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div>
                <p className="font-display font-semibold text-primary">{p.agent.name}</p>
                <div className="flex items-center gap-0.5 mt-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} className={i < p.agent.rating ? "fill-secondary text-secondary" : "text-border"} />
                  ))}
                </div>
              </div>
            </div>
            <a href="https://wa.me/50220000000" target="_blank" rel="noreferrer" className="mt-4 block text-center py-3 bg-secondary text-primary font-semibold text-sm uppercase tracking-wider rounded-sm hover:bg-secondary/85">
              Contactar Agente
            </a>
          </div>
        </aside>
      </div>

      {/* DESCRIPTION + AMENITIES */}
      <div className="mt-16 grid gap-12 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl text-primary mb-4">Descripción</h2>
          <p className="text-primary/80 leading-relaxed">{p.description}</p>
        </div>
        <div>
          <h2 className="font-display text-2xl text-primary mb-4">Amenidades</h2>
          <ul className="grid grid-cols-2 gap-3">
            {p.amenities.map((a) => (
              <li key={a} className="flex items-center gap-2 text-sm text-primary/85">
                <Check size={16} className="text-secondary" /> {a}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* MAP */}
      <div className="mt-16">
        <h2 className="font-display text-2xl text-primary mb-4">Ubicación</h2>
        <div className="aspect-[16/7] rounded-sm overflow-hidden border border-border">
          <iframe
            title="Mapa de la propiedad"
            src={`https://www.google.com/maps?q=${p.lat},${p.lng}&z=14&output=embed`}
            className="w-full h-full"
            loading="lazy"
          />
        </div>
      </div>

      {/* SIMILAR */}
      {similar.length > 0 && (
        <div className="mt-20">
          <h2 className="font-display text-2xl text-primary mb-8">Propiedades similares</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((s) => <PropertyCard key={s.id} p={s} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function Spec({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-secondary/30 last:border-0">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">{icon}{label}</span>
      <span className="font-display font-semibold text-primary text-sm">{value}</span>
    </div>
  );
}
