export const CRM_STAGE_SLUGS = [
  "nuevo",
  "contactado",
  "calificado",
  "opciones-enviadas",
  "visita-agendada",
  "visita-realizada",
  "negociacion",
  "credito-financiamiento",
  "cierre",
  "perdido",
] as const;

export type CrmStageSlug = (typeof CRM_STAGE_SLUGS)[number];

export interface CrmStage {
  id: string;
  name: string;
  slug: string;
  position: number;
  probability: number;
  color?: string | null;
  is_won?: boolean;
  is_lost?: boolean;
}

export interface CrmLead {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  interest_operation: string | null;
  interest_type: string | null;
  interest_zone: string | null;
  budget_min: number | null;
  budget_max: number | null;
  currency: string | null;
  notes: string | null;
  temperature: "frio" | "tibio" | "caliente" | string;
  status: string;
  next_follow_up_at: string | null;
}

export interface CrmPropertyMini {
  id: string;
  title: string;
  zone: string;
  price: number;
  currency: string | null;
  operation: string;
  cover_image: string | null;
}

export interface CrmDeal {
  id: string;
  title: string;
  status: string;
  stage_id: string | null;
  lead_id: string;
  property_id: string | null;
  assigned_to_user_id: string | null;
  deal_value: number | null;
  currency: string | null;
  commission_rate: number | null;
  commission_total: number | null;
  advisor_commission_rate: number | null;
  commission_advisor: number | null;
  commission_company: number | null;
  next_activity_at: string | null;
  temperature: string | null;
  created_at: string;
  leads?: CrmLead | null;
  properties?: CrmPropertyMini | null;
  deal_stages?: CrmStage | null;
}

export interface CrmActivity {
  id: string;
  title: string;
  type: string;
  status: string;
  notes: string | null;
  due_at: string | null;
  deal_id: string | null;
  lead_id: string | null;
  assigned_to_user_id: string | null;
  created_at: string;
  deals?: Pick<CrmDeal, "id" | "title"> | null;
  leads?: Pick<CrmLead, "id" | "full_name" | "phone"> | null;
}

export const DEFAULT_CRM_STAGES: CrmStage[] = [
  { id: "fallback-nuevo", name: "Nuevo", slug: "nuevo", position: 10, probability: 5, color: "#64748B" },
  { id: "fallback-contactado", name: "Contactado", slug: "contactado", position: 20, probability: 15, color: "#0EA5E9" },
  { id: "fallback-calificado", name: "Calificado", slug: "calificado", position: 30, probability: 25, color: "#2563EB" },
  { id: "fallback-opciones", name: "Opciones enviadas", slug: "opciones-enviadas", position: 40, probability: 35, color: "#7C3AED" },
  { id: "fallback-visita-agendada", name: "Visita agendada", slug: "visita-agendada", position: 50, probability: 50, color: "#F59E0B" },
  { id: "fallback-visita-realizada", name: "Visita realizada", slug: "visita-realizada", position: 60, probability: 60, color: "#D97706" },
  { id: "fallback-negociacion", name: "Negociación", slug: "negociacion", position: 70, probability: 70, color: "#EA580C" },
  { id: "fallback-credito", name: "Crédito / Financiamiento", slug: "credito-financiamiento", position: 80, probability: 80, color: "#059669" },
  { id: "fallback-cierre", name: "Cierre", slug: "cierre", position: 90, probability: 100, color: "#16A34A", is_won: true },
  { id: "fallback-perdido", name: "Perdido", slug: "perdido", position: 100, probability: 0, color: "#DC2626", is_lost: true },
];

export const LEAD_SOURCES = ["manual", "whatsapp", "facebook", "instagram", "web", "referido"];
export const LEAD_TEMPERATURES = ["frio", "tibio", "caliente"];
export const ACTIVITY_TYPES = ["llamada", "whatsapp", "email", "visita", "seguimiento", "tarea"];

export function money(amount: number | null | undefined, currency = "GTQ") {
  const safe = Number(amount || 0);
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: currency === "USD" ? "USD" : "GTQ",
    maximumFractionDigits: 0,
  }).format(safe);
}

export function temperatureClass(value?: string | null) {
  if (value === "caliente") return "bg-red-50 text-red-700 border-red-200";
  if (value === "frio") return "bg-slate-50 text-slate-700 border-slate-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

export function safeDate(value?: string | null) {
  if (!value) return "Sin fecha";
  try {
    return new Date(value).toLocaleString("es-GT", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "Sin fecha";
  }
}
