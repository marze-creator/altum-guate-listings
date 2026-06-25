import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Users, Home, TrendingUp, CircleDollarSign, AlertCircle, FileText } from "lucide-react";

export const Route = createFileRoute("/_vendedor/vendedores/metricas")({
  head: () => ({ meta: [{ title: "Métricas — ALTUM GROUP" }, { name: "robots", content: "noindex" }] }),
  component: Metricas,
});

interface Metrics {
  es_admin: boolean;
  leads: { total: number; calientes: number; tibios: number; frios: number; nuevos_semana: number; seguimientos_vencidos: number; de_whatsapp: number; de_web: number; manuales: number };
  propiedades: { total: number; publicadas: number; borradores: number; contenido_pendiente: number; contenido_generado: number };
  pipeline: { total: number; valor_pipeline: number; comision_potencial: number };
  comisiones: { total_potencial: number };
  contenido: { por_aprobar: number };
}

function Metricas() {
  const { user } = useAuth();
  const [m, setM] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase.rpc as any)("get_dashboard_metrics");
    if (error) toast.error(error.message);
    setM((data as Metrics) ?? null);
    setLoading(false);
  }

  const fmt = (n: number) => new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ", maximumFractionDigits: 0 }).format(n || 0);
  const num = (n: number) => (n ?? 0).toLocaleString();

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-sm p-5">
          <Users className="text-secondary mb-2" size={22} />
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Leads totales</p>
          <p className="font-display text-3xl text-primary mt-1">{num(m.leads.total)}</p>
          <p className="text-xs text-muted-foreground mt-1">{m.leads.nuevos_semana} nuevos esta semana</p>
        </div>
        <div className="bg-card border border-border rounded-sm p-5">
          <Home className="text-secondary mb-2" size={22} />
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Propiedades</p>
          <p className="font-display text-3xl text-primary mt-1">{num(m.propiedades.total)}</p>
          <p className="text-xs text-muted-foreground mt-1">{m.propiedades.publicadas} publicadas</p>
        </div>
        <div className="bg-card border border-border rounded-sm p-5">
          <TrendingUp className="text-secondary mb-2" size={22} />
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Pipeline</p>
          <p className="font-display text-2xl text-primary mt-1">{fmt(m.pipeline.valor_pipeline)}</p>
          <p className="text-xs text-muted-foreground mt-1">{m.pipeline.total} negocio(s) activos</p>
        </div>
        <div className="bg-card border border-border rounded-sm p-5">
          <CircleDollarSign className="text-secondary mb-2" size={22} />
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Comisión potencial</p>
          <p className="font-display text-2xl text-primary mt-1">{fmt(m.comisiones.total_potencial)}</p>
        </div>
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
            {bar("Web", m.leads.de_web, m.leads.total, "bg-primary")}
            {bar("Manual", m.leads.manuales, m.leads.total, "bg-secondary")}
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
