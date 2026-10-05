import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Users, Home, TrendingUp, CircleDollarSign, AlertCircle, FileText, Target } from "lucide-react";
import { money } from "@/lib/crm";

export const Route = createFileRoute("/_vendedor/vendedores/metricas")({
  head: () => ({ meta: [{ title: "Métricas — ALTUM GROUP" }, { name: "robots", content: "noindex" }] }),
  component: Metricas,
});

interface Metrics {
  es_admin: boolean;
  leads: {
    total: number;
    calientes: number;
    tibios: number;
    frios: number;
    nuevos_semana: number;
    seguimientos_vencidos: number;
    de_whatsapp: number;
    de_web: number;
    de_web_chat: number;
    de_meta: number;
    manuales: number;
    otros: number;
  };
  propiedades: {
    total: number;
    publicadas: number;
    borradores: number;
    contenido_pendiente: number;
    contenido_generado: number;
  };
  pipeline: { total: number; abiertos: number; ganados: number; perdidos: number };
  comisiones: { total_potencial: number };
  contenido: { por_aprobar: number };
}

type DealMetric = {
  id: string;
  status: string;
  currency: string | null;
  commission_advisor: number | null;
  commission_captured_advisor: number | null;
  commission_closing_advisor: number | null;
  assigned_to_user_id: string | null;
  captured_by_user_id: string | null;
  closed_by_user_id: string | null;
  deal_stages?: { name: string; position: number } | null;
};

type StageCount = { name: string; position: number; count: number };
type CurrencyTotals = Record<string, number>;

const db = supabase as any;

function addCurrency(total: CurrencyTotals, currency: string | null | undefined, amount: number | null | undefined) {
  const key = currency === "USD" ? "USD" : "GTQ";
  total[key] = (total[key] || 0) + Number(amount || 0);
  return total;
}

function formatCurrencyTotals(values: CurrencyTotals) {
  const entries = Object.entries(values).filter(([, value]) => Math.abs(value) > 0.0001);
  if (!entries.length) return <span>{money(0, "GTQ")}</span>;
  return (
    <span className="flex flex-col gap-0.5">
      {entries.map(([currency, value]) => (
        <span key={currency}>{money(value, currency)}</span>
      ))}
    </span>
  );
}

function advisorShareForUser(deal: DealMetric, userId: string | undefined, isAdmin: boolean) {
  if (isAdmin) return Number(deal.commission_advisor || 0);
  if (!userId) return 0;

  const captured = deal.captured_by_user_id;
  const closed = deal.closed_by_user_id;
  const shared = Boolean(captured && closed && captured !== closed);

  if (shared && captured === userId) return Number(deal.commission_captured_advisor || 0);
  if (shared && closed === userId) return Number(deal.commission_closing_advisor || 0);
  if (captured === userId || closed === userId || deal.assigned_to_user_id === userId) return Number(deal.commission_advisor || 0);
  return 0;
}

function Metricas() {
  const { user, isAdmin } = useAuth();
  const [m, setM] = useState<Metrics | null>(null);
  const [deals, setDeals] = useState<DealMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  async function load() {
    if (!user) return;
    setLoading(true);

    let dealsQuery = db
      .from("deals")
      .select("id,status,currency,commission_advisor,commission_captured_advisor,commission_closing_advisor,assigned_to_user_id,captured_by_user_id,closed_by_user_id,deal_stages(name,position)")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (!isAdmin) {
      dealsQuery = dealsQuery.or(`assigned_to_user_id.eq.${user.id},captured_by_user_id.eq.${user.id},closed_by_user_id.eq.${user.id}`);
    }

    const [metricsResult, dealsResult] = await Promise.all([
      (supabase.rpc as any)("get_dashboard_metrics"),
      dealsQuery,
    ]);

    if (metricsResult.error) toast.error(metricsResult.error.message);
    if (dealsResult.error) toast.error("CRM: " + dealsResult.error.message);

    setM((metricsResult.data as Metrics) ?? null);
    setDeals((dealsResult.data ?? []) as DealMetric[]);
    setLoading(false);
  }

  const performance = useMemo(() => {
    const won = deals.filter((deal) => deal.status === "ganado");
    const open = deals.filter((deal) => deal.status === "abierto");
    const lost = deals.filter((deal) => deal.status === "perdido");
    const earned: CurrencyTotals = {};

    won.forEach((deal) => addCurrency(earned, deal.currency, advisorShareForUser(deal, user?.id, isAdmin)));

    const stageMap = new Map<string, StageCount>();
    [...open, ...won].forEach((deal) => {
      const name = deal.deal_stages?.name || (deal.status === "ganado" ? "Cierre" : "Sin etapa");
      const position = Number(deal.deal_stages?.position ?? 999);
      const current = stageMap.get(name) ?? { name, position, count: 0 };
      current.count += 1;
      stageMap.set(name, current);
    });

    return {
      won: won.length,
      open: open.length,
      lost: lost.length,
      earned,
      stages: Array.from(stageMap.values()).sort((a, b) => a.position - b.position),
    };
  }, [deals, user?.id, isAdmin]);

  const num = (n: number) => (n ?? 0).toLocaleString("es-GT");

  if (loading) return <div className="container-altum py-12"><p className="text-center text-muted-foreground py-12">Cargando métricas…</p></div>;
  if (!m) return <div className="container-altum py-12"><p className="text-center text-muted-foreground py-12">No se pudieron cargar las métricas.</p></div>;

  const bar = (label: string, value: number, total: number, color: string) => {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-semibold text-primary">{value}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className={"h-full rounded-full " + color} style={{ width: pct + "%" }} />
        </div>
      </div>
    );
  };

  const maxStage = Math.max(...performance.stages.map((stage) => stage.count), 1);

  return (
    <div className="container-altum py-12">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-secondary font-semibold">Portal Vendedor</p>
        <h1 className="font-display text-3xl text-primary">Dashboard de Métricas</h1>
        <p className="text-sm text-muted-foreground mt-1">{m.es_admin ? "Vista de toda la empresa" : "Tus métricas personales"}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {m.leads.seguimientos_vencidos > 0 && (
          <div className="rounded-sm border border-red-300 bg-red-50 p-4 flex items-center gap-3">
            <AlertCircle className="text-red-600 shrink-0" size={20} />
            <div>
              <p className="text-sm font-semibold text-red-900">{m.leads.seguimientos_vencidos} seguimiento(s) vencido(s)</p>
              <Link to="/vendedores/crm" className="text-xs text-red-700 underline">Ir al CRM</Link>
            </div>
          </div>
        )}
        {m.contenido.por_aprobar > 0 && (
          <div className="rounded-sm border border-amber-300 bg-amber-50 p-4 flex items-center gap-3">
            <FileText className="text-amber-600 shrink-0" size={20} />
            <div>
              <p className="text-sm font-semibold text-amber-900">{m.contenido.por_aprobar} contenido(s) por aprobar</p>
              <Link to="/vendedores/aprobacion" className="text-xs text-amber-700 underline">Ir a aprobación</Link>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <MetricCard icon={<Users size={22} />} label="Leads totales" value={num(m.leads.total)} hint={`${m.leads.nuevos_semana} nuevos esta semana`} />
        <MetricCard icon={<Home size={22} />} label="Propiedades disponibles" value={num(m.propiedades.publicadas)} hint={`${m.propiedades.total} registradas en total`} />
        <MetricCard icon={<Target size={22} />} label="Oportunidades activas" value={num(performance.open)} hint="En el embudo comercial" />
        <MetricCard icon={<TrendingUp size={22} />} label="Cierres ganados" value={num(performance.won)} hint="Solo negocios confirmados" />
        <MetricCard icon={<CircleDollarSign size={22} />} label={m.es_admin ? "Comisión asesores generada" : "Comisión ganada"} value={formatCurrencyTotals(performance.earned)} hint="Solo negocios ganados" />
      </div>

      <div className="bg-card border border-border rounded-sm p-5 mb-8">
        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-wider text-secondary font-semibold">Embudo comercial actual</p>
            <p className="text-xs text-muted-foreground mt-1">Oportunidades abiertas más cierres confirmados, ordenadas por etapa.</p>
          </div>
          <Link to="/vendedores/crm" className="text-xs font-semibold text-primary underline underline-offset-4">Ver CRM</Link>
        </div>

        {performance.stages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay oportunidades en el embudo.</p>
        ) : (
          <div className="grid gap-3">
            {performance.stages.map((stage) => {
              const pct = Math.max(4, Math.round((stage.count / maxStage) * 100));
              return (
                <div key={stage.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{stage.name}</span>
                    <span className="font-semibold text-primary">{stage.count}</span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-secondary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="bg-card border border-border rounded-sm p-5">
          <p className="text-xs uppercase tracking-wider text-secondary font-semibold mb-4">Leads por temperatura</p>
          <div className="space-y-3">
            {bar("🔥 Calientes", m.leads.calientes, m.leads.total, "bg-red-500")}
            {bar("🌤 Tibios", m.leads.tibios, m.leads.total, "bg-amber-500")}
            {bar("❄️ Fríos", m.leads.frios, m.leads.total, "bg-blue-400")}
          </div>
        </div>

        <div className="bg-card border border-border rounded-sm p-5">
          <p className="text-xs uppercase tracking-wider text-secondary font-semibold mb-4">Leads por canal</p>
          <div className="space-y-3">
            {bar("WhatsApp", m.leads.de_whatsapp, m.leads.total, "bg-green-500")}
            {bar("Web / Chat", m.leads.de_web, m.leads.total, "bg-primary")}
            {bar("Meta", m.leads.de_meta, m.leads.total, "bg-blue-500")}
            {bar("Manual", m.leads.manuales, m.leads.total, "bg-secondary")}
            {m.leads.otros > 0 && bar("Otros", m.leads.otros, m.leads.total, "bg-slate-400")}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-sm p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Contenido pendiente</p>
          <p className="font-display text-3xl text-primary mt-1">{num(m.propiedades.contenido_pendiente)}</p>
        </div>
        <div className="bg-card border border-border rounded-sm p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Contenido generado</p>
          <p className="font-display text-3xl text-primary mt-1">{num(m.propiedades.contenido_generado)}</p>
        </div>
        <div className="bg-card border border-border rounded-sm p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Por aprobar</p>
          <p className="font-display text-3xl text-primary mt-1">{num(m.contenido.por_aprobar)}</p>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, hint }: { icon: ReactNode; label: string; value: ReactNode; hint: string }) {
  return (
    <div className="bg-card border border-border rounded-sm p-5">
      <div className="text-secondary mb-2">{icon}</div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="font-display text-2xl text-primary mt-1">{value}</div>
      <p className="text-xs text-muted-foreground mt-1">{hint}</p>
    </div>
  );
}
