import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CircleDollarSign, RefreshCw, TrendingUp } from "lucide-react";
import { CrmDeal, money } from "@/lib/crm";

export const Route = createFileRoute("/_vendedor/vendedores/comisiones")({
  head: () => ({ meta: [{ title: "Comisiones — ALTUM GROUP" }, { name: "robots", content: "noindex" }] }),
  component: ComisionesPage,
});

function ComisionesPage() {
  const [deals, setDeals] = useState<CrmDeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("deals")
      .select("id,title,status,stage_id,lead_id,property_id,assigned_to_user_id,deal_value,currency,commission_rate,commission_total,advisor_commission_rate,commission_advisor,commission_company,next_activity_at,temperature,created_at,leads(id,full_name,phone,email,source,interest_operation,interest_type,interest_zone,budget_min,budget_max,currency,notes,temperature,status,next_follow_up_at),properties(id,title,zone,price,currency,operation,cover_image),deal_stages(id,name,slug,position,probability,color,is_won,is_lost)")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) toast.error(error.message + ". Revisa si ya aplicaste la migración del CRM.");
    setDeals((data ?? []) as CrmDeal[]);
    setLoading(false);
  }

  const totals = useMemo(() => {
    const open = deals.filter((deal) => deal.status !== "perdido");
    const won = deals.filter((deal) => deal.status === "ganado" || deal.deal_stages?.is_won);
    return {
      open: open.length,
      won: won.length,
      pipeline: open.reduce((sum, deal) => sum + Number(deal.deal_value || 0), 0),
      gross: open.reduce((sum, deal) => sum + Number(deal.commission_total || 0), 0),
      advisor: open.reduce((sum, deal) => sum + Number(deal.commission_advisor || 0), 0),
      company: open.reduce((sum, deal) => sum + Number(deal.commission_company || 0), 0),
      wonAdvisor: won.reduce((sum, deal) => sum + Number(deal.commission_advisor || 0), 0),
    };
  }, [deals]);

  return (
    <div className="container-altum py-10 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-secondary font-semibold">ALTUM CRM</p>
          <h1 className="font-display text-3xl text-primary">Comisiones</h1>
          <p className="text-sm text-muted-foreground mt-1">Pipeline económico, comisión estimada del asesor y comisión ALTUM.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 h-10 px-4 border border-border rounded-sm hover:bg-muted text-sm"><RefreshCw size={16} /> Actualizar</button>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Metric label="Oportunidades abiertas" value={String(totals.open)} />
        <Metric label="Pipeline" value={money(totals.pipeline, "GTQ")} />
        <Metric label="Comisión asesor est." value={money(totals.advisor, "GTQ")} />
        <Metric label="Cerrado asesor" value={money(totals.wonAdvisor, "GTQ")} />
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Metric label="Comisión bruta est." value={money(totals.gross, "GTQ")} />
        <Metric label="Comisión empresa est." value={money(totals.company, "GTQ")} />
        <Metric label="Cierres" value={String(totals.won)} />
      </div>

      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {loading ? <p className="text-center py-16 text-muted-foreground">Cargando comisiones…</p> : deals.length === 0 ? <p className="text-center py-16 text-muted-foreground">Todavía no hay oportunidades registradas.</p> : (
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-4">Oportunidad</th>
                <th className="text-left p-4 hidden md:table-cell">Etapa</th>
                <th className="text-left p-4">Valor</th>
                <th className="text-left p-4">Comisión bruta</th>
                <th className="text-left p-4">Asesor</th>
                <th className="text-left p-4 hidden lg:table-cell">ALTUM</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.id} className="border-t border-border">
                  <td className="p-4">
                    <p className="font-semibold text-primary">{deal.title}</p>
                    <p className="text-xs text-muted-foreground">{deal.leads?.full_name ?? "Sin cliente"} · {deal.properties?.title ?? "Sin propiedad"}</p>
                  </td>
                  <td className="p-4 hidden md:table-cell"><span className="text-xs px-2 py-1 rounded-sm bg-muted text-primary">{deal.deal_stages?.name ?? deal.status}</span></td>
                  <td className="p-4 font-semibold">{money(deal.deal_value, deal.currency ?? "GTQ")}</td>
                  <td className="p-4">{money(deal.commission_total, deal.currency ?? "GTQ")}<p className="text-[11px] text-muted-foreground">{deal.properties?.operation === "renta" ? "1 mes renta" : "5% venta"}</p></td>
                  <td className="p-4 font-semibold text-primary">{money(deal.commission_advisor, deal.currency ?? "GTQ")}<p className="text-[11px] text-muted-foreground">70% asesores</p></td>
                  <td className="p-4 hidden lg:table-cell">{money(deal.commission_company, deal.currency ?? "GTQ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-6 bg-primary text-white rounded-sm p-5 flex items-start gap-3">
        <TrendingUp className="text-secondary shrink-0" />
        <div>
          <p className="font-semibold">Reglas de comisión ALTUM</p>
          <p className="text-sm text-white/80 mt-1">Venta: 5% del precio — 30% ALTUM y 70% asesor (o 35% para quien captó la propiedad + 35% para quien la cierra). Renta: una mensualidad — misma división.</p>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-sm p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-2xl text-primary mt-1 flex items-center gap-2"><CircleDollarSign size={18} className="text-secondary" />{value}</p>
    </div>
  );
}
