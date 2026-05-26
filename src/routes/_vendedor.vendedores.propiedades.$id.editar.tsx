import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ZONES, PROPERTY_TYPES } from "@/lib/properties";
import { toast } from "sonner";
import { ArrowLeft, Save, Trash2, Upload } from "lucide-react";

export const Route = createFileRoute("/_vendedor/vendedores/propiedades/$id/editar")({
  head: () => ({ meta: [{ title: "Editar propiedad — ALTUM GROUP" }, { name: "robots", content: "noindex" }] }),
  component: EditProperty,
});

const TYPE_MAP: Record<string, string> = { Casa: "casa", Apartamento: "apartamento", Terreno: "terreno", Local: "local" };
const TYPE_REV: Record<string, string> = { casa: "Casa", apartamento: "Apartamento", terreno: "Terreno", local: "Local", oficina: "Local", finca: "Casa" };

function EditProperty() {
  const { id } = Route.useParams();
  const { user, isAdmin } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<{ id: string; url: string }[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [f, setF] = useState({
    title: "", description: "", price: "", operation: "venta", type: "Casa",
    zone: "Zona 10", address: "", bedrooms: "0", bathrooms: "0", area_m2: "0", status: "draft",
  });

  useEffect(() => {
    (async () => {
      if (!user) return;

      let query = supabase.from("properties").select("*").eq("id", id);
      
      if (!isAdmin) {
        query = query.eq("owner_id", user.id);
      }
      
      const { data, error } = await query.single();
      
      if (error || !data) { 
        toast.error("Propiedad no encontrada o sin permisos"); 
        nav({ to: "/vendedores/dashboard" }); 
        return; 
      }
      
      setF({
        title: data.title ?? "",
        description: data.description ?? "",
        price: String(data.price),
        operation: data.operation,
        type: TYPE_REV[data.type] || "Casa",
        zone: data.zone,
        address: data.address ?? "",
        bedrooms: String(data.bedrooms ?? 0),
        bathrooms: String(data.bathrooms ?? 0),
        area_m2: String(data.area_m2 ?? 0),
        status: data.status,
      });
      const { data: imgs } = await supabase.from("property_images").select("id,url").eq("property_id", id).order("position");
      setImages(imgs ?? []);
      setLoading(false);
    })();
  }, [id, nav, user, isAdmin]);

  async function save() {
    if (!user) { 
      toast.error("Sesión expirada"); 
      return; 
    }
    
    setSaving(true);
    try {
      let updateQuery = supabase.from("properties").update({
        title: f.title,
        description: f.description || null,
        price: Number(f.price),
        operation: f.operation as "venta" | "renta",
        type: (TYPE_MAP[f.type] || "casa") as "casa" | "apartamento" | "terreno" | "local",
        zone: f.zone,
        address: f.address || null,
        bedrooms: Number(f.bedrooms),
        bathrooms: Number(f.bathrooms),
        area_m2: Number(f.area_m2),
        status: f.status as "draft" | "pending" | "published",
      }).eq("id", id);

      if (!isAdmin) {
        updateQuery = updateQuery.eq("owner_id", user.id);
      }

      const { error } = await updateQuery;
      if (error) throw error;

      if (newFiles.length > 0 && user) {
        for (let i = 0; i < newFiles.length; i++) {
          const file = newFiles[i];
          const path = ${user.id}/${id}/${Date.now()}-${i}-${file.name.replace(/[^\w.-]/g, "_")};
          const { error: up } = await supabase.storage.from("property-images").upload(path, file);
          if (up) continue;
          const { data: pub } = supabase.storage.from("property-images").getPublicUrl(path);
          await supabase.from("property_images").insert({ property_id: id, url: pub.publicUrl, position: images.length + i });
          if (images.length === 0 && i === 0) {
            await supabase.from("properties").update({ cover_image: pub.publicUrl }).eq("id", id);
          }
        }
      }
      toast.success("Cambios guardados");
      nav({ to: "/vendedores/dashboard" });
    } catch (e: any) {
      toast.error(e.message || "Error al guardar");
    } finally { setSaving(false); }
  }

  async function deleteImage(imgId: string) {
    if (!confirm("¿Eliminar esta foto?")) return;
    const { error } = await supabase.from("property_images").delete().eq("id", imgId);
    if (error) return toast.error(error.message);
    setImages(images.filter((i) => i.id !== imgId));
  }

  if (loading) return <div className="container-altum py-24 text-center text-muted-foreground">Cargando…</div>;

  return (
    <div className="container-altum py-12 max-w-3xl">
      <Link to="/vendedores/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft size={14} /> Volver al dashboard
      </Link>
      <h1 className="font-display text-3xl text-primary mb-8">Editar propiedad</h1>

      <div className="space-y-4 bg-card border border-border rounded-sm p-6">
        <Field label="Título"><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className="input-altum" /></Field>
        <Field label="Descripción"><textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="input-altum min-h-[120px]" /></Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Operación">
            <select value={f.operation} onChange={(e) => setF({ ...f, operation: e.target.value })} className="input-altum">
              <option value="venta">Venta</option>
              <option value="renta">Renta</option>
            </select>
          </Field>
          <Field label="Tipo">
            <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className="input-altum">
              {PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Zona">
            <select value={f.zone} onChange={(e) => setF({ ...f, zone: e.target.value })} className="input-altum">
              {ZONES.map((z) => <option key={z}>{z}</option>)}
            </select>
          </Field>
          <Field label="Precio (Q)"><input type="number" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} className="input-altum" /></Field>
          <Field label="Habitaciones"><input type="number" value={f.bedrooms} onChange={(e) => setF({ ...f, bedrooms: e.target.value })} className="input-altum" /></Field>
          <Field label="Baños"><input type="number" step="0.5" value={f.bathrooms} onChange={(e) => setF({ ...f, bathrooms: e.target.value })} className="input-altum" /></Field>
          <Field label="Área (m²)"><input type="number" value={f.area_m2} onChange={(e) => setF({ ...f, area_m2: e.target.value })} className="input-altum" /></Field>
          <Field label="Estado">
            <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className="input-altum">
              <option value="draft">Borrador</option>
              <option value="pending">Pendiente de revisión</option>
            </select>
          </Field>
        </div>
        <Field label="Dirección"><input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} className="input-altum" /></Field>

        <div>
          <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">Fotos actuales</p>
          {images.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin fotos.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {images.map((img) => (
                <div key={img.id} className="relative aspect-[4/3] rounded-sm overflow-hidden border border-border group">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => deleteImage(img.id)} className="absolute top-1 right-1 p-1.5 bg-black/60 text-white rounded-sm opacity-0 group-hover:opacity-100" aria-label="Eliminar"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          )}
          <label className="mt-3 inline-flex items-center gap-2 px-4 py-2 border border-dashed border-secondary text-primary text-sm rounded-sm cursor-pointer hover:bg-secondary/10">
            <Upload size={14} /> Agregar fotos
            <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => setNewFiles(Array.from(e.target.files ?? []))} />
          </label>
          {newFiles.length > 0 && <p className="text-xs text-muted-foreground mt-2">{newFiles.length} archivo(s) listos para subir.</p>}
        </div>
      </div>

      <div className="flex gap-3 mt-6 justify-end">
        <Link to="/vendedores/dashboard" className="px-5 py-2.5 border border-border rounded-sm text-sm">Cancelar</Link>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-6 py-2.5 bg-secondary text-primary font-semibold rounded-sm hover:bg-secondary/85 disabled:opacity-60">
          <Save size={14} /> {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider text-primary font-semibold mb-1">{label}</span>
      {children}
    </label>
  );
}
