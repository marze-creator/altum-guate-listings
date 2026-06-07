// Edge Function: send-lead-notification
// Sends an email via Resend when a new lead is inserted into any leads table.
// Triggered by Supabase Database Webhooks (INSERT on inquiries, property_submissions, valuations).

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const WEBHOOK_SECRET = "3d92e1cfe87de0fd4ced69f8efaef6611486ba6e93b8d928";
const NOTIFY_TO = "marcelo@altumgroup.com.gt";
const NOTIFY_FROM = "Altum Group <admin@altumgroup.com.gt>";

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: Record<string, any>;
  old_record: Record<string, any> | null;
}

function escapeHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function extractLead(table: string, record: Record<string, any>) {
  // Normalize across the three tables
  if (table === "inquiries") {
    return {
      source: "Consulta de propiedad",
      name: record.name,
      email: record.email,
      phone: record.phone,
      message: record.message,
      extra: { property_id: record.property_id },
    };
  }
  if (table === "property_submissions") {
    return {
      source: "Publicación de propiedad",
      name: record.contact_name,
      email: record.contact_email,
      phone: record.contact_phone,
      message: record.description,
      extra: {
        property_type: record.property_type,
        operation: record.operation,
        zone: record.zone,
        price: record.price,
      },
    };
  }
  if (table === "valuations") {
    return {
      source: "Solicitud de tasación",
      name: record.full_name,
      email: record.email,
      phone: record.phone || record.whatsapp,
      message: record.comments || record.reason,
      extra: {
        property_type: record.property_type,
        zone: record.zone,
        approximate_size: record.approximate_size,
        estimated_value: record.estimated_value,
      },
    };
  }
  return {
    source: table,
    name: record.name || record.full_name || record.contact_name,
    email: record.email || record.contact_email,
    phone: record.phone || record.contact_phone || record.whatsapp,
    message: record.message || record.description || record.comments,
    extra: {},
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Verify webhook secret (constant-time compare) — blocks anonymous spam
    const incomingSecret = req.headers.get("x-webhook-secret") ?? "";
    if (!timingSafeEqualStr(incomingSecret, WEBHOOK_SECRET)) {
      console.warn("Rejected webhook: invalid or missing secret");
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    if (!RESEND_API_KEY) {
      console.error("Missing RESEND_API_KEY");
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as WebhookPayload;



    if (payload.type !== "INSERT" || !payload.record) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lead = extractLead(payload.table, payload.record);

    const extraRows = Object.entries(lead.extra || {})
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px 10px;color:#666;text-transform:capitalize">${escapeHtml(
            k.replace(/_/g, " "),
          )}</td><td style="padding:6px 10px;color:#111">${escapeHtml(v)}</td></tr>`,
      )
      .join("");

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111">
        <h2 style="margin:0 0 8px;color:#1a1a1a">Nuevo lead: ${escapeHtml(lead.source)}</h2>
        <p style="margin:0 0 16px;color:#666">Tabla: <code>${escapeHtml(payload.table)}</code> · ID: <code>${escapeHtml(payload.record.id)}</code></p>
        <table style="width:100%;border-collapse:collapse;background:#fafafa;border:1px solid #eee;border-radius:6px">
          <tr><td style="padding:6px 10px;color:#666;width:140px">Nombre</td><td style="padding:6px 10px"><strong>${escapeHtml(lead.name)}</strong></td></tr>
          <tr><td style="padding:6px 10px;color:#666">Email</td><td style="padding:6px 10px"><a href="mailto:${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</a></td></tr>
          <tr><td style="padding:6px 10px;color:#666">Teléfono</td><td style="padding:6px 10px">${escapeHtml(lead.phone)}</td></tr>
          ${extraRows}
        </table>
        ${lead.message ? `<div style="margin-top:16px"><p style="color:#666;margin:0 0 6px">Mensaje:</p><div style="background:#fff;border:1px solid #eee;border-radius:6px;padding:12px;white-space:pre-wrap">${escapeHtml(lead.message)}</div></div>` : ""}
        <p style="margin-top:24px;font-size:12px;color:#999">Notificación automática · Altum Group</p>
      </div>
    `;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: [NOTIFY_TO],
        reply_to: lead.email || undefined,
        subject: `Nuevo lead (${lead.source}) — ${lead.name ?? "Sin nombre"}`,
        html,
      }),
    });

    const respText = await resp.text();
    if (!resp.ok) {
      console.error("Resend error:", resp.status, respText);
      return new Response(JSON.stringify({ error: "Resend failed", status: resp.status, body: respText }), {
        status: 200, // Return 200 so webhook is not retried infinitely
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Email sent:", respText);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Handler error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
