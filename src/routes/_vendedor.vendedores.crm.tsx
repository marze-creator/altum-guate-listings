import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  ExternalLink,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  Search,
  StickyNote,
  X,
} from "lucide-react";
import {
  ACTIVITY_TYPES,
  CrmActivity,
  CrmDeal,
  CrmStage,
  DEFAULT_CRM_STAGES,
  LEAD_SOURCES,
  LEAD_TEMPERATURES,
  money,
  safeDate,
  temperatureClass,
} from "@/lib/crm";

type PropertyOption = {
  id: string;
  title: string;
  zone: string;
  price: number;
  currency: string | null;
  operation: string;
};

type WhatsAppMessage = {
  id: string;
  lead_id: string | null;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export const Route = createFileRoute("/_vendedor/vendedores/crm")({
  head: () => ({
    meta: [
      { title: "CRM — ALTUM GROUP" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CrmPage,
});

function CrmPage() {
  const { user, isAdmin } = useAuth();

  const [stages, setStages] = useState<CrmStage[]>([]);
  const [deals, setDeals] = useState<CrmDeal[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [vendors, setVendors] = useState<
    { user_id: string; full_name: string }[]
  >([]);
  const [sellerNames, setSellerNames] = useState<Record<string, string>>({});
  const [sellerFilter, setSellerFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showNewLead, setShowNewLead] = useState(false);
  const [activeDealId, setActiveDealId] = useState<string | null>(null);
  const [detailDealId, setDetailDealId] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    source: "manual",
    interest_operation: "venta",
    interest_type: "apartamento",
    interest_zone: "",
    budget_max: "",
    currency: "GTQ",
    notes: "",
    temperature: "tibio",
    property_id: "",
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 8,
      },
    }),
  );

  useEffect(() => {
    if (!user) return;
    load();
  }, [user, isAdmin]);

  async function load() {
    setLoading(true);

    const db = supabase as any;

    const [
      { data: stageRows, error: stagesError },
      { data: propertyRows },
      { data: dealRows, error: dealsError },
    ] = await Promise.all([
      db
        .from("deal_stages")
        .select("id,name,slug,position,probability,color,is_won,is_lost")
        .order("position", { ascending: true }),

      db
        .from("properties")
        .select("id,title,zone,price,currency,operation")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(200),

      db
        .from("deals")
        .select(
          "id,title,status,stage_id,lead_id,property_id,assigned_to_user_id,deal_value,currency,commission_rate,commission_total,advisor_commission_rate,commission_advisor,commission_company,next_activity_at,temperature,created_at,leads(id,full_name,phone,email,source,lead_kind,interest_operation,interest_type,interest_zone,budget_min,budget_max,currency,notes,temperature,status,next_follow_up_at,property_id,ad_id,ad_headline,ad_source_url,ad_source_type,ad_ctwa_clid,ad_referral),properties(id,title,zone,price,currency,operation,cover_image),deal_stages(id,name,slug,position,probability,color,is_won,is_lost)",
        )
        .order("created_at", { ascending: false })
        .limit(300),
    ]);

    if (stagesError) {
      toast.error("CRM stages: " + stagesError.message);
    }

    if (dealsError) {
      toast.error(
        "CRM deals: " +
          dealsError.message +
          ". Revisa si ya aplicaste la migración del CRM.",
      );
    }

    setStages(
      (stageRows?.length ? stageRows : DEFAULT_CRM_STAGES) as CrmStage[],
    );

    setProperties((propertyRows ?? []) as PropertyOption[]);
    setDeals((dealRows ?? []) as CrmDeal[]);

    const assignedIds = Array.from(
      new Set(
        ((dealRows ?? []) as CrmDeal[])
          .map((d) => d.assigned_to_user_id)
          .filter(Boolean) as string[],
      ),
    );

    let vendorIds: string[] = [];

    if (isAdmin) {
      const { data: roleRows } = await db
        .from("user_roles")
        .select("user_id")
        .eq("role", "vendedor");

      vendorIds = ((roleRows ?? []) as { user_id: string }[]).map(
        (r) => r.user_id,
      );
    }

    const idsToFetch = Array.from(
      new Set([...assignedIds, ...vendorIds]),
    );

    if (idsToFetch.length) {
      const { data: profRows } = await db
        .from("profiles")
        .select("user_id,full_name")
        .in("user_id", idsToFetch);

      const map: Record<string, string> = {};

      (
        (profRows ?? []) as {
          user_id: string;
          full_name: string | null;
        }[]
      ).forEach((p) => {
        map[p.user_id] = p.full_name || "Sin nombre";
      });

      setSellerNames(map);

      if (isAdmin) {
        setVendors(
          vendorIds
            .map((id) => ({
              user_id: id,
              full_name: map[id] || "Sin nombre",
            }))
            .sort((a, b) => a.full_name.localeCompare(b.full_name)),
        );
      }
    } else {
      setSellerNames({});
      setVendors([]);
    }

    setLoading(false);
  }

  const scopedDeals = useMemo(() => {
    if (!isAdmin) {
      return deals.filter(
        (d) => d.assigned_to_user_id === user?.id,
      );
    }

    if (sellerFilter !== "all") {
      return deals.filter(
        (d) => d.assigned_to_user_id === sellerFilter,
      );
    }

    return deals;
  }, [deals, isAdmin, sellerFilter, user?.id]);

  const filteredDeals = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return scopedDeals;

    return scopedDeals.filter((deal) => {
      const lead = deal.leads;
      const prop = deal.properties;

      return [
        deal.title,
        lead?.full_name,
        lead?.phone,
        lead?.interest_zone,
        lead?.ad_headline,
        prop?.title,
        prop?.zone,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(q),
        );
    });
  }, [scopedDeals, query]);

  const activeDealCount = useMemo(
    () =>
      scopedDeals.filter(
        (deal) => deal.status === "abierto",
      ).length,
    [scopedDeals],
  );

  const inventoryValue = useMemo(
    () =>
      properties.reduce(
        (sum, property) =>
          sum + Number(property.price || 0),
        0,
      ),
    [properties],
  );

  const detailDeal = useMemo(
    () =>
      deals.find(
        (d) => d.id === detailDealId,
      ) ?? null,
    [deals, detailDealId],
  );

  const activeDeal = useMemo(
    () =>
      deals.find(
        (d) => d.id === activeDealId,
      ) ?? null,
    [deals, activeDealId],
  );

  async function createLeadAndDeal() {
    if (!user) {
      return toast.error("Sesión expirada");
    }

    if (!form.full_name.trim()) {
      return toast.error(
        "El nombre del cliente es obligatorio",
      );
    }

    if (
      !form.phone.trim() &&
      !form.email.trim()
    ) {
      return toast.error(
        "Agrega teléfono o correo",
      );
    }

    const db = supabase as any;

    const selectedProperty = properties.find(
      (item) => item.id === form.property_id,
    );

    const currency =
      selectedProperty?.currency ??
      form.currency;

    const payload: Record<
      string,
      unknown
    > = {
      assigned_to_user_id: user.id,
      created_by: user.id,
      full_name: form.full_name.trim(),
      phone:
        form.phone.trim() || null,
      email:
        form.email.trim() || null,
      interest_zone:
        form.interest_zone.trim() ||
        selectedProperty?.zone ||
        null,
      budget_max: form.budget_max
        ? Number(form.budget_max)
        : null,
      currency,
      notes:
        form.notes.trim() || null,
    };

    if (form.source?.trim()) {
      payload.source = form.source;
    }

    if (form.interest_operation?.trim()) {
      payload.interest_operation =
        form.interest_operation;
    }

    if (form.interest_type?.trim()) {
      payload.interest_type =
        form.interest_type;
    }

    if (form.temperature?.trim()) {
      payload.temperature =
        form.temperature;
    }

    if (form.property_id) {
      payload.property_id =
        form.property_id;
    }

    const { error: leadError } =
      await db
        .from("leads")
        .insert(payload)
        .select("id")
        .single();

    if (leadError) {
      return toast.error(
        leadError.message,
      );
    }

    toast.success("Lead creado");

    setShowNewLead(false);

    setForm({
      full_name: "",
      phone: "",
      email: "",
      source: "manual",
      interest_operation: "venta",
      interest_type: "apartamento",
      interest_zone: "",
      budget_max: "",
      currency: "GTQ",
      notes: "",
      temperature: "tibio",
      property_id: "",
    });

    load();
  }

  async function moveDeal(
    dealId: string,
    stageId: string,
  ) {
    const current = deals.find(
      (item) => item.id === dealId,
    );

    if (
      !current ||
      current.stage_id === stageId
    ) {
      return;
    }

    const target = stages.find(
      (item) => item.id === stageId,
    );

    if (!target) return;

    const status = target.is_won
      ? "ganado"
      : target.is_lost
        ? "perdido"
        : "abierto";

    const { error } =
      await (supabase as any)
        .from("deals")
        .update({
          stage_id: stageId,
          status,
        })
        .eq("id", dealId);

    if (error) {
      return toast.error(
        error.message,
      );
    }

    setDeals((rows) =>
      rows.map((deal) =>
        deal.id === dealId
          ? {
              ...deal,
              stage_id: stageId,
              status,
              deal_stages: target,
            }
          : deal,
      ),
    );
  }

  function handleDragStart(
    event: DragStartEvent,
  ) {
    setActiveDealId(
      String(event.active.id),
    );
  }

  function handleDragEnd(
    event: DragEndEvent,
  ) {
    const { active, over } = event;

    setActiveDealId(null);

    if (!over) return;

    const stageId =
      String(over.id);

    moveDeal(
      String(active.id),
      stageId,
    );
  }

  return (
    <div className="container-altum py-10 max-w-[1500px]">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-secondary font-semibold">
            ALTUM CRM
          </p>

          <h1 className="font-display text-3xl text-primary">
            Embudo comercial
          </h1>

          <p className="text-sm text-muted-foreground mt-1">
            Kanban operativo para leads,
            propiedades, visitas y cierre.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={load}
            className="inline-flex items-center gap-2 h-10 px-4 border border-border rounded-sm hover:bg-muted text-sm"
          >
            <RefreshCw size={16} />
            Actualizar
          </button>

          <button
            onClick={() =>
              setShowNewLead(true)
            }
            className="inline-flex items-center gap-2 h-10 px-4 bg-secondary text-primary font-semibold rounded-sm hover:bg-secondary/85"
          >
            <Plus size={16} />
            Nuevo lead
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Metric
          label="Leads en gestión"
          value={String(
            activeDealCount,
          )}
        />

        <Metric
          label="Propiedades disponibles"
          value={String(
            properties.length,
          )}
        />

        <Metric
          label="Valor inventario"
          value={money(
            inventoryValue,
            "GTQ",
          )}
        />

        <Metric
          label="Vista"
          value={
            isAdmin
              ? "Admin"
              : "Asesor"
          }
        />
      </div>

      <div className="mb-5 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 rounded-sm border border-border bg-card px-3 h-11 max-w-xl flex-1 min-w-[240px]">
          <Search
            size={16}
            className="text-muted-foreground"
          />

          <input
            value={query}
            onChange={(e) =>
              setQuery(
                e.target.value,
              )
            }
            placeholder="Buscar por cliente, teléfono, propiedad o zona…"
            className="bg-transparent outline-none flex-1 text-sm"
          />
        </div>

        {isAdmin && (
          <select
            value={sellerFilter}
            onChange={(e) =>
              setSellerFilter(
                e.target.value,
              )
            }
            className="h-11 px-3 border border-border rounded-sm bg-card text-sm min-w-[220px]"
          >
            <option value="all">
              Todos los vendedores
            </option>

            {vendors.map((v) => (
              <option
                key={v.user_id}
                value={v.user_id}
              >
                {v.full_name}
              </option>
            ))}
          </select>
        )}
      </div>

      {showNewLead && (
        <div className="mb-6 bg-card border border-border rounded-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl text-primary">
              Nuevo lead rápido
            </h2>

            <button
              onClick={() =>
                setShowNewLead(false)
              }
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Cerrar
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <input
              className="input-altum"
              placeholder="Nombre cliente *"
              value={form.full_name}
              onChange={(e) =>
                setForm({
                  ...form,
                  full_name:
                    e.target.value,
                })
              }
            />

            <input
              className="input-altum"
              placeholder="WhatsApp / teléfono"
              value={form.phone}
              onChange={(e) =>
                setForm({
                  ...form,
                  phone:
                    e.target.value,
                })
              }
            />

            <input
              className="input-altum"
              placeholder="Correo"
              value={form.email}
              onChange={(e) =>
                setForm({
                  ...form,
                  email:
                    e.target.value,
                })
              }
            />

            <select
              className="input-altum"
              value={form.source}
              onChange={(e) =>
                setForm({
                  ...form,
                  source:
                    e.target.value,
                })
              }
            >
              {LEAD_SOURCES.map(
                (source) => (
                  <option
                    key={source}
                    value={source}
                  >
                    {source}
                  </option>
                ),
              )}
            </select>

            <select
              className="input-altum"
              value={
                form.interest_operation
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  interest_operation:
                    e.target.value,
                })
              }
            >
              <option value="venta">
                Compra
              </option>
              <option value="renta">
                Renta
              </option>
              <option value="ambas">
                Ambas
              </option>
            </select>

            <select
              className="input-altum"
              value={
                form.temperature
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  temperature:
                    e.target.value,
                })
              }
            >
              {LEAD_TEMPERATURES.map(
                (temp) => (
                  <option
                    key={temp}
                    value={temp}
                  >
                    {temp}
                  </option>
                ),
              )}
            </select>

            <input
              className="input-altum"
              placeholder="Tipo: casa, apartamento…"
              value={
                form.interest_type
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  interest_type:
                    e.target.value,
                })
              }
            />

            <input
              className="input-altum"
              placeholder="Zona de interés"
              value={
                form.interest_zone
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  interest_zone:
                    e.target.value,
                })
              }
            />

            <input
              className="input-altum"
              placeholder="Presupuesto máximo"
              type="number"
              value={
                form.budget_max
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  budget_max:
                    e.target.value,
                })
              }
            />

            <select
              className="input-altum md:col-span-2"
              value={
                form.property_id
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  property_id:
                    e.target.value,
                })
              }
            >
              <option value="">
                Sin propiedad específica
              </option>

              {properties.map(
                (property) => (
                  <option
                    key={
                      property.id
                    }
                    value={
                      property.id
                    }
                  >
                    {
                      property.title
                    }{" "}
                    —{" "}
                    {
                      property.zone
                    }
                  </option>
                ),
              )}
            </select>

            <input
              className="input-altum"
              placeholder="Notas"
              value={form.notes}
              onChange={(e) =>
                setForm({
                  ...form,
                  notes:
                    e.target.value,
                })
              }
            />
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={
                createLeadAndDeal
              }
              className="h-10 px-4 bg-primary text-white rounded-sm font-semibold hover:bg-primary/90"
            >
              Crear oportunidad
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="py-16 text-center text-muted-foreground">
          Cargando CRM…
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={
            handleDragStart
          }
          onDragEnd={handleDragEnd}
          onDragCancel={() =>
            setActiveDealId(null)
          }
        >
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {stages.map(
                (stage) => {
                  const stageDeals =
                    filteredDeals.filter(
                      (deal) =>
                        deal.stage_id ===
                          stage.id ||
                        deal
                          .deal_stages
                          ?.slug ===
                          stage.slug,
                    );

                  return (
                    <StageColumn
                      key={stage.id}
                      stage={stage}
                      count={
                        stageDeals.length
                      }
                    >
                      {stageDeals.map(
                        (deal) => (
                          <DraggableCard
                            key={
                              deal.id
                            }
                            deal={
                              deal
                            }
                            stages={
                              stages
                            }
                            onMove={
                              moveDeal
                            }
                            onOpen={() =>
                              setDetailDealId(
                                deal.id,
                              )
                            }
                            sellerName={
                              deal.assigned_to_user_id
                                ? sellerNames[
                                    deal
                                      .assigned_to_user_id
                                  ]
                                : undefined
                            }
                          />
                        ),
                      )}

                      {stageDeals.length ===
                        0 && (
                        <p className="text-xs text-muted-foreground text-center py-8">
                          Suelta
                          oportunidades
                          aquí
                        </p>
                      )}
                    </StageColumn>
                  );
                },
              )}
            </div>
          </div>

          <DragOverlay>
            {activeDeal ? (
              <DealCardBody
                deal={activeDeal}
                dragging
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {detailDeal && (
        <DealDetail
          deal={detailDeal}
          stages={stages}
          onClose={() =>
            setDetailDealId(null)
          }
          onMove={moveDeal}
          onRefresh={load}
          userId={
            user?.id ?? null
          }
        />
      )}
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-card border border-border rounded-sm p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>

      <p className="font-display text-2xl text-primary mt-1">
        {value}
      </p>
    </div>
  );
}

function StageColumn({
  stage,
  count,
  children,
}: {
  stage: CrmStage;
  count: number;
  children: React.ReactNode;
}) {
  const {
    setNodeRef,
    isOver,
  } = useDroppable({
    id: stage.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`w-[310px] bg-muted/40 border rounded-sm min-h-[540px] transition-colors ${
        isOver
          ? "border-secondary bg-secondary/10"
          : "border-border"
      }`}
    >
      <div className="p-3 border-b border-border bg-card sticky top-0 z-10">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-semibold text-primary">
              {stage.name}
            </p>

            <p className="text-xs text-muted-foreground">
              {
                stage.probability
              }
              % probabilidad
            </p>
          </div>

          <span className="text-xs bg-background border border-border rounded-full px-2 py-0.5">
            {count}
          </span>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {children}
      </div>
    </div>
  );
}

function DraggableCard({
  deal,
  stages,
  onMove,
  onOpen,
  sellerName,
}: {
  deal: CrmDeal;
  stages: CrmStage[];
  onMove: (
    dealId: string,
    stageId: string,
  ) => void;
  onOpen: () => void;
  sellerName?: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
    transform,
  } = useDraggable({
    id: deal.id,
  });

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,

    opacity: isDragging
      ? 0.4
      : 1,

    touchAction: "none",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <DealCardBody
        deal={deal}
        stages={stages}
        onMove={onMove}
        onOpen={onOpen}
        sellerName={sellerName}
      />
    </div>
  );
}

function DealCardBody({
  deal,
  stages,
  onMove,
  onOpen,
  dragging,
  sellerName,
}: {
  deal: CrmDeal;
  stages?: CrmStage[];
  onMove?: (
    dealId: string,
    stageId: string,
  ) => void;
  onOpen?: () => void;
  dragging?: boolean;
  sellerName?: string;
}) {
  const lead = deal.leads;
  const property =
    deal.properties;

  const wa =
    lead?.phone?.replace(
      /\D/g,
      "",
    );

  return (
    <div
      className={`bg-card border border-border rounded-sm p-4 shadow-sm ${
        dragging
          ? "shadow-lg ring-2 ring-secondary"
          : "cursor-grab active:cursor-grabbing"
      }`}
    >
      {lead?.lead_kind ===
        "captacion" && (
        <div className="mb-2">
          <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
            Captación
          </span>
        </div>
      )}

      <button
        type="button"
        onPointerDown={(e) =>
          e.stopPropagation()
        }
        onClick={(e) => {
          e.stopPropagation();
          onOpen?.();
        }}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-primary line-clamp-2 hover:underline">
              {lead?.full_name ??
                deal.title}
            </p>

            <p className="text-xs text-muted-foreground mt-0.5">
              {property?.title ??
                lead?.interest_type ??
                "Sin propiedad"}
            </p>
          </div>

          <span
            className={`text-[11px] px-2 py-0.5 border rounded-full ${temperatureClass(
              deal.temperature ??
                lead?.temperature,
            )}`}
          >
            {deal.temperature ??
              lead?.temperature ??
              "tibio"}
          </span>
        </div>
      </button>

      <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
        {sellerName && (
          <p className="text-[11px] font-medium text-primary/80">
            Asesor:{" "}
            {sellerName}
          </p>
        )}

        {lead?.phone && (
          <p className="flex items-center gap-1.5">
            <MessageCircle
              size={12}
            />

            {lead.phone}
          </p>
        )}

        {property?.zone && (
          <p>
            {property.zone} ·{" "}
            {
              property.operation
            }
          </p>
        )}

        <p className="flex items-center gap-1.5">
          <CircleDollarSign
            size={12}
          />

          {money(
            deal.deal_value,
            deal.currency ??
              "GTQ",
          )}

          {" · Comisión "}

          {money(
            deal.commission_advisor,
            deal.currency ??
              "GTQ",
          )}
        </p>

        <p className="flex items-center gap-1.5">
          <CalendarDays
            size={12}
          />

          Próxima:{" "}
          {safeDate(
            deal.next_activity_at ??
              lead?.next_follow_up_at,
          )}
        </p>
      </div>

      {!dragging && (
        <>
          <div
            className="mt-3 flex gap-2 flex-wrap"
            onPointerDown={(e) =>
              e.stopPropagation()
            }
          >
            {wa && (
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs px-2 py-1 bg-green-600 text-white rounded-sm"
              >
                WhatsApp
              </a>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpen?.();
              }}
              className="text-xs px-2 py-1 border border-border rounded-sm hover:bg-muted"
            >
              Detalle
            </button>

            <Link
              to="/vendedores/agenda"
              className="text-xs px-2 py-1 border border-border rounded-sm hover:bg-muted"
            >
              Agenda
            </Link>
          </div>

          {stages &&
            onMove && (
              <div
                className="mt-3 relative"
                onPointerDown={(e) =>
                  e.stopPropagation()
                }
              >
                <ChevronDown
                  size={14}
                  className="absolute right-2 top-2.5 text-muted-foreground pointer-events-none"
                />

                <select
                  value={
                    deal.stage_id ??
                    ""
                  }
                  onChange={(event) =>
                    onMove(
                      deal.id,
                      event.target
                        .value,
                    )
                  }
                  className="w-full text-xs h-9 px-2 border border-border rounded-sm bg-background appearance-none"
                >
                  {stages.map(
                    (stage) => (
                      <option
                        key={
                          stage.id
                        }
                        value={
                          stage.id
                        }
                      >
                        {
                          stage.name
                        }
                      </option>
                    ),
                  )}
                </select>
              </div>
            )}
        </>
      )}
    </div>
  );
}

function DealDetail({
  deal,
  stages,
  onClose,
  onMove,
  onRefresh,
  userId,
}: {
  deal: CrmDeal;
  stages: CrmStage[];
  onClose: () => void;
  onMove: (
    dealId: string,
    stageId: string,
  ) => void;
  onRefresh:
    () => void | Promise<void>;
  userId: string | null;
}) {
  const [activities, setActivities] =
    useState<CrmActivity[]>([]);

  const [loadingAct, setLoadingAct] =
    useState(true);

  const [messages, setMessages] =
    useState<WhatsAppMessage[]>([]);

  const [
    loadingMessages,
    setLoadingMessages,
  ] = useState(true);

  const [
    chatError,
    setChatError,
  ] = useState<string | null>(
    null,
  );

  const [
    activityType,
    setActivityType,
  ] = useState<string>(
    "llamada",
  );

  const [
    activityTitle,
    setActivityTitle,
  ] = useState("");

  const [
    activityNotes,
    setActivityNotes,
  ] = useState("");

  const [
    savingActivity,
    setSavingActivity,
  ] = useState(false);

  const [
    futureType,
    setFutureType,
  ] = useState<string>(
    "seguimiento",
  );

  const [
    futureDueAt,
    setFutureDueAt,
  ] = useState("");

  const [
    futureTitle,
    setFutureTitle,
  ] = useState("");

  const [
    futureNotes,
    setFutureNotes,
  ] = useState("");

  const [
    savingFuture,
    setSavingFuture,
  ] = useState(false);

  const [
    completingActivityId,
    setCompletingActivityId,
  ] = useState<
    string | null
  >(null);

  useEffect(() => {
    setActivityType(
      "llamada",
    );

    setActivityTitle("");
    setActivityNotes("");

    setFutureType(
      "seguimiento",
    );

    setFutureDueAt("");
    setFutureTitle("");
    setFutureNotes("");

    loadActivities();
    loadMessages();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal.id, deal.lead_id]);

  async function loadActivities() {
    setLoadingAct(true);

    const {
      data,
      error,
    } =
      await (supabase as any)
        .from("activities")
        .select(
          "id,title,type,status,notes,due_at,completed_at,deal_id,lead_id,assigned_to_user_id,created_at",
        )
        .or(
          `deal_id.eq.${deal.id},lead_id.eq.${deal.lead_id}`,
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(100);

    if (error) {
      toast.error(
        "Actividades: " +
          error.message,
      );
    }

    setActivities(
      (data ?? []) as CrmActivity[],
    );

    setLoadingAct(false);
  }

  async function loadMessages() {
    setLoadingMessages(true);
    setChatError(null);

    const {
      data,
      error,
    } =
      await (supabase as any)
        .from("wa_messages")
        .select(
          "id,lead_id,role,content,created_at",
        )
        .eq(
          "lead_id",
          deal.lead_id,
        )
        .order("created_at", {
          ascending: true,
        })
        .limit(300);

    if (error) {
      setMessages([]);
      setChatError(
        error.message,
      );
    } else {
      setMessages(
        (data ?? []) as WhatsAppMessage[],
      );
    }

    setLoadingMessages(false);
  }

  async function addCompletedActivity() {
    if (!userId) {
      return toast.error(
        "Sesión expirada",
      );
    }

    if (
      !activityTitle.trim() &&
      !activityNotes.trim()
    ) {
      return toast.error(
        "Agrega un título o una nota",
      );
    }

    setSavingActivity(true);

    const completedAt =
      new Date().toISOString();

    const payload: Record<
      string,
      unknown
    > = {
      deal_id: deal.id,
      lead_id: deal.lead_id,
      assigned_to_user_id:
        userId,
      created_by: userId,
      type: activityType,
      title:
        activityTitle.trim() ||
        `${activityType} con ${
          deal.leads
            ?.full_name ??
          "cliente"
        }`,
      notes:
        activityNotes.trim() ||
        null,
      status: "completada",
      completed_at:
        completedAt,
      due_at: null,
    };

    const { error } =
      await (supabase as any)
        .from("activities")
        .insert(payload);

    setSavingActivity(false);

    if (error) {
      return toast.error(
        error.message,
      );
    }

    toast.success(
      "Actividad realizada registrada",
    );

    setActivityTitle("");
    setActivityNotes("");

    await loadActivities();
  }

  async function addFutureActivity() {
    if (!userId) {
      return toast.error(
        "Sesión expirada",
      );
    }

    if (!futureDueAt) {
      return toast.error(
        "Selecciona fecha y hora para la actividad futura",
      );
    }

    const dueDate =
      new Date(futureDueAt);

    if (
      Number.isNaN(
        dueDate.getTime(),
      )
    ) {
      return toast.error(
        "La fecha seleccionada no es válida",
      );
    }

    if (
      dueDate.getTime() <=
      Date.now()
    ) {
      return toast.error(
        "La actividad futura debe quedar después de la hora actual",
      );
    }

    setSavingFuture(true);

    const payload: Record<
      string,
      unknown
    > = {
      deal_id: deal.id,
      lead_id: deal.lead_id,
      assigned_to_user_id:
        userId,
      created_by: userId,
      type: futureType,
      title:
        futureTitle.trim() ||
        `${futureType} con ${
          deal.leads
            ?.full_name ??
          "cliente"
        }`,
      notes:
        futureNotes.trim() ||
        null,
      status: "pendiente",
      completed_at: null,
      due_at:
        dueDate.toISOString(),
    };

    const { error } =
      await (supabase as any)
        .from("activities")
        .insert(payload);

    if (error) {
      setSavingFuture(false);

      return toast.error(
        error.message,
      );
    }

    toast.success(
      "Actividad futura programada",
    );

    setFutureDueAt("");
    setFutureTitle("");
    setFutureNotes("");

    await loadActivities();
    await onRefresh();

    setSavingFuture(false);
  }

  async function completeActivity(
    activity: CrmActivity,
  ) {
    if (!userId) {
      return toast.error(
        "Sesión expirada",
      );
    }

    if (
      activity.status ===
      "completada"
    ) {
      return;
    }

    setCompletingActivityId(
      activity.id,
    );

    const completedAt =
      new Date().toISOString();

    const { error } =
      await (supabase as any)
        .from("activities")
        .update({
          status: "completada",
          completed_at:
            completedAt,
        })
        .eq("id", activity.id);

    if (error) {
      setCompletingActivityId(
        null,
      );

      return toast.error(
        "No fue posible completar la actividad: " +
          error.message,
      );
    }

    setActivities(
      (rows) =>
        rows.map((row) =>
          row.id === activity.id
            ? ({
                ...row,
                status:
                  "completada",
                completed_at:
                  completedAt,
              } as CrmActivity)
            : row,
        ),
    );

    toast.success(
      "Actividad completada",
    );

    await loadActivities();
    await onRefresh();

    setCompletingActivityId(
      null,
    );
  }

  const lead = deal.leads;
  const property =
    deal.properties;

  const wa =
    lead?.phone?.replace(
      /\D/g,
      "",
    );

  const hasAdAttribution =
    Boolean(
      lead?.ad_id ||
        lead?.ad_headline ||
        lead?.ad_source_url,
    );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-background h-full overflow-y-auto shadow-xl"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        <div className="sticky top-0 bg-primary text-white px-5 py-4 flex items-center justify-between z-10">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-secondary font-semibold">
              Detalle de
              oportunidad
            </p>

            <h2 className="font-display text-xl truncate">
              {lead?.full_name ??
                deal.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-sm hover:bg-white/10"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <section className="grid sm:grid-cols-2 gap-3 text-sm">
            <InfoRow
              label="Teléfono"
              value={
                lead?.phone ??
                "—"
              }
            />

            <InfoRow
              label="Correo"
              value={
                lead?.email ??
                "—"
              }
            />

            <InfoRow
              label="Fuente"
              value={
                lead?.source ??
                "—"
              }
            />

            <InfoRow
              label="Temperatura"
              value={
                deal.temperature ??
                lead?.temperature ??
                "—"
              }
            />

            <InfoRow
              label="Interés"
              value={`${
                lead?.interest_operation ??
                "—"
              } · ${
                lead?.interest_type ??
                "—"
              }`}
            />

            <InfoRow
              label="Zona"
              value={
                lead?.interest_zone ??
                property?.zone ??
                "—"
              }
            />

            <InfoRow
              label="Propiedad"
              value={
                property?.title ??
                "—"
              }
            />

            <InfoRow
              label="Valor"
              value={money(
                deal.deal_value,
                deal.currency ??
                  "GTQ",
              )}
            />
          </section>

          <section className="border border-border rounded-sm p-4 bg-card">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-display text-primary text-lg">
                  Origen del lead
                </h3>

                <p className="text-xs text-muted-foreground mt-1">
                  Canal y atribución
                  publicitaria capturada
                  al iniciar la
                  conversación.
                </p>
              </div>

              {hasAdAttribution && (
                <span className="inline-flex items-center rounded-full border border-secondary/50 bg-secondary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  Publicidad Meta
                </span>
              )}
            </div>

            <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
              <InfoRow
                label="Canal"
                value={
                  lead?.source ??
                  "—"
                }
              />

              <InfoRow
                label="Tipo de origen"
                value={
                  lead?.ad_source_type ??
                  (hasAdAttribution
                    ? "ad"
                    : "Orgánico / sin atribución")
                }
              />
            </div>

            {hasAdAttribution ? (
              <div className="mt-3 rounded-sm border border-border bg-background p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Anuncio
                </p>

                <p className="text-sm font-semibold text-primary mt-1">
                  {lead?.ad_headline ??
                    "Anuncio de Meta"}
                </p>

                {lead?.ad_id && (
                  <p className="text-xs text-muted-foreground mt-1 break-all">
                    ID:{" "}
                    {lead.ad_id}
                  </p>
                )}

                {lead?.ad_source_url && (
                  <a
                    href={
                      lead.ad_source_url
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline underline-offset-4"
                  >
                    Ver anuncio
                    <ExternalLink
                      size={12}
                    />
                  </a>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Sin atribución de
                anuncio registrada
                para este lead.
              </p>
            )}
          </section>

          <section className="flex flex-wrap gap-2">
            {wa && (
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 h-9 px-3 bg-green-600 text-white rounded-sm text-sm"
              >
                <MessageCircle
                  size={14}
                />
                WhatsApp
              </a>
            )}

            {lead?.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="inline-flex items-center gap-1.5 h-9 px-3 border border-border rounded-sm text-sm hover:bg-muted"
              >
                <Phone size={14} />
                Llamar
              </a>
            )}

            <div className="ml-auto">
              <select
                value={
                  deal.stage_id ??
                  ""
                }
                onChange={(e) =>
                  onMove(
                    deal.id,
                    e.target.value,
                  )
                }
                className="h-9 px-2 border border-border rounded-sm bg-background text-sm"
              >
                {stages.map(
                  (s) => (
                    <option
                      key={s.id}
                      value={s.id}
                    >
                      {s.name}
                    </option>
                  ),
                )}
              </select>
            </div>
          </section>

          <section className="border border-border rounded-sm p-4 bg-card">
            <h3 className="font-display text-primary text-lg">
              Registrar actividad
              realizada
            </h3>

            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Guarda lo que acabas de
              hacer con el cliente.
              Queda completado en el
              historial y no entra como
              pendiente en Agenda.
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              <select
                className="input-altum"
                value={
                  activityType
                }
                onChange={(e) =>
                  setActivityType(
                    e.target.value,
                  )
                }
              >
                {ACTIVITY_TYPES.map(
                  (t) => (
                    <option
                      key={t}
                      value={t}
                    >
                      {t}
                    </option>
                  ),
                )}
              </select>

              <div className="hidden sm:block" />

              <input
                className="input-altum sm:col-span-2"
                placeholder="Título breve (ej. Llamé y confirmó interés)"
                value={
                  activityTitle
                }
                onChange={(e) =>
                  setActivityTitle(
                    e.target.value,
                  )
                }
              />

              <textarea
                className="input-altum sm:col-span-2 min-h-[90px] py-2"
                placeholder="Resultado / notas de lo realizado…"
                value={
                  activityNotes
                }
                onChange={(e) =>
                  setActivityNotes(
                    e.target.value,
                  )
                }
              />
            </div>

            <div className="mt-3 flex justify-end">
              <button
                disabled={
                  savingActivity
                }
                onClick={
                  addCompletedActivity
                }
                className="h-10 px-4 bg-primary text-white rounded-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
              >
                {savingActivity
                  ? "Guardando…"
                  : "Guardar actividad realizada"}
              </button>
            </div>
          </section>

          <section className="border border-secondary/60 rounded-sm p-4 bg-secondary/5">
            <h3 className="font-display text-primary text-lg">
              Programar actividad
              futura
            </h3>

            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Crea el siguiente paso.
              Esta actividad queda
              pendiente y sí aparecerá
              en Agenda en la fecha y
              hora seleccionadas.
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              <select
                className="input-altum"
                value={futureType}
                onChange={(e) =>
                  setFutureType(
                    e.target.value,
                  )
                }
              >
                {ACTIVITY_TYPES.map(
                  (t) => (
                    <option
                      key={t}
                      value={t}
                    >
                      {t}
                    </option>
                  ),
                )}
              </select>

              <input
                type="datetime-local"
                className="input-altum"
                value={
                  futureDueAt
                }
                onChange={(e) =>
                  setFutureDueAt(
                    e.target.value,
                  )
                }
                required
              />

              <input
                className="input-altum sm:col-span-2"
                placeholder="Título del siguiente paso (opcional)"
                value={
                  futureTitle
                }
                onChange={(e) =>
                  setFutureTitle(
                    e.target.value,
                  )
                }
              />

              <textarea
                className="input-altum sm:col-span-2 min-h-[90px] py-2"
                placeholder="Notas para el siguiente seguimiento (opcional)…"
                value={
                  futureNotes
                }
                onChange={(e) =>
                  setFutureNotes(
                    e.target.value,
                  )
                }
              />
            </div>

            <div className="mt-3 flex justify-end">
              <button
                disabled={
                  savingFuture
                }
                onClick={
                  addFutureActivity
                }
                className="h-10 px-4 bg-secondary text-primary rounded-sm font-semibold hover:bg-secondary/85 disabled:opacity-60"
              >
                {savingFuture
                  ? "Programando…"
                  : "Programar actividad futura"}
              </button>
            </div>
          </section>

          <section className="border border-border rounded-sm bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-primary text-lg">
                  Conversación
                  WhatsApp
                </h3>

                <p className="text-xs text-muted-foreground">
                  Historial entre el
                  cliente y Andrea.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  loadMessages
                }
                disabled={
                  loadingMessages
                }
                className="inline-flex items-center gap-1.5 h-8 px-2.5 border border-border rounded-sm text-xs hover:bg-muted disabled:opacity-50"
              >
                <RefreshCw
                  size={13}
                  className={
                    loadingMessages
                      ? "animate-spin"
                      : ""
                  }
                />

                Actualizar chat
              </button>
            </div>

            <div className="p-4 bg-muted/20 max-h-[520px] overflow-y-auto">
              {loadingMessages ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Cargando
                  conversación…
                </p>
              ) : chatError ? (
                <div className="rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  No fue posible
                  cargar el chat:{" "}
                  {chatError}
                </div>
              ) : messages.length ===
                0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Aún no hay mensajes
                  de WhatsApp enlazados
                  a este lead.
                </p>
              ) : (
                <div className="space-y-3">
                  {messages.map(
                    (message) => {
                      const fromAndrea =
                        message.role ===
                        "assistant";

                      return (
                        <div
                          key={
                            message.id
                          }
                          className={`flex ${
                            fromAndrea
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[88%] sm:max-w-[78%] rounded-lg px-3 py-2 shadow-sm ${
                              fromAndrea
                                ? "bg-primary text-white"
                                : "bg-background border border-border text-primary"
                            }`}
                          >
                            <p
                              className={`text-[11px] font-semibold mb-1 ${
                                fromAndrea
                                  ? "text-secondary"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {fromAndrea
                                ? "Andrea · ALTUM"
                                : lead?.full_name ??
                                  "Cliente"}
                            </p>

                            <p className="text-sm whitespace-pre-wrap break-words">
                              {
                                message.content
                              }
                            </p>

                            <p
                              className={`text-[10px] mt-1.5 ${
                                fromAndrea
                                  ? "text-white/65"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {safeDate(
                                message.created_at,
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="font-display text-primary text-lg">
                  Línea de tiempo
                </h3>

                <p className="text-xs text-muted-foreground mt-0.5">
                  Puedes completar aquí
                  mismo los seguimientos
                  que ya realizaste.
                </p>
              </div>
            </div>

            {loadingAct ? (
              <p className="text-sm text-muted-foreground">
                Cargando…
              </p>
            ) : activities.length ===
              0 ? (
              <p className="text-sm text-muted-foreground">
                Aún no hay actividades
                registradas.
              </p>
            ) : (
              <ol className="relative border-l border-border ml-2 space-y-4">
                {activities.map(
                  (a) => {
                    const completed =
                      a.status ===
                      "completada";

                    const completing =
                      completingActivityId ===
                      a.id;

                    return (
                      <li
                        key={a.id}
                        className="ml-4"
                      >
                        <span
                          className={`absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full border border-primary ${
                            completed
                              ? "bg-green-500"
                              : "bg-secondary"
                          }`}
                        />

                        <div className="bg-card border border-border rounded-sm p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-primary text-sm flex items-center gap-2">
                                <ActivityIcon
                                  type={
                                    a.type
                                  }
                                />

                                <span
                                  className={
                                    completed
                                      ? "line-through opacity-70"
                                      : ""
                                  }
                                >
                                  {
                                    a.title
                                  }
                                </span>
                              </p>

                              <span
                                className={`inline-block mt-1 text-[11px] uppercase tracking-wider font-semibold ${
                                  completed
                                    ? "text-green-700"
                                    : "text-amber-700"
                                }`}
                              >
                                {completed
                                  ? "completada"
                                  : a.status ??
                                    "pendiente"}
                              </span>
                            </div>

                            {!completed && (
                              <button
                                type="button"
                                disabled={
                                  completing
                                }
                                onClick={() =>
                                  void completeActivity(
                                    a,
                                  )
                                }
                                className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-sm border border-green-600 bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 disabled:opacity-50"
                              >
                                {completing ? (
                                  <RefreshCw
                                    size={
                                      13
                                    }
                                    className="animate-spin"
                                  />
                                ) : (
                                  <CheckCircle2
                                    size={
                                      14
                                    }
                                  />
                                )}

                                {completing
                                  ? "Completando…"
                                  : "Completar"}
                              </button>
                            )}
                          </div>

                          {a.notes && (
                            <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                              {
                                a.notes
                              }
                            </p>
                          )}

                          <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
                            <p className="text-[11px] text-muted-foreground">
                              {a.type} ·
                              creada{" "}
                              {safeDate(
                                a.created_at,
                              )}

                              {a.due_at
                                ? ` · seguimiento ${safeDate(
                                    a.due_at,
                                  )}`
                                : ""}
                            </p>

                            {completed && (
                              <div className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700">
                                <CheckCircle2
                                  size={
                                    12
                                  }
                                />

                                Realizada
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  },
                )}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>

      <p className="text-primary break-words">
        {value}
      </p>
    </div>
  );
}

function ActivityIcon({
  type,
}: {
  type: string;
}) {
  if (type === "llamada") {
    return (
      <Phone
        size={14}
        className="text-primary"
      />
    );
  }

  if (type === "whatsapp") {
    return (
      <MessageCircle
        size={14}
        className="text-green-600"
      />
    );
  }

  if (type === "visita") {
    return (
      <CalendarDays
        size={14}
        className="text-secondary"
      />
    );
  }

  return (
    <StickyNote
      size={14}
      className="text-primary"
    />
  );
}
