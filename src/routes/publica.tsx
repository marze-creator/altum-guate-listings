import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { ZONES, PROPERTY_TYPES } from "@/lib/properties";

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

const STEPS = ["Tipo", "Ubicación", "Características", "Precio", "Fotos", "Descripción", "Contacto"];

function PublicaPage() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [data, setData] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setData((d) => ({ ...d, [k]: v }));
  const pct = ((step + 1) / STEPS.length) * 100;

  if (done) {
    return (
      <div className="container-altum py-24 text-center max-w-xl mx-auto">
        <div className="w-20 h-20 mx-auto rounded-full bg-secondary text-primary flex items-center justify-center mb-6">
          <Check size={36} strokeWidth={2.5} />
        </div>
        <h1 className="font-display text-3xl text-primary">¡Propiedad enviada!</h1>
        <p className="mt-4 text-muted-foreground">Un asesor ALTUM se pondrá en contacto contigo en menos de 24 horas para validar tu publicación.</p>
        <button onClick={() => { setDone(false); setStep(0); setData({}); }} className="mt-8 px-6 py-3 bg-secondary text-primary font-semibold rounded-sm">
          Publicar otra
        </button>
      </div>
    );
  }

  return (
    <>
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container-altum text-center max-w-3xl mx-auto">
          <h1 className="font-display text-4xl md:text-5xl">Publica tu Propiedad con ALTUM</h1>
          <p className="mt-4 text-primary-foreground/85">Difusión premium, asesores certificados y compradores calificados.</p>
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
              <Field label="Fotos (mínimo 5)">
                <div className="border-2 border-dashed border-secondary/60 rounded-sm p-10 text-center bg-muted/40">
                  <p className="text-sm text-muted-foreground">Arrastra tus fotos aquí o</p>
                  <button className="mt-3 px-5 py-2 bg-secondary text-primary text-sm font-semibold rounded-sm">Seleccionar archivos</button>
                </div>
              </Field>
            )}
            {step === 5 && (
              <Field label="Descripción">
                <textarea value={data.desc || ""} onChange={(e) => set("desc", e.target.value)} rows={6} placeholder="Describe tu propiedad..." className="w-full p-3 border border-border rounded-sm bg-background" />
              </Field>
            )}
            {step === 6 && (
              <Field label="Información de contacto">
                <Input label="Nombre completo" value={data.name} onChange={(v) => set("name", v)} />
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <Input label="Teléfono" value={data.phone} onChange={(v) => set("phone", v)} />
                  <Input label="Correo electrónico" type="email" value={data.email} onChange={(v) => set("email", v)} />
                </div>
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
              <button onClick={() => setDone(true)} className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-sm hover:bg-primary/90">
                Enviar publicación
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
function Input({ label, value, onChange, type = "text" }: { label: string; value?: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full h-11 px-3 border border-border rounded-sm bg-background" />
    </label>
  );
}
