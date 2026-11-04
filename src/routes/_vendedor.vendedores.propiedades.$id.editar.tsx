import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PROPERTY_TYPES } from "@/lib/properties";
import { UBICACIONES_PREDEFINIDAS, DEPARTAMENTOS } from "@/lib/locations";
import { MapPicker } from "@/components/map-picker";
import { toast } from "sonner";
import { ArrowLeft, Save, Upload, Trash2, ImagePlus, ArrowUp, ArrowDown, Star, GripVertical, RefreshCw } from "lucide-react";

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
  const [existingImages, setExistingImages] = useState<{ id: string; url: string; position: number }[]>([]);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [otra, setOtra] = useState(false);
  const [f, setF] = useState({
    title: "", description: "", price: "", currency: "GTQ" as "GTQ" | "USD", operation: "venta", type: "Casa",
    zone: "Zona 10", city: "Guatemala", address: "", bedrooms: "0", bathrooms: "0",
    area_m2: "0", parking: "0", year_built: "", features: "", status: "draft",
    property_owner_name: "", property_owner_phone: "", property_owner_email: "", internal_notes: "",
    latitude: 14.6349, longitude: -90.5069,
  });

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any).from("properties").select("*, property_images(id,url,position)").eq("id", id).maybeSingle();
      if (error || !data) { toast.error("No se pudo cargar la propiedad"); nav({ to: "/vendedores/dashboard" }); return; }
      const row = data as any;
      setF({
        title: row.title ?? "",
        description: row.description ?? "",
        price: String(row.price ?? ""),
        currency: (row.currency === "USD" ? "USD" : "GTQ"),
        operation: row.operation ?? "venta",
        type: TYPE_REVERSE[row.type] ?? "Casa",
        zone: row.zone ?? "Zona 10",
        city: row.city ?? "Guatemala",
        address: row.address ?? "",
        bedrooms: String(row.bedrooms ?? 0),
        bathrooms: String(row.bathrooms ?? 0),
        area_m2: String(row.area_m2 ?? 0),
        parking: String(row.parking ?? 0),
        year_built: row.year_built ? String(row.year_built) : "",
        features: Array.isArray(row.features) ? row.features.join(", ") : "",
        status: row.status ?? "draft",
        property_owner_name: row.property_owner_name ?? "",
        property_owner_phone: row.property_owner_phone ?? "",
        property_owner_email: row.property_owner_email ?? "",
        internal_notes: row.internal_notes ?? "",
        latitude: Number(row.latitude ?? 14.6349),
        longitude: Number(row.longitude ?? -90.5069),
      });
      setOtra(!UBICACIONES_PREDEFINIDAS.includes(row.zone));
      const imgs = (data.property_images ?? []).sort((a: any, b: any) => a.position - b.position);
      setExistingImages(imgs.map((i: any) => ({ id: i.id, url: i.url, position: i.position })));
      setCoverImage(row.cover_image ?? imgs[0]?.url ?? null);
      setLoading(false);
    })();
  }, [id]);

  async function reloadImages() {
    const { data, error } = await (supabase as any)
      .from("property_images").select("id,url,position").eq("property_id", id).order("position");
    if (error) throw error;
    setExistingImages((data ?? []).map((img: any) => ({ id: img.id, url: img.url, position: img.position })));
    const { data: property } = await (supabase as any).from("properties").select("cover_image").eq("id", id).single();
    setCoverImage(property?.cover_image ?? null);
  }

  // Positions are persisted in Supabase; arrows also work on touch screens.
  async function reorderImages(next: { id: string; url: string; position: number }[]) {
    if (imageBusy) return;
    setImageBusy(true);
    try {
      const updates = next.map((img, position) =>
        (supabase as any).from("property_images").update({ position }).eq("id", img.id).eq("property_id", id)
      );
      const results = await Promise.all(updates);
      const failed = results.find((result: any) => result.error);
      if (failed) throw failed.error;
      setExistingImages(next.map((img, position) => ({ ...img, position })));
      toast.success("Orden de fotos actualizado");
    } catch (e: any) {
      toast.error(e.message || "No se pudo cambiar el orden");
      await reloadImages().catch(console.error);
    } finally {
      setImageBusy(false);
      setDraggedId(null);
    }
  }

  function moveImage(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= existingImages.length) return;
    const next = [...existingImages];
    [next[index], next[target]] = [next[target], next[index]];
    void reorderImages(next);
  }

  function dropImage(targetId: string) {
    if (!draggedId || draggedId === targetId) { setDraggedId(null); return; }
    const from = existingImages.findIndex((img) => img.id === draggedId);
    const to = existingImages.findIndex((img) => img.id === targetId);
    if (from < 0 || to < 0) { setDraggedId(null); return; }
    const next = [...existingImages];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    void reorderImages(next);
  }

  async function chooseCover(img: { id: string; url: string }) {
    if (imageBusy || coverImage === img.url) return;
    setImageBusy(true);
    try {
      const { error } = await (supabase as any).from("properties").update({ cover_image: img.url }).eq("id", id);
      if (error) throw error;
      setCoverImage(img.url);
      toast.success("Portada actualizada");
    } catch (e: any) {
      toast.error(e.message || "No se pudo actualizar la portada");
    } finally {
      setImageBusy(false);
    }
  }

  async function removeImage(imgId: string) {
    if (imageBusy || !confirm("¿Eliminar esta foto de la galería?")) return;
    setImageBusy(true);
    try {
      const img = existingImages.find((i) => i.id === imgId);
      if (!img) return;
      const remaining = existingImages.filter((i) => i.id !== imgId);
      const { error } = await (supabase as any).from("property_images").delete()
        .eq("id", imgId).eq("property_id", id);
      if (error) throw error;
      if (coverImage === img.url) {
        const nextCover = remaining[0]?.url ?? null;
        const { error: coverError } = await (supabase as any).from("properties")
          .update({ cover_image: nextCover }).eq("id", id);
        if (coverError) throw coverError;
        setCoverImage(nextCover);
      }
      const result = await Promise.all(remaining.map((item, position) =>
        (supabase as any).from("property_images").update({ position })
          .eq("id", item.id).eq("property_id", id)
      ));
      const failed = result.find((entry: any) => entry.error);
      if (failed) throw failed.error;
      setExistingImages(remaining.map((item, position) => ({ ...item, position })));
      toast.success("Foto eliminada de la galería");
    } catch (e: any) {
      toast.error(e.message || "No se pudo eliminar la foto");
      await reloadImages().catch(console.error);
    } finally {
      setImageBusy(false);
    }
  }

  async function replaceImage(imgId: string, file?: File) {
    if (!file || !user || imageBusy) return;
    if (!file.type.startsWith("image/")) return toast.error("Selecciona una imagen válida");
    setImageBusy(true);
    try {
      const original = existingImages.find((img) => img.id === imgId);
      if (!original) throw new Error("Imagen no encontrada");
      const safeName = file.name.replace(/[^\w.-]/g, "_");
      const filePath = `${user.id}/${id}/${Date.now()}-replacement-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("property-images").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: publicFile } = supabase.storage.from("property-images").getPublicUrl(filePath);
      const url = publicFile.publicUrl;
      const { error } = await (supabase as any).from("property_images")
        .update({ url }).eq("id", imgId).eq("property_id", id);
      if (error) throw error;
      if (coverImage === original.url) {
        const { error: coverError } = await (supabase as any).from("properties")
          .update({ cover_image: url }).eq("id", id);
        if (coverError) throw coverError;
        setCoverImage(url);
      }
      setExistingImages((items) => items.map((img) => img.id === imgId ? { ...img, url } : img));
      toast.success("Fotografía reemplazada");
    } catch (e: any) {
      toast.error(e.message || "No se pudo reemplazar la foto");
      await reloadImages().catch(console.error);
    } finally {
      setImageBusy(false);
    }
  }

  async function save() {
    if (!user || imageBusy) return;
    if (!f.title.trim()) return toast.error("Título obligatorio");
    if (!f.price || Number(f.price) <= 0) return toast.error("Precio inválido");
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("properties").update({
        title: f.title,
        description: f.description || null,
        price: Number(f.price),
        currency: f.currency,
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
        property_owner_name: f.property_owner_name.trim() || null,
        property_owner_phone: f.property_owner_phone.trim() || null,
        property_owner_email: f.property_owner_email.trim() || null,
        internal_notes: f.internal_notes.trim() || null,
        latitude: f.latitude,
        longitude: f.longitude,
      }).eq("id", id);
      if (error) throw error;

      if (files.length > 0) {
        const { data: currentImages, error: imagesError } = await (supabase as any)
          .from("property_images").select("position").eq("property_id", id).order("position", { ascending: false }).limit(1);
        if (imagesError) throw imagesError;
        const startPos = (currentImages?.[0]?.position ?? -1) + 1;
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const safeName = file.name.replace(/[^\w.-]/g, "_");
          const path = `${user.id}/${id}/${Date.now()}-${i}-${safeName}`;
          const { error: upErr } = await supabase.storage.from("property-images").upload(path, file);
          if (upErr) throw upErr;
          const { data: pub } = supabase.storage.from("property-images").getPublicUrl(path);
          const { error: insertError } = await supabase.from("property_images").insert({ property_id: id, url: pub.publicUrl, position: startPos + i });
          if (insertError) throw insertError;
          if (startPos + i === 0) {
            const { error: coverError } = await supabase.from("properties").update({ cover_image: pub.publicUrl }).eq("id", id);
            if (coverError) throw coverError;
          }
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

          <Field label={"Precio (" + f.currency + ") *"}>
            <div className="flex gap-2">
              <select value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value as "GTQ" | "USD" })} className="input-altum w-24">
                <option value="GTQ">Q</option>
                <option value="USD">$</option>
              </select>
              <input type="number" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} className="input-altum flex-1" />
            </div>
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

        <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-border">
          <div className="md:col-span-3">
            <p className="text-xs uppercase tracking-wider text-primary font-semibold">Datos internos de captación</p>
            <p className="text-xs text-muted-foreground mt-1">Privado para CRM, seguimiento y comisiones.</p>
          </div>
          <Field label="Propietario">
            <input value={f.property_owner_name} onChange={(e) => setF({ ...f, property_owner_name: e.target.value })} placeholder="Nombre propietario" className="input-altum" />
          </Field>
          <Field label="Teléfono propietario">
            <input value={f.property_owner_phone} onChange={(e) => setF({ ...f, property_owner_phone: e.target.value })} placeholder="WhatsApp / teléfono" className="input-altum" />
          </Field>
          <Field label="Correo propietario">
            <input value={f.property_owner_email} onChange={(e) => setF({ ...f, property_owner_email: e.target.value })} placeholder="correo@ejemplo.com" className="input-altum" />
          </Field>
          <div className="md:col-span-2 text-xs text-muted-foreground bg-muted/40 border border-border rounded-sm p-3">
            La comisión se calcula sola al cerrar la oportunidad: venta 5% (30% ALTUM / 70% asesor, o 35% + 35% si la captó uno y la cerró otro). Renta = una mensualidad, con la misma división.
          </div>
          <Field label="Notas internas">
            <textarea value={f.internal_notes} onChange={(e) => setF({ ...f, internal_notes: e.target.value })} placeholder="Llaves, negociación, comisión compartida, condiciones especiales…" className="input-altum min-h-[90px]" />
          </Field>
        </div>

        <div>
          <p className="block text-xs uppercase tracking-wider text-primary font-semibold mb-2">Ubicación en el mapa</p>
          <p className="text-xs text-muted-foreground mb-2">Arrastra el pin o haz clic en el mapa para fijar la ubicación exacta.</p>
          <MapPicker lat={f.latitude} lng={f.longitude} onChange={(lat, lng) => setF((s) => ({ ...s, latitude: lat, longitude: lng }))} />
          <p className="text-xs text-muted-foreground mt-2">Lat: {f.latitude.toFixed(6)} · Lng: {f.longitude.toFixed(6)}</p>
        </div>

        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-primary font-semibold">Administrar fotografías ({existingImages.length})</p>
              <p className="text-xs text-muted-foreground mt-1">Reemplaza, elimina, elige la portada o cambia el orden. También puedes arrastrar desde una computadora.</p>
            </div>
            {imageBusy && <RefreshCw size={18} className="animate-spin text-secondary shrink-0" aria-label="Actualizando fotos" />}
          </div>
          {existingImages.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Aún no hay fotos. Puedes agregarlas abajo.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {existingImages.map((img, i) => (
                <div key={img.id} draggable={!imageBusy}
                  onDragStart={() => setDraggedId(img.id)}
                  onDragEnd={() => setDraggedId(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); dropImage(img.id); }}
                  className={`border rounded-md overflow-hidden bg-card ${draggedId === img.id ? "opacity-50 border-secondary" : "border-border"}`}>
                  <div className="relative aspect-[4/3]">
                    <img src={img.url} alt={`Foto ${i + 1} de la propiedad`} className="h-full w-full object-cover" />
                    <span className="absolute top-2 left-2 rounded bg-primary/85 px-2 py-1 text-xs text-white flex items-center gap-1">
                      <GripVertical size={12} /> Foto {i + 1}
                    </span>
                    {coverImage === img.url && (
                      <span className="absolute top-2 right-2 rounded bg-secondary text-primary px-2 py-1 text-xs font-semibold flex items-center gap-1">
                        <Star size={12} fill="currentColor" /> Portada
                      </span>
                    )}
                  </div>
                  <div className="p-2 grid grid-cols-2 gap-2">
                    <button type="button" disabled={imageBusy || coverImage === img.url}
                      onClick={() => chooseCover(img)}
                      className="inline-flex items-center justify-center gap-1 rounded border border-border px-2 py-2 text-xs disabled:opacity-50 hover:bg-muted">
                      <Star size={13} /> Portada
                    </button>
                    <label className={`inline-flex items-center justify-center gap-1 rounded border border-border px-2 py-2 text-xs hover:bg-muted cursor-pointer ${imageBusy ? "opacity-50 pointer-events-none" : ""}`}>
                      <ImagePlus size={13} /> Reemplazar
                      <input type="file" accept="image/*" className="sr-only" disabled={imageBusy}
                        onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; void replaceImage(img.id, file); }} />
                    </label>
                    <div className="flex gap-1">
                      <button type="button" title="Mover arriba" aria-label={`Mover foto ${i + 1} arriba`} disabled={imageBusy || i === 0}
                        onClick={() => moveImage(i, -1)} className="flex-1 inline-flex items-center justify-center rounded border border-border py-2 disabled:opacity-30 hover:bg-muted">
                        <ArrowUp size={14} />
                      </button>
                      <button type="button" title="Mover abajo" aria-label={`Mover foto ${i + 1} abajo`} disabled={imageBusy || i === existingImages.length - 1}
                        onClick={() => moveImage(i, 1)} className="flex-1 inline-flex items-center justify-center rounded border border-border py-2 disabled:opacity-30 hover:bg-muted">
                        <ArrowDown size={14} />
                      </button>
                    </div>
                    <button type="button" disabled={imageBusy}
                      onClick={() => removeImage(img.id)}
                      className="inline-flex items-center justify-center gap-1 rounded border border-red-300 text-red-700 px-2 py-2 text-xs disabled:opacity-50 hover:bg-red-50">
                      <Trash2 size={13} /> Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">Los cambios de portada, orden y eliminación se guardan al momento. Las nuevas fotos y los datos del formulario se guardan con “Guardar cambios”.</p>
        </div>

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
        <button onClick={save} disabled={saving || imageBusy} className="inline-flex items-center gap-2 px-6 py-2.5 bg-secondary text-primary font-semibold rounded-sm hover:bg-secondary/85 disabled:opacity-60">
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
