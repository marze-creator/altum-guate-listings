import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Copy, Save, CheckCircle2, XCircle, FileText, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_vendedor/vendedores/aprobacion")({
  head: () => ({ meta: [{ title: "Aprobación de Contenido — ALTUM GROUP" }, { name: "robots", content: "noindex" }] }),
  component: Aprobacion,
});

interface Content {
  id: string;
  property_id: string;
  status: string;
  short_description: string | null;
  long_description: string | null;
  commercial_hook: string | null;
  whatsapp_cta: string | null;
  post_facebook_instagram: string | null;
  marketplace_copy: string | null;
  reel_script: string | null;
  email_subject: string | null;
  email_body: string | null;
  hashtags: string[] | null;
  missing_data: string[] | null;
  rejection_reason: string | null;
  properties: { title: string; zone: string; price: number; currency: string | null; operation: string; type: string } | null;
}

const FIELDS: { key: keyof Content; label: string; big?: boolean }[] = [
  { key: "short_description", label: "Descripción corta" },
  { key: "long_description", label: "Descripción larga", big: true },
  { key: "commercial_hook", label: "Gancho comercial" },
  { key: "whatsapp_cta", label: "CTA WhatsApp" },
  { key: "post_facebook_instagram", label: "Post Facebook / Instagram", big: true },
  { key: "marketplace_copy", label: "Copy Marketplace", big: true },
  { key: "reel_script", label: "Guion del Reel", big: true },
  { key: "email_subject", label: "Correo — Asunto" },
  { key: "email_body", label: "Correo — Cuerpo", big: true },
];

function Aprobacion() {
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"borrador" | "aprobado" | "rechazado">("borrador");
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filter]);

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("property_content")
      .select("*, properties(title,zone,price,currency,operation,type)")
      .eq("status", filter)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as unknown as Content[]) ?? []);
    setDrafts({});
    setLoading(false);
  }

  function setField(id: string, key: string, value: string) {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], [key]: value } }));
  }

  function valueOf(item: Content, key: keyof Content): string {
    const d = drafts[item.id];
    if (d && key in d) return d[key] ?? "";
    return ((item[key] as string) ?? "");
  }

  async function copyText(text: string) {
    try { await navigator.clipboard.writeText(text || ""); toast.success("Copiado"); }
    catch { toast.error("No se pudo copiar"); }
  }

  async function saveChanges(item: Content) {
    const d = drafts[item.id];
    if (!d || Object.keys(d).length === 0) return toast.info("No hay cambios que guardar");
    setBusy(item.id);
    const { error } = await supabase.from("property_content").update(d).eq("id", item.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Cambios guardados");
    load();
  }

  async function approve(item: Content) {
    setBusy(item.id);
    const { error } = await (supabase.rpc as any)("approve_property_content", { p_content_id: item.id });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Contenido aprobado");
    load();
  }

  async function reject(item: Content) {
    const reason = prompt("Motivo del rechazo (opcional):") ?? null;
    setBusy(item.id);
    const { error } = await (supabase.rpc as any)("reject_property_content", { p_content_id: item.id, p_reason: reason });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Contenido rechazado");
    load();
  }

  const tabClass = (t: string) =>
    "px-3 py-1.5 rounded-sm text-sm font-medium whitespace-nowrap " +
    (filter === t ? "bg-primary text-white" : "bg-card border border-border text-muted-foreground hover:bg-muted");

  return (
    <div className="container-altum py-12">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-secondary font-semibold">Portal Vendedor</p>
        <h1 className="font-display text-3xl text-primary">Aprobación de Contenido</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAdmin ? "Revisa, edita y aprueba el contenido generado antes de publicar." : "Revisa y edita el contenido. La aprobación final la hace un administrador."}
        </p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        <button onClick={() => setFilter("borrador")} className={tabClass("borrador")}>Borradores</button>
        <button onClick={() => setFilter("aprobado")} className={tabClass("aprobado")}>Aprobados</button>
        <button onClick={() => setFilter("rechazado")} className={tabClass("rechazado")}>Rechazados</button>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-12">Cargando…</p>
      ) : items.length === 0 ? (
        <div className="bg-card border border-border rounded-sm p-12 text-center">
          <FileText className="mx-auto text-muted-foreground mb-3" size={28} />
          <p className="text-muted-foreground">No hay contenido en "{filter}".</p>
        </div>
      ) : (
        <div className="space-y-6">
          {items.map((item) => (
            <div key={item.id} className="bg-card border border-border rounded-sm overflow-hidden">
              <div className="bg-muted/60 px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-display text-lg text-primary">{item.properties?.title ?? "Propiedad"}</p>
                  <p className="text-xs text-muted-foreground capitalize">{item.properties?.operation} · {item.properties?.type} · {item.properties?.zone}</p>
                </div>
                <span className={"text-xs px-2 py-1 rounded-sm " + (item.status === "aprobado" ? "bg-green-100 text-green-800" : item.status === "rechazado" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800")}>
                  {item.status}
                </span>
              </div>

              <div className="p-5 space-y-4">
                {item.missing_data && item.missing_data.length > 0 && (
                  <div className="rounded-sm border border-amber-300 bg-amber-50 p-3 flex items-start gap-2">
                    <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                    <div>
                      <p className="text-xs font-semibold text-amber-900">Datos faltantes sugeridos</p>
                      <p className="text-xs text-amber-800">{item.missing_data.join(", ")}</p>
                    </div>
                  </div>
                )}

                {FIELDS.map((f) => (
                  <div key={f.key as string}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs uppercase tracking-wider text-secondary font-semibold">{f.label}</label>
                      <button onClick={() => copyText(valueOf(item, f.key))} className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"><Copy size={12} /> Copiar</button>
                    </div>
                    <textarea
                      value={valueOf(item, f.key)}
                      onChange={(e) => setField(item.id, f.key as string, e.target.value)}
                      rows={f.big ? 4 : 2}
                      className="w-full rounded-sm border border-border bg-background p-2.5 text-sm"
                    />
                  </div>
                ))}

                {item.hashtags && item.hashtags.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs uppercase tracking-wider text-secondary font-semibold">Hashtags</label>
                      <button onClick={() => copyText((item.hashtags ?? []).join(" "))} className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"><Copy size={12} /> Copiar</button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {item.hashtags.map((h, i) => (<span key={i} className="text-xs bg-muted px-2 py-1 rounded-sm text-primary">{h}</span>))}
                    </div>
                  </div>
                )}

                {item.status === "rechazado" && item.rejection_reason && (
                  <p className="text-xs text-red-700 italic">Motivo de rechazo: "{item.rejection_reason}"</p>
                )}
              </div>

              <div className="px-5 py-4 border-t border-border bg-muted/30 flex items-center justify-end gap-2 flex-wrap">
                <button onClick={() => saveChanges(item)} disabled={busy === item.id} className="inline-flex items-center gap-1.5 h-9 px-4 border border-border rounded-sm text-sm hover:bg-muted disabled:opacity-50"><Save size={15} /> Guardar cambios</button>
                {isAdmin && item.status !== "aprobado" && (
                  <button onClick={() => approve(item)} disabled={busy === item.id} className="inline-flex items-center gap-1.5 h-9 px-4 bg-green-600 text-white rounded-sm text-sm hover:bg-green-700 disabled:opacity-50"><CheckCircle2 size={15} /> Aprobar</button>
                )}
                {isAdmin && item.status !== "rechazado" && (
                  <button onClick={() => reject(item)} disabled={busy === item.id} className="inline-flex items-center gap-1.5 h-9 px-4 bg-red-600 text-white rounded-sm text-sm hover:bg-red-700 disabled:opacity-50"><XCircle size={15} /> Rechazar</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
