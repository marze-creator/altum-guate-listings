import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Building2, CheckCircle2, CircleDollarSign, RefreshCw, TrendingUp, Users } from "lucide-react";
import { money } from "@/lib/crm";

export const Route = createFileRoute("/_vendedor/vendedores/comisiones")({
  head: () => ({ meta: [{ title: "Comisiones — ALTUM GROUP" }, { name: "robots", content: "noindex" }] }),
  component: ComisionesPage,
});

type DealRow = {
  id: string;
  title: string;
  status: string;
  deal_value: number | null;
  currency: string | null;
  commission_total: number | null;
  commission_advisor: number | null;
  commission_company: number | null;
  commission_captured_advisor: number | null;
  commission_closing_advisor: number | null;
  captured_by_user_id: string | null;
  closed_by_user_id: string | null;
  assigned_to_user_id: string | null;
  created_at: string;
  leads?: { id: string; full_name: string | null } | null;
  properties?: { id: string; title: string; zone: string | null; price: number | null; currency: string | null; operation: string | null } | null;
  deal_stages?: { id: string; name: string; is_won: boolean | null } | null;
};

type PropertyRow = {
  id: string;
  title: string;
  zone: string | null;
  price: number | null;
  currency: string | null;
  operation: string | null;
  status: string;
};

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

function propertyGrossPotential(property: PropertyRow) {
  const price = Number(property.price || 0);
  return property.operation === "renta" ? price : price * 0.05;
}

function advisorShareForUser(deal: DealRow, userId: string | undefined, isAdmin: boolean) {
  if (isAdmin) return Number(deal.commission_advisor || 0);
  if (!userId) return 0;

  const captured = deal.captured_by_user_id;
  const closed = deal.closed_by_user_id;
  const shared = Boolean(captured && closed && captured !== closed);

  if (shared && captured === userId) return Number(deal.commission_captured_advisor || 0);
  if (shared && closed === userId) return Number(deal.commission_closing_advisor || 0);
  if (captured === userId || closed === userId || deal.assigned_to_user_id === userId) {
    return Number(deal.commission_advisor || 0);
  }
  return 0;
}

function ComisionesPage() {
  const { user, isAdmin } = useAuth();
  const [wonDeals, setWonDeals] = useState<DealRow[]>([]);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [sellerNames, setSellerNames] = useState<Record<string, string>>({});
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
      .select("id,title,status,deal_value,currency,commission_total,commission_advisor,commission_company,commission_captured_advisor,commission_closing_advisor,captured_by_user_id,closed_by_user_id,assigned_to_user_id,created_at,leads(id,full_name),properties(id,title,zone,price,currency,operation),deal_stages(id,name,is_won)")
      .eq("status", "ganado")
      .order("created_at", { ascending: false });

    if (!isAdmin) {
      dealsQuery = dealsQuery.or(`assigned_to_user_id.eq.${user.id},captured_by_user_id.eq.${user.id},closed_by_user_id.eq.${user.id}`);
    }

    const [dealsResult, propertiesResult] = await Promise.all([
      dealsQuery,
      db
        .from("properties")
        .select("id,title,zone,price,currency,operation,status")
        .eq("status", "published")
        .order("created_at", { ascending: false }),
    ]);

    if (dealsResult.error) toast.error("Cierres: " + dealsResult.error.message);
    if (propertiesResult.error) toast.error("Propiedades: " + propertiesResult.error.message);

    const nextDeals = (dealsResult.data ?? []) as DealRow[];
    const nextProperties = (propertiesResult.data ?? []) as PropertyRow[];
    setWonDeals(nextDeals);
    setProperties(nextProperties);

    const sellerIds = Array.from(
      new Set(
        nextDeals.flatMap((deal) => [deal.captured_by_user_id, deal.closed_by_user_id, deal.assigned_to_user_id]).filter(Boolean) as string[],
      ),
    );

    if (sellerIds.length) {
      const { data: profiles } = await db.from("profiles").select("user_id,full_name").in("user_id", sellerIds);
      const map: Record<string, string> = {};
      ((profiles ?? []) as { user_id: string; full_name: string | null }[]).forEach((profile) => {
        map[profile.user_id] = profile.full_name || "Asesor ALTUM";
      });
      setSellerNames(map);
    } else {
      setSellerNames({});
    }

    setLoading(false);
  }

  const earned = useMemo(() => {
    const soldValue: CurrencyTotals = {};
    const advisor: CurrencyTotals = {};
    const company: CurrencyTotals = {};
    const gross: CurrencyTotals = {};

    wonDeals.forEach((deal) => {
      addCurrency(soldValue, deal.currency, deal.deal_value);
      addCurrency(gross, deal.currency, deal.commission_total);
      addCurrency(advisor, deal.currency, advisorShareForUser(deal, user?.id, isAdmin));
      addCurrency(company, deal.currency, deal.commission_company);
    });

    return { soldValue, advisor, company, gross };
  }, [wonDeals, user?.id, isAdmin]);

  const inventory = useMemo(() => {
    const value: CurrencyTotals = {};
    const gross: CurrencyTotals = {};
    const advisors: CurrencyTotals = {};
    const company: CurrencyTotals = {};

    properties.forEach((property) => {
      const price = Number(property.price || 0);
      const grossPotential = propertyGrossPotential(property);
      addCurrency(value, property.currency, price);
      addCurrency(gross, property.currency, grossPotential);
      addCurrency(advisors, property.currency, grossPotential * 0.7);
      addCurrency(company, property.currency, grossPotential * 0.3);
    });

    return { value, gross, advisors, company };
  }, [properties]);

  return (
    <div className="container-altum py-10 max-w-7xl">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-secondary font-semibold">ALTUM CRM</p>
          <h1 className="font-display text-3xl text-primary">Comisiones</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Comisiones reales de negocios ganados y potencial económico del inventario disponible, sin duplicar por cantidad de leads.
          </p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 h-10 px-4 border border-border rounded-sm hover:bg-muted text-sm">
          <RefreshCw size={16} /> Actualizar
        </button>
      </div>

      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 size={20} className="text-green-600" />
          <div>
            <h2 className="font-display text-xl text-primary">Comisiones ganadas</h2>
            <p className="text-xs text-muted-foreground">Solo negocios confirmados como ganados.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <Metric label="Cierres ganados" value={String(wonDeals.length)} icon={<CheckCircle2 size={18} />} />
          <Metric label="Valor cerrado" value={formatCurrencyTotals(earned.soldValue)} />
          <Metric label={isAdmin ? "Comisión asesores generada" : "Tu comisión ganada"} value={formatCurrencyTotals(earned.advisor)} />
          <Metric label="Comisión ALTUM generada" value={formatCurrencyTotals(earned.company)} />
        </div>

        <div className="bg-card border border-border rounded-sm overflow-x-auto">
          {loading ? (
            <p className="text-center py-16 text-muted-foreground">Cargando cierres…</p>
          ) : wonDeals.length === 0 ? (
            <p className="text-center py-16 text-muted-foreground">Todavía no hay negocios ganados.</p>
          ) : (
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left p-4">Cliente / propiedad</th>
                  <th className="text-left p-4">Precio publicado</th>
                  <th className="text-left p-4">Precio cierre</th>
                  <th className="text-left p-4">Tipo de cierre</th>
                  <th className="text-left p-4">Comisión bruta</th>
                  <th className="text-left p-4">Asesor(es)</th>
                  <th className="text-left p-4">ALTUM</th>
                </tr>
              </thead>
              <tbody>
                {wonDeals.map((deal) => {
                  const captured = deal.captured_by_user_id;
                  const closed = deal.closed_by_user_id;
                  const shared = Boolean(captured && closed && captured !== closed);
                  const currency = deal.currency ?? deal.properties?.currency ?? "GTQ";
                  const viewerShare = advisorShareForUser(deal, user?.id, isAdmin);

                  return (
                    <tr key={deal.id} className="border-t border-border align-top">
                      <td className="p-4">
                        <p className="font-semibold text-primary">{deal.leads?.full_name ?? deal.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{deal.properties?.title ?? "Sin propiedad"}</p>
                      </td>
                      <td className="p-4">{money(deal.properties?.price, currency)}</td>
                      <td className="p-4 font-semibold text-primary">{money(deal.deal_value, currency)}</td>
                      <td className="p-4">
                        <span className={`text-xs px-2 py-1 rounded-full border ${shared ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-green-50 text-green-700 border-green-200"}`}>
                          {shared ? "Compartido" : "Propio"}
                        </span>
                      </td>
                      <td className="p-4">
                        {money(deal.commission_total, currency)}
                        <p className="text-[11px] text-muted-foreground mt-1">{deal.properties?.operation === "renta" ? "1 mensualidad" : "5% venta"}</p>
                      </td>
                      <td className="p-4">
                        {shared ? (
                          <div className="space-y-1">
                            <p className="text-xs"><span className="font-semibold">Captación:</span> {sellerNames[captured || ""] ?? "Asesor ALTUM"} · {money(deal.commission_captured_advisor, currency)}</p>
                            <p className="text-xs"><span className="font-semibold">Cierre:</span> {sellerNames[closed || ""] ?? "Asesor ALTUM"} · {money(deal.commission_closing_advisor, currency)}</p>
                            {!isAdmin && <p className="font-semibold text-primary pt-1">Tu parte: {money(viewerShare, currency)}</p>}
                          </div>
                        ) : (
                          <div>
                            <p className="font-semibold text-primary">{money(viewerShare, currency)}</p>
                            <p className="text-[11px] text-muted-foreground">{sellerNames[captured || closed || deal.assigned_to_user_id || ""] ?? "Asesor ALTUM"}</p>
                          </div>
                        )}
                      </td>
                      <td className="p-4 font-semibold">{money(deal.commission_company, currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={20} className="text-secondary" />
          <div>
            <h2 className="font-display text-xl text-primary">Potencial por inventario</h2>
            <p className="text-xs text-muted-foreground">Cada propiedad disponible cuenta una sola vez, aunque tenga decenas de leads interesados.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
          <Metric label="Propiedades disponibles" value={String(properties.length)} icon={<Building2 size={18} />} />
          <Metric label="Valor inventario" value={formatCurrencyTotals(inventory.value)} />
          <Metric label="Comisión bruta potencial" value={formatCurrencyTotals(inventory.gross)} />
          <Metric label="Bolsa asesores potencial" value={formatCurrencyTotals(inventory.advisors)} />
          <Metric label="ALTUM potencial" value={formatCurrencyTotals(inventory.company)} />
        </div>

        <div className="bg-card border border-border rounded-sm overflow-x-auto">
          {properties.length === 0 ? (
            <p className="text-center py-16 text-muted-foreground">No hay propiedades publicadas disponibles.</p>
          ) : (
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left p-4">Propiedad</th>
                  <th className="text-left p-4">Operación</th>
                  <th className="text-left p-4">Valor</th>
                  <th className="text-left p-4">Comisión bruta potencial</th>
                  <th className="text-left p-4">Asesores 70%</th>
                  <th className="text-left p-4">ALTUM 30%</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((property) => {
                  const currency = property.currency ?? "GTQ";
                  const gross = propertyGrossPotential(property);
                  return (
                    <tr key={property.id} className="border-t border-border">
                      <td className="p-4">
                        <p className="font-semibold text-primary">{property.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{property.zone || "Sin zona"}</p>
                      </td>
                      <td className="p-4 capitalize">{property.operation || "—"}</td>
                      <td className="p-4 font-semibold">{money(property.price, currency)}</td>
                      <td className="p-4">{money(gross, currency)}<p className="text-[11px] text-muted-foreground">{property.operation === "renta" ? "1 mensualidad" : "5% venta"}</p></td>
                      <td className="p-4 font-semibold text-primary">{money(gross * 0.7, currency)}</td>
                      <td className="p-4">{money(gross * 0.3, currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <div className="mt-6 bg-primary text-white rounded-sm p-5 flex items-start gap-3">
        <TrendingUp className="text-secondary shrink-0" />
        <div>
          <p className="font-semibold">Reglas de comisión ALTUM</p>
          <p className="text-sm text-white/80 mt-1">
            Venta: 5% del precio final — 30% ALTUM y 70% asesores. Si el cierre es compartido, la parte de asesores se divide 35% captación + 35% cierre. Renta: una mensualidad con la misma división.
          </p>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-sm p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="font-display text-2xl text-primary mt-1 flex items-start gap-2">
        <span className="text-secondary mt-1">{icon ?? <CircleDollarSign size={18} />}</span>
        {value}
      </div>
    </div>
  );
}
