import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ZONES, PROPERTY_TYPES } from "@/lib/properties";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, Calculator, FileText, Clock } from "lucide-react";

export const Route = createFileRoute("/tasacion")({
  validateSearch: () => ({}),
  head: () => ({
    meta: [
      { title: "Tasacion - ALTUM" },
      { name: "description", content: "Tasacion gratuita ALTUM Guatemala" },
    ],
  }),
  component: TasacionPage,
});

const REASONS = [
  { value: "sell_now", label: "Voy a vender en los próximos 3 meses" },
  { value: "sell_soon", label: "Estoy considerando vender (3-12 meses)" },
  { value: "rent", label: "Quiero ponerla en renta" },
  { value: "refinance", label: "Refinanciamiento con mi banco" },
  { value: "insurance", label: "Trámite de seguros" },
  { value: "curiosity", label: "Solo quiero saber el valor actual" },
  { value: "other", label: "Otro motivo" },
];

function TasacionPage() {
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [f, setF] = useState({
    full_name: "",
    email: "",
    phone: "",
    whatsapp: "",
    property_type: "Casa",
    zone: "Zona 10",
    approximate_size: "",
    bedrooms: "",
    bathrooms: "",
    estimated_value: "",
    reason: "sell_soon",
    comments: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (f.full_name.trim().length < 2) {
      toast.error("Por favor ingresa tu nombre completo");
      return;
    }
    if (!f.email.includes("@")) {
      toast.error("Por favor ingresa un correo valido");
      return;
    }
    if (f.phone.trim().length < 8) {
      toast.error("Por favor ingresa un telefono valido");
      return;
    }
    if (!f.approximate_size || Number(f.approximate_size) <= 0) {
      toast.error("Por favor ingresa el tamano aproximado en m2");
      return;
    }

    setSubmitting(true);

    const TYPE_MAP: Record<string, string> = {
      Casa: "casa",
      Apartamento: "apartamento",
      Terreno: "terreno",
      Local: "local",
    };

    try {
      const { error } = await supabase.from("valuations").insert({
        full_name: f.full_name.trim(),
        email: f.email.trim().toLowerCase(),
        phone: f.phone.trim(),
        whatsapp: f.whatsapp.trim() || f.phone.trim(),
        property_type: TYPE_MAP[f.property_type] || "casa",
        zone: f.zone,
        approximate_size: Number(f.approximate_size),
        bedrooms: f.bedrooms ? Number(f.bedrooms) : null,
        bathrooms: f.bathrooms ? Number(f.bathrooms) : null,
        estimated_value: f.estimated_value.trim() || null,
        reason: f.reason,
        comments: f.comments.trim() || null,
        source: "website",
        status: "pending",
      });

      if (error) throw error;

      setSuccess(true);
      toast.success("Solicitud enviada correctamente");
    } catch (e: any) {
      console.error("Error enviando tasacion:", e);
      toast.error("Hubo un problema. Intentalo de nuevo en unos minutos.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="container-altum py-16 max-w-2xl">
        <div className="bg-card border border-border rounded-sm p-10 text-center shadow-elegant">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/20 mb-5">
            <CheckCircle2 className="w-8 h-8 text-secondary" />
          </div>
          <h1 className="font-display text-3xl text-primary mb-3">Solicitud recibida</h1>
          <div className="text-sm text-muted-foreground space-y-3 mb-8 max-w-md mx-auto">
            <p>Gracias <strong>{f.full_name}</strong>. Recibimos tu solicitud de tasacion.</p>
            <p>Un asesor de ALTUM va a contactarte en las proximas 24 horas habiles al <strong>{f.whatsapp || f.phone}</strong> para coordinar la visita tecnica.</p>
            <p>El reporte completo te llegara por correo a <strong>{f.email}</strong> dentro de las 48 horas posteriores a la visita.</p>
          </div>
          <div className="bg-muted border-l-4 border-secondary p-4 text-left text-xs text-muted-foreground mb-6 max-w-md mx-auto">
            <p className="font-semibold text-primary mb-1">Que viene ahora</p>
            <p>Te recomendamos tener a mano los documentos de la propiedad (escritura, IUSI al dia) para agilizar la visita. Si no los tenes todos, no es problema, el asesor te indica como proceder.</p>
          </div>
          <Link to="/propiedades" className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-primary font-semibold text-sm rounded-sm hover:bg-secondary/85 transition-colors">
            Mientras tanto, mira nuestras propiedades
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted/30">
      <section className="bg-primary text-white py-20">
        <div className="container-altum max-w-3xl text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-secondary font-semibold mb-3">Servicio gratuito sin compromiso</p>
          <h1 className="font-display text-4xl md:text-5xl mb-4">Cuanto vale tu propiedad hoy?</h1>
          <p className="text-base md:text-lg text-white/80 max-w-2xl mx-auto">Tasacion profesional gratuita con analisis comparativo de mercado. Reporte completo en 48 horas. Sin obligacion de vender.</p>
        </div>
      </section>

      <section className="container-altum py-12 max-w-5xl">
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-card border border-border rounded-sm p-6">
            <Calculator className="text-secondary mb-3" size={28} />
            <h3 className="font-display font-semibold text-primary mb-2">Analisis de mercado</h3>
            <p className="text-sm text-muted-foreground">Estudiamos propiedades similares vendidas en tu zona en los ultimos 6 meses para determinar el valor real, no estimado.</p>
          </div>
          <div className="bg-card border border-border rounded-sm p-6">
            <FileText className="text-secondary mb-3" size={28} />
            <h3 className="font-display font-semibold text-primary mb-2">Reporte profesional</h3>
            <p className="text-sm text-muted-foreground">Documento PDF detallado con el valor estimado, justificacion tecnica y rango sugerido para venta o renta.</p>
          </div>
          <div className="bg-card border border-border rounded-sm p-6">
            <Clock className="text-secondary mb-3" size={28} />
            <h3 className="font-display font-semibold text-primary mb-2">48 horas</h3>
            <p className="text-sm text-muted-foreground">Coordinamos visita tecnica en las proximas 24 horas y entregamos el reporte completo dentro de las 48 horas siguientes.</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-sm p-8 md:p-10 shadow-elegant">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-widest text-secondary font-semibold mb-2">Solicitar tasacion</p>
            <h2 className="font-display text-2xl text-primary">Completa tus datos</h2>
            <p className="text-sm text-muted-foreground mt-1">Toda la informacion se mantiene confidencial. No compartimos tus datos con terceros.</p>
          </div>

          <form onSubmit={submit} className="space-y-6">
            <div>
              <h3 className="text-xs uppercase tracking-wider text-primary font-semibold mb-3 pb-2 border-b border-border">Tus datos de contacto</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Nombre completo *">
                  <input required value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} placeholder="Como te llamas" className="input-altum" />
                </Field>
                <Field label="Correo electronico *">
                  <input required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="tu@correo.com" className="input-altum" />
                </Field>
                <Field label="Telefono *">
                  <input required type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+502 5555-5555" className="input-altum" />
                </Field>
                <Field label="WhatsApp" hint="Si es diferente al telefono">
                  <input type="tel" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} placeholder="+502 5555-5555" className="input-altum" />
                </Field>
              </div>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-wider text-primary font-semibold mb-3 pb-2 border-b border-border">Sobre tu propiedad</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Tipo de propiedad *">
                  <select value={f.property_type} onChange={(e) => setF({ ...f, property_type: e.target.value })} className="input-altum">
                    {PROPERTY_TYPES.map((t) => (<option key={t}>{t}</option>))}
                  </select>
                </Field>
                <Field label="Zona *">
                  <select value={f.zone} onChange={(e) => setF({ ...f, zone: e.target.value })} className="input-altum">
                    {ZONES.map((z) => (<option key={z}>{z}</option>))}
                  </select>
                </Field>
                <Field label="Tamano aproximado (m2) *">
                  <input required type="number" min="1" value={f.approximate_size} onChange={(e) => setF({ ...f, approximate_size: e.target.value })} placeholder="250" className="input-altum" />
                </Field>
                <Field label="Valor que estimas (opcional)" hint="Ej: alrededor de USD 300,000">
                  <input value={f.estimated_value} onChange={(e) => setF({ ...f, estimated_value: e.target.value })} placeholder="No estas seguro? Esta bien dejarlo vacio" className="input-altum" />
                </Field>
                <Field label="Habitaciones">
                  <input type="number" min="0" value={f.bedrooms} onChange={(e) => setF({ ...f, bedrooms: e.target.value })} placeholder="3" className="input-altum" />
                </Field>
                <Field label="Banos">
                  <input type="number" step="0.5" min="0" value={f.bathrooms} onChange={(e) => setF({ ...f, bathrooms: e.target.value })} placeholder="2.5" className="input-altum" />
                </Field>
              </div>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-wider text-primary font-semibold mb-3 pb-2 border-b border-border">Motivo de la tasacion</h3>
              <Field label="Por que necesitas la tasacion? *">
                <select value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} className="input-altum">
                  {REASONS.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
                </select>
              </Field>
              <div className="mt-4">
                <Field label="Comentarios adicionales (opcional)">
                  <textarea value={f.comments} onChange={(e) => setF({ ...f, comments: e.target.value })} placeholder="Algo mas que el asesor deba saber" rows={4} className="input-altum resize-none" />
                </Field>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <button type="submit" disabled={submitting} className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 bg-secondary text-primary font-semibold rounded-sm hover:bg-secondary/85 disabled:opacity-60 transition-colors">
                {submitting ? "Enviando..." : "Solicitar tasacion gratuita"}
                {!submitting && <ArrowRight size={16} />}
              </button>
              <p className="text-xs text-muted-foreground mt-3">Al enviar este formulario aceptas que un asesor de ALTUM te contacte. Tu informacion no se comparte con terceros.</p>
            </div>
          </form>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Tenes dudas antes de solicitar?{" "}
            <a href="https://wa.me/50251014866" target="_blank" rel="noreferrer" className="text-primary hover:text-secondary font-semibold">Conversemos por WhatsApp</a>
          </p>
        </div>
      </section>
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
