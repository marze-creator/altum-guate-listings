import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Eye, LogOut, ShieldCheck, MailCheck, MailWarning, Clock, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_vendedor/vendedores/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — ALTUM GROUP" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

interface AdminReq { id: string; status: "pending" | "approved" | "rejected"; reason: string; created_at: string; admin_notes: string | null; }

interface Prop {
  id: string;
  title: string;
  price: number;
  currency: string | null;
  zone: string;
  status: string;
  operation: string;
  views: number;
  cover_image: string | null;
}

function Dashboard() {
  const { user, signOut, isAdmin } = useAuth();
  const [props, setProps] = useState<Prop[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminReq, setAdminReq] = useState<AdminReq | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [reason, setReason] = useState("");
  const [showForm, setShowForm] = useState(false);

  const emailConfirmed = !!user?.email_confirmed_at;

  useEffect(() => {
    if (!user) return;
    load();
    loadAdminReq();
  }, [user]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("properties")
      .select("id,title,price,currency,zone,status,operation,views,cover_image")
      .eq("owner_id", user!.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setProps(data ?? []);
    setLoading(false);
  }

  async function loadAdminReq() {
    if (isAdmin) return;
    const { data } = await supabase
      .from("admin_requests")
      .select("id,status,reason,created_at,admin_notes")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setAdminReq((data as AdminReq) ?? null);
  }

  async function submitAdminRequest() {
    if (reason.trim().length < 10) return toast.error("Explica brevemente tu solicitud (mín. 10 caracteres).");
    if (reason.length > 1000) return toast.error("Máximo 1000 caracteres.");
    setRequesting(true);
    const { error } = await supabase.from("admin_requests").insert({ user_id: user!.id, reason: reason.trim() });
    setRequesting(false);
    if (error) return toast.error(error.message);
    toast.success("Solicitud enviada. Un administrador la revisará.");
    setReason("");
    setShowForm(false);
    loadAdminReq();
  }

  async function resendVerification() {
    const { error } = await supabase.auth.resend({ type: "signup", email: user!.email! });
    if (error) return toast.error(error.message);
    toast.success("Correo de verificación reenviado.");
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta propiedad?")) return;
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Propiedad eliminada");
    load();
  }

  const published = props.filter((p) => p.status === "published");
  const sale = published.filter((p) => p.operation === "venta");
  const rent = published.filter((p) => p.operation === "renta");
  const sum = (arr: Prop[], curr: "GTQ" | "USD") =>
    arr.filter((p) => (p.currency ?? "GTQ") === curr).reduce((s, p) => s + Number(p.price || 0), 0);
  const fmt = (n: number, c: "GTQ" | "USD") =>
    new Intl.NumberFormat("es-GT", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n);
  const potentialSaleGTQ = sum(sale, "GTQ");
  const potentialSaleUSD = sum(sale, "USD");
  const potentialRentGTQ = sum(rent, "GTQ");
  const potentialRentUSD = sum(rent, "USD");
  const stats = {
    total: props.length,
    published: published.length,
    pending: props.filter((p) => p.status === "pending" || p.status === "draft").length,
    views: props.reduce((s, p) => s + p.views, 0),
  };

  const emailBoxClass = emailConfirmed 
    ? "mb-4 rounded-sm border p-4 flex items-start gap-3 bg-green-50 border-green-200"
    : "mb-4 rounded-sm border p-4 flex items-start gap-3 bg-amber-50 border-amber-300";

  const emailTextClass = emailConfirmed ? "text-sm font-semibold text-green-900" : "text-sm font-semibold text-amber-900";
  const emailDescClass = emailConfirmed ? "text-xs mt-0.5 text-green-800" : "text-xs mt-0.5 text-amber-800";

  function statusBadgeClass(status: string) {
    if (status === "published") return "text-xs px-2 py-1 rounded-sm bg-green-100 text-green-800";
    if (status === "pending") return "text-xs px-2 py-1 rounded-sm bg-amber-100 text-amber-800";
    return "text-xs px-2 py-1 rounded-sm bg-gray-100 text-gray-700";
  }

  return (
    <div className="container-altum py-12">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-secondary font-semibold">Portal Vendedor</p>
          <h1 className="font-display text-3xl text-primary">Mis Propiedades</h1>
          <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/vendedores/propiedades/nueva" className="inline-flex items-center gap-2 h-10 px-4 bg-secondary text-primary font-semibold rounded-sm hover:bg-secondary/85">
            <Plus size={16} /> Nueva propiedad
          </Link>
          <button onClick={signOut} className="inline-flex items-center gap-2 h-10 px-4 border border-border rounded-sm hover:bg-muted text-sm">
            <LogOut size={16} /> Salir
          </button>
        </div>
      </div>

      <div className={emailBoxClass}>
        {emailConfirmed ? <MailCheck className="text-green-700 shrink-0" size={20} /> : <MailWarning className="text-amber-700 shrink-0" size={20} />}
        <div className="flex-1 min-w-0">
          <p className={emailTextClass}>
            {emailConfirmed ? "Correo verificado" : "Correo sin verificar"}
          </p>
          <p className={emailDescClass}>
            {emailConfirmed
              ? "Confirmado el " + new Date(user!.email_confirmed_at!).toLocaleDateString()
              : "Confirma tu correo para activar todas las funcionalidades de tu cuenta."}
          </p>
        </div>
        {!emailConfirmed && (
          <button onClick={resendVerification} className="text-xs font-semibold px-3 py-1.5 bg-amber-700 text-white rounded-sm hover:bg-amber-800">
            Reenviar correo
          </button>
        )}
      </div>

      {!isAdmin && (
        <div className="mb-8 bg-card border border-border rounded-sm p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="text-secondary shrink-0" size={20} />
            <div className="flex-1 min-w-0">
              <p className="font-display font-semibold text-primary">Acceso administrativo</p>
              {!adminReq && (
                <p className="text-xs text-muted-foreground mt-0.5">Solicita permisos de administrador para aprobar propiedades y gestionar consultas.</p>
              )}
              {adminReq?.status === "pending" && (
                <p className="text-xs text-amber-700 mt-1 flex items-center gap-1.5"><Clock size={12} /> Solicitud en revisión desde el {new Date(adminReq.created_at).toLocaleDateString()}.</p>
              )}
              {adminReq?.status === "rejected" && (
                <div className="text-xs text-red-700 mt-1">
                  <p className="flex items-center gap-1.5"><XCircle size={12} /> Solicitud rechazada.</p>
                  {adminReq.admin_notes && <p className="mt-1 italic">"{adminReq.admin_notes}"</p>}
                </div>
              )}
              {adminReq?.status === "approved" && (
                <p className="text-xs text-green-700 mt-1 flex items-center gap-1.5"><CheckCircle2 size={12} /> Aprobada. Recarga la sesión para ver el panel admin.</p>
              )}
            </div>
            {(!adminReq || adminReq.status === "rejected") && !showForm && (
              <button onClick={() => setShowForm(true)} className="text-xs font-semibold px-3 py-1.5 border border-secondary text-primary rounded-sm hover:bg-secondary/10">
                Solicitar acceso
              </button>
            )}
          </div>
          {showForm && (
            <div className="mt-4 space-y-2">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={1000}
                placeholder="Cuéntanos por qué necesitas acceso administrativo (mín. 10 caracteres)…"
                className="w-full min-h-[100px] rounded-sm border border-border bg-background p-3 text-sm"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setShowForm(false); setReason(""); }} className="text-xs px-3 py-1.5 border border-border rounded-sm">Cancelar</button>
                <button onClick={submitAdminRequest} disabled={requesting} className="text-xs font-semibold px-3 py-1.5 bg-secondary text-primary rounded-sm disabled:opacity-50">
                  {requesting ? "Enviando…" : "Enviar solicitud"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { l: "Total", v: stats.total },
          { l: "Publicadas", v: stats.published },
          { l: "Pendientes", v: stats.pending },
          { l: "Vistas", v: stats.views },
        ].map((s) => (
          <div key={s.l} className="bg-card border border-border rounded-sm p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.l}</p>
            <p className="font-display text-3xl text-primary mt-2">{s.v}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-sm overflow-hidden">
        {loading ? (
          <p className="p-12 text-center text-muted-foreground">Cargando…</p>
        ) : props.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground mb-4">Aún no has publicado propiedades.</p>
            <Link to="/vendedores/propiedades/nueva" className="inline-flex items-center gap-2 h-10 px-4 bg-secondary text-primary font-semibold rounded-sm">
              <Plus size={16} /> Publicar la primera
            </Link>
          </div>
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
                  <td className="p-4 font-semibold">Q{p.price.toLocaleString()}</td>
                  <td className="p-4">
                    <span className={statusBadgeClass(p.status)}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <Link to="/propiedades/$id" params={{ id: p.id }} className="p-2 hover:bg-muted rounded-sm" aria-label="Ver">
                        <Eye size={16} />
                      </Link>
                      <Link to="/vendedores/propiedades/$id/editar" params={{ id: p.id }} className="p-2 hover:bg-muted rounded-sm" aria-label="Editar">
                        <Edit size={16} />
                      </Link>
                      <button onClick={() => remove(p.id)} className="p-2 hover:bg-muted rounded-sm text-red-600" aria-label="Eliminar">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
