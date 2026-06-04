import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Eye, Mail, Phone, ShieldCheck, Send, Home } from "lucide-react";

interface Submission {
  id: string; contact_name: string; contact_email: string; contact_phone: string | null;
  property_type: string; operation: string; zone: string; address: string | null;
  bedrooms: number | null; bathrooms: number | null; area_m2: number | null; price: number | null;
  description: string | null; status: "nuevo" | "en_contacto" | "convertido" | "descartado";
  admin_notes: string | null; created_at: string;
}

export const Route = createFileRoute("/_admin/admin")({
  head: () => ({ meta: [{ title: "Admin — ALTUM GROUP" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

interface PendingProp {
  id: string; title: string; price: number; zone: string; status: string;
  operation: string; cover_image: string | null; created_at: string;
  views?: number; pdf_downloads?: number;
}
interface Inquiry {
  id: string; name: string; email: string; phone: string | null;
  message: string; created_at: string; contacted: boolean; property_id: string;
}
interface AdminReqRow {
  id: string; user_id: string; reason: string; status: "pending" | "approved" | "rejected";
  created_at: string; admin_notes: string | null;
  profile?: { full_name: string | null; phone: string | null } | null;
}

function AdminPage() {
  const [tab, setTab] = useState<"submissions" | "pending" | "all" | "inquiries" | "requests">("submissions");
  const [props, setProps] = useState<PendingProp[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [requests, setRequests] = useState<AdminReqRow[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  useEffect(() => { load(); }, [tab]);

  async function load() {
    setLoading(true);
    if (tab === "submissions") {
      const { data } = await supabase.from("property_submissions").select("*").order("created_at", { ascending: false }).limit(200);
      setSubmissions((data as Submission[]) ?? []);
    } else if (tab === "inquiries") {
      const { data } = await supabase.from("inquiries").select("*").order("created_at", { ascending: false }).limit(100);
      setInquiries((data as Inquiry[]) ?? []);
    } else if (tab === "requests") {
      const { data } = await supabase
        .from("admin_requests")
        .select("id,user_id,reason,status,created_at,admin_notes")
        .order("created_at", { ascending: false })
        .limit(100);
      const rows = (data as AdminReqRow[]) ?? [];
      if (rows.length) {
        const ids = [...new Set(rows.map((r) => r.user_id))];
        const { data: profs } = await supabase.from("profiles").select("user_id,full_name,phone").in("user_id", ids);
        const map = new Map((profs ?? []).map((p) => [p.user_id, p]));
        rows.forEach((r) => { r.profile = (map.get(r.user_id) as any) ?? null; });
      }
      setRequests(rows);
    } else {
      let q = supabase.from("properties").select("id,title,price,zone,status,operation,cover_image,created_at").order("created_at", { ascending: false }).limit(100);
      if (tab === "pending") q = q.in("status", ["pending", "draft"]);
      const { data } = await q;
      setProps((data as PendingProp[]) ?? []);
    }
    setLoading(false);
  }

  async function updateSubmission(id: string, patch: Partial<Submission>) {
    const { error } = await supabase.from("property_submissions").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Actualizado");
    load();
  }

  async function setStatus(id: string, status: "published" | "draft") {
    const { error } = await supabase.from("properties").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "published" ? "Publicada" : "Devuelta a borrador");
    load();
  }
  async function markContacted(id: string, v: boolean) {
    const { error } = await supabase.from("inquiries").update({ contacted: v }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }
  async function reviewRequest(id: string, status: "approved" | "rejected") {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("admin_requests")
      .update({ status, admin_notes: notesById[id] ?? null, reviewed_by: u.user?.id ?? null })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? "Solicitud aprobada — rol asignado" : "Solicitud rechazada");
    load();
  }

  return (
    <div className="container-altum py-12">
      <p className="text-xs uppercase tracking-widest text-secondary font-semibold">Panel ALTUM</p>
      <h1 className="font-display text-3xl text-primary mb-6">Administración</h1>

      <div className="flex gap-2 mb-8 border-b border-border flex-wrap">
        {[
          { k: "submissions", l: "Propuestas" },
          { k: "pending", l: "Pendientes" },
          { k: "all", l: "Todas" },
          { k: "inquiries", l: "Consultas" },
          { k: "requests", l: "Acceso admin" },
        ].map((t) => (
          <button key={t.k} onClick={() => setTab(t.k as typeof tab)} className={`px-4 py-2.5 text-sm font-semibold ${tab === t.k ? "text-primary border-b-2 border-secondary" : "text-muted-foreground"}`}>
            {t.l}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center py-12 text-muted-foreground">Cargando…</p>
      ) : tab === "submissions" ? (
        <div className="space-y-3">
          {submissions.length === 0 && <p className="text-center py-12 text-muted-foreground">Sin propuestas de clientes.</p>}
          {submissions.map((s) => {
            const waText = encodeURIComponent(
              `Hola ${s.contact_name}, soy de ALTUM. Recibimos tu propuesta de ${s.property_type} en ${s.zone}. Nos gustaría coordinar una visita para fotografía profesional.`
            );
            const waNum = (s.contact_phone || "").replace(/\D/g, "");
            return (
              <div key={s.id} className="bg-card border border-border rounded-sm p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-primary flex items-center gap-2">
                      <Home size={16} className="text-secondary" />
                      {s.property_type} en {s.operation} — {s.zone}
                    </p>
                    <p className="text-sm text-primary/80 mt-1">{s.contact_name}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                      <a href={`mailto:${s.contact_email}`} className="flex items-center gap-1 hover:text-primary"><Mail size={12} />{s.contact_email}</a>
                      {s.contact_phone && <span className="flex items-center gap-1"><Phone size={12} />{s.contact_phone}</span>}
                      <span>{new Date(s.created_at).toLocaleDateString()}</span>
                      <span className={`px-2 py-0.5 rounded-sm ${
                        s.status === "nuevo" ? "bg-amber-100 text-amber-800" :
                        s.status === "en_contacto" ? "bg-blue-100 text-blue-800" :
                        s.status === "convertido" ? "bg-green-100 text-green-800" :
                        "bg-gray-100 text-gray-700"
                      }`}>{s.status}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {waNum && (
                      <a href={`https://wa.me/${waNum}?text=${waText}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-green-600 text-white rounded-sm">
                        <Send size={12} /> WhatsApp
                      </a>
                    )}
                    <a href={`mailto:${s.contact_email}`} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 border border-border rounded-sm">
                      <Mail size={12} /> Email
                    </a>
                  </div>
                </div>
                <div className="mt-3 grid sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
                  <span>Habs: <b className="text-primary">{s.bedrooms ?? "—"}</b></span>
                  <span>Baños: <b className="text-primary">{s.bathrooms ?? "—"}</b></span>
                  <span>Área: <b className="text-primary">{s.area_m2 ? `${s.area_m2}m²` : "—"}</b></span>
                  <span>Precio: <b className="text-primary">{s.price ? `Q${Number(s.price).toLocaleString()}` : "—"}</b></span>
                </div>
                {s.address && <p className="mt-2 text-xs text-muted-foreground">Dirección: {s.address}</p>}
                {s.description && <p className="mt-2 text-sm text-primary/80 whitespace-pre-line border-l-2 border-secondary pl-3">{s.description}</p>}
                <div className="mt-3 flex gap-2 flex-wrap items-center">
                  <select
                    value={s.status}
                    onChange={(e) => updateSubmission(s.id, { status: e.target.value as Submission["status"] })}
                    className="text-xs h-8 px-2 border border-border rounded-sm bg-background"
                  >
                    <option value="nuevo">Nuevo</option>
                    <option value="en_contacto">En contacto</option>
                    <option value="convertido">Convertido</option>
                    <option value="descartado">Descartado</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Nota interna…"
                    defaultValue={s.admin_notes ?? ""}
                    onBlur={(e) => { if (e.target.value !== (s.admin_notes ?? "")) updateSubmission(s.id, { admin_notes: e.target.value }); }}
                    className="flex-1 min-w-[200px] text-xs h-8 px-2 border border-border rounded-sm bg-background"
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : tab === "inquiries" ? (
        <div className="space-y-3">
          {inquiries.length === 0 && <p className="text-center py-12 text-muted-foreground">Sin consultas.</p>}
          {inquiries.map((i) => (
            <div key={i.id} className="bg-card border border-border rounded-sm p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-display font-semibold text-primary">{i.name}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground mt-1 flex-wrap">
                    <span className="flex items-center gap-1"><Mail size={12} />{i.email}</span>
                    {i.phone && <span className="flex items-center gap-1"><Phone size={12} />{i.phone}</span>}
                    <span>{new Date(i.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link to="/propiedades/$id" params={{ id: i.property_id }} className="p-2 hover:bg-muted rounded-sm" aria-label="Ver propiedad"><Eye size={14} /></Link>
                  <button onClick={() => markContacted(i.id, !i.contacted)} className={`text-xs px-3 py-1.5 rounded-sm border ${i.contacted ? "bg-green-50 border-green-300 text-green-800" : "border-border text-muted-foreground"}`}>
                    {i.contacted ? "Contactado" : "Marcar contactado"}
                  </button>
                </div>
              </div>
              <p className="mt-3 text-sm text-primary/80 whitespace-pre-line">{i.message}</p>
            </div>
          ))}
        </div>
      ) : tab === "requests" ? (
        <div className="space-y-3">
          {requests.length === 0 && <p className="text-center py-12 text-muted-foreground">Sin solicitudes.</p>}
          {requests.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-sm p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <p className="font-display font-semibold text-primary flex items-center gap-2">
                    <ShieldCheck size={16} className="text-secondary" />
                    {r.profile?.full_name ?? "Vendedor"}
                  </p>
                  <div className="flex gap-4 text-xs text-muted-foreground mt-1 flex-wrap">
                    {r.profile?.phone && <span className="flex items-center gap-1"><Phone size={12} />{r.profile.phone}</span>}
                    <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    <span className={`px-2 py-0.5 rounded-sm ${
                      r.status === "pending" ? "bg-amber-100 text-amber-800" :
                      r.status === "approved" ? "bg-green-100 text-green-800" :
                      "bg-red-100 text-red-800"
                    }`}>{r.status}</span>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-sm text-primary/80 whitespace-pre-line border-l-2 border-secondary pl-3">{r.reason}</p>
              {r.admin_notes && r.status !== "pending" && (
                <p className="mt-2 text-xs italic text-muted-foreground">Nota: {r.admin_notes}</p>
              )}
              {r.status === "pending" && (
                <div className="mt-4 space-y-2">
                  <input
                    type="text"
                    placeholder="Nota interna (opcional)…"
                    value={notesById[r.id] ?? ""}
                    onChange={(e) => setNotesById((s) => ({ ...s, [r.id]: e.target.value }))}
                    className="w-full text-xs px-3 py-2 border border-border rounded-sm bg-background"
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => reviewRequest(r.id, "rejected")} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 border border-border rounded-sm">
                      <XCircle size={12} /> Rechazar
                    </button>
                    <button onClick={() => reviewRequest(r.id, "approved")} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-secondary text-primary font-semibold rounded-sm">
                      <CheckCircle2 size={12} /> Aprobar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-sm overflow-hidden">
          {props.length === 0 ? (
            <p className="p-12 text-center text-muted-foreground">Sin propiedades.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left p-4">Propiedad</th>
                  <th className="text-left p-4 hidden md:table-cell">Zona</th>
                  <th className="text-left p-4">Precio</th>
                  <th className="text-left p-4">Estado</th>
                  <th className="text-right p-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {props.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {p.cover_image && <img src={p.cover_image} alt="" className="w-12 h-12 object-cover rounded-sm" />}
                        <div>
                          <p className="font-semibold text-primary">{p.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">{p.operation}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell">{p.zone}</td>
                    <td className="p-4 font-semibold">Q{Number(p.price).toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-sm ${
                        p.status === "published" ? "bg-green-100 text-green-800" :
                        p.status === "pending" ? "bg-amber-100 text-amber-800" :
                        "bg-gray-100 text-gray-700"
                      }`}>{p.status}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <Link to="/propiedades/$id" params={{ id: p.id }} className="p-2 hover:bg-muted rounded-sm"><Eye size={14} /></Link>
                        {p.status !== "published" ? (
                          <button onClick={() => setStatus(p.id, "published")} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-secondary text-primary font-semibold rounded-sm">
                            <CheckCircle2 size={12} /> Aprobar
                          </button>
                        ) : (
                          <button onClick={() => setStatus(p.id, "draft")} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 border border-border rounded-sm">
                            <XCircle size={12} /> Despublicar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
