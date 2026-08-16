import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Bot,
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  Flame,
  MessageSquareText,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Search,
  Send,
  UserRound,
} from "lucide-react";

type WaMessage = {
  id: string;
  organization_id: string;
  lead_id: string | null;
  phone: string;
  role: "user" | "assistant" | string;
  content: string;
  sender: string | null;
  message_type: string | null;
  media_url: string | null;
  created_at: string;
};

type LeadRow = {
  id: string;
  organization_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  interest_operation: string | null;
  interest_type: string | null;
  interest_zone: string | null;
  budget_min: number | null;
  budget_max: number | null;
  currency: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  notes: string | null;
  temperature: string | null;
  status: string | null;
  property_id: string | null;
  ad_property_id: string | null;
  assigned_to_user_id: string | null;
  created_by: string | null;
  ai_paused: boolean;
  updated_at: string;
};

type PropertyRow = {
  id: string;
  title: string;
  zone: string;
  price: number;
  currency: string | null;
  operation: string;
  cover_image: string | null;
};

type StageRow = {
  lead_id: string;
  name: string | null;
  slug: string | null;
};

type Conversation = {
  lead: LeadRow;
  messages: WaMessage[];
  property: PropertyRow | null;
  stage: StageRow | null;
  lastMessage: WaMessage | null;
  lastInboundAt: string | null;
  unreadCount: number;
};

function formatTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return new Intl.DateTimeFormat("es-GT", sameDay
    ? { hour: "2-digit", minute: "2-digit" }
    : { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }
  ).format(date);
}

function formatMoney(value: number | null, currency?: string | null) {
  if (value == null) return "—";
  const code = currency === "USD" ? "USD" : "GTQ";
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: code,
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function tempClasses(temperature?: string | null) {
  const value = String(temperature ?? "tibio").toLowerCase();
  if (value === "caliente") return "bg-red-50 text-red-700 border-red-200";
  if (value === "frio" || value === "frío") return "bg-sky-50 text-sky-700 border-sky-200";
  return "bg-amber-50 text-amber-800 border-amber-200";
}

function senderLabel(message: WaMessage, leadName: string) {
  if (message.role === "user") return leadName || "Cliente";
  if (message.sender === "humano") return "Asesor ALTUM";
  return "Andrea · ALTUM";
}

export function ConversationsInbox() {
  const { user } = useAuth();
  const db = supabase as any;
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendingPhotos, setSendingPhotos] = useState(false);
  const [togglingAi, setTogglingAi] = useState(false);
  const [markingHot, setMarkingHot] = useState(false);
  const [clockTick, setClockTick] = useState(Date.now());
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setClockTick(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await db
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data?.organization_id) {
        toast.error("No fue posible identificar la organización del usuario.");
        setLoading(false);
        return;
      }
      setOrganizationId(data.organization_id);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const loadInbox = useCallback(async (silent = false) => {
    if (!organizationId || !user) return;
    if (!silent) setRefreshing(true);

    const { data: messageRows, error: messagesError } = await db
      .from("wa_messages")
      .select("id,organization_id,lead_id,phone,role,content,sender,message_type,media_url,created_at")
      .eq("organization_id", organizationId)
      .not("lead_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(2000);

    if (messagesError) {
      toast.error("Conversaciones: " + messagesError.message);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const messages = ((messageRows ?? []) as WaMessage[]).reverse();
    const leadIds = Array.from(new Set(messages.map((m) => m.lead_id).filter(Boolean) as string[]));
    if (!leadIds.length) {
      setConversations([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const [{ data: leadRows, error: leadsError }, { data: readRows }] = await Promise.all([
      db
        .from("leads")
        .select("id,organization_id,full_name,phone,email,source,interest_operation,interest_type,interest_zone,budget_min,budget_max,currency,bedrooms,bathrooms,notes,temperature,status,property_id,ad_property_id,assigned_to_user_id,created_by,ai_paused,updated_at")
        .eq("organization_id", organizationId)
        .in("id", leadIds),
      db
        .from("wa_conversation_reads")
        .select("lead_id,last_read_at")
        .eq("user_id", user.id)
        .eq("organization_id", organizationId),
    ]);

    if (leadsError) {
      toast.error("Leads: " + leadsError.message);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const leads = (leadRows ?? []) as LeadRow[];
    const visibleLeadIds = leads.map((lead) => lead.id);
    const propertyIds = Array.from(new Set(leads.flatMap((lead) => [lead.property_id, lead.ad_property_id]).filter(Boolean) as string[]));

    const [propertiesResult, dealsResult] = await Promise.all([
      propertyIds.length
        ? db.from("properties").select("id,title,zone,price,currency,operation,cover_image").in("id", propertyIds)
        : Promise.resolve({ data: [] }),
      visibleLeadIds.length
        ? db.from("deals").select("lead_id,created_at,deal_stages(name,slug)").in("lead_id", visibleLeadIds).order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

    const propertyMap = new Map<string, PropertyRow>();
    ((propertiesResult.data ?? []) as PropertyRow[]).forEach((property) => propertyMap.set(property.id, property));

    const stageMap = new Map<string, StageRow>();
    ((dealsResult.data ?? []) as any[]).forEach((deal) => {
      if (!deal.lead_id || stageMap.has(deal.lead_id)) return;
      const stage = Array.isArray(deal.deal_stages) ? deal.deal_stages[0] : deal.deal_stages;
      stageMap.set(deal.lead_id, {
        lead_id: deal.lead_id,
        name: stage?.name ?? null,
        slug: stage?.slug ?? null,
      });
    });

    const readMap = new Map<string, string>();
    ((readRows ?? []) as { lead_id: string; last_read_at: string }[]).forEach((row) => readMap.set(row.lead_id, row.last_read_at));

    const messagesByLead = new Map<string, WaMessage[]>();
    messages.forEach((message) => {
      if (!message.lead_id) return;
      const list = messagesByLead.get(message.lead_id) ?? [];
      list.push(message);
      messagesByLead.set(message.lead_id, list);
    });

    const next = leads.map((lead) => {
      const thread = messagesByLead.get(lead.id) ?? [];
      const lastMessage = thread.at(-1) ?? null;
      const lastInbound = [...thread].reverse().find((message) => message.role === "user") ?? null;
      const lastReadAt = readMap.get(lead.id);
      const lastReadMs = lastReadAt ? new Date(lastReadAt).getTime() : 0;
      const unreadCount = thread.filter((message) => message.role === "user" && new Date(message.created_at).getTime() > lastReadMs).length;
      const linkedPropertyId = lead.property_id ?? lead.ad_property_id;
      return {
        lead,
        messages: thread,
        property: linkedPropertyId ? propertyMap.get(linkedPropertyId) ?? null : null,
        stage: stageMap.get(lead.id) ?? null,
        lastMessage,
        lastInboundAt: lastInbound?.created_at ?? null,
        unreadCount,
      } satisfies Conversation;
    }).sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
      const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
      return bTime - aTime;
    });

    setConversations(next);
    setSelectedLeadId((current) => current && next.some((item) => item.lead.id === current) ? current : next[0]?.lead.id ?? null);
    setLoading(false);
    setRefreshing(false);
  }, [organizationId, user]);

  useEffect(() => {
    if (!organizationId) return;
    void loadInbox(true);
  }, [organizationId, loadInbox]);

  useEffect(() => {
    if (!organizationId) return;
    const scheduleReload = () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      reloadTimer.current = setTimeout(() => void loadInbox(true), 250);
    };

    const channel = supabase
      .channel(`altum-wa-inbox-${organizationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "wa_messages",
        filter: `organization_id=eq.${organizationId}`,
      }, scheduleReload)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "leads",
        filter: `organization_id=eq.${organizationId}`,
      }, scheduleReload)
      .subscribe();

    return () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [organizationId, loadInbox]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.lead.id === selectedLeadId) ?? null,
    [conversations, selectedLeadId],
  );

  useEffect(() => {
    if (!selectedConversation || !user || !organizationId) return;
    const now = new Date().toISOString();
    setConversations((rows) => rows.map((row) => row.lead.id === selectedConversation.lead.id ? { ...row, unreadCount: 0 } : row));
    void db.from("wa_conversation_reads").upsert({
      user_id: user.id,
      lead_id: selectedConversation.lead.id,
      organization_id: organizationId,
      last_read_at: now,
      updated_at: now,
    }, { onConflict: "user_id,lead_id" });
  }, [selectedLeadId, selectedConversation?.lastMessage?.id, user, organizationId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: "end" });
  }, [selectedConversation?.lead.id, selectedConversation?.messages.length]);

  const filteredConversations = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return conversations;
    return conversations.filter((conversation) => [
      conversation.lead.full_name,
      conversation.lead.phone,
      conversation.lead.interest_zone,
      conversation.property?.title,
      conversation.lastMessage?.content,
    ].filter(Boolean).some((item) => String(item).toLowerCase().includes(value)));
  }, [conversations, query]);

  const windowOpen = useMemo(() => {
    if (!selectedConversation?.lastInboundAt) return false;
    const lastInboundMs = new Date(selectedConversation.lastInboundAt).getTime();
    return Number.isFinite(lastInboundMs) && clockTick - lastInboundMs < 24 * 60 * 60 * 1000;
  }, [selectedConversation?.lastInboundAt, clockTick]);

  async function readFunctionError(error: any) {
    try {
      const payload = await error?.context?.json?.();
      return payload?.message ?? payload?.error ?? error?.message ?? "No fue posible enviar el mensaje.";
    } catch {
      return error?.message ?? "No fue posible enviar el mensaje.";
    }
  }

  async function sendText() {
    if (!selectedConversation || !draft.trim() || sending) return;
    if (!windowOpen) return toast.error("La ventana de 24 horas está cerrada. Debe usarse una plantilla aprobada.");
    setSending(true);
    const content = draft.trim();
    const { data, error } = await supabase.functions.invoke("wa-send", {
      body: { lead_id: selectedConversation.lead.id, action: "send_text", content },
    });
    setSending(false);
    if (error) return toast.error(await readFunctionError(error));
    if (data?.error) return toast.error(data.message ?? data.error);
    setDraft("");
    toast.success("Mensaje enviado. El chat queda en control humano.");
    await loadInbox(true);
  }

  async function sendPhotos() {
    if (!selectedConversation || sendingPhotos) return;
    if (!windowOpen) return toast.error("La ventana de 24 horas está cerrada. Debe usarse una plantilla aprobada.");
    if (!selectedConversation.property) return toast.error("Este lead no tiene una propiedad enlazada con fotos.");
    setSendingPhotos(true);
    const { data, error } = await supabase.functions.invoke("wa-send", {
      body: { lead_id: selectedConversation.lead.id, action: "send_property_photos" },
    });
    setSendingPhotos(false);
    if (error) return toast.error(await readFunctionError(error));
    if (data?.error) return toast.error(data.message ?? data.error);
    toast.success(`Fotos enviadas: ${data?.sent ?? 0}. El chat queda en control humano.`);
    await loadInbox(true);
  }

  async function toggleAi() {
    if (!selectedConversation || togglingAi) return;
    setTogglingAi(true);
    const nextPaused = !selectedConversation.lead.ai_paused;
    const { error } = await db.from("leads").update({ ai_paused: nextPaused }).eq("id", selectedConversation.lead.id);
    setTogglingAi(false);
    if (error) return toast.error(error.message);
    toast.success(nextPaused ? "Control humano activado." : "Conversación devuelta a Andrea.");
    await loadInbox(true);
  }

  async function markHot() {
    if (!selectedConversation || markingHot) return;
    setMarkingHot(true);
    const leadId = selectedConversation.lead.id;
    const { error } = await db.from("leads").update({ temperature: "caliente" }).eq("id", leadId);
    if (!error) await db.from("deals").update({ temperature: "caliente" }).eq("lead_id", leadId);
    setMarkingHot(false);
    if (error) return toast.error(error.message);
    toast.success("Lead marcado como caliente.");
    await loadInbox(true);
  }

  return (
    <div className="container-altum py-6 max-w-[1600px]">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-secondary font-semibold">ALTUM · WhatsApp Inbox</p>
          <h1 className="font-display text-3xl text-primary">Conversaciones</h1>
          <p className="text-sm text-muted-foreground mt-1">Andrea filtra y califica; tú puedes entrar al chat y tomar el cierre cuando haga falta.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadInbox(false)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 h-10 px-4 border border-border rounded-sm bg-card hover:bg-muted text-sm disabled:opacity-60"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> Actualizar
        </button>
      </div>

      <div className="grid lg:grid-cols-[320px_minmax(0,1fr)_300px] min-h-[72vh] max-h-[78vh] border border-border rounded-sm overflow-hidden bg-card shadow-sm">
        <aside className="border-b lg:border-b-0 lg:border-r border-border flex flex-col min-h-[300px] lg:min-h-0">
          <div className="p-3 border-b border-border bg-background/80">
            <div className="flex items-center gap-2 h-10 px-3 border border-border rounded-sm bg-card">
              <Search size={15} className="text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar chat…"
                className="bg-transparent outline-none flex-1 text-sm min-w-0"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-10">Cargando conversaciones…</p>
            ) : filteredConversations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10 px-4">No hay conversaciones visibles para este usuario.</p>
            ) : filteredConversations.map((conversation) => {
              const active = conversation.lead.id === selectedLeadId;
              return (
                <button
                  key={conversation.lead.id}
                  type="button"
                  onClick={() => setSelectedLeadId(conversation.lead.id)}
                  className={`w-full text-left p-3 border-b border-border/70 transition-colors ${active ? "bg-secondary/10" : "hover:bg-muted/60"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <UserRound size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm text-primary truncate">{conversation.lead.full_name || conversation.lead.phone || "Sin nombre"}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(conversation.lastMessage?.created_at)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{conversation.lastMessage?.content || "Sin mensajes"}</p>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 border rounded-full ${tempClasses(conversation.lead.temperature)}`}>{conversation.lead.temperature ?? "tibio"}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${conversation.lead.ai_paused ? "bg-secondary/10 border-secondary/50 text-primary" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                          {conversation.lead.ai_paused ? "👤 Humano" : "🤖 Andrea"}
                        </span>
                        {conversation.unreadCount > 0 && (
                          <span className="ml-auto min-w-5 h-5 px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                            {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="flex flex-col min-h-[560px] lg:min-h-0 bg-muted/20">
          {!selectedConversation ? (
            <div className="flex-1 flex items-center justify-center text-center px-6">
              <div>
                <MessageSquareText size={36} className="mx-auto text-muted-foreground mb-3" />
                <p className="font-display text-xl text-primary">Selecciona una conversación</p>
                <p className="text-sm text-muted-foreground mt-1">Aquí verás el hilo completo en tiempo real.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-border bg-card flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-primary truncate">{selectedConversation.lead.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{selectedConversation.lead.phone ?? "Sin teléfono"}{selectedConversation.property ? ` · ${selectedConversation.property.title}` : ""}</p>
                </div>
                <div className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full border shrink-0 ${windowOpen ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"}`}>
                  {windowOpen ? <CheckCircle2 size={12} /> : <Clock3 size={12} />}
                  {windowOpen ? "Ventana 24 h abierta" : "Requiere plantilla"}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
                {selectedConversation.messages.map((message) => {
                  const fromClient = message.role === "user";
                  const fromHuman = !fromClient && message.sender === "humano";
                  const bubbleClass = fromClient
                    ? "bg-white border border-border text-primary"
                    : fromHuman
                      ? "bg-secondary/20 border border-secondary/40 text-primary"
                      : "bg-primary text-white";
                  return (
                    <div key={message.id} className={`flex ${fromClient ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[88%] sm:max-w-[75%] rounded-xl px-3 py-2 shadow-sm ${bubbleClass}`}>
                        <p className={`text-[10px] font-semibold mb-1 ${!fromClient && !fromHuman ? "text-secondary" : "text-muted-foreground"}`}>
                          {senderLabel(message, selectedConversation.lead.full_name)}
                        </p>
                        {message.message_type === "image" && message.media_url && (
                          <img src={message.media_url} alt="Imagen enviada por WhatsApp" className="rounded-lg max-h-72 w-auto object-cover mb-2" loading="lazy" />
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        <p className={`text-[10px] mt-1 text-right ${!fromClient && !fromHuman ? "text-white/60" : "text-muted-foreground"}`}>{formatTime(message.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={threadEndRef} />
              </div>

              <div className="border-t border-border bg-card p-3">
                {!windowOpen && (
                  <div className="mb-2 px-3 py-2 rounded-sm border border-amber-200 bg-amber-50 text-xs text-amber-900">
                    Meta no permite texto libre desde este inbox hasta que el cliente escriba nuevamente o se use una plantilla aprobada.
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void sendText();
                      }
                    }}
                    disabled={!windowOpen || sending}
                    placeholder={windowOpen ? "Escribe como asesor…" : "Ventana cerrada: usa una plantilla aprobada"}
                    className="flex-1 min-h-[44px] max-h-32 resize-y px-3 py-2.5 border border-border rounded-lg bg-background outline-none focus:ring-2 focus:ring-secondary/40 text-sm disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => void sendText()}
                    disabled={!windowOpen || !draft.trim() || sending}
                    className="h-11 w-11 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-40"
                    aria-label="Enviar mensaje"
                  >
                    {sending ? <RefreshCw size={17} className="animate-spin" /> : <Send size={17} />}
                  </button>
                </div>
              </div>
            </>
          )}
        </main>

        <aside className="border-t lg:border-t-0 lg:border-l border-border bg-background overflow-y-auto">
          {!selectedConversation ? (
            <div className="p-5 text-sm text-muted-foreground">Datos del lead</div>
          ) : (
            <div className="p-4 space-y-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Lead</p>
                <h2 className="font-display text-xl text-primary mt-1">{selectedConversation.lead.full_name}</h2>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`text-[11px] px-2 py-0.5 border rounded-full ${tempClasses(selectedConversation.lead.temperature)}`}>{selectedConversation.lead.temperature ?? "tibio"}</span>
                  <span className="text-[11px] px-2 py-0.5 border border-border rounded-full">{selectedConversation.stage?.name ?? selectedConversation.lead.status ?? "Sin etapa"}</span>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <Detail label="Teléfono" value={selectedConversation.lead.phone ?? "—"} />
                <Detail label="Zona" value={selectedConversation.lead.interest_zone ?? selectedConversation.property?.zone ?? "—"} />
                <Detail label="Interés" value={[selectedConversation.lead.interest_operation, selectedConversation.lead.interest_type].filter(Boolean).join(" · ") || "—"} />
                <Detail label="Presupuesto" value={formatMoney(selectedConversation.lead.budget_max, selectedConversation.lead.currency)} />
                <Detail label="Fuente" value={selectedConversation.lead.source ?? "—"} />
              </div>

              <div className="border border-border rounded-sm overflow-hidden">
                {selectedConversation.property?.cover_image && (
                  <img src={selectedConversation.property.cover_image} alt={selectedConversation.property.title} className="w-full h-28 object-cover" loading="lazy" />
                )}
                <div className="p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Propiedad</p>
                  <p className="font-semibold text-sm text-primary mt-1">{selectedConversation.property?.title ?? "Sin propiedad enlazada"}</p>
                  {selectedConversation.property && (
                    <p className="text-xs text-muted-foreground mt-1">{selectedConversation.property.zone} · {formatMoney(selectedConversation.property.price, selectedConversation.property.currency)}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => void toggleAi()}
                  disabled={togglingAi}
                  className={`w-full h-10 px-3 rounded-sm text-sm font-semibold inline-flex items-center justify-center gap-2 border ${selectedConversation.lead.ai_paused ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-primary text-white border-primary"} disabled:opacity-60`}
                >
                  {selectedConversation.lead.ai_paused ? <PlayCircle size={15} /> : <PauseCircle size={15} />}
                  {selectedConversation.lead.ai_paused ? "Devolver a Andrea" : "Tomar control"}
                </button>
                <button
                  type="button"
                  onClick={() => void markHot()}
                  disabled={markingHot}
                  className="w-full h-10 px-3 rounded-sm border border-border bg-card text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-muted disabled:opacity-60"
                >
                  <Flame size={15} /> Marcar caliente
                </button>
                <button
                  type="button"
                  onClick={() => void sendPhotos()}
                  disabled={!windowOpen || !selectedConversation.property || sendingPhotos}
                  className="w-full h-10 px-3 rounded-sm border border-secondary/60 bg-secondary/10 text-primary text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-secondary/20 disabled:opacity-40"
                >
                  {sendingPhotos ? <RefreshCw size={15} className="animate-spin" /> : <Camera size={15} />}
                  Enviar 3 fotos
                </button>
                <Link to="/vendedores/agenda" className="w-full h-10 px-3 rounded-sm border border-border bg-card text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-muted">
                  <CalendarDays size={15} /> Abrir Agenda
                </Link>
                <Link to="/vendedores/crm" className="w-full h-10 px-3 rounded-sm border border-border bg-card text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-muted">
                  <Building2 size={15} /> Ver en CRM
                </Link>
              </div>

              <div className={`rounded-sm border p-3 text-xs ${selectedConversation.lead.ai_paused ? "bg-secondary/10 border-secondary/40 text-primary" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}>
                <div className="flex items-center gap-2 font-semibold">
                  {selectedConversation.lead.ai_paused ? <UserRound size={14} /> : <Bot size={14} />}
                  {selectedConversation.lead.ai_paused ? "Atiende humano" : "Atiende Andrea"}
                </div>
                <p className="mt-1 opacity-80">Al enviar desde este inbox, el lead se marca automáticamente en control humano.</p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm text-primary mt-0.5 break-words">{value}</p>
    </div>
  );
}
