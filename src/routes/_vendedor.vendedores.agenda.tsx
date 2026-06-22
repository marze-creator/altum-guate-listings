import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { CalendarPlus, CheckCircle2, Clock, Plus, RefreshCw } from "lucide-react";
import { ACTIVITY_TYPES, CrmActivity, safeDate } from "@/lib/crm";

export const Route = createFileRoute("/_vendedor/vendedores/agenda")({
  head: () => ({ meta: [{ title: "Agenda CRM — ALTUM GROUP" }, { name: "robots", content: "noindex" }] }),
  component: AgendaPage,
});

function AgendaPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [deals, setDeals] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", type: "seguimiento", due_at: "", deal_id: "", notes: "" });

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  async function load() {
    setLoading(true);
    const db = supabase as any;
    const [{ data: activityRows, error }, { data: dealRows }] = await Promise.all([
      db
        .from("activities")
        .select("id,title,type,status,notes,due_at,deal_id,lead_id,assigned_to_user_id,created_at,deals(id,title),leads(id,full_name,phone)")
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(200),
      db.from("deals").select("id,title").order("created_at", { ascending: false }).limit(200),
    ]);
    if (error) toast.error(error.message + ". Revisa si ya aplicaste la migración del CRM.");
    setActivities((activityRows ?? []) as CrmActivity[]);
    setDeals((dealRows ?? []) as { id: string; title: string }[]);
    setLoading(false);
  }

  async function createActivity() {
    if (!user) return;
    if (!form.title.trim()) return toast.error("Agrega un título");
    const { error } = await (supabase as any).from("activities").insert({
      title: form.title.trim(),
      type: form.type,
      due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
      deal_id: form.deal_id || null,
      notes: form.notes.trim() || null,
      assigned_to_user_id: user.id,
      created_by: user.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Actividad creada");
    setShowForm(false);
    setForm({ title: "", type: "seguimiento", due_at: "", deal_id: "", notes: "" });
    load();
  }

  async function completeActivity(id: string) {
    const { error } = await (supabase as any).from("activities").update({ status: "completada", completed_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Actividad completada");
    load();
  }

  const grouped = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return {
      overdue: activities.filter((item) => item.status !== "completada" && item.due_at && new Date(item.due_at) < new Date()),
      today: activities.filter((item) => item.status !== "completada" && item.due_at && new Date(item.due_at) <= today && new Date(item.due_at) >= new Date(new Date().setHours(0, 0, 0, 0))),
      upcoming: activities.filter((item) => item.status !== "completada" && (!item.due_at || new Date(item.due_at) > today)),
      done: activities.filter((item) => item.status === "completada"),
    };
  }, [activities]);

  return (
    <div className="container-altum py-10 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-secondary font-semibold">ALTUM CRM</p>
          <h1 className="font-display text-3xl text-primary">Agenda y tareas</h1>
          <p className="text-sm text-muted-foreground mt-1">Seguimientos, llamadas, visitas y recordatorios del asesor.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="inline-flex items-center gap-2 h-10 px-4 border border-border rounded-sm hover:bg-muted text-sm"><RefreshCw size={16} /> Actualizar</button>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 h-10 px-4 bg-secondary text-primary font-semibold rounded-sm"><Plus size={16} /> Nueva actividad</button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Metric label="Vencidas" value={String(grouped.overdue.length)} danger />
        <Metric label="Hoy" value={String(grouped.today.length)} />
        <Metric label="Próximas" value={String(grouped.upcoming.length)} />
        <Metric label="Completadas" value={String(grouped.done.length)} />
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-sm p-5 mb-6">
          <h2 className="font-display text-xl text-primary mb-4 flex items-center gap-2"><CalendarPlus size={18} className="text-secondary" /> Nueva actividad</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <input className="input-altum" placeholder="Título *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <select className="input-altum" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{ACTIVITY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select>
            <input className="input-altum" type="datetime-local" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} />
            <select className="input-altum md:col-span-2" value={form.deal_id} onChange={(e) => setForm({ ...form, deal_id: e.target.value })}>
              <option value="">Sin oportunidad vinculada</option>
              {deals.map((deal) => <option key={deal.id} value={deal.id}>{deal.title}</option>)}
            </select>
            <input className="input-altum" placeholder="Notas" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="h-10 px-4 border border-border rounded-sm">Cancelar</button>
            <button onClick={createActivity} className="h-10 px-4 bg-primary text-white rounded-sm font-semibold">Guardar</button>
          </div>
        </div>
      )}

      {loading ? <p className="text-center py-16 text-muted-foreground">Cargando agenda…</p> : (
        <div className="space-y-8">
          <Section title="Vencidas" items={grouped.overdue} onComplete={completeActivity} empty="Sin tareas vencidas." />
          <Section title="Hoy" items={grouped.today} onComplete={completeActivity} empty="Sin tareas para hoy." />
          <Section title="Próximas" items={grouped.upcoming} onComplete={completeActivity} empty="Sin próximas tareas." />
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return <div className="bg-card border border-border rounded-sm p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p><p className={`font-display text-3xl mt-1 ${danger ? "text-red-700" : "text-primary"}`}>{value}</p></div>;
}

function Section({ title, items, onComplete, empty }: { title: string; items: CrmActivity[]; onComplete: (id: string) => void; empty: string }) {
  return (
    <div>
      <h2 className="font-display text-xl text-primary mb-3">{title}</h2>
      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {items.length === 0 ? <p className="p-8 text-center text-muted-foreground text-sm">{empty}</p> : items.map((item) => (
          <div key={item.id} className="p-4 border-t first:border-t-0 border-border flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold text-primary flex items-center gap-2"><Clock size={14} className="text-secondary" /> {item.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.type} · {safeDate(item.due_at)} {item.leads?.full_name ? `· ${item.leads.full_name}` : ""}</p>
              {item.deals?.title && <p className="text-xs text-muted-foreground mt-1">Oportunidad: {item.deals.title}</p>}
              {item.notes && <p className="text-sm text-primary/80 mt-2 whitespace-pre-line">{item.notes}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              {item.deal_id && <Link to="/vendedores/crm" className="text-xs px-3 py-1.5 border border-border rounded-sm">Ver CRM</Link>}
              <button onClick={() => onComplete(item.id)} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-green-600 text-white rounded-sm"><CheckCircle2 size={12} /> Completar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
