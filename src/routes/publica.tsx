import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { ZONES, PROPERTY_TYPES } from "@/lib/properties";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/publica")({
  head: () => ({
    meta: [
      { title: "Publica tu Propiedad — ALTUM GROUP" },
      { name: "description", content: "Publica tu propiedad con ALTUM GROUP y alcanza compradores e inquilinos calificados." },
      { property: "og:url", content: "/publica" },
    ],
    links: [{ rel: "canonical", href: "/publica" }],
  }),
  component: PublicaPage,
});

const STEPS = ["Tipo", "Ubicación", "Características", "Precio", "Fotos", "Descripción", "Confirmar"];

const TYPE_MAP: Record<string, string> = {
  "Casa": "casa", "Apartamento": "apartamento", "Terreno": "terreno",
  "Oficina": "oficina", "Local": "local", "Finca": "finca",
};

function PublicaPage() {
  const { user, isVendedor } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<File[]>([]);
  const set = (k: string, v: string) => setData((d) => ({ ...d, [k]: v }));
  const pct = ((step + 1) / STEPS.length) * 100;

  async function submit() {
    if (!user) {
      toast.error("Inicia sesión como vendedor para publicar");
      nav({ to: "/vendedores/login" });
      return;
    }
    if (!isVendedor) {
      toast.error("Tu cuenta no tiene permisos de vendedor");
      return;
    }
    if (!data.type || !data.zone || !data.price || !data.op) {
      toast.error("Completa los campos obligatorios");
      return;
    }
    setSubmitting(true);
    try {
      // Insert property
      const { data: prop, error } = await supabase.from("properties").insert({
        owner_id: user.id,
        title: data.title || `${data.type} en ${data.zone}`,
        description: data.desc || null,
        price: Number(data.price),
        operation: data.op as "venta" | "renta",
        type: (TYPE_MAP[data.type] || "casa") as "casa" | "apartamento" | "terreno" | "oficina" | "local" | "finca",
        zone: data.zone,
        address: data.address || null,
        bedrooms: Number(data.beds || 0),
        bathrooms: Number(data.baths || 0),
        area_m2: data.area ? Number(data.area) : null,
        status: "pending",
      }).select("id").single();
      if (error) throw error;

      // Upload photos
      if (files.length > 0 && prop) {
        const urls: { url: string; position: number }[] = [];
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          const path = `${user.id}/${prop.id}/${Date.now()}-${i}-${f.name.replace(/[^\w.-]/g, "_")}`;
          const { error: upErr } = await supabase.storage.from("property-images").upload(path, f);
          if (upErr) { console.error(upErr); continue; }
          const { data: pub } = supabase.storage.from("property-images").getPublicUrl(path);
          urls.push({ url: pub.publicUrl, position: i });
        }
        if (urls.length) {
          await supabase.from("property_images").insert(urls.map((u) => ({ property_id: prop.id, ...u })));
          await supabase.from("properties").update({ cover_image: urls[0].url }).eq("id", prop.id);
        }
      }
      setDone(true);
    } catch (e: any) {
      toast.error(e.message || "Error al publicar");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="container-altum py-24 text-center max-w-xl mx-auto">
        <div className="w-20 h-20 mx-auto rounded-full bg-secondary text-primary flex items-center justify-center mb-6">
          <Check size={36} strokeWidth={2.5} />
        </div>
        <h1 className="font-display text-3xl text-primary">¡Propiedad enviada!</h1>
        <p className="mt-4 text-muted-foreground">Está en revisión. Un asesor ALTUM la aprobará en menos de 24 horas.</p>
        <div className="mt-8 flex gap-3 justify-center">
          <button onClick={() => { setDone(false); setStep(0); setData({}); setFiles([]); }} className="px-6 py-3 border border-border rounded-sm">
            Publicar otra
          </button>
          <button onClick={() => nav({ to: "/vendedores/dashboard" })} className="px-6 py-3 bg-secondary text-primary font-semibold rounded-sm">
            Ir al dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container-altum text-center max-w-3xl mx-auto">
          <h1 className="font-display text-4xl md:text-5xl">Publica tu Propiedad con ALTUM</h1>
          <p className="mt-4 text-primary-foreground/85">Difusión premium, asesores certificados y compradores calificados.</p>
          {!user && (
            <p className="mt-3 text-sm text-secondary">Necesitas una cuenta de vendedor para publicar.</p>
          )}
        </div>
      </section>

      <section className="py-16">
        <div className="container-altum max-w-3xl">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <span>Paso {step + 1} de {STEPS.length}</span>
              <span>{STEPS[step]}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-secondary transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="bg-card border border-border rounded-sm p-8 min-h-[320px]">
            {step === 0 && (
              <Field label="Tipo de propiedad">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PROPERTY_TYPES.map((t) => (
                    <button key={t} onClick={() => set("type", t)} className={`py-4 rounded-sm border text-sm font-semibold ${data.type === t ? "border-secondary bg-secondary/20 text-primary" : "border-border text-primary/70 hover:border-secondary/60"}`}>{t}</button>
                  ))}
                </div>
                <Input className="mt-4" label="Título (opcional)" value={data.title} onChange={(v) => set("title", v)} />
              </Field>
            )}
            {step === 1 && (
              <Field label="Ubicación">
                <select value={data.zone || ""} onChange={(e) => set("zone", e.target.value)} className="w-full h-12 px-3 border border-border rounded-sm bg-background">
                  <option value="">Selecciona una zona</option>
                  {ZONES.map((z) => <option key={z}>{z}</option>)}
                </select>
                <input value={data.address || ""} onChange={(e) => set("address", e.target.value)} placeholder="Dirección o referencia" className="mt-3 w-full h-12 px-3 border border-border rounded-sm bg-background" />
              </Field>
            )}
            {step === 2 && (
              <Field label="Características">
                <div className="grid grid-cols-3 gap-3">
                  <Input label="Habitaciones" type="number" value={data.beds} onChange={(v) => set("beds", v)} />
                  <Input label="Baños" type="number" value={data.baths} onChange={(v) => set("baths", v)} />
                  <Input label="Área (m²)" type="number" value={data.area} onChange={(v) => set("area", v)} />
                </div>
              </Field>
            )}
            {step === 3 && (
              <Field label="Precio y disponibilidad">
                <Input label="Precio (GTQ)" type="number" value={data.price} onChange={(v) => set("price", v)} />
                <div className="mt-3 flex gap-3">
                  {(["venta", "renta"] as const).map((o) => (
                    <button key={o} onClick={() => set("op", o)} className={`flex-1 py-3 rounded-sm border text-sm font-semibold capitalize ${data.op === o ? "border-secondary bg-secondary/20" : "border-border"}`}>{o}</button>
                  ))}
                </div>
              </Field>
            )}
            {step === 4 && (
              <Field label="Fotos (recomendado mínimo 5)">
                <label className="block border-2 border-dashed border-secondary/60 rounded-sm p-10 text-center bg-muted/40 cursor-pointer hover:bg-muted/60">
                  <p className="text-sm text-muted-foreground">Haz clic o arrastra tus fotos aquí</p>
                  <p className="mt-1 text-xs text-muted-foreground">JPG / PNG, hasta 10MB cada una</p>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
                    const list = Array.from(e.target.files || []);
                    setFiles((prev) => [...prev, ...list]);
                  }} />
                </label>
                {files.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
                    {files.map((f, i) => (
                      <div key={i} className="relative group aspect-square rounded-sm overflow-hidden border border-border">
                        <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute top-1 right-1 bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Field>
            )}
            {step === 5 && (
              <Field label="Descripción">
                <textarea value={data.desc || ""} onChange={(e) => set("desc", e.target.value)} rows={6} placeholder="Describe tu propiedad..." className="w-full p-3 border border-border rounded-sm bg-background" />
              </Field>
            )}
            {step === 6 && (
              <Field label="Confirmar publicación">
                <div className="space-y-2 text-sm">
                  <Row k="Tipo" v={data.type} />
                  <Row k="Operación" v={data.op} />
                  <Row k="Zona" v={data.zone} />
                  <Row k="Precio" v={data.price ? `Q${Number(data.price).toLocaleString()}` : "—"} />
                  <Row k="Habs/Baños/Área" v={`${data.beds || 0} / ${data.baths || 0} / ${data.area || 0}m²`} />
                  <Row k="Fotos" v={`${files.length} archivo(s)`} />
                </div>
                <p className="mt-6 text-xs text-muted-foreground">Tu propiedad entra en revisión. Un asesor ALTUM la aprobará antes de publicarse.</p>
              </Field>
            )}
          </div>

          <div className="flex justify-between mt-6">
            <button disabled={step === 0} onClick={() => setStep(step - 1)} className="inline-flex items-center gap-1 px-5 py-2.5 border border-border rounded-sm text-primary disabled:opacity-40">
              <ChevronLeft size={16} /> Anterior
            </button>
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep(step + 1)} className="inline-flex items-center gap-1 px-5 py-2.5 bg-secondary text-primary font-semibold rounded-sm hover:bg-secondary/85">
                Siguiente <ChevronRight size={16} />
              </button>
            ) : (
              <button disabled={submitting} onClick={submit} className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-sm hover:bg-primary/90 disabled:opacity-50">
                {submitting ? "Enviando..." : "Enviar publicación"}
              </button>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-display font-semibold text-primary mb-4">{label}</p>
      {children}
    </div>
  );
}
function Input({ label, value, onChange, type = "text", className = "" }: { label: string; value?: string; onChange: (v: string) => void; type?: string; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full h-11 px-3 border border-border rounded-sm bg-background" />
    </label>
  );
}
function Row({ k, v }: { k: string; v?: string }) {
  return <div className="flex justify-between border-b border-border py-2"><span className="text-muted-foreground">{k}</span><span className="font-semibold text-primary">{v || "—"}</span></div>;
}
