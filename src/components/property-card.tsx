import { Link } from "@tanstack/react-router";
import { Bath, BedDouble, MapPin, Maximize } from "lucide-react";
import { type Property, formatGTQ } from "@/lib/properties";

export function PropertyCard({ p }: { p: Property }) {
  return (
    <article className="group bg-card rounded-sm overflow-hidden border border-border hover:shadow-elegant transition-all duration-300">
      <Link to="/propiedades/$id" params={{ id: p.id }} className="block relative aspect-[4/3] overflow-hidden">
        <img
          src={p.image}
          alt={p.title}
          loading="lazy"
          width={1024}
          height={768}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {p.badge && (
          <span className="absolute top-3 left-3 badge-altum">{p.badge}</span>
        )}
        {p.operation === "renta" && (
          <span className="absolute top-3 right-3 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground rounded-sm">
            Renta
          </span>
        )}
      </Link>
      <div className="p-5">
        <p className="text-2xl price-text">
          {formatGTQ(p.price)}
          {p.operation === "renta" && <span className="text-xs text-muted-foreground font-normal">/mes</span>}
        </p>
        <h3 className="mt-1 font-display font-semibold text-base text-primary line-clamp-1">{p.title}</h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin size={14} /> {p.zone}
        </p>
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-primary/80">
          {p.beds > 0 && <span className="flex items-center gap-1"><BedDouble size={14} /> {p.beds}</span>}
          {p.baths > 0 && <span className="flex items-center gap-1"><Bath size={14} /> {p.baths}</span>}
          <span className="flex items-center gap-1"><Maximize size={14} /> {p.area} m²</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            to="/propiedades/$id"
            params={{ id: p.id }}
            className="text-center text-xs font-semibold uppercase tracking-wider py-2.5 border border-secondary text-primary rounded-sm hover:bg-secondary/20 transition-colors"
          >
            Ver detalles
          </Link>
          <a
            href="https://wa.me/50220000000"
            target="_blank"
            rel="noreferrer"
            className="text-center text-xs font-semibold uppercase tracking-wider py-2.5 bg-secondary text-primary rounded-sm hover:bg-secondary/85 transition-colors"
          >
            Contactar
          </a>
        </div>
      </div>
    </article>
  );
}
