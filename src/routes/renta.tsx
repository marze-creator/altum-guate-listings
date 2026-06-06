import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { PropertyCard } from "@/components/property-card";
import { fetchPublishedProperties } from "@/lib/properties-db";
import type { Property } from "@/lib/properties";

export const Route = createFileRoute("/renta")({
  head: () => ({
    meta: [
      { title: "Renta de Propiedades — ALTUM GROUP" },
      { name: "description", content: "Renta la mejor propiedad en Guatemala con ALTUM GROUP." },
      { property: "og:title", content: "Renta de Propiedades — ALTUM GROUP" },
      { property: "og:url", content: "/renta" },
    ],
    links: [{ rel: "canonical", href: "/renta" }],
  }),
  component: RentaPage,
});

function RentaPage() {
  const [props, setProps] = useState<Property[]>([]);
  useEffect(() => { fetchPublishedProperties().then(setProps).catch(() => {}); }, []);
  const renta = props.filter((p) => p.operation === "renta");
  return (
    <>
      <section className="py-24 bg-secondary/30">
        <div className="container-altum text-center max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-[0.25em] text-primary font-semibold mb-3">Renta</p>
          <h1 className="font-display text-4xl md:text-6xl text-primary">Renta la Mejor Propiedad</h1>
          <p className="mt-6 text-primary/80 text-lg">Apartamentos, casas y locales en las zonas más exclusivas de Guatemala.</p>
        </div>
      </section>

      <section className="py-20">
        <div className="container-altum">
          <div className="grid md:grid-cols-3 gap-6 mb-14">
            {[
              { t: "Contratos transparentes", d: "Cláusulas claras y respaldo legal." },
              { t: "Propiedades verificadas", d: "Cada inmueble pasa por inspección ALTUM." },
              { t: "Asistencia continua", d: "Soporte durante toda la vigencia de tu contrato." },
            ].map((x) => (
              <div key={x.t} className="p-6 border border-border rounded-sm">
                <h3 className="font-display font-semibold text-primary">{x.t}</h3>
                <p className="text-sm text-muted-foreground mt-2">{x.d}</p>
              </div>
            ))}
          </div>

          <h2 className="font-display text-3xl text-primary mb-8">Propiedades en renta</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {renta.map((p) => <PropertyCard key={p.id} p={p} />)}
          </div>

          <div className="text-center mt-12">
            <Link to="/propiedades" search={{ op: "renta" } as never} className="inline-flex items-center gap-2 px-8 py-3.5 bg-secondary text-primary font-semibold rounded-sm hover:bg-secondary/85">
              Ver Propiedades en Renta <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
