import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PROPERTY_TYPES } from "@/lib/properties";
import { UBICACIONES_PREDEFINIDAS, DEPARTAMENTOS } from "@/lib/locations";
import { MapPicker } from "@/components/map-picker";
import { toast } from "sonner";
import { ArrowLeft, Save, Upload } from "lucide-react";

export const Route = createFileRoute("/_vendedor/vendedores/propiedades/nueva")({
  head: () => ({ 
    meta: [
      { title: "Nueva Propiedad — ALTUM GROUP" }, 
      { name: "robots", content: "noindex" }
    ] 
  }),
  component: NewProperty,
});

const TYPE_MAP: Record<string, string> = { 
  Casa: "casa", 
  Apartamento: "apartamento", 
  Terreno: "terreno", 
  Local: "local" 
};

function NewProperty() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [otra, setOtra] = useState(false);
  const [f, setF] = useState({
    title: "",
    description: "",
    price: "",
    operation: "venta",
    type: "Casa",
    zone: "Zona 10",
    city: "Guatemala",
    address: "",
    bedrooms: "0",
    bathrooms: "0",
    area_m2: "0",
    parking: "0",
    year_built: "",
    status: "draft",
    latitude: 14.6349,
    longitude: -90.5069,
  });

  async function save() {
    if (!user) { 
      toast.error("Sesión expirada"); 
      return; 
    }

    if (!f.title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }
    if (!f.price || Number(f.price) <= 0) {
      toast.error("El precio debe ser mayor a 0");
      return;
    }
    if (!f.address.trim()) {
      toast.error("La dirección es obligatoria");
      return;
    }

    setSaving(true);
    try {
      const { data: newProp, error } = await supabase
        .from("properties")
        .insert({
          owner_id: user.id,
          title: f.title,
          description: f.description || null,
          price: Number(f.price),
          currency: "GTQ",
          operation: f.operation as "venta" | "renta",
          type: (TYPE_MAP[f.type] || "casa") as "casa" | "apartamento" | "terreno" | "local",
          zone: f.zone,
          city: f.city,
          latitude: f.latitude,
          longitude: f.longitude,
          address: f.address,
          bedrooms: Number(f.bedrooms),
          bathrooms: Number(f.bathrooms),
          area_m2: Number(f.area_m2),
          parking: Number(f.parking),
          year_built: f.year_built ? Number(f.year_built) : null,
          status: f.status as "draft" | "pending" | "published",
        })
        .select()
        .single();

      if (error) throw error;
      if (!newProp) throw new Error("No se pudo crear la propiedad");

      if (files.length > 0) {
        toast.info("Subiendo " + files.length + " imagen(es)...");
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const safeName = file.name.replace(/[^\w.-]/g, "_");
          const path = user.id + "/" + newProp.id + "/" + Date.now() + "-" + i + "-" + safeName;
          
          const { error: upErr } = await supabase.storage
            .from("property-images")
            .upload(path, file);
          
          if (upErr) {
            console.error("Error subiendo imagen:", upErr);
            continue;
          }
          
          const { data: pub } = supabase.storage
            .from("property-images")
            .getPublicUrl(path);
          
          await supabase.from("property_images").insert({
            property_id: newProp.id,
            url: pub.publicUrl,
            position: i,
          });
          
          if (i === 0) {
            await supabase
              .from("properties")
              .update({ cover_image: pub.publicUrl })
              .eq("id", newProp.id);
          }
        }
      }

      toast.success("¡Propiedad creada exitosamente!");
      nav({ to: "/vendedores/dashboard" });
    } catch (e: any) {
      toast.error(e.message || "Error al crear la propiedad");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container-altum py-12 max-w-3xl">
      <Link 
        to="/vendedores/dashboard" 
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6"
      >
        <ArrowLeft size={14} /> Volver al dashboard
      </Link>
      
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-secondary font-semibold">Portal Vendedor</p>
        <h1 className="font-display text-3xl text-primary">Nueva propiedad</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Completá los datos. Podés guardar como borrador y editarlo después.
        </p>
      </div>

      <div className="space-y-4 bg-card border border-border rounded-sm p-6">
        
        <Field label="Título *" hint="Ej: Casa moderna en Zona 14 con piscina">
          <input 
            value={f.title} 
            onChange={(e) => setF({ ...f, title: e.target.value })} 
            placeholder="Título atractivo de la propiedad"
            className="input-altum" 
          />
        </Field>

        <Field label="Descripción" hint="Describí características, vecindario, vista, etc.">
          <textarea 
            value={f.description} 
            onChange={(e) => setF({ ...f, description: e.target.value })} 
            placeholder="Descripción detallada..."
            className="input-altum min-h-[120px]" 
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Operación *">
            <select 
              value={f.operation} 
              onChange={(e) => setF({ ...f, operation: e.target.value })} 
              className="input-altum"
            >
              <option value="venta">Venta</option>
              <option value="renta">Renta</option>
            </select>
          </Field>
          
          <Field label="Tipo *">
            <select 
              value={f.type} 
              onChange={(e) => setF({ ...f, type: e.target.value })} 
              className="input-altum"
            >
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
              <select
                value={f.zone}
                onChange={(e) => { if (e.target.value === "__otra__") { setOtra(true); setF({ ...f, zone: "" }); } else setF({ ...f, zone: e.target.value }); }}
                className="input-altum"
              >
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
            <input 
              type="number" 
              value={f.price} 
              onChange={(e) => setF({ ...f, price: e.target.value })} 
              placeholder="0"
              className="input-altum" 
            />
          </Field>
          
          <Field label="Habitaciones">
            <input 
              type="number" 
              min="0"
              value={f.bedrooms} 
              onChange={(e) => setF({ ...f, bedrooms: e.target.value })} 
              className="input-altum" 
            />
          </Field>
          
          <Field label="Baños">
            <input 
              type="number" 
              step="0.5"
              min="0"
              value={f.bathrooms} 
              onChange={(e) => setF({ ...f, bathrooms: e.target.value })} 
              className="input-altum" 
            />
          </Field>
          
          <Field label="Área (m²)">
            <input 
              type="number" 
              min="0"
              value={f.area_m2} 
              onChange={(e) => setF({ ...f, area_m2: e.target.value })} 
              className="input-altum" 
            />
          </Field>
          
          <Field label="Parqueos">
            <input 
              type="number" 
              min="0"
              value={f.parking} 
              onChange={(e) => setF({ ...f, parking: e.target.value })} 
              className="input-altum" 
            />
          </Field>
          
          <Field label="Año construcción">
            <input 
              type="number" 
              min="1900"
              max={new Date().getFullYear() + 2}
              value={f.year_built} 
              onChange={(e) => setF({ ...f, year_built: e.target.value })} 
              placeholder="2020"
              className="input-altum" 
            />
          </Field>
          
          <Field label="Estado *">
            <select 
              value={f.status} 
              onChange={(e) => setF({ ...f, status: e.target.value })} 
              className="input-altum"
            >
              <option value="draft">Borrador (no se muestra)</option>
              <option value="pending">Pendiente de revisión</option>
              <option value="published">Publicada (visible al público)</option>
            </select>
          </Field>
        </div>

        <Field label="Dirección *" hint="Será visible al público">
          <input 
            value={f.address} 
            onChange={(e) => setF({ ...f, address: e.target.value })} 
            placeholder="Ej: 5ta avenida 12-34, Zona 14"
            className="input-altum" 
          />
        </Field>

        <div className="pt-4 border-t border-border">
          <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">
            Fotos de la propiedad
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            La primera foto será la portada. Podés agregar hasta 20 fotos.
          </p>
          
          <label className="inline-flex items-center gap-2 px-4 py-3 border-2 border-dashed border-secondary text-primary text-sm rounded-sm cursor-pointer hover:bg-secondary/10 transition-colors">
            <Upload size={16} /> 
            {files.length === 0 ? "Seleccionar fotos" : files.length + " foto(s) seleccionada(s)"}
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              className="hidden" 
              onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 20))} 
            />
          </label>
          
          {files.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {files.slice(0, 6).map((file, i) => (
                <div key={i} className="relative aspect-[4/3] rounded-sm overflow-hidden border border-border">
                  <img 
                    src={URL.createObjectURL(file)} 
                    alt={"Preview " + (i+1)}
                    className="w-full h-full object-cover" 
                  />
                  {i === 0 && (
                    <span className="absolute top-1 left-1 bg-secondary text-primary text-xs px-2 py-0.5 rounded-sm font-semibold">
                      Portada
                    </span>
                  )}
                </div>
              ))}
              {files.length > 6 && (
                <div className="aspect-[4/3] rounded-sm border border-border bg-muted flex items-center justify-center text-sm text-muted-foreground">
                  +{files.length - 6} más
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 mt-6 justify-end">
        <Link 
          to="/vendedores/dashboard" 
          className="px-5 py-2.5 border border-border rounded-sm text-sm hover:bg-muted"
        >
          Cancelar
        </Link>
        <button 
          onClick={save} 
          disabled={saving} 
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-secondary text-primary font-semibold rounded-sm hover:bg-secondary/85 disabled:opacity-60"
        >
          <Save size={14} /> 
          {saving ? "Guardando…" : "Crear propiedad"}
        </button>
      </div>

      <div className="mt-6 p-4 bg-muted border-l-4 border-secondary rounded-sm text-xs text-muted-foreground">
        <p className="font-semibold text-primary mb-1">💡 Tip:</p>
        <p>Si seleccionás "Borrador", la propiedad NO se mostrará al público hasta que cambies su estado. Útil para empezar y completar más datos después.</p>
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
