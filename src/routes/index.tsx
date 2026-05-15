import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Award, Building2, ChevronRight, Search, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import hero from "@/assets/hero-luxury.jpg";
import { PROPERTIES, ZONES, PROPERTY_TYPES, type Property } from "@/lib/properties";
import { PropertyCard } from "@/components/property-card";
import { fetchPublishedProperties } from "@/lib/properties-db";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ALTUM GROUP — Propiedades de Lujo en Guatemala" },
      { name: "description", content: "Encuentra tu propiedad ideal en Guatemala. Casas, apartamentos y terrenos premium con ALTUM GROUP." },
      { property: "og:title", content: "ALTUM GROUP — Propiedades de Lujo en Guatemala" },
      { property: "og:description", content: "Encuentra tu propiedad ideal en Guatemala con ALTUM GROUP." },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: HomePage,
});

const BENEFITS = [
  { icon: Award, title: "Asesores Certificados", text: "Equipo profesional con amplia trayectoria." },
  { icon: ShieldCheck, title: "Transacciones Seguras", text: "Acompañamiento legal y financiero completo." },
  { icon: Sparkles, title: "Catálogo Premium", text: "Propiedades exclusivas en zonas selectas." },
  { icon: TrendingUp, title: "Inversión Inteligente", text: "Análisis de mercado y oportunidades de plusvalía." },
];

const TESTIMONIALS = [
  { name: "María Fernández", text: "Encontramos la casa de nuestros sueños. El proceso fue impecable.", role: "Cliente Compra Zona 14" },
  { name: "Luis Méndez", text: "Excelente asesoría en mi inversión. ALTUM superó mis expectativas.", role: "Inversionista Cayalá" },
  { name: "Ana Castillo", text: "Profesionalismo y elegancia en cada detalle.", role: "Cliente Renta Antigua" },
];

function HomePage() {
  const [dbProps, setDbProps] = useState<Property[]>([]);
  useEffect(() => {
    fetchPublishedProperties().then(setDbProps).catch(() => {});
  }, []);
  const all = dbProps.length > 0 ? dbProps : PROPERTIES;
  const featuredRaw = (dbProps.length > 0 ? dbProps.filter((p: any) => (p as any).featured) : PROPERTIES.filter((p) => p.badge));
  const featured = (featuredRaw.length > 0 ? featuredRaw : all).slice(0, 6);
  const latest = all.slice(0, 5);
  const navigate = useNavigate();
  const [zone, setZone] = useState("");
  const [type, setType] = useState("");
  const [price, setPrice] = useState("");

  return (
    <>
      {/* HERO */}
      <section className="relative h-[88vh] min-h-[620px] flex items-center">
        <img src={hero} alt="" width={1920} height={1080} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/85 via-primary/55 to-secondary/30" />
        <div className="container-altum relative z-10 text-primary-foreground max-w-3xl">
          <span className="inline-block px-3 py-1 text-xs uppercase tracking-[0.25em] bg-secondary text-primary rounded-sm mb-6">
            Inmobiliaria · Inversión · Desarrollo
          </span>
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05]">
            Encuentra tu Propiedad Ideal en Guatemala
          </h1>
          <p className="mt-6 text-lg md:text-xl text-primary-foreground/85 max-w-2xl">
            Descubre residencias, apartamentos y terrenos cuidadosamente seleccionados por nuestros asesores certificados.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/propiedades"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-secondary text-primary font-semibold rounded-sm hover:bg-secondary/85 transition"
            >
              Buscar Ahora <ChevronRight size={18} />
            </Link>
            <Link
              to="/publica"
              className="inline-flex items-center gap-2 px-7 py-3.5 border border-primary-foreground/40 text-primary-foreground font-semibold rounded-sm hover:bg-primary-foreground/10 transition"
            >
              Publica tu Propiedad
            </Link>
          </div>
        </div>
      </section>

      {/* SEARCH */}
      <section className="bg-muted py-10 -mt-20 relative z-20">
        <div className="container-altum">
          <div className="bg-card border border-border shadow-elegant rounded-sm p-6 grid gap-4 md:grid-cols-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">Zona</label>
              <select value={zone} onChange={(e) => setZone(e.target.value)} className="w-full h-11 px-3 border border-border rounded-sm bg-background text-sm focus:outline-none focus:border-secondary">
                <option value="">Todas las zonas</option>
                {ZONES.map((z) => <option key={z}>{z}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">Tipo</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full h-11 px-3 border border-border rounded-sm bg-background text-sm focus:outline-none focus:border-secondary">
                <option value="">Todos</option>
                {PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">Precio máximo</label>
              <select value={price} onChange={(e) => setPrice(e.target.value)} className="w-full h-11 px-3 border border-border rounded-sm bg-background text-sm focus:outline-none focus:border-secondary">
                <option value="">Sin límite</option>
                <option value="500000">Hasta Q 500,000</option>
                <option value="1500000">Hasta Q 1,500,000</option>
                <option value="3000000">Hasta Q 3,000,000</option>
                <option value="5000000">Hasta Q 5,000,000</option>
              </select>
            </div>
            <button
              onClick={() => navigate({ to: "/propiedades", search: { zone, type, price } as never })}
              className="h-11 mt-auto inline-flex items-center justify-center gap-2 bg-secondary text-primary font-semibold rounded-sm hover:bg-secondary/85 transition"
            >
              <Search size={16} /> Buscar
            </button>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="py-24">
        <div className="container-altum">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs uppercase tracking-[0.25em] text-secondary font-semibold mb-3">Por qué ALTUM GROUP</p>
            <h2 className="font-display text-4xl md:text-5xl text-primary">Excelencia en cada detalle</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className="p-7 border-l-4 border-secondary bg-card hover:shadow-card transition-shadow rounded-sm">
                <b.icon className="text-secondary mb-4" size={32} strokeWidth={1.6} />
                <h3 className="font-display font-semibold text-lg text-primary">{b.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section className="py-24 bg-muted">
        <div className="container-altum">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-secondary font-semibold mb-3">Selección ALTUM</p>
              <h2 className="font-display text-4xl md:text-5xl text-primary">Propiedades Destacadas</h2>
            </div>
            <Link to="/propiedades" className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-secondary">
              Ver todas <ChevronRight size={16} />
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => <PropertyCard key={p.id} p={p} />)}
          </div>
        </div>
      </section>

      {/* LATEST */}
      <section className="py-24">
        <div className="container-altum">
          <p className="text-xs uppercase tracking-[0.25em] text-secondary font-semibold mb-3">Recién publicadas</p>
          <h2 className="font-display text-4xl md:text-5xl text-primary mb-12">Últimas Publicaciones</h2>
          <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory -mx-4 px-4">
            {latest.map((p) => (
              <div key={p.id} className="min-w-[280px] sm:min-w-[340px] snap-start">
                <PropertyCard p={p} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 bg-muted">
        <div className="container-altum">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-[0.25em] text-secondary font-semibold mb-3">Testimonios</p>
            <h2 className="font-display text-4xl md:text-5xl text-primary">Confianza de nuestros clientes</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="p-8 bg-card rounded-sm border border-border">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-secondary text-primary font-display font-bold text-xl flex items-center justify-center">
                    {t.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <p className="font-display font-semibold text-primary">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
                <blockquote className="text-primary/80 italic leading-relaxed">"{t.text}"</blockquote>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container-altum text-center">
          <Building2 className="mx-auto text-secondary mb-6" size={40} />
          <h2 className="font-display text-3xl md:text-4xl mb-4">¿Tienes una propiedad para vender o rentar?</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">Publica con ALTUM y alcanza compradores e inquilinos calificados.</p>
          <Link to="/publica" className="inline-flex items-center gap-2 px-8 py-3.5 bg-secondary text-primary font-semibold rounded-sm hover:bg-secondary/85">
            Publica tu Propiedad <ChevronRight size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}
