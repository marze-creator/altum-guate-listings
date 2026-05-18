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
  zone: string;
  status: string;
  operation: string;
  views: number;
  cover_image: string | null;
}

function Dashboard() {
  const { user, signOut } = useAuth();
  const [props, setProps] = useState<Prop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("properties")
      .select("id,title,price,zone,status,operation,views,cover_image")
      .eq("owner_id", user!.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setProps(data ?? []);
    setLoading(false);
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta propiedad?")) return;
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Propiedad eliminada");
    load();
  }

  const stats = {
    total: props.length,
    published: props.filter((p) => p.status === "published").length,
    pending: props.filter((p) => p.status === "pending" || p.status === "draft").length,
    views: props.reduce((s, p) => s + p.views, 0),
  };

  return (
    <div className="container-altum py-12">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-secondary font-semibold">Portal Vendedor</p>
          <h1 className="font-display text-3xl text-primary">Mis Propiedades</h1>
          <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/publica" className="inline-flex items-center gap-2 h-10 px-4 bg-secondary text-primary font-semibold rounded-sm hover:bg-secondary/85">
            <Plus size={16} /> Nueva propiedad
          </Link>
          <button onClick={signOut} className="inline-flex items-center gap-2 h-10 px-4 border border-border rounded-sm hover:bg-muted text-sm">
            <LogOut size={16} /> Salir
          </button>
        </div>
      </div>

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
            <Link to="/publica" className="inline-flex items-center gap-2 h-10 px-4 bg-secondary text-primary font-semibold rounded-sm">
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
                    <span className={`text-xs px-2 py-1 rounded-sm ${
                      p.status === "published" ? "bg-green-100 text-green-800" :
                      p.status === "pending" ? "bg-amber-100 text-amber-800" :
                      "bg-gray-100 text-gray-700"
                    }`}>
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
