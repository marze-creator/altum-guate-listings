import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Send, ShieldCheck, Camera, ClipboardList } from "lucide-react";
import { z } from "zod";
import { PROPERTY_TYPES } from "@/lib/properties";
import { UBICACIONES_PREDEFINIDAS, DEPARTAMENTOS } from "@/lib/locations";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/publica")({
  head: () => ({
    meta: [
      { title: "Publica tu Propiedad — ALTUM GROUP" },
      { name: "description", content: "Cuéntanos sobre tu propiedad y un asesor ALTUM la fotografiará y publicará con estándar profesional." },
      { property: "og:url", content: "/publica" },
    ],
    links: [{ rel: "canonical", href: "/publica" }],
  }),
  component: PublicaPage,
});

// WhatsApp del equipo ALTUM (sin +, solo dígitos)
const ALTUM_WHATSAPP = "50251014866";

const schema = z.object({
  contact_name: z.string().trim().min(2, "Nombre muy corto").max(120),
  contact_email: z.string().trim().email("Correo inválido").max(254),
  contact_phone: z.string().trim().max(40).optional().or(z.literal("")),
  property_type: z.string().min(2),
  operation: z.enum(["venta", "renta"]),
  zone: z.string().min(2, "Selecciona una zona"),
  address: z.string().trim().max(240).optional().or(z.literal("")),
  bedrooms: z.string().optional(),
  bathrooms: z.string().optional(),
  area_m2: z.string().optional(),
  price: z.string().optional(),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
});

function PublicaPage() {
  const [done, setDone] = useState<null | { id: string; summary: string }>(null);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    property_type: "Casa",
    operation: "venta" as "venta" | "renta",
    department: "Guatemala",
    zone: "",
    otherZone: "",
    address: "",
    bedrooms: "",
    bathrooms: "",
    area_m2: "",
    price: "",
    description: "",
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const finalZone = form.zone === "__otra__" ? form.otherZone.trim() : form.zone;
    const parsed = schema.safeParse({ ...form, zone: finalZone });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || "Revisa los datos");
      return;
    }
    setSending(true);
    const { data, error } = await supabase
      .from("property_submissions")
      .insert({
        contact_name: parsed.data.contact_name,
        contact_email: parsed.data.contact_email,
        contact_phone: parsed.data.contact_phone || null,
        property_type: parsed.data.property_type,
        operation: parsed.data.operation,
        zone: finalZone + (form.department ? " — " + form.department : ""),
        address: parsed.data.address || null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        area_m2: form.area_m2 ? Number(form.area_m2) : null,
        price: form.price ? Number(form.price) : null,
        description: parsed.data.description || null,
      })
      .select("id")
      .single();
    setSending(false);
    if (error || !data) {
      toast.error(error?.message || "No se pudo enviar");
      return;
    }
    const summary =
      `Nueva propuesta de propiedad — ALTUM\n` +
      `• Cliente: ${parsed.data.contact_name}\n` +
      `• Correo: ${parsed.data.contact_email}\n` +
      (parsed.data.contact_phone ? `• Tel: ${parsed.data.contact_phone}\n` : "") +
      `• ${parsed.data.property_type} en ${parsed.data.operation}\n` +
      `• Zona: ${parsed.data.zone}${parsed.data.address ? ` — ${parsed.data.address}` : ""}\n` +
      (form.price ? `• Precio sugerido: Q${Number(form.price).toLocaleString()}\n` : "") +
      `• Habs/Baños/Área: ${form.bedrooms || "-"} / ${form.bathrooms || "-"} / ${form.area_m2 || "-"}m²\n` +
      (parsed.data.description ? `\n${parsed.data.description}` : "");
    setDone({ id: data.id, summary });
  }

  if (done) {
    const wa = `https://wa.me/${ALTUM_WHATSAPP}?text=${encodeURIComponent(done.summary)}`;
    return (
      <div className="container-altum py-24 text-center max-w-xl mx-auto">
        <div className="w-20 h-20 mx-auto rounded-full bg-secondary text-primary flex items-center justify-center mb-6">
          <Check size={36} strokeWidth={2.5} />
        </div>
        <h1 className="font-display text-3xl text-primary">¡Solicitud recibida!</h1>
        <p className="mt-4 text-muted-foreground">
          Un asesor ALTUM se comunicará contigo en menos de 24 horas para coordinar la visita, fotografía profesional y publicación con estándar premium.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-primary font-semibold rounded-sm">
            <Send size={14} /> Enviar también por WhatsApp
          </a>
          <button onClick={() => { setDone(null); }} className="px-6 py-3 border border-border rounded-sm">
            Enviar otra propuesta
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
          <p className="mt-4 text-primary-foreground/85">
            Cuéntanos sobre tu propiedad. Un asesor coordinará la visita, fotografía profesional y publicación con estándar premium.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="container-altum max-w-5xl grid md:grid-cols-3 gap-6">
          {[
            { icon: ClipboardList, t: "1. Llenas el formulario", d: "Datos básicos de la propiedad y tus datos de contacto." },
            { icon: ShieldCheck, t: "2. Asesor te contacta", d: "Validamos información, precio y agendamos visita." },
            { icon: Camera, t: "3. Fotografía y publicación", d: "ALTUM toma fotos profesionales y publica con estándar premium." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="bg-card border border-border rounded-sm p-6">
              <Icon className="text-secondary" size={24} />
              <p className="mt-3 font-display font-semibold text-primary">{t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pb-20">
        <div className="container-altum max-w-3xl">
          <form onSubmit={submit} className="bg-card border border-border rounded-sm p-8 space-y-6">
            <div>
              <p className="font-display font-semibold text-primary mb-3">Tus datos</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input label="Nombre completo *" value={form.contact_name} onChange={(v) => set("contact_name", v)} required maxLength={120} />
                <Input label="Correo *" type="email" value={form.contact_email} onChange={(v) => set("contact_email", v)} required maxLength={254} />
                <Input label="Teléfono / WhatsApp" value={form.contact_phone} onChange={(v) => set("contact_phone", v)} maxLength={40} />
              </div>
            </div>

            <div>
              <p className="font-display font-semibold text-primary mb-3">Tu propiedad</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <Select label="Tipo *" value={form.property_type} onChange={(v) => set("property_type", v)} options={PROPERTY_TYPES} />
                <Select label="Operación *" value={form.operation} onChange={(v) => set("operation", v as "venta" | "renta")} options={["venta", "renta"]} />
                <Select label="Departamento *" value={form.department} onChange={(v) => set("department", v)} options={DEPARTAMENTOS} />
                <Select label="Zona / Municipio *" value={form.zone} onChange={(v) => set("zone", v)} options={["", ...UBICACIONES_PREDEFINIDAS, "__otra__"]} placeholder="Selecciona ubicación" />
                {form.zone === "__otra__" && (
                  <Input label="Otra ubicación *" value={form.otherZone} onChange={(v) => set("otherZone", v)} maxLength={120} />
                )}
                <Input label="Dirección o referencia" value={form.address} onChange={(v) => set("address", v)} maxLength={240} />
                <Input label="Habitaciones" type="number" value={form.bedrooms} onChange={(v) => set("bedrooms", v)} />
                <Input label="Baños" type="number" value={form.bathrooms} onChange={(v) => set("bathrooms", v)} />
                <Input label="Área (m²)" type="number" value={form.area_m2} onChange={(v) => set("area_m2", v)} />
                <Input label="Precio sugerido (GTQ)" type="number" value={form.price} onChange={(v) => set("price", v)} />
              </div>
              <label className="block mt-3">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Cuéntanos más (opcional)</span>
                <textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={5}
                  maxLength={4000}
                  placeholder="Amenidades, año, condiciones especiales, horarios de visita…"
                  className="mt-1 w-full p-3 border border-border rounded-sm bg-background"
                />
              </label>
            </div>

            <div className="p-4 bg-secondary/10 border border-secondary/40 rounded-sm flex items-start gap-3">
              <Camera className="text-secondary mt-0.5 flex-shrink-0" size={18} />
              <p className="text-xs text-primary/80">
                <strong>No necesitas subir fotos.</strong> ALTUM enviará un fotógrafo profesional para garantizar que todas las propiedades publicadas cumplan con el estándar visual de la marca.
              </p>
            </div>

            <button type="submit" disabled={sending} className="w-full inline-flex items-center justify-center gap-2 py-4 bg-secondary text-primary font-semibold text-sm uppercase tracking-wider rounded-sm hover:bg-secondary/85 disabled:opacity-60">
              <Send size={14} /> {sending ? "Enviando…" : "Enviar solicitud"}
            </button>
            <p className="text-xs text-muted-foreground text-center">Al enviar aceptas que un asesor ALTUM te contacte para coordinar la publicación.</p>
          </form>
        </div>
      </section>
    </>
  );
}

function Input({ label, value, onChange, type = "text", required, maxLength }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; maxLength?: number }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} maxLength={maxLength} className="mt-1 w-full h-11 px-3 border border-border rounded-sm bg-background" />
    </label>
  );
}

function Select({ label, value, onChange, options, placeholder }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[]; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full h-11 px-3 border border-border rounded-sm bg-background">
        {options.map((o) => (
          <option key={o} value={o}>{o || placeholder || "—"}</option>
        ))}
      </select>
    </label>
  );
}
