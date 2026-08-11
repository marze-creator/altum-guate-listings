import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  Phone,
  RefreshCw,
  StickyNote,
  X,
} from "lucide-react";
import { ACTIVITY_TYPES, CrmActivity, CrmStage, money, safeDate } from "@/lib/crm";

type ActivityRow = CrmActivity & { completed_at?: string | null };
type WhatsAppMessage = {
  id: string;
  lead_id: string | null;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

type DealData = {
  id: string;
  title: string;
  status: string;
  stage_id: string | null;
  lead_id: string;
  property_id: string | null;
  assigned_to_user_id: string | null;
  deal_value: number | null;
  currency: string | null;
  temperature: string | null;
  leads?: {
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
    source: string | null;
    interest_operation: string | null;
    interest_type: string | null;
    interest_zone: string | null;
    temperature: string | null;
    ad_id?: string | null;
    ad_headline?: string | null;
    ad_source_url?: string | null;
    ad_source_type?: string | null;
  } | null;
  properties?: {
    id: string;
    title: string;
    zone: string;
    price: number;
    currency: string | null;
    operation: string;
  } | null;
};

export function AgendaDealDetail({
  dealId,
  activityId,
  onClose,
  onActivityCompleted,
}: {
  dealId: string;
  activityId: string;
  onClose: () => void;
  onActivityCompleted: (activityId: string) => void;
}) {
  const { user } = useAuth();
  const [deal, setDeal] = useState<DealData | null>(null);
  const [stages, setStages] = useState<CrmStage[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState("seguimiento");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId, activityId]);

  async function loadAll() {
    setLoading(true);
    setError(null);
    const db = supabase as any;
    const [{ data: dealRow, error: dealError }, { data: stageRows }] = await Promise.all([
      db
        .from("deals")
        .select("id,title,status,stage_id,lead_id,property_id,assigned_to_user_id,deal_value,currency,temperature,leads(id,full_name,phone,email,source,interest_operation,interest_type,interest_zone,temperature,ad_id,ad_headline,ad_source_url,ad_source_type),properties(id,title,zone,price,currency,operation)")
        .eq("id", dealId)
        .single(),
      db.from("deal_stages").select("id,name,slug,position,probability,color,is_won,is_lost").order("position", { ascending: true }),
    ]);

    if (dealError || !dealRow) {
      setError(dealError?.message || "No fue posible abrir esta oportunidad.");
      setDeal(null);
      setLoading(false);
      return;
    }

    setDeal(dealRow as DealData);
    setStages((stageRows ?? []) as CrmStage[]);
    await Promise.all([loadActivities(dealRow as DealData), loadMessages((dealRow as DealData).lead_id)]);
    setLoading(false);
  }

  async function loadActivities(currentDeal = deal) {
    if (!currentDeal) return;
    const { data, error: activityError } = await (supabase as any)
      .from("activities")
      .select("id,title,type,status,notes,due_at,deal_id,lead_id,assigned_to_user_id,created_at,completed_at")
      .or(`deal_id.eq.${currentDeal.id},lead_id.eq.${currentDeal.lead_id}`)
      .order("created_at", { ascending: false })
      .limit(100);
    if (activityError) toast.error("Actividades: " + activityError.message);
    setActivities((data ?? []) as ActivityRow[]);
  }

  async function loadMessages(leadId = deal?.lead_id) {
    if (!leadId) return;
    setLoadingMessages(true);
    const { data, error: messageError } = await (supabase as any)
      .from("wa_messages")
      .select("id,lead_id,role,content,created_at")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true })
      .limit(300);
    if (messageError) {
      toast.error("Conversación: " + messageError.message);
      setMessages([]);
    } else {
      setMessages((data ?? []) as WhatsAppMessage[]);
    }
    setLoadingMessages(false);
  }

  const currentActivity = useMemo(
    () => activities.find((activity) => activity.id === activityId) ?? null,
    [activities, activityId],
  );

  async function completeActivity(id: string, silent = false) {
    if (completing) return false;
    setCompleting(true);
    const completedAt = new Date().toISOString();
    const previous = activities;
    setActivities((rows) => rows.map((row) => row.id === id ? { ...row, status: "completada", completed_at: completedAt } : row));
    const { error: completeError } = await (supabase as any)
      .from("activities")
      .update({ status: "completada", completed_at: completedAt })
      .eq("id", id);
    setCompleting(false);
    if (completeError) {
      setActivities(previous);
      toast.error(completeError.message);
      return false;
    }
    onActivityCompleted(id);
    if (!silent) toast.success("Actividad completada");
    return true;
  }

  async function addActivity() {
    if (!deal || !user) return toast.error("Sesión expirada");
    if (!title.trim() && !notes.trim()) return toast.error("Agrega un título o una nota");
    setSaving(true);
    const payload = {
      deal_id: deal.id,
      lead_id: deal.lead_id,
      assigned_to_user_id: user.id,
      created_by: user.id,
      type,
      title: title.trim() || `${type} con ${deal.leads?.full_name ?? "cliente"}`,
      notes: notes.trim() || null,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
    };
    const { error: insertError } = await (supabase as any).from("activities").insert(payload);
    if (insertError) {
      setSaving(false);
      return toast.error(insertError.message);
    }

    if (currentActivity && currentActivity.status !== "completada") {
      await completeActivity(currentActivity.id, true);
    }

    setSaving(false);
    toast.success(dueAt ? "Seguimiento registrado y actividad anterior completada" : "Actividad registrada");
    setTitle("");
    setNotes("");
    setDueAt("");
    await loadActivities(deal);
  }

  async function moveStage(stageId: string) {
    if (!deal) return;
    const target = stages.find((stage) => stage.id === stageId);
    if (!target) return;
    const status = target.is_won ? "ganado" : target.is_lost ? "perdido" : "abierto";
    const { error: stageError } = await (supabase as any).from("deals").update({ stage_id: stageId, status }).eq("id", deal.id);
    if (stageError) return toast.error(stageError.message);
    setDeal({ ...deal, stage_id: stageId, status });
  }

  const lead = deal?.leads;
  const property = deal?.properties;
  const wa = lead?.phone?.replace(/\D/g, "");
  const hasAdAttribution = Boolean(lead?.ad_id || lead?.ad_headline || lead?.ad_source_url);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div className="w-full max-w-2xl bg-background h-full overflow-y-auto shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 bg-primary text-white px-5 py-4 flex items-center justify-between z-10">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-secondary font-semibold">Oportunidad desde Agenda</p>
            <h2 className="font-display text-xl truncate">{lead?.full_name ?? deal?.title ?? "Oportunidad"}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-sm hover:bg-white/10" aria-label="Cerrar"><X size={18} /></button>
        </div>

        {loading ? (
          <p className="p-10 text-center text-muted-foreground">Cargando oportunidad…</p>
        ) : error || !deal ? (
          <div className="p-5"><div className="border border-red-200 bg-red-50 text-red-700 rounded-sm p-4">{error || "No fue posible abrir esta oportunidad."}</div></div>
        ) : (
          <div className="p-5 space-y-6">
            {currentActivity && (
              <section className={`border rounded-sm p-4 ${currentActivity.status === "completada" ? "border-green-200 bg-green-50" : "border-secondary bg-secondary/10"}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider font-semibold text-primary/70">Actividad actual</p>
                    <p className="font-semibold text-primary mt-1">{currentActivity.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{currentActivity.type} · {safeDate(currentActivity.due_at)}</p>
                    {currentActivity.notes && <p className="text-sm text-primary/80 mt-2 whitespace-pre-wrap">{currentActivity.notes}</p>}
                  </div>
                  {currentActivity.status === "completada" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700"><CheckCircle2 size={14} /> Completada</span>
                  ) : (
                    <button disabled={completing} onClick={() => completeActivity(currentActivity.id)} className="inline-flex items-center gap-1.5 h-9 px-3 bg-green-600 text-white rounded-sm text-sm disabled:opacity-60">
                      <CheckCircle2 size={14} /> Completar actividad
                    </button>
                  )}
                </div>
              </section>
            )}

            <section className="grid sm:grid-cols-2 gap-3 text-sm">
              <InfoRow label="Teléfono" value={lead?.phone ?? "—"} />
              <InfoRow label="Correo" value={lead?.email ?? "—"} />
              <InfoRow label="Fuente" value={lead?.source ?? "—"} />
              <InfoRow label="Temperatura" value={deal.temperature ?? lead?.temperature ?? "—"} />
              <InfoRow label="Interés" value={`${lead?.interest_operation ?? "—"} · ${lead?.interest_type ?? "—"}`} />
              <InfoRow label="Zona" value={lead?.interest_zone ?? property?.zone ?? "—"} />
              <InfoRow label="Propiedad" value={property?.title ?? "—"} />
              <InfoRow label="Valor" value={money(deal.deal_value, deal.currency ?? "GTQ")} />
            </section>

            <section className="flex flex-wrap gap-2">
              {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 h-9 px-3 bg-green-600 text-white rounded-sm text-sm"><MessageCircle size={14} /> WhatsApp</a>}
              {lead?.phone && <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1.5 h-9 px-3 border border-border rounded-sm text-sm hover:bg-muted"><Phone size={14} /> Llamar</a>}
              <div className="ml-auto">
                <select value={deal.stage_id ?? ""} onChange={(event) => moveStage(event.target.value)} className="h-9 px-2 border border-border rounded-sm bg-background text-sm">
                  {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
                </select>
              </div>
            </section>

            <section className="border border-border rounded-sm p-4 bg-card">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="font-display text-primary text-lg">Origen del lead</h3>
                  <p className="text-xs text-muted-foreground mt-1">Canal y publicidad que originó la conversación.</p>
                </div>
                {hasAdAttribution && <span className="inline-flex items-center rounded-full border border-secondary/50 bg-secondary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">Publicidad Meta</span>}
              </div>
              {hasAdAttribution ? (
                <div className="mt-3 rounded-sm border border-border bg-background p-3">
                  <p className="text-sm font-semibold text-primary">{lead?.ad_headline ?? "Anuncio de Meta"}</p>
                  {lead?.ad_id && <p className="text-xs text-muted-foreground mt-1 break-all">ID: {lead.ad_id}</p>}
                  {lead?.ad_source_url && <a href={lead.ad_source_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline underline-offset-4">Ver anuncio <ExternalLink size={12} /></a>}
                </div>
              ) : <p className="mt-3 text-sm text-muted-foreground">Sin atribución de anuncio registrada.</p>}
            </section>

            <section className="border border-border rounded-sm p-4 bg-card">
              <h3 className="font-display text-primary text-lg mb-1">Registrar resultado / próximo seguimiento</h3>
              {currentActivity?.status !== "completada" && <p className="text-xs text-muted-foreground mb-3">Al guardar, la actividad actual se marcará automáticamente como completada.</p>}
              <div className="grid sm:grid-cols-2 gap-3">
                <select className="input-altum" value={type} onChange={(event) => setType(event.target.value)}>{ACTIVITY_TYPES.map((activityType) => <option key={activityType} value={activityType}>{activityType}</option>)}</select>
                <input type="datetime-local" className="input-altum" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
                <input className="input-altum sm:col-span-2" placeholder="Resultado o siguiente paso" value={title} onChange={(event) => setTitle(event.target.value)} />
                <textarea className="input-altum sm:col-span-2 min-h-[90px] py-2" placeholder="Notas de la conversación / próximos pasos…" value={notes} onChange={(event) => setNotes(event.target.value)} />
              </div>
              <div className="mt-3 flex justify-end">
                <button disabled={saving} onClick={addActivity} className="h-10 px-4 bg-primary text-white rounded-sm font-semibold hover:bg-primary/90 disabled:opacity-60">{saving ? "Guardando…" : "Guardar seguimiento"}</button>
              </div>
            </section>

            <section className="border border-border rounded-sm bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-primary text-lg">Conversación WhatsApp</h3>
                  <p className="text-xs text-muted-foreground">Historial entre el cliente y Andrea.</p>
                </div>
                <button type="button" onClick={() => loadMessages(deal.lead_id)} disabled={loadingMessages} className="inline-flex items-center gap-1.5 h-8 px-2.5 border border-border rounded-sm text-xs hover:bg-muted disabled:opacity-50"><RefreshCw size={13} className={loadingMessages ? "animate-spin" : ""} /> Actualizar</button>
              </div>
              <div className="p-4 bg-muted/20 max-h-[520px] overflow-y-auto">
                {loadingMessages ? <p className="text-sm text-muted-foreground py-6 text-center">Cargando conversación…</p> : messages.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">Aún no hay mensajes enlazados a este lead.</p> : (
                  <div className="space-y-3">
                    {messages.map((message) => {
                      const fromAndrea = message.role === "assistant";
                      return <div key={message.id} className={`flex ${fromAndrea ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[88%] sm:max-w-[78%] rounded-lg px-3 py-2 shadow-sm ${fromAndrea ? "bg-primary text-white" : "bg-background border border-border text-primary"}`}>
                          <p className={`text-[11px] font-semibold mb-1 ${fromAndrea ? "text-secondary" : "text-muted-foreground"}`}>{fromAndrea ? "Andrea · ALTUM" : (lead?.full_name ?? "Cliente")}</p>
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                          <p className={`text-[10px] mt-1.5 ${fromAndrea ? "text-white/65" : "text-muted-foreground"}`}>{safeDate(message.created_at)}</p>
                        </div>
                      </div>;
                    })}
                  </div>
                )}
              </div>
            </section>

            <section>
              <h3 className="font-display text-primary text-lg mb-3">Línea de tiempo</h3>
              {activities.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay actividades registradas.</p> : (
                <ol className="relative border-l border-border ml-2 space-y-4">
                  {activities.map((activity) => <li key={activity.id} className="ml-4">
                    <span className={`absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full border border-primary ${activity.status === "completada" ? "bg-green-500" : "bg-secondary"}`} />
                    <div className={`border rounded-sm p-3 ${activity.id === activityId ? "border-secondary bg-secondary/10" : "border-border bg-card"}`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-primary text-sm flex items-center gap-2"><ActivityIcon type={activity.type} /> {activity.title}</p>
                        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{activity.status === "completada" ? "completada" : activity.type}</span>
                      </div>
                      {activity.notes && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{activity.notes}</p>}
                      <p className="text-[11px] text-muted-foreground mt-2">{safeDate(activity.created_at)}{activity.due_at ? ` · vence ${safeDate(activity.due_at)}` : ""}</p>
                    </div>
                  </li>)}
                </ol>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="text-primary break-words">{value}</p></div>;
}

function ActivityIcon({ type }: { type: string }) {
  if (type === "llamada") return <Phone size={14} className="text-primary" />;
  if (type === "whatsapp") return <MessageCircle size={14} className="text-green-600" />;
  if (type === "visita") return <CalendarDays size={14} className="text-secondary" />;
  return <StickyNote size={14} className="text-primary" />;
}
