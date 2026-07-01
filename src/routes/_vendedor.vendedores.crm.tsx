import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { CalendarDays, ChevronDown, CircleDollarSign, MessageCircle, Plus, RefreshCw, Search, UserRound } from "lucide-react";
import {
  CrmDeal,
  CrmStage,
  DEFAULT_CRM_STAGES,
  LEAD_SOURCES,
  LEAD_TEMPERATURES,
  money,
  safeDate,
  temperatureClass,
} from "@/lib/crm";

type PropertyOption = { id: string; title: string; zone: string; price: number; currency: string | null; operation: string };

export const Route = createFileRoute("/_vendedor/vendedores/crm")({
  head: () => ({ meta: [{ title: "CRM — ALTUM GROUP" }, { name: "robots", content: "noindex" }] }),
  component: CrmPage,
});

function CrmPage() {
  const { user, isAdmin } = useAuth();
  const [stages, setStages] = useState<CrmStage[]>([]);
  const [deals, setDeals] = useState<CrmDeal[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showNewLead, setShowNewLead] = useState(false);
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    source: "manual",
    interest_operation: "venta",
    interest_type: "apartamento",
    interest_zone: "",
    budget_max: "",
    currency: "GTQ",
    notes: "",
    temperature: "tibio",
    property_id: "",
  });

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  async function load() {
    setLoading(true);
    const db = supabase as any;

    const [{ data: stageRows, error: stagesError }, { data: propertyRows }, { data: dealRows, error: dealsError }] = await Promise.all([
      db.from("deal_stages").select("id,name,slug,position,probability,color,is_won,is_lost").order("position", { ascending: true }),
      db.from("properties").select("id,title,zone,price,currency,operation").order("created_at", { ascending: false }).limit(200),
      db
        .from("deals")
        .select("id,title,status,stage_id,lead_id,property_id,assigned_to_user_id,deal_value,currency,commission_rate,commission_total,advisor_commission_rate,commission_advisor,commission_company,next_activity_at,temperature,created_at,leads(id,full_name,phone,email,source,interest_operation,interest_type,interest_zone,budget_min,budget_max,currency,notes,temperature,status,next_follow_up_at),properties(id,title,zone,price,currency,operation,cover_image),deal_stages(id,name,slug,position,probability,color,is_won,is_lost)")
        .order("created_at", { ascending: false })
        .limit(300),
    ]);

    if (stagesError) toast.error("CRM stages: " + stagesError.message);
    if (dealsError) toast.error("CRM deals: " + dealsError.message + ". Revisa si ya aplicaste la migración del CRM.");

    setStages((stageRows?.length ? stageRows : DEFAULT_CRM_STAGES) as CrmStage[]);
    setProperties((propertyRows ?? []) as PropertyOption[]);
    setDeals((dealRows ?? []) as CrmDeal[]);
    setLoading(false);
  }

  const filteredDeals = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return deals;
    return deals.filter((deal) => {
      const lead = deal.leads;
      const prop = deal.properties;
      return [deal.title, lead?.full_name, lead?.phone, lead?.interest_zone, prop?.title, prop?.zone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [deals, query]);

  const totals = useMemo(() => {
    return deals.reduce(
      (acc, deal) => {
        if (deal.status === "perdido") return acc;
        acc.count += 1;
        acc.pipeline += Number(deal.deal_value || 0);
        acc.commission += Number(deal.commission_advisor || 0);
        return acc;
      },
      { count: 0, pipeline: 0, commission: 0 },
    );
  }, [deals]);

  async function createLeadAndDeal() {
    if (!user) return toast.error("Sesión expirada");
    if (!form.full_name.trim()) return toast.error("El nombre del cliente es obligatorio");
    if (!form.phone.trim() && !form.email.trim()) return toast.error("Agrega teléfono o correo");

    const db = supabase as any;
    const selectedProperty = properties.find((item) => item.id === form.property_id);
    const currency = selectedProperty?.currency ?? form.currency;

    // Build payload omitting empty enum-typed fields to avoid breaking Postgres enums
    const payload: Record<string, unknown> = {
      assigned_to_user_id: user.id,
      created_by: user.id,
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      interest_zone: form.interest_zone.trim() || selectedProperty?.zone || null,
      budget_max: form.budget_max ? Number(form.budget_max) : null,
      currency,
      notes: form.notes.trim() || null,
    };
    if (form.source && form.source.trim()) payload.source = form.source;
    if (form.interest_operation && form.interest_operation.trim()) payload.interest_operation = form.interest_operation;
    if (form.interest_type && form.interest_type.trim()) payload.interest_type = form.interest_type;
    if (form.temperature && form.temperature.trim()) payload.temperature = form.temperature;
    if (form.property_id) payload.property_id = form.property_id;

    // Insert ONLY the lead — a database trigger creates the associated deal automatically.
    const { error: leadError } = await db.from("leads").insert(payload).select("id").single();
    if (leadError) return toast.error(leadError.message);

    toast.success("Lead creado");
    setShowNewLead(false);
    setForm({
      full_name: "",
      phone: "",
      email: "",
      source: "manual",
      interest_operation: "venta",
      interest_type: "apartamento",
      interest_zone: "",
      budget_max: "",
      currency: "GTQ",
      notes: "",
      temperature: "tibio",
      property_id: "",
    });
    load();
  }

  async function moveDeal(dealId: string, stageId: string) {
    const current = deals.find((item) => item.id === dealId);
    if (!current || current.stage_id === stageId) return;
    const target = stages.find((item) => item.id === stageId);
    if (!target) return;
    const status = target.is_won ? "ganado" : target.is_lost ? "perdido" : "abierto";
    const { error } = await (supabase as any)
      .from("deals")
      .update({ stage_id: stageId, status })
      .eq("id", dealId);
    if (error) return toast.error(error.message);
    setDeals((rows) =>
      rows.map((deal) =>
        deal.id === dealId ? { ...deal, stage_id: stageId, status, deal_stages: target } : deal,
      ),
    );
  }

  async function createFollowUp(deal: CrmDeal) {
    if (!user) return;
    const due = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { error } = await (supabase as any).from("activities").insert({
      deal_id: deal.id,
      lead_id: deal.lead_id,
      assigned_to_user_id: user.id,
      created_by: user.id,
      type: "seguimiento",
      title: `Dar seguimiento a ${deal.leads?.full_name ?? deal.title}`,
      due_at: due,
      notes: "Creado desde el Kanban CRM.",
    });
    if (error) return toast.error(error.message);
    toast.success("Seguimiento creado para mañana");
  }

  return (
    <div className="container-altum py-10 max-w-[1500px]">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-secondary font-semibold">ALTUM CRM</p>
          <h1 className="font-display text-3xl text-primary">Embudo comercial</h1>
          <p className="text-sm text-muted-foreground mt-1">Kanban operativo para leads, propiedades, visitas y cierre.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={load} className="inline-flex items-center gap-2 h-10 px-4 border border-border rounded-sm hover:bg-muted text-sm">
            <RefreshCw size={16} /> Actualizar
          </button>
          <button onClick={() => setShowNewLead(true)} className="inline-flex items-center gap-2 h-10 px-4 bg-secondary text-primary font-semibold rounded-sm hover:bg-secondary/85">
            <Plus size={16} /> Nuevo lead
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Metric label="Oportunidades" value={String(totals.count)} />
        <Metric label="Pipeline estimado" value={money(totals.pipeline, "GTQ")} />
        <Metric label="Comisión asesor est." value={money(totals.commission, "GTQ")} />
        <Metric label="Vista" value={isAdmin ? "Admin" : "Asesor"} />
      </div>

      <div className="mb-5 flex items-center gap-2 rounded-sm border border-border bg-card px-3 h-11 max-w-xl">
        <Search size={16} className="text-muted-foreground" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por cliente, teléfono, propiedad o zona…" className="bg-transparent outline-none flex-1 text-sm" />
      </div>

      {showNewLead && (
        <div className="mb-6 bg-card border border-border rounded-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl text-primary">Nuevo lead rápido</h2>
            <button onClick={() => setShowNewLead(false)} className="text-sm text-muted-foreground hover:text-primary">Cerrar</button>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <input className="input-altum" placeholder="Nombre cliente *" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <input className="input-altum" placeholder="WhatsApp / teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className="input-altum" placeholder="Correo" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <select className="input-altum" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              {LEAD_SOURCES.map((source) => <option key={source} value={source}>{source}</option>)}
            </select>
            <select className="input-altum" value={form.interest_operation} onChange={(e) => setForm({ ...form, interest_operation: e.target.value })}>
              <option value="venta">Compra</option>
              <option value="renta">Renta</option>
              <option value="ambas">Ambas</option>
            </select>
            <select className="input-altum" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })}>
              {LEAD_TEMPERATURES.map((temp) => <option key={temp} value={temp}>{temp}</option>)}
            </select>
            <input className="input-altum" placeholder="Tipo: casa, apartamento…" value={form.interest_type} onChange={(e) => setForm({ ...form, interest_type: e.target.value })} />
            <input className="input-altum" placeholder="Zona de interés" value={form.interest_zone} onChange={(e) => setForm({ ...form, interest_zone: e.target.value })} />
            <input className="input-altum" placeholder="Presupuesto máximo" type="number" value={form.budget_max} onChange={(e) => setForm({ ...form, budget_max: e.target.value })} />
            <select className="input-altum md:col-span-2" value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })}>
              <option value="">Sin propiedad específica</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>{property.title} — {property.zone}</option>
              ))}
            </select>
            <input className="input-altum" placeholder="Notas" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={createLeadAndDeal} className="h-10 px-4 bg-primary text-white rounded-sm font-semibold hover:bg-primary/90">Crear oportunidad</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="py-16 text-center text-muted-foreground">Cargando CRM…</p>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {stages.map((stage) => {
              const stageDeals = filteredDeals.filter((deal) => deal.stage_id === stage.id || deal.deal_stages?.slug === stage.slug);
              return (
                <div
                  key={stage.id}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (draggedDealId) moveDeal(draggedDealId, stage.id);
                    setDraggedDealId(null);
                  }}
                  className="w-[310px] bg-muted/40 border border-border rounded-sm min-h-[540px]"
                >
                  <div className="p-3 border-b border-border bg-card sticky top-0 z-10">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-primary">{stage.name}</p>
                        <p className="text-xs text-muted-foreground">{stage.probability}% probabilidad</p>
                      </div>
                      <span className="text-xs bg-background border border-border rounded-full px-2 py-0.5">{stageDeals.length}</span>
                    </div>
                  </div>
                  <div className="p-3 space-y-3">
                    {stageDeals.map((deal) => (
                      <DealCard
                        key={deal.id}
                        deal={deal}
                        stages={stages}
                        onMove={moveDeal}
                        onFollowUp={createFollowUp}
                        onDragStart={() => setDraggedDealId(deal.id)}
                      />
                    ))}
                    {stageDeals.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Arrastra oportunidades aquí</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-sm p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-2xl text-primary mt-1">{value}</p>
    </div>
  );
}

function DealCard({ deal, stages, onMove, onFollowUp, onDragStart }: { deal: CrmDeal; stages: CrmStage[]; onMove: (dealId: string, stageId: string) => void; onFollowUp: (deal: CrmDeal) => void; onDragStart: () => void }) {
  const lead = deal.leads;
  const property = deal.properties;
  const wa = lead?.phone?.replace(/\D/g, "");
  return (
    <div draggable onDragStart={onDragStart} className="bg-card border border-border rounded-sm p-4 shadow-sm cursor-grab active:cursor-grabbing">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-primary line-clamp-2">{lead?.full_name ?? deal.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{property?.title ?? lead?.interest_type ?? "Sin propiedad"}</p>
        </div>
        <span className={`text-[11px] px-2 py-0.5 border rounded-full ${temperatureClass(deal.temperature ?? lead?.temperature)}`}>{deal.temperature ?? lead?.temperature ?? "tibio"}</span>
      </div>
      <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
        {lead?.phone && <p className="flex items-center gap-1.5"><MessageCircle size={12} /> {lead.phone}</p>}
        {property?.zone && <p>{property.zone} · {property.operation}</p>}
        <p className="flex items-center gap-1.5"><CircleDollarSign size={12} /> {money(deal.deal_value, deal.currency ?? "GTQ")} · Comisión {money(deal.commission_advisor, deal.currency ?? "GTQ")}</p>
        <p className="flex items-center gap-1.5"><CalendarDays size={12} /> Próxima: {safeDate(deal.next_activity_at ?? lead?.next_follow_up_at)}</p>
      </div>
      <div className="mt-3 flex gap-2 flex-wrap">
        {wa && (
          <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 bg-green-600 text-white rounded-sm">WhatsApp</a>
        )}
        <button onClick={() => onFollowUp(deal)} className="text-xs px-2 py-1 border border-border rounded-sm hover:bg-muted">Seguimiento</button>
        <Link to="/vendedores/agenda" className="text-xs px-2 py-1 border border-border rounded-sm hover:bg-muted">Agenda</Link>
      </div>
      <div className="mt-3 relative">
        <ChevronDown size={14} className="absolute right-2 top-2.5 text-muted-foreground pointer-events-none" />
        <select value={deal.stage_id ?? ""} onChange={(event) => onMove(deal.id, event.target.value)} className="w-full text-xs h-9 px-2 border border-border rounded-sm bg-background appearance-none">
          {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
        </select>
      </div>
    </div>
  );
}
