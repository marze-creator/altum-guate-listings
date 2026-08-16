import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhone(value: string | null) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 8) return `502${digits}`;
  return digits;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "server_config_missing" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await admin.auth.getUser(token);
    const user = authData?.user;
    if (authError || !user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const leadId = String(body?.lead_id ?? "").trim();
    const action = String(body?.action ?? "send_text");
    const content = String(body?.content ?? "").trim();
    if (!leadId) return json({ error: "lead_id_required" }, 400);

    const [{ data: profile }, { data: roleRows }] = await Promise.all([
      admin.from("profiles").select("organization_id").eq("user_id", user.id).maybeSingle(),
      admin.from("user_roles").select("role").eq("user_id", user.id),
    ]);

    const organizationId = profile?.organization_id ?? null;
    const isAdmin = (roleRows ?? []).some((row: { role: string }) => row.role === "admin");
    if (!organizationId) return json({ error: "organization_not_found" }, 403);

    const { data: lead, error: leadError } = await admin
      .from("leads")
      .select("id,organization_id,assigned_to_user_id,created_by,phone,property_id,ad_property_id,full_name")
      .eq("id", leadId)
      .maybeSingle();

    if (leadError || !lead) return json({ error: "lead_not_found" }, 404);
    if (lead.organization_id !== organizationId) return json({ error: "forbidden" }, 403);
    if (!isAdmin && lead.assigned_to_user_id !== user.id && lead.created_by !== user.id) {
      return json({ error: "forbidden" }, 403);
    }

    const phone = normalizePhone(lead.phone);
    if (!phone) return json({ error: "lead_phone_missing" }, 400);

    const { data: lastInbound } = await admin
      .from("wa_messages")
      .select("created_at")
      .eq("lead_id", leadId)
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastInboundAt = lastInbound?.created_at ? new Date(lastInbound.created_at).getTime() : 0;
    const windowOpen = Boolean(lastInboundAt && Date.now() - lastInboundAt < 24 * 60 * 60 * 1000);
    if (!windowOpen) {
      return json({
        error: "WHATSAPP_WINDOW_CLOSED",
        message: "La ventana de 24 horas está cerrada. Usa una plantilla aprobada.",
        last_inbound_at: lastInbound?.created_at ?? null,
      }, 409);
    }

    const accessToken =
      Deno.env.get("WHATSAPP_ACCESS_TOKEN") ??
      Deno.env.get("META_WHATSAPP_TOKEN") ??
      Deno.env.get("META_ACCESS_TOKEN");
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") ?? "1215949138274781";
    const graphVersion = Deno.env.get("WHATSAPP_GRAPH_API_VERSION") ?? "v23.0";

    if (!accessToken) {
      return json({
        error: "WHATSAPP_ACCESS_TOKEN_MISSING",
        message: "Configura WHATSAPP_ACCESS_TOKEN como secret de la Edge Function.",
      }, 503);
    }

    async function sendMeta(messagePayload: Record<string, unknown>) {
      const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messaging_product: "whatsapp", to: phone, ...messagePayload }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error("WhatsApp API error", response.status, payload);
        throw new Error(payload?.error?.message ?? `WhatsApp API ${response.status}`);
      }
      return payload;
    }

    if (action === "send_property_photos") {
      const propertyId = lead.property_id ?? lead.ad_property_id ?? null;
      if (!propertyId) return json({ error: "property_not_linked" }, 400);

      const [{ data: property }, { data: photos, error: photosError }] = await Promise.all([
        admin.from("properties").select("id,title").eq("id", propertyId).maybeSingle(),
        admin
          .from("property_images")
          .select("url,alt,position")
          .eq("property_id", propertyId)
          .order("position", { ascending: true })
          .limit(3),
      ]);

      if (photosError) throw photosError;
      if (!photos?.length) return json({ error: "property_photos_missing" }, 404);

      const sent: string[] = [];
      for (let index = 0; index < photos.length; index += 1) {
        const photo = photos[index];
        const caption = index === 0 ? `Fotos de ${property?.title ?? "la propiedad"}` : undefined;
        const result = await sendMeta({ type: "image", image: { link: photo.url, ...(caption ? { caption } : {}) } });
        const messageId = result?.messages?.[0]?.id ?? null;
        if (messageId) sent.push(messageId);
        await admin.from("wa_messages").insert({
          organization_id: organizationId,
          phone: lead.phone,
          lead_id: leadId,
          role: "assistant",
          sender: "humano",
          content: caption ?? "📷 Foto enviada por asesor",
          message_type: "image",
          media_url: photo.url,
          meta_message_id: messageId,
        });
      }

      await admin.from("leads").update({ ai_paused: true, last_contacted_at: new Date().toISOString() }).eq("id", leadId);
      return json({ ok: true, action, sent: sent.length, ai_paused: true });
    }

    if (action !== "send_text") return json({ error: "unsupported_action" }, 400);
    if (!content) return json({ error: "content_required" }, 400);
    if (content.length > 4000) return json({ error: "content_too_long" }, 400);

    const result = await sendMeta({ type: "text", text: { preview_url: true, body: content } });
    const metaMessageId = result?.messages?.[0]?.id ?? null;

    const { error: insertError } = await admin.from("wa_messages").insert({
      organization_id: organizationId,
      phone: lead.phone,
      lead_id: leadId,
      role: "assistant",
      sender: "humano",
      content,
      message_type: "text",
      media_url: null,
      meta_message_id: metaMessageId,
    });
    if (insertError) throw insertError;

    await admin.from("leads").update({ ai_paused: true, last_contacted_at: new Date().toISOString() }).eq("id", leadId);

    return json({ ok: true, action, meta_message_id: metaMessageId, ai_paused: true });
  } catch (error) {
    console.error("wa-send failure", error);
    return json({ error: "send_failed", message: error instanceof Error ? error.message : "Error desconocido" }, 500);
  }
});
