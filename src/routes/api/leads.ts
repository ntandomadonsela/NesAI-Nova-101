import { createFileRoute } from "@tanstack/react-router";

type LeadPayload = { name?: unknown; email?: unknown; interest?: unknown; message?: unknown };
const MAX_FIELD_LENGTH = 4_000;
const asText = (value: unknown) => typeof value === "string" ? value.trim().slice(0, MAX_FIELD_LENGTH) : "";

/** Public lead endpoint. LEADS_WEBHOOK_URL remains server-side and can point to Make, Zapier, n8n, HubSpot, or another CRM webhook. */
export const Route = createFileRoute("/api/leads")({
  server: { handlers: { POST: async ({ request }) => {
    let body: LeadPayload;
    try { body = (await request.json()) as LeadPayload; } catch { return Response.json({ error: "Invalid request body." }, { status: 400 }); }
    const lead = { name: asText(body.name), email: asText(body.email), interest: asText(body.interest), message: asText(body.message), source: "nesma-holdings-website", receivedAt: new Date().toISOString() };
    if (!lead.name || !lead.interest || !lead.message || !/^\S+@\S+\.\S+$/.test(lead.email)) return Response.json({ error: "Please complete all required fields with a valid email address." }, { status: 422 });
    const webhookUrl = process.env.LEADS_WEBHOOK_URL;
    if (!webhookUrl) { console.info("Lead received without LEADS_WEBHOOK_URL configured", lead); return Response.json({ ok: true, delivery: "development" }); }
    try {
      const response = await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead) });
      if (!response.ok) throw new Error(`Webhook returned ${response.status}`);
    } catch (error) { console.error("Lead automation delivery failed", error); return Response.json({ error: "We could not send your enquiry. Please try again shortly." }, { status: 502 }); }
    return Response.json({ ok: true, delivery: "automation" });
  } } },
});
