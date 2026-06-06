import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, FileSearch, HandCoins, Handshake, Key } from "lucide-react";
import { PropertyCard } from "@/components/property-card";
import { fetchPublishedProperties } from "@/lib/properties-db";
import type { Property } from "@/lib/properties";

export const Route = createFileRoute("/compra")({
  head: () => ({
    meta: [
      { title: "Compra de Propiedades — ALTUM GROUP" },
      { name: "description", content: "Encuentra la casa de tus sueños en Guatemala con asesoría experta de ALTUM GROUP." },
      { property: "og:title", content: "Compra de Propiedades — ALTUM GROUP" },
      { property: "og:url", content: "/compra" },
    ],
    links: [{ rel: "canonical", href: "/compra" }],
  }),
  component: ComprarPage,
});

const STEPS = [
  { icon: FileSearch, title: "Búsqueda guiada", text: "Te ayudamos a encontrar opciones que cumplan tus criterios." },
  { icon: Handshake, title: "Asesoría personalizada", text: "Visitas, análisis de zona y proyecciones de plusvalía." },
  { icon: HandCoins, title: "Negociación inteligente", text: "Trabajamos por las mejores condiciones de compra." },
  { icon: Key, title: "Cierre y entrega", text: "Acompañamiento legal y financiero hasta las llaves." },
];

function ComprarPage() {
  const [props, setProps] = useState<Property[]>([]);
  useEffect(() => { fetchPublishedProperties().then(setProps).catch(() => {}); }, []);
  const venta = props.filter((p) => p.operation === "venta").slice(0, 6);
  return (
    <>
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="container-altum text-center max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-[0.25em] text-secondary font-semibold mb-3">Compra</p>
          <h1 className="font-display text-4xl md:text-6xl">Encuentra la Casa de tus Sueños con ALTUM GROUP</h1>
          <p className="mt-6 text-primary-foreground/85 text-lg">Acompañamiento integral en cada paso del proceso de compra.</p>
        </div>
      </section>

      <section className="py-20">
        <div className="container-altum">
          <h2 className="font-display text-3xl text-primary text-center mb-12">Proceso de compra</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="p-7 bg-muted rounded-sm border-l-4 border-secondary">
                <span className="font-display text-secondary font-bold text-sm">PASO {i + 1}</span>
                <s.icon className="text-primary mt-3 mb-3" size={28} strokeWidth={1.6} />
                <h3 className="font-display font-semibold text-primary">{s.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted">
        <div className="container-altum">
          <div className="flex items-end justify-between mb-10">
            <h2 className="font-display text-3xl text-primary">Propiedades en venta</h2>
            <Link to="/propiedades" search={{ op: "venta" } as never} className="text-sm font-semibold text-primary hover:text-secondary">Ver todas</Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {venta.map((p) => <PropertyCard key={p.id} p={p} />)}
          </div>
          <div className="text-center mt-12">
            <Link to="/propiedades" search={{ op: "venta" } as never} className="inline-flex items-center gap-2 px-8 py-3.5 bg-secondary text-primary font-semibold rounded-sm hover:bg-secondary/85">
              Explorar Propiedades <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
