import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send } from "lucide-react";

const schema = z.object({
  name: z.string().trim().min(2, "Nombre muy corto").max(120),
  email: z.string().trim().email("Correo inválido").max(254),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  budget: z.string().trim().max(60).optional().or(z.literal("")),
  message: z.string().trim().min(5, "Mensaje muy corto").max(2000),
});

export function InquiryForm({ propertyId, propertyTitle }: { propertyId: string; propertyTitle: string }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", budget: "", message: `Me interesa la propiedad "${propertyTitle}". Por favor contáctenme.` });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || "Datos inválidos");
      return;
    }
    setSending(true);
    const budgetLine = parsed.data.budget ? `Presupuesto: ${parsed.data.budget}\nPropiedad de interés (ID): ${propertyId}\n\n` : `Propiedad de interés (ID): ${propertyId}\n\n`;
    const { error } = await supabase.from("inquiries").insert({
      property_id: propertyId,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      message: budgetLine + parsed.data.message,
    });
    setSending(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("Consulta enviada");
  }

  if (sent) {
    return (
      <div className="p-6 bg-secondary/15 border border-secondary rounded-sm text-center">
        <p className="font-display text-lg text-primary">¡Gracias!</p>
        <p className="text-sm text-muted-foreground mt-1">Un asesor se comunicará contigo pronto.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="p-6 bg-card border border-border rounded-sm space-y-3">
      <p className="font-display font-semibold text-primary text-sm uppercase tracking-wider mb-1">Solicitar información</p>
      <input className="w-full h-10 px-3 border border-border rounded-sm text-sm bg-background" placeholder="Nombre completo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={120} />
      <input className="w-full h-10 px-3 border border-border rounded-sm text-sm bg-background" placeholder="Correo electrónico" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required maxLength={254} />
      <input className="w-full h-10 px-3 border border-border rounded-sm text-sm bg-background" placeholder="Teléfono (opcional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={40} />
      <textarea className="w-full px-3 py-2 border border-border rounded-sm text-sm bg-background min-h-[100px]" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} maxLength={2000} required />
      <button type="submit" disabled={sending} className="w-full inline-flex items-center justify-center gap-2 py-3 bg-secondary text-primary font-semibold text-sm uppercase tracking-wider rounded-sm hover:bg-secondary/85 disabled:opacity-60">
        <Send size={14} /> {sending ? "Enviando…" : "Enviar consulta"}
      </button>
    </form>
  );
}
