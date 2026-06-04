import { buildMortgageMatrix, DEFAULT_ANNUAL_RATE, fmtGTQ, TERMS_YEARS } from "@/lib/mortgage";
import { Calculator } from "lucide-react";

export function Cotizador({ price }: { price: number }) {
  if (!price || price <= 0) return null;
  const rows = buildMortgageMatrix(price, DEFAULT_ANNUAL_RATE);

  return (
    <section className="mt-16">
      <div className="flex items-center gap-2 mb-2">
        <Calculator size={20} className="text-secondary" />
        <h2 className="font-display text-2xl text-primary">Cotizador</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Estimación referencial al {(DEFAULT_ANNUAL_RATE * 100).toFixed(0)}% anual. Cuotas niveladas, mensuales.
      </p>
      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full text-sm">
          <thead className="bg-primary text-white">
            <tr>
              <th className="text-left p-3 font-display font-semibold">Enganche</th>
              <th className="text-right p-3 font-display font-semibold">Monto enganche</th>
              <th className="text-right p-3 font-display font-semibold">A financiar</th>
              {TERMS_YEARS.map((y) => (
                <th key={y} className="text-right p-3 font-display font-semibold">{y} años</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-secondary/10">
            {rows.map((r) => (
              <tr key={r.downPct} className="border-t border-border">
                <td className="p-3 font-semibold text-primary">{(r.downPct * 100).toFixed(0)}%</td>
                <td className="p-3 text-right">{fmtGTQ(r.down)}</td>
                <td className="p-3 text-right">{fmtGTQ(r.financed)}</td>
                {r.terms.map((t) => (
                  <td key={t.years} className="p-3 text-right font-semibold text-primary">{fmtGTQ(t.monthly)}/mes</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        * Los valores son orientativos. La tasa, plazo y enganche finales dependen de la institución financiera y el perfil del cliente.
      </p>
    </section>
  );
}
