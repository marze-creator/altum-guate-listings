// src/components/tiktok-generator.tsx
// ALTUM · Generador de TikTok (V1) — genera guion + paquete + render_spec.
// Aditivo: se monta como un tab dentro del Estudio de Contenido (solo admin).
// No toca Andrea, WhatsApp, FB/IG ni el flujo Propiedad → Contenido.

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Music2, Sparkles, Loader2, Copy, Check, Clapperboard, Type as TypeIcon,
  Mic, Hash, Megaphone, ListOrdered, FileJson, ShieldCheck, RotateCw,
} from "lucide-react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

const db = supabase as any;

// URL del workflow n8n (configurable por env; fallback a producción self-hosted).
const TIKTOK_WEBHOOK_URL =
  (import.meta as any).env?.VITE_TIKTOK_WEBHOOK_URL ||
  "https://altum-n8n.ca-1.instapods.app/webhook/altum-propiedad-tiktok";

// ---- Design tokens (mismos que el Estudio de Contenido) ----
const GOLD = "#C9A84C";
const NAV_BG = "#0A1226";
const CARD_BG = "#111A33";
const CARD_BORDER = "#1F2A48";
const TEXT_DIM = "#8FA0C2";

type Objective = "venta" | "inversion" | "renta" | "branding";
type Format =
  | "property_tour" | "opportunity" | "educational" | "storytelling"
  | "investment" | "comparison" | "lifestyle";

const OBJECTIVES: { key: Objective; label: string }[] = [
  { key: "venta", label: "Venta" },
  { key: "inversion", label: "Inversión" },
  { key: "renta", label: "Renta" },
  { key: "branding", label: "Branding" },
];

const FORMATS: { key: Format; label: string; hint: string }[] = [
  { key: "property_tour", label: "Recorrido", hint: "Tour de la propiedad" },
  { key: "opportunity", label: "Oportunidad", hint: "Precio / plusvalía / urgencia" },
  { key: "educational", label: "Educativo", hint: "Aporta valor, atrae audiencia" },
  { key: "storytelling", label: "Storytelling", hint: "Narrativa emocional" },
  { key: "investment", label: "Inversión", hint: "ROI / renta / plusvalía" },
  { key: "comparison", label: "Comparación", hint: "Zona vs zona / mercado" },
  { key: "lifestyle", label: "Lifestyle", hint: "Aspiracional / estilo de vida" },
];

interface PropertyLite {
  id: string;
  title: string | null;
  zone: string | null;
  cover_image: string | null;
  status: string | null;
}

interface TikTokContent {
  id: string;
  property_id: string;
  objective: Objective;
  format: Format;
  hook: string | null;
  script: string | null;
  voiceover: string | null;
  caption: string | null;
  cta: string | null;
  hashtags: string[] | null;
  storyboard: any;
  on_screen_text: any;
  render_spec: any;
  status: string;
  model: string | null;
  created_at: string;
  approved_at: string | null;
}

export function TikTokStudio() {
  const [properties, setProperties] = useState<PropertyLite[]>([]);
  const [propId, setPropId] = useState<string>("");
  const [objective, setObjective] = useState<Objective>("venta");
  const [format, setFormat] = useState<Format>("property_tour");

  const [generating, setGenerating] = useState(false);
  const [current, setCurrent] = useState<TikTokContent | null>(null);
  const [history, setHistory] = useState<TikTokContent[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // cargar propiedades para el selector
  useEffect(() => {
    db.from("properties")
      .select("id,title,zone,cover_image,status")
      .order("created_at", { ascending: false })
      .limit(500)
      .then((r: any) => {
        if (!r.error) setProperties((r.data ?? []) as PropertyLite[]);
      });
  }, []);

  // cargar historial de paquetes de la propiedad seleccionada
  async function loadHistory(id: string) {
    if (!id) { setHistory([]); return; }
    setLoadingHistory(true);
    const r = await db
      .from("property_tiktok_content")
      .select("*")
      .eq("property_id", id)
      .order("created_at", { ascending: false })
      .limit(50);
    setLoadingHistory(false);
    if (!r.error) setHistory((r.data ?? []) as TikTokContent[]);
  }

  useEffect(() => { loadHistory(propId); }, [propId]);

  async function generate() {
    if (!propId) { toast.error("Elige una propiedad primero"); return; }
    setGenerating(true);
    try {
      const res = await fetch(TIKTOK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property_id: propId, objective, format }),
      });

      let newId: string | null = null;
      try {
        const data = await res.json();
        newId = data?.tiktok_content_id || data?.[0]?.tiktok_content_id || null;
      } catch { /* respuesta no-JSON: usamos fallback */ }

      // fallback: tomar el paquete más reciente de la propiedad
      let row: TikTokContent | null = null;
      if (newId) {
        const r = await db.from("property_tiktok_content").select("*").eq("id", newId).maybeSingle();
        if (!r.error) row = r.data as TikTokContent;
      }
      if (!row) {
        const r = await db
          .from("property_tiktok_content")
          .select("*")
          .eq("property_id", propId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!r.error) row = r.data as TikTokContent;
      }

      if (row) {
        setCurrent(row);
        toast.success("Paquete de TikTok generado");
        await loadHistory(propId);
      } else {
        toast.error("Se generó pero no se pudo leer el resultado. Revisa el historial.");
        await loadHistory(propId);
      }
    } catch (e: any) {
      toast.error("No se pudo conectar con el generador (n8n). ¿Workflow activo?");
    } finally {
      setGenerating(false);
    }
  }

  async function approve(id: string) {
    const { error } = await db.rpc("approve_property_tiktok_content", { p_id: id });
    if (error) { toast.error(error.message || "No se pudo aprobar"); return; }
    toast.success("Contenido aprobado");
    if (current?.id === id) setCurrent({ ...current, status: "aprobado", approved_at: new Date().toISOString() });
    await loadHistory(propId);
  }

  const selectedProp = useMemo(
    () => properties.find((p) => p.id === propId) || null,
    [properties, propId]
  );

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="altum-card rounded-xl p-4 md:p-6 space-y-4" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
        <div className="flex items-center gap-2">
          <Music2 size={18} style={{ color: "#EE1D52" }} />
          <h3 className="font-display text-lg">Generador de TikTok</h3>
        </div>
        <p className="text-sm" style={{ color: TEXT_DIM }}>
          Elige propiedad, objetivo y formato. La IA arma hook, guion, voice-over, storyboard (slideshow / ken burns con tus fotos), texto en pantalla, caption, hashtags, CTA y el <em>render_spec</em> 9:16 para la fase 2.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Propiedad">
            <select value={propId} onChange={(e) => { setPropId(e.target.value); setCurrent(null); }} className="altum-input w-full rounded-md px-3 py-2 text-sm" style={inputStyle}>
              <option value="">Selecciona…</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {(p.title || "Sin título")}{p.zone ? ` — ${p.zone}` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Objetivo">
            <select value={objective} onChange={(e) => setObjective(e.target.value as Objective)} className="altum-input w-full rounded-md px-3 py-2 text-sm" style={inputStyle}>
              {OBJECTIVES.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Formato">
            <select value={format} onChange={(e) => setFormat(e.target.value as Format)} className="altum-input w-full rounded-md px-3 py-2 text-sm" style={inputStyle}>
              {FORMATS.map((f) => <option key={f.key} value={f.key}>{f.label} — {f.hint}</option>)}
            </select>
          </Field>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={generate}
            disabled={generating || !propId}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold disabled:opacity-50"
            style={{ background: GOLD, color: NAV_BG }}
          >
            {generating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
            {generating ? "Generando…" : "Generar TikTok"}
          </button>
          {selectedProp?.cover_image && (
            <img src={selectedProp.cover_image} alt="" className="w-10 h-10 rounded-md object-cover" style={{ border: `1px solid ${CARD_BORDER}` }} />
          )}
        </div>
      </div>

      {/* Paquete actual */}
      {current && <PackageView pkg={current} onApprove={approve} />}

      {/* Historial */}
      <div className="altum-card rounded-xl p-4 md:p-6" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
        <h3 className="font-display text-lg mb-3">Paquetes de esta propiedad</h3>
        {!propId ? (
          <div className="text-sm" style={{ color: TEXT_DIM }}>Selecciona una propiedad para ver su historial.</div>
        ) : loadingHistory ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: TEXT_DIM }}><Loader2 className="animate-spin" size={14} /> Cargando…</div>
        ) : history.length === 0 ? (
          <div className="text-sm" style={{ color: TEXT_DIM }}>Aún no hay paquetes de TikTok para esta propiedad.</div>
        ) : (
          <div className="grid gap-2">
            {history.map((h) => (
              <button key={h.id} onClick={() => setCurrent(h)} className="flex items-center justify-between gap-3 p-3 rounded-lg text-left" style={{ background: "#0F1830", border: `1px solid ${CARD_BORDER}` }}>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{(h.hook || "Sin hook")}</div>
                  <div className="text-xs mt-0.5" style={{ color: TEXT_DIM }}>
                    {labelOf(OBJECTIVES, h.objective)} · {labelOf(FORMATS, h.format)} · {new Date(h.created_at).toLocaleDateString("es-GT", { day: "2-digit", month: "short" })}
                  </div>
                </div>
                <StatusPill status={h.status} />
              </button>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .altum-input { background: #0F1830; border: 1px solid ${CARD_BORDER}; color: white; }
        .altum-input:focus { outline: none; border-color: ${GOLD}; }
      `}</style>
    </div>
  );
}

const inputStyle = { background: "#0F1830", border: `1px solid ${CARD_BORDER}`, color: "white" } as const;

function PackageView({ pkg, onApprove }: { pkg: TikTokContent; onApprove: (id: string) => void }) {
  const storyboard: any[] = Array.isArray(pkg.storyboard) ? pkg.storyboard : [];
  const ost: any[] = Array.isArray(pkg.on_screen_text) ? pkg.on_screen_text : [];
  const hashtags = (pkg.hashtags ?? []).join("  ");

  return (
    <div className="altum-card rounded-xl p-4 md:p-6 space-y-4" style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clapperboard size={18} style={{ color: GOLD }} />
          <h3 className="font-display text-lg">Paquete generado</h3>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#0F1830", color: TEXT_DIM, border: `1px solid ${CARD_BORDER}` }}>
            {labelOf(OBJECTIVES, pkg.objective)} · {labelOf(FORMATS, pkg.format)}
          </span>
          <StatusPill status={pkg.status} />
        </div>
        {pkg.status !== "aprobado" && (
          <button onClick={() => onApprove(pkg.id)} className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold" style={{ background: GOLD, color: NAV_BG }}>
            <ShieldCheck size={14} /> Aprobar
          </button>
        )}
      </div>

      <Accordion type="multiple" defaultValue={["hook", "script"]} className="rounded-md" style={{ background: "#0F1830", border: `1px solid ${CARD_BORDER}` }}>
        <Block v="hook" icon={Sparkles} label="Hook (1–3 s)" value={pkg.hook} />
        <Block v="script" icon={FileJson} label="Guion (20–35 s)" value={pkg.script} />
        <Block v="vo" icon={Mic} label="Voice-over" value={pkg.voiceover} />
        <Block v="caption" icon={TypeIcon} label="Caption" value={pkg.caption} />
        <Block v="cta" icon={Megaphone} label="CTA (leads)" value={pkg.cta} />
        <Block v="hashtags" icon={Hash} label="Hashtags" value={hashtags} />

        {/* Storyboard */}
        <AccordionItem value="storyboard" className="border-b last:border-b-0" style={{ borderColor: CARD_BORDER }}>
          <AccordionTrigger className="px-3 py-2 text-sm hover:no-underline text-white">
            <span className="inline-flex items-center gap-2"><ListOrdered size={14} style={{ color: GOLD }} /> Storyboard ({storyboard.length})</span>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3">
            {storyboard.length === 0 ? (
              <div className="text-sm" style={{ color: TEXT_DIM }}>Sin storyboard.</div>
            ) : (
              <div className="grid gap-2">
                {storyboard.map((s, i) => (
                  <div key={i} className="flex gap-3 p-2 rounded-md" style={{ background: NAV_BG, border: `1px solid ${CARD_BORDER}` }}>
                    <div className="w-16 h-20 shrink-0 rounded-md overflow-hidden flex items-center justify-center" style={{ background: "#0F1830" }}>
                      {s.media_url ? <img src={s.media_url} alt="" className="w-full h-full object-cover" /> : <span className="text-xs" style={{ color: TEXT_DIM }}>#{s.media_index ?? i}</span>}
                    </div>
                    <div className="min-w-0 text-sm">
                      <div className="font-medium">{s.orden ?? i + 1}. {s.movimiento || "corte"} · {s.duracion_s ?? "?"}s</div>
                      <div className="text-xs mt-0.5" style={{ color: TEXT_DIM }}>{s.nota || ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* On-screen text */}
        <AccordionItem value="ost" className="border-b last:border-b-0" style={{ borderColor: CARD_BORDER }}>
          <AccordionTrigger className="px-3 py-2 text-sm hover:no-underline text-white">
            <span className="inline-flex items-center gap-2"><TypeIcon size={14} style={{ color: GOLD }} /> Texto en pantalla ({ost.length})</span>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3">
            {ost.length === 0 ? (
              <div className="text-sm" style={{ color: TEXT_DIM }}>Sin textos.</div>
            ) : (
              <div className="grid gap-1.5">
                {ost.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#0F1830", color: GOLD }}>{t.en_segundo ?? 0}s</span>
                    <span>{t.texto || ""}</span>
                  </div>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* render_spec (para V2) */}
        <AccordionItem value="render" className="border-b last:border-b-0" style={{ borderColor: CARD_BORDER }}>
          <AccordionTrigger className="px-3 py-2 text-sm hover:no-underline text-white">
            <span className="inline-flex items-center gap-2"><FileJson size={14} style={{ color: GOLD }} /> render_spec (9:16 — fase 2)</span>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3">
            <pre className="text-xs overflow-x-auto p-3 rounded-md" style={{ background: NAV_BG, color: "#DDE5F5", border: `1px solid ${CARD_BORDER}` }}>
              {JSON.stringify(pkg.render_spec ?? {}, null, 2)}
            </pre>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="text-xs" style={{ color: TEXT_DIM }}>
        Modelo: {pkg.model || "—"} · Generado {new Date(pkg.created_at).toLocaleString("es-GT")}
      </div>
    </div>
  );
}

function Block({ v, icon: Icon, label, value }: { v: string; icon: typeof Sparkles; label: string; value: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  async function copy() {
    try { await navigator.clipboard.writeText(value!); setCopied(true); setTimeout(() => setCopied(false), 1500); toast.success(`${label} copiado`); }
    catch { toast.error("No se pudo copiar"); }
  }
  return (
    <AccordionItem value={v} className="border-b last:border-b-0" style={{ borderColor: CARD_BORDER }}>
      <AccordionTrigger className="px-3 py-2 text-sm hover:no-underline text-white">
        <span className="inline-flex items-center gap-2"><Icon size={14} style={{ color: GOLD }} /> {label}</span>
      </AccordionTrigger>
      <AccordionContent className="px-3 pb-3">
        <div className="whitespace-pre-wrap text-sm mb-2" style={{ color: "#DDE5F5" }}>{value}</div>
        <button onClick={copy} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold" style={{ background: GOLD, color: NAV_BG }}>
          {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copiado" : "Copiar"}
        </button>
      </AccordionContent>
    </AccordionItem>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    borrador: { bg: "#3A3020", fg: "#E4C87A", label: "Borrador" },
    aprobado: { bg: "#123321", fg: "#4ADE80", label: "Aprobado" },
  };
  const s = map[status] ?? { bg: "#0F1830", fg: TEXT_DIM, label: status };
  return <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: s.bg, color: s.fg }}>{s.label}</span>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs mb-1" style={{ color: TEXT_DIM }}>{label}</div>
      {children}
    </label>
  );
}

function labelOf(arr: { key: string; label: string }[], key: string) {
  return arr.find((x) => x.key === key)?.label ?? key;
}
