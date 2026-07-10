import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Sparkles, Instagram, Facebook, Linkedin, Music2, Globe2,
  Calendar as CalendarIcon, Lightbulb, BarChart3, FileText,
  Plus, Trash2, Copy, ChevronLeft, ChevronRight, Loader2, Check,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

export const Route = createFileRoute("/_vendedor/vendedores/contenido")({
  head: () => ({ meta: [{ title: "Contenido — ALTUM GROUP" }, { name: "robots", content: "noindex" }] }),
  component: ContenidoPage,
});

// ---- Types (local; tables not in generated types) ----
type Network = "instagram" | "facebook" | "tiktok" | "linkedin" | "otro";
type PostStatus = "borrador" | "listo" | "publicado";
type IdeaStatus = "idea" | "en_progreso" | "usada";

interface ContentPost {
  id: string;
  title: string | null;
  caption: string | null;
  image_url: string | null;
  network: Network;
  scheduled_at: string | null;
  status: PostStatus;
  property_id: string | null;
  content_id: string | null;
  created_at: string;
}
interface ContentIdea {
  id: string;
  title: string;
  notes: string | null;
  status: IdeaStatus;
  created_at: string;
}
interface SocialMetric {
  id: string;
  network: Network;
  metric_date: string;
  followers: number | null;
  interactions: number | null;
  views: number | null;
  reach: number | null;
  posts_count: number | null;
}
interface PropertyContent {
  id: string;
  property_id: string | null;
  post_facebook_instagram: string | null;
  marketplace_copy: string | null;
  reel_script: string | null;
  hashtags: string | null;
  whatsapp_cta: string | null;
  short_description: string | null;
  commercial_hook: string | null;
  status: string | null;
}

const db = supabase as any;

// ---- Design tokens ----
const GOLD = "#C9A84C";
const NAV_BG = "#0A1226";
const CARD_BG = "#111A33";
const CARD_BORDER = "#1F2A48";
const TEXT_DIM = "#8FA0C2";

const NETWORKS: { key: Network; label: string; Icon: typeof Instagram; color: string }[] = [
  { key: "instagram", label: "Instagram", Icon: Instagram, color: "#E1306C" },
  { key: "facebook", label: "Facebook", Icon: Facebook, color: "#1877F2" },
  { key: "tiktok", label: "TikTok", Icon: Music2, color: "#EE1D52" },
  { key: "linkedin", label: "LinkedIn", Icon: Linkedin, color: "#0A66C2" },
  { key: "otro", label: "Otro", Icon: Globe2, color: "#94A3B8" },
];

function netMeta(n: Network) {
  return NETWORKS.find((x) => x.key === n) ?? NETWORKS[4];
}

function statusBadge(s: PostStatus) {
  if (s === "borrador") return { bg: "#3A3020", fg: "#E4C87A", label: "Borrador" };
  if (s === "listo") return { bg: "#3A2E10", fg: GOLD, label: "Listo" };
  return { bg: "#123321", fg: "#4ADE80", label: "Publicado" };
}

// ---- Root ----
function ContenidoPage() {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div className="min-h-[60vh] flex items-center justify-center" style={{ background: NAV_BG, color: TEXT_DIM }}>Cargando…</div>;
  if (!user || !isAdmin) return <Navigate to="/vendedores/dashboard" />;
  return <ContenidoStudio />;
}

function ContenidoStudio() {
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [metrics, setMetrics] = useState<SocialMetric[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [editing, setEditing] = useState<Partial<ContentPost> | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  async function loadAll() {
    setLoadingData(true);
    const [p, i, m] = await Promise.all([
      db.from("content_posts").select("*").order("scheduled_at", { ascending: true, nullsFirst: false }).limit(500),
      db.from("content_ideas").select("*").order("created_at", { ascending: false }).limit(300),
      db.from("social_metrics").select("*").order("metric_date", { ascending: true }).limit(500),
    ]);
    if (!p.error) setPosts((p.data ?? []) as ContentPost[]);
    if (!i.error) setIdeas((i.data ?? []) as ContentIdea[]);
    if (!m.error) setMetrics((m.data ?? []) as SocialMetric[]);
    setLoadingData(false);
  }

  useEffect(() => { loadAll(); }, []);

  function openNew(prefill?: Partial<ContentPost>) {
    setEditing({
      title: "", caption: "", network: "instagram", status: "borrador",
      scheduled_at: null, image_url: "", ...prefill,
    });
    setSheetOpen(true);
  }
  function openEdit(post: ContentPost) {
    setEditing(post);
    setSheetOpen(true);
  }

  return (
    <div style={{ background: NAV_BG, minHeight: "calc(100vh - 3.5rem)" }} className="text-white">
      <div className="container-altum py-6 md:py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={20} style={{ color: GOLD }} />
              <h1 className="font-display text-2xl md:text-3xl">Estudio de Contenido</h1>
            </div>
            <p className="text-sm" style={{ color: TEXT_DIM }}>
              Planifica, produce y publica el contenido premium de ALTUM.
            </p>
          </div>
          <button
            onClick={() => openNew()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors self-start md:self-auto"
            style={{ background: GOLD, color: NAV_BG }}
          >
            <Plus size={16} /> Nueva publicación
          </button>
        </div>

        <Tabs defaultValue="resumen" className="w-full">
          <TabsList
            className="w-full flex flex-wrap h-auto p-1 rounded-lg mb-6"
            style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
          >
            {[
              { v: "resumen", l: "Resumen", I: FileText },
              { v: "publicaciones", l: "Publicaciones", I: Instagram },
              { v: "calendario", l: "Calendario", I: CalendarIcon },
              { v: "ideas", l: "Ideas", I: Lightbulb },
              { v: "metricas", l: "Métricas", I: BarChart3 },
            ].map((t) => (
              <TabsTrigger
                key={t.v} value={t.v}
                className="flex-1 min-w-[110px] gap-1.5 data-[state=active]:shadow-none text-sm py-2"
                style={{ color: "#CBD5E1" }}
              >
                <t.I size={14} /> {t.l}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="resumen"><Resumen posts={posts} ideas={ideas} loading={loadingData} onEdit={openEdit} /></TabsContent>
          <TabsContent value="publicaciones"><Publicaciones posts={posts} loading={loadingData} onEdit={openEdit} onNew={() => openNew()} /></TabsContent>
          <TabsContent value="calendario"><Calendario posts={posts} onEdit={openEdit} onNew={openNew} /></TabsContent>
          <TabsContent value="ideas"><Ideas ideas={ideas} reload={loadAll} /></TabsContent>
          <TabsContent value="metricas"><Metricas metrics={metrics} loading={loadingData} /></TabsContent>
        </Tabs>
      </div>

      <PostSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        post={editing}
        onSaved={() => { setSheetOpen(false); loadAll(); }}
      />
      <style>{`
        [data-radix-popper-content-wrapper] { z-index: 60; }
        .altum-card { background: ${CARD_BG}; border: 1px solid ${CARD_BORDER}; }
        .altum-input { background: #0F1830; border: 1px solid ${CARD_BORDER}; color: white; }
        .altum-input:focus { outline: none; border-color: ${GOLD}; }
        [data-state="active"].contenido-trigger { background: ${GOLD} !important; color: ${NAV_BG} !important; }
      `}</style>
    </div>
  );
}

// ---- Resumen ----
function Resumen({ posts, ideas, loading, onEdit }: { posts: ContentPost[]; ideas: ContentIdea[]; loading: boolean; onEdit: (p: ContentPost) => void }) {
  const now = new Date();
  const weekAhead = new Date(Date.now() + 7 * 864e5);
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const semana = posts.filter((p) => p.scheduled_at && new Date(p.scheduled_at) >= now && new Date(p.scheduled_at) <= weekAhead && p.status !== "publicado").length;
  const borradores = posts.filter((p) => p.status === "borrador").length;
  const publicadosMes = posts.filter((p) => p.status === "publicado" && p.scheduled_at && new Date(p.scheduled_at) >= startMonth).length;

  const proximos = [...posts]
    .filter((p) => p.scheduled_at && new Date(p.scheduled_at) >= now)
    .sort((a, b) => (a.scheduled_at! < b.scheduled_at! ? -1 : 1))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard label="Programados esta semana" value={semana} />
        <StatCard label="Borradores pendientes" value={borradores} />
        <StatCard label="Publicados este mes" value={publicadosMes} />
        <StatCard label="Ideas guardadas" value={ideas.length} />
      </div>

      <div className="altum-card rounded-xl p-4 md:p-6">
        <h3 className="font-display text-lg mb-4">Próximas publicaciones</h3>
        {loading ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: TEXT_DIM }}><Loader2 className="animate-spin" size={14} /> Cargando…</div>
        ) : proximos.length === 0 ? (
          <EmptyState icon={CalendarIcon} title="Sin publicaciones programadas" hint="Crea una publicación para empezar." />
        ) : (
          <div className="grid gap-3">
            {proximos.map((p) => {
              const nm = netMeta(p.network); const sb = statusBadge(p.status);
              return (
                <button key={p.id} onClick={() => onEdit(p)} className="flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:brightness-110" style={{ background: "#0F1830", border: `1px solid ${CARD_BORDER}` }}>
                  <div className="w-14 h-14 shrink-0 rounded-md overflow-hidden flex items-center justify-center" style={{ background: "#1B2748" }}>
                    {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <Sparkles size={16} style={{ color: GOLD }} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate text-sm md:text-base">{p.title || "Sin título"}</div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: TEXT_DIM }}>
                      <nm.Icon size={12} style={{ color: nm.color }} /> {nm.label}
                      <span>•</span>
                      <span>{formatWhen(p.scheduled_at)}</span>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full shrink-0" style={{ background: sb.bg, color: sb.fg }}>{sb.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="altum-card rounded-xl p-4 md:p-5">
      <div className="text-xs md:text-sm mb-1" style={{ color: TEXT_DIM }}>{label}</div>
      <div className="font-display text-3xl md:text-4xl" style={{ color: GOLD }}>{value}</div>
    </div>
  );
}

// ---- Publicaciones ----
function Publicaciones({ posts, loading, onEdit, onNew }: { posts: ContentPost[]; loading: boolean; onEdit: (p: ContentPost) => void; onNew: () => void }) {
  const [net, setNet] = useState<"all" | Network>("all");
  const [st, setSt] = useState<"all" | PostStatus>("all");

  const filtered = posts.filter((p) => (net === "all" || p.network === net) && (st === "all" || p.status === st));

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={net} onChange={(e) => setNet(e.target.value as any)} className="altum-input rounded-md px-3 py-2 text-sm">
          <option value="all">Todas las redes</option>
          {NETWORKS.map((n) => <option key={n.key} value={n.key}>{n.label}</option>)}
        </select>
        <select value={st} onChange={(e) => setSt(e.target.value as any)} className="altum-input rounded-md px-3 py-2 text-sm">
          <option value="all">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="listo">Listo</option>
          <option value="publicado">Publicado</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: TEXT_DIM }}><Loader2 className="animate-spin" size={14} /> Cargando…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Instagram} title="Sin publicaciones" hint="Crea tu primera publicación premium." action={<button onClick={onNew} className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold" style={{ background: GOLD, color: NAV_BG }}><Plus size={14} /> Nueva</button>} />
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => {
            const nm = netMeta(p.network); const sb = statusBadge(p.status);
            return (
              <button key={p.id} onClick={() => onEdit(p)} className="altum-card rounded-xl overflow-hidden text-left transition-transform hover:-translate-y-0.5">
                <div className="aspect-square w-full flex items-center justify-center" style={{ background: "#0F1830" }}>
                  {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <Sparkles size={28} style={{ color: GOLD, opacity: 0.5 }} />}
                </div>
                <div className="p-3">
                  <div className="font-medium text-sm truncate">{p.title || "Sin título"}</div>
                  <div className="flex items-center justify-between mt-2 text-xs" style={{ color: TEXT_DIM }}>
                    <span className="inline-flex items-center gap-1"><nm.Icon size={12} style={{ color: nm.color }} /> {nm.label}</span>
                    <span>{formatWhen(p.scheduled_at)}</span>
                  </div>
                  <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full" style={{ background: sb.bg, color: sb.fg }}>{sb.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---- Calendario ----
function Calendario({ posts, onEdit, onNew }: { posts: ContentPost[]; onEdit: (p: ContentPost) => void; onNew: (prefill: Partial<ContentPost>) => void }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const year = cursor.getFullYear(); const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startDow = (first.getDay() + 6) % 7; // Monday start
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date(); const isToday = (d: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  const byDay = useMemo(() => {
    const map = new Map<number, ContentPost[]>();
    for (const p of posts) {
      if (!p.scheduled_at) continue;
      const d = new Date(p.scheduled_at);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(p);
      }
    }
    return map;
  }, [posts, year, month]);

  const monthLabel = cursor.toLocaleDateString("es-GT", { month: "long", year: "numeric" });

  return (
    <div className="altum-card rounded-xl p-3 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="p-2 rounded-md hover:bg-white/5"><ChevronLeft size={16} /></button>
        <div className="font-display text-lg capitalize">{monthLabel}</div>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="p-2 rounded-md hover:bg-white/5"><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 md:gap-2 text-[10px] md:text-xs mb-1" style={{ color: TEXT_DIM }}>
        {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map((d) => <div key={d} className="px-1 py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {Array.from({ length: startDow }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const list = byDay.get(day) ?? [];
          const has = list.length > 0;
          return (
            <button
              key={day}
              onClick={() => {
                if (list.length === 1) onEdit(list[0]);
                else if (list.length === 0) {
                  const d = new Date(year, month, day, 10, 0);
                  onNew({ scheduled_at: d.toISOString() });
                }
              }}
              className="min-h-[64px] md:min-h-[92px] rounded-md p-1 md:p-1.5 text-left flex flex-col gap-1 transition-colors"
              style={{
                background: has ? "#152047" : "#0F1830",
                border: isToday(day) ? `1.5px solid ${GOLD}` : `1px solid ${CARD_BORDER}`,
              }}
            >
              <div className="text-[11px] md:text-xs font-medium" style={{ color: isToday(day) ? GOLD : "white" }}>{day}</div>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {list.slice(0, 3).map((p) => {
                  const nm = netMeta(p.network);
                  return (
                    <div key={p.id} className="flex items-center gap-1 text-[9px] md:text-[10px] truncate" style={{ color: "#DDE5F5" }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: nm.color }} />
                      <span className="truncate">{p.title || "Sin título"}</span>
                    </div>
                  );
                })}
                {list.length > 3 && <div className="text-[9px]" style={{ color: TEXT_DIM }}>+{list.length - 3}</div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---- Ideas ----
function Ideas({ ideas, reload }: { ideas: ContentIdea[]; reload: () => Promise<void> }) {
  const [text, setText] = useState(""); const [saving, setSaving] = useState(false);

  async function add() {
    if (!text.trim()) return;
    setSaving(true);
    const { error } = await db.from("content_ideas").insert({ title: text.trim(), status: "idea" });
    setSaving(false);
    if (error) { toast.error("No se pudo guardar la idea"); return; }
    setText(""); toast.success("Idea guardada"); await reload();
  }
  async function updateStatus(id: string, s: IdeaStatus) {
    const { error } = await db.from("content_ideas").update({ status: s }).eq("id", id);
    if (error) { toast.error("No se pudo actualizar"); return; } await reload();
  }
  async function remove(id: string) {
    const { error } = await db.from("content_ideas").delete().eq("id", id);
    if (error) { toast.error("No se pudo eliminar"); return; } await reload();
  }

  return (
    <div className="space-y-4">
      <div className="altum-card rounded-xl p-4 flex flex-col md:flex-row gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Apunta una idea…" className="altum-input rounded-md px-3 py-2 text-sm flex-1" />
        <button onClick={add} disabled={saving || !text.trim()} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-50" style={{ background: GOLD, color: NAV_BG }}>
          {saving ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />} Guardar
        </button>
      </div>

      {ideas.length === 0 ? (
        <EmptyState icon={Lightbulb} title="Sin ideas todavía" hint="Captura la primera idea de contenido." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {ideas.map((it) => (
            <div key={it.id} className="altum-card rounded-xl p-4 flex flex-col gap-2">
              <div className="font-medium text-sm">{it.title}</div>
              {it.notes && <div className="text-xs" style={{ color: TEXT_DIM }}>{it.notes}</div>}
              <div className="flex items-center gap-2 mt-auto pt-2">
                <select value={it.status} onChange={(e) => updateStatus(it.id, e.target.value as IdeaStatus)} className="altum-input rounded-md px-2 py-1 text-xs flex-1">
                  <option value="idea">Idea</option>
                  <option value="en_progreso">En progreso</option>
                  <option value="usada">Usada</option>
                </select>
                <button onClick={() => remove(it.id)} className="p-1.5 rounded-md text-red-300 hover:bg-red-500/10" aria-label="Eliminar"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Métricas ----
function Metricas({ metrics, loading }: { metrics: SocialMetric[]; loading: boolean }) {
  if (loading) return <div className="flex items-center gap-2 text-sm" style={{ color: TEXT_DIM }}><Loader2 className="animate-spin" size={14} /> Cargando…</div>;
  if (metrics.length === 0) {
    return <EmptyState icon={BarChart3} title="Aún sin datos de redes" hint="Se conectarán vía Metricool/Meta próximamente." />;
  }

  // latest per network
  const latestByNet = new Map<Network, SocialMetric>();
  for (const m of metrics) {
    const cur = latestByNet.get(m.network as Network);
    if (!cur || cur.metric_date < m.metric_date) latestByNet.set(m.network as Network, m);
  }
  const seguidores = Array.from(latestByNet.values()).reduce((a, m) => a + (m.followers ?? 0), 0);
  const interactionAvg = Math.round(metrics.reduce((a, m) => a + (m.interactions ?? 0), 0) / metrics.length);
  const nowM = new Date().toISOString().slice(0, 7);
  const viewsMes = metrics.filter((m) => m.metric_date.startsWith(nowM)).reduce((a, m) => a + (m.views ?? 0), 0);

  // 30-day followers line
  const cutoff = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const lineData = metrics.filter((m) => m.metric_date >= cutoff).reduce<any[]>((acc, m) => {
    let row = acc.find((r) => r.date === m.metric_date);
    if (!row) { row = { date: m.metric_date }; acc.push(row); }
    row[m.network] = (row[m.network] ?? 0) + (m.followers ?? 0);
    return acc;
  }, []).sort((a, b) => (a.date < b.date ? -1 : 1));

  const barData = Array.from(latestByNet.entries()).map(([k, v]) => ({
    red: netMeta(k).label, seguidores: v.followers ?? 0, interacciones: v.interactions ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <StatCard label="Seguidores totales" value={seguidores} />
        <StatCard label="Interacciones promedio" value={interactionAvg} />
        <StatCard label="Visualizaciones del mes" value={viewsMes} />
      </div>
      <div className="altum-card rounded-xl p-4 md:p-6">
        <h3 className="font-display text-lg mb-4">Crecimiento de seguidores (30 días)</h3>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={lineData}>
              <CartesianGrid stroke="#1F2A48" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke={TEXT_DIM} fontSize={11} />
              <YAxis stroke={TEXT_DIM} fontSize={11} />
              <Tooltip contentStyle={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, color: "white" }} />
              <Legend />
              {NETWORKS.map((n) => <Line key={n.key} type="monotone" dataKey={n.key} stroke={n.color} strokeWidth={2} dot={false} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="altum-card rounded-xl p-4 md:p-6">
        <h3 className="font-display text-lg mb-4">Comparación por red</h3>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={barData}>
              <CartesianGrid stroke="#1F2A48" strokeDasharray="3 3" />
              <XAxis dataKey="red" stroke={TEXT_DIM} fontSize={11} />
              <YAxis stroke={TEXT_DIM} fontSize={11} />
              <Tooltip contentStyle={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, color: "white" }} />
              <Legend />
              <Bar dataKey="seguidores" fill={GOLD} />
              <Bar dataKey="interacciones" fill="#7DA7FF" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ---- Sheet: crear/editar ----
function PostSheet({ open, onOpenChange, post, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; post: Partial<ContentPost> | null; onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Partial<ContentPost>>({});
  const [saving, setSaving] = useState(false);
  const [pkg, setPkg] = useState<PropertyContent | null>(null);
  const [pkgLoading, setPkgLoading] = useState(false);

  useEffect(() => {
    setDraft(post ?? {});
    setPkg(null);
    if (post?.content_id) {
      setPkgLoading(true);
      db.from("property_content").select("*").eq("id", post.content_id).maybeSingle().then((r: any) => {
        if (!r.error && r.data) setPkg(r.data as PropertyContent);
        setPkgLoading(false);
      });
    }
  }, [post]);

  const isEdit = Boolean(draft.id);

  async function save() {
    setSaving(true);
    const payload: any = {
      title: draft.title ?? null,
      caption: draft.caption ?? null,
      image_url: draft.image_url || null,
      network: draft.network ?? "instagram",
      status: draft.status ?? "borrador",
      scheduled_at: draft.scheduled_at || null,
    };
    let error;
    if (isEdit) ({ error } = await db.from("content_posts").update(payload).eq("id", draft.id));
    else ({ error } = await db.from("content_posts").insert(payload));
    setSaving(false);
    if (error) { toast.error("No se pudo guardar"); return; }
    toast.success(isEdit ? "Publicación actualizada" : "Publicación creada");
    onSaved();
  }
  async function remove() {
    if (!draft.id) return;
    if (!confirm("¿Eliminar esta publicación?")) return;
    const { error } = await db.from("content_posts").delete().eq("id", draft.id);
    if (error) { toast.error("No se pudo eliminar"); return; }
    toast.success("Eliminada"); onSaved();
  }

  const scheduledLocal = draft.scheduled_at ? toLocalInput(draft.scheduled_at) : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0" style={{ background: NAV_BG, color: "white", borderColor: CARD_BORDER }}>
        <SheetHeader className="p-5 border-b" style={{ borderColor: CARD_BORDER }}>
          <SheetTitle className="text-white font-display">{isEdit ? "Editar publicación" : "Nueva publicación"}</SheetTitle>
        </SheetHeader>
        <div className="p-5 space-y-4">
          <Field label="Título">
            <input value={draft.title ?? ""} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} className="altum-input w-full rounded-md px-3 py-2 text-sm" />
          </Field>
          <Field label="Caption">
            <textarea value={draft.caption ?? ""} onChange={(e) => setDraft((d) => ({ ...d, caption: e.target.value }))} rows={5} className="altum-input w-full rounded-md px-3 py-2 text-sm" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Red">
              <select value={draft.network ?? "instagram"} onChange={(e) => setDraft((d) => ({ ...d, network: e.target.value as Network }))} className="altum-input w-full rounded-md px-2 py-2 text-sm">
                {NETWORKS.map((n) => <option key={n.key} value={n.key}>{n.label}</option>)}
              </select>
            </Field>
            <Field label="Estado">
              <select value={draft.status ?? "borrador"} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as PostStatus }))} className="altum-input w-full rounded-md px-2 py-2 text-sm">
                <option value="borrador">Borrador</option>
                <option value="listo">Listo</option>
                <option value="publicado">Publicado</option>
              </select>
            </Field>
          </div>
          <Field label="Programar para">
            <input type="datetime-local" value={scheduledLocal} onChange={(e) => setDraft((d) => ({ ...d, scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null }))} className="altum-input w-full rounded-md px-3 py-2 text-sm" />
          </Field>
          <Field label="Imagen (URL)">
            <input value={draft.image_url ?? ""} onChange={(e) => setDraft((d) => ({ ...d, image_url: e.target.value }))} placeholder="https://…" className="altum-input w-full rounded-md px-3 py-2 text-sm" />
          </Field>

          {draft.content_id && (
            <div className="pt-2">
              <div className="text-xs mb-2" style={{ color: TEXT_DIM }}>Paquete de contenido de la propiedad</div>
              {pkgLoading ? (
                <div className="flex items-center gap-2 text-sm" style={{ color: TEXT_DIM }}><Loader2 className="animate-spin" size={14} /> Cargando paquete…</div>
              ) : pkg ? (
                <Accordion type="multiple" className="rounded-md" style={{ background: "#0F1830", border: `1px solid ${CARD_BORDER}` }}>
                  <PkgItem label="Post Facebook / Instagram" value={pkg.post_facebook_instagram} v="a" />
                  <PkgItem label="Marketplace" value={pkg.marketplace_copy} v="b" />
                  <PkgItem label="Guion Reel" value={pkg.reel_script} v="c" />
                  <PkgItem label="Hashtags" value={pkg.hashtags} v="d" />
                  <PkgItem label="WhatsApp CTA" value={pkg.whatsapp_cta} v="e" />
                  <PkgItem label="Descripción corta" value={pkg.short_description} v="f" />
                  <PkgItem label="Gancho comercial" value={pkg.commercial_hook} v="g" />
                </Accordion>
              ) : (
                <div className="text-sm" style={{ color: TEXT_DIM }}>Paquete no disponible.</div>
              )}
            </div>
          )}
        </div>
        <div className="p-5 border-t flex items-center gap-2 sticky bottom-0" style={{ borderColor: CARD_BORDER, background: NAV_BG }}>
          {isEdit && <button onClick={remove} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm text-red-300 hover:bg-red-500/10"><Trash2 size={14} /> Eliminar</button>}
          <div className="flex-1" />
          <button onClick={() => onOpenChange(false)} className="px-3 py-2 rounded-md text-sm" style={{ color: TEXT_DIM }}>Cancelar</button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-50" style={{ background: GOLD, color: NAV_BG }}>
            {saving ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />} Guardar
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PkgItem({ label, value, v }: { label: string; value: string | null; v: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  async function copy() {
    try { await navigator.clipboard.writeText(value!); setCopied(true); setTimeout(() => setCopied(false), 1500); toast.success(`${label} copiado`); }
    catch { toast.error("No se pudo copiar"); }
  }
  return (
    <AccordionItem value={v} className="border-b last:border-b-0" style={{ borderColor: CARD_BORDER }}>
      <AccordionTrigger className="px-3 py-2 text-sm hover:no-underline text-white">{label}</AccordionTrigger>
      <AccordionContent className="px-3 pb-3">
        <div className="whitespace-pre-wrap text-sm mb-2" style={{ color: "#DDE5F5" }}>{value}</div>
        <button onClick={copy} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold" style={{ background: GOLD, color: NAV_BG }}>
          {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copiado" : "Copiar"}
        </button>
      </AccordionContent>
    </AccordionItem>
  );
}

// ---- Utils ----
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs mb-1" style={{ color: TEXT_DIM }}>{label}</div>
      {children}
    </label>
  );
}

function EmptyState({ icon: Icon, title, hint, action }: { icon: typeof Sparkles; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="altum-card rounded-xl p-8 text-center">
      <Icon size={32} className="mx-auto mb-3" style={{ color: GOLD, opacity: 0.7 }} />
      <div className="font-display text-base">{title}</div>
      {hint && <div className="text-sm mt-1" style={{ color: TEXT_DIM }}>{hint}</div>}
      {action}
    </div>
  );
}

function formatWhen(iso: string | null) {
  if (!iso) return "Sin fecha";
  try { return new Date(iso).toLocaleString("es-GT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return "Sin fecha"; }
}
function toLocalInput(iso: string) {
  const d = new Date(iso); const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
