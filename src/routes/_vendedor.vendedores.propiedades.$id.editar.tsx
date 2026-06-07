import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PROPERTY_TYPES } from "@/lib/properties";
import { UBICACIONES_PREDEFINIDAS, DEPARTAMENTOS } from "@/lib/locations";
import { MapPicker } from "@/components/map-picker";
import { toast } from "sonner";
import { ArrowLeft, Save, Upload, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_vendedor/vendedores/propiedades/$id/editar")({
  head: () => ({ meta: [{ title: "Editar propiedad — ALTUM GROUP" }, { name: "robots", content: "noindex" }] }),
  component: EditProperty,
});

const TYPE_MAP: Record<string, string> = { Casa: "casa", Apartamento: "apartamento", Terreno: "terreno", Local: "local" };
const TYPE_REVERSE: Record<string, string> = { casa: "Casa", apartamento: "Apartamento", terreno: "Terreno", local: "Local", oficina: "Local" };

function EditProperty() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<{ id: string; url: string }[]>([]);
  const [otra, setOtra] = useState(false);
  const [f, setF] = useState({
    title: "", description: "", price: "", currency: "GTQ" as "GTQ" | "USD", operation: "venta", type: "Casa",
    zone: "Zona 10", city: "Guatemala", address: "", bedrooms: "0", bathrooms: "0",
    area_m2: "0", parking: "0", year_built: "", features: "", status: "draft",
    latitude: 14.6349, longitude: -90.5069,
  });

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("properties").select("*, property_images(id,url,position)").eq("id", id).maybeSingle();
      if (error || !data) { toast.error("No se pudo cargar la propiedad"); nav({ to: "/vendedores/dashboard" }); return; }
      setF({
        title: data.title ?? "",
        description: data.description ?? "",
        price: String(data.price ?? ""),
        currency: (data.currency === "USD" ? "USD" : "GTQ"),
        type: TYPE_REVERSE[data.type] ?? "Casa",
        zone: data.zone ?? "Zona 10",
        city: data.city ?? "Guatemala",
        address: data.address ?? "",
        bedrooms: String(data.bedrooms ?? 0),
        bathrooms: String(data.bathrooms ?? 0),
        area_m2: String(data.area_m2 ?? 0),
        parking: String(data.parking ?? 0),
        year_built: data.year_built ? String(data.year_built) : "",
        features: Array.isArray(data.features) ? data.features.join(", ") : "",
        status: data.status ?? "draft",
        latitude: Number(data.latitude ?? 14.6349),
        longitude: Number(data.longitude ?? -90.5069),
      });
      setOtra(!UBICACIONES_PREDEFINIDAS.includes(data.zone));
      const imgs = (data.property_images ?? []).sort((a: any, b: any) => a.position - b.position);
      setExistingImages(imgs.map((i: any) => ({ id: i.id, url: i.url })));
      setLoading(false);
    })();
  }, [id]);

  async function removeImage(imgId: string) {
    if (!confirm("¿Eliminar esta imagen?")) return;
    const { error } = await supabase.from("property_images").delete().eq("id", imgId);
    if (error) return toast.error(error.message);
    setExistingImages((s) => s.filter((i) => i.id !== imgId));
    toast.success("Imagen eliminada");
  }

  async function save() {
    if (!user) return;
    if (!f.title.trim()) return toast.error("Título obligatorio");
    if (!f.price || Number(f.price) <= 0) return toast.error("Precio inválido");
    setSaving(true);
    try {
      const { error } = await supabase.from("properties").update({
        title: f.title,
        description: f.description || null,
        price: Number(f.price),
        operation: f.operation as any,
        type: (TYPE_MAP[f.type] || "casa") as any,
        zone: f.zone,
        city: f.city,
        address: f.address || null,
        bedrooms: Number(f.bedrooms),
        bathrooms: Number(f.bathrooms),
        area_m2: Number(f.area_m2),
        parking: Number(f.parking),
        year_built: f.year_built ? Number(f.year_built) : null,
        features: f.features.split(",").map((s) => s.trim()).filter(Boolean),
        status: f.status as any,
        latitude: f.latitude,
        longitude: f.longitude,
      }).eq("id", id);
      if (error) throw error;

      if (files.length > 0) {
        const startPos = existingImages.length;
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const safeName = file.name.replace(/[^\w.-]/g, "_");
          const path = `${user.id}/${id}/${Date.now()}-${i}-${safeName}`;
          const { error: upErr } = await supabase.storage.from("property-images").upload(path, file);
          if (upErr) { console.error(upErr); continue; }
          const { data: pub } = supabase.storage.from("property-images").getPublicUrl(path);
          await supabase.from("property_images").insert({ property_id: id, url: pub.publicUrl, position: startPos + i });
          if (startPos + i === 0) await supabase.from("properties").update({ cover_image: pub.publicUrl }).eq("id", id);
        }
      }

      toast.success("Cambios guardados");
      nav({ to: "/vendedores/dashboard" });
    } catch (e: any) {
      toast.error(e.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="container-altum py-20 text-center text-muted-foreground">Cargando…</div>;

  return (
    <div className="container-altum py-12 max-w-3xl">
      <Link to="/vendedores/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft size={14} /> Volver al dashboard
      </Link>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-secondary font-semibold">Portal Vendedor</p>
        <h1 className="font-display text-3xl text-primary">Editar propiedad</h1>
      </div>

      <div className="space-y-4 bg-card border border-border rounded-sm p-6">
        <Field label="Título *">
          <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className="input-altum" />
        </Field>
        <Field label="Descripción">
          <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="input-altum min-h-[120px]" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Operación *">
            <select value={f.operation} onChange={(e) => setF({ ...f, operation: e.target.value })} className="input-altum">
              <option value="venta">Venta</option><option value="renta">Renta</option>
            </select>
          </Field>
          <Field label="Tipo *">
            <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className="input-altum">
              {PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>

          <Field label="Departamento *">
            <select value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} className="input-altum">
              {DEPARTAMENTOS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Zona / Municipio *">
            {otra ? (
              <input value={f.zone} onChange={(e) => setF({ ...f, zone: e.target.value })} placeholder="Especifica ubicación" className="input-altum" />
            ) : (
              <select value={f.zone} onChange={(e) => { if (e.target.value === "__otra__") { setOtra(true); setF({ ...f, zone: "" }); } else setF({ ...f, zone: e.target.value }); }} className="input-altum">
                <optgroup label="Ciudad de Guatemala">
                  {UBICACIONES_PREDEFINIDAS.slice(0, 25).map((z) => <option key={z}>{z}</option>)}
                </optgroup>
                <optgroup label="Municipios / Frecuentes">
                  {UBICACIONES_PREDEFINIDAS.slice(25).map((z) => <option key={z}>{z}</option>)}
                </optgroup>
                <option value="__otra__">Otra ubicación…</option>
              </select>
            )}
            {otra && <button type="button" onClick={() => { setOtra(false); setF({ ...f, zone: "Zona 10" }); }} className="text-xs text-secondary mt-1">← Volver al listado</button>}
          </Field>

          <Field label="Precio (Q) *">
            <input type="number" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} className="input-altum" />
          </Field>
          <Field label="Estado *">
            <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className="input-altum">
              <option value="draft">Borrador</option><option value="pending">Pendiente</option><option value="published">Publicada</option>
            </select>
          </Field>

          <Field label="Habitaciones"><input type="number" min="0" value={f.bedrooms} onChange={(e) => setF({ ...f, bedrooms: e.target.value })} className="input-altum" /></Field>
          <Field label="Baños"><input type="number" step="0.5" min="0" value={f.bathrooms} onChange={(e) => setF({ ...f, bathrooms: e.target.value })} className="input-altum" /></Field>
          <Field label="Área (m²)"><input type="number" min="0" value={f.area_m2} onChange={(e) => setF({ ...f, area_m2: e.target.value })} className="input-altum" /></Field>
          <Field label="Parqueos"><input type="number" min="0" value={f.parking} onChange={(e) => setF({ ...f, parking: e.target.value })} className="input-altum" /></Field>
          <Field label="Año construcción"><input type="number" value={f.year_built} onChange={(e) => setF({ ...f, year_built: e.target.value })} className="input-altum" /></Field>
        </div>

        <Field label="Dirección"><input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} className="input-altum" /></Field>

        <Field label="Amenidades / Características" hint="Separá con comas. Aparecen en el detalle y en el PDF.">
          <input value={f.features} onChange={(e) => setF({ ...f, features: e.target.value })} placeholder="Piscina, Gimnasio, Seguridad 24/7" className="input-altum" />
        </Field>

        <div>
          <p className="block text-xs uppercase tracking-wider text-primary font-semibold mb-2">Ubicación en el mapa</p>
          <p className="text-xs text-muted-foreground mb-2">Arrastra el pin o haz clic en el mapa para fijar la ubicación exacta.</p>
          <MapPicker lat={f.latitude} lng={f.longitude} onChange={(lat, lng) => setF((s) => ({ ...s, latitude: lat, longitude: lng }))} />
          <p className="text-xs text-muted-foreground mt-2">Lat: {f.latitude.toFixed(6)} · Lng: {f.longitude.toFixed(6)}</p>
        </div>

        {existingImages.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">Fotos actuales</p>
            <div className="grid grid-cols-3 gap-2">
              {existingImages.map((img, i) => (
                <div key={img.id} className="relative aspect-[4/3] rounded-sm overflow-hidden border border-border group">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  {i === 0 && <span className="absolute top-1 left-1 bg-secondary text-primary text-xs px-2 py-0.5 rounded-sm font-semibold">Portada</span>}
                  <button onClick={() => removeImage(img.id)} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-sm opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-border">
          <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">Agregar más fotos</p>
          <label className="inline-flex items-center gap-2 px-4 py-3 border-2 border-dashed border-secondary text-primary text-sm rounded-sm cursor-pointer hover:bg-secondary/10">
            <Upload size={16} /> {files.length === 0 ? "Seleccionar fotos" : files.length + " seleccionada(s)"}
            <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 20))} />
          </label>
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

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider text-primary font-semibold mb-1">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground mt-1">{hint}</span>}
    </label>
  );
}
