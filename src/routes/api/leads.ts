import { createFileRoute } from "@tanstack/react-router";

type LeadPayload = {
  name?: unknown;
  email?: unknown;
  company?: unknown;
  dataset_size?: unknown;
  interest?: unknown;
  message?: unknown;
  website?: unknown;
};

const MAX_REQUEST_BYTES = 20 * 1024;
const MAX_FIELD_LENGTH = 4_000;
const asText = (value: unknown, limit = MAX_FIELD_LENGTH) =>
  typeof value === "string" ? value.trim().slice(0, limit) : "";
const accepted = () => Response.json({ ok: true });

/** Sends validated enterprise enquiries to Formspree or an HTTPS CRM webhook. */
export const Route = createFileRoute("/api/leads")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
          return Response.json({ error: "Send the enquiry as JSON." }, { status: 415 });
        }

        const declaredLength = Number(request.headers.get("content-length"));
        if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
          return Response.json({ error: "The enquiry is too large." }, { status: 413 });
        }

        let body: LeadPayload;
        try {
          const rawBody = await request.text();
          if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
            return Response.json({ error: "The enquiry is too large." }, { status: 413 });
          }
          const parsed: unknown = JSON.parse(rawBody);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            return Response.json({ error: "Invalid request body." }, { status: 400 });
          }
          body = parsed as LeadPayload;
        } catch {
          return Response.json({ error: "Invalid request body." }, { status: 400 });
        }

        // Silently discard bot submissions caught by the hidden honeypot field.
        if (asText(body.website, 255)) return accepted();

        const lead = {
          name: asText(body.name, 160),
          email: asText(body.email, 254).toLowerCase(),
          company: asText(body.company, 200),
          datasetSize: asText(body.dataset_size, 200),
          interest: asText(body.interest, 200),
          message: asText(body.message),
          source: "nesai-corporate-website",
          receivedAt: new Date().toISOString(),
        };
        if (
          !lead.name ||
          !lead.company ||
          !lead.interest ||
          !lead.message ||
          !/^\S+@\S+\.\S+$/.test(lead.email)
        ) {
          return Response.json(
            { error: "Please complete all required fields with a valid email address." },
            { status: 422 },
          );
        }

        const formspreeFormId = process.env.FORMSPREE_FORM_ID?.trim();
        const configuredWebhook = process.env.LEADS_WEBHOOK_URL?.trim();
        if (!formspreeFormId && !configuredWebhook) {
          return Response.json(
            {
              error:
                "The enquiry service is not available right now. Please email hello@nesai.co.za.",
            },
            { status: 503 },
          );
        }

        if (formspreeFormId && !/^[A-Za-z0-9]+$/.test(formspreeFormId)) {
          console.error("Lead delivery is misconfigured: the Formspree form ID is invalid.");
          return Response.json(
            {
              error:
                "The enquiry service is not available right now. Please email hello@nesai.co.za.",
            },
            { status: 503 },
          );
        }

        let webhookUrl: URL | undefined;
        if (!formspreeFormId && configuredWebhook) {
          try {
            webhookUrl = new URL(configuredWebhook);
          } catch {
            console.error("Lead automation is misconfigured: the webhook URL is invalid.");
            return Response.json(
              {
                error:
                  "The enquiry service is not available right now. Please email hello@nesai.co.za.",
              },
              { status: 503 },
            );
          }
          if (webhookUrl.protocol !== "https:") {
            console.error("Lead automation is misconfigured: the webhook must use HTTPS.");
            return Response.json(
              {
                error:
                  "The enquiry service is not available right now. Please email hello@nesai.co.za.",
              },
              { status: 503 },
            );
          }
        }

        try {
          let response: Response;
          if (formspreeFormId) {
            const formData = new FormData();
            formData.set("name", lead.name);
            formData.set("email", lead.email);
            formData.set("company", lead.company);
            formData.set("dataset_size", lead.datasetSize);
            formData.set("interest", lead.interest);
            formData.set("message", lead.message);
            formData.set("source", lead.source);
            formData.set("received_at", lead.receivedAt);
            formData.set("_replyto", lead.email);
            formData.set("_subject", `NesAI enterprise enquiry: ${lead.company}`);
            response = await fetch(`https://formspree.io/f/${formspreeFormId}`, {
              method: "POST",
              headers: { Accept: "application/json" },
              body: formData,
              signal: AbortSignal.timeout(8_000),
            });
          } else {
            response = await fetch(webhookUrl!, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(lead),
              signal: AbortSignal.timeout(8_000),
            });
          }
          if (!response.ok) {
            console.error(`Lead automation delivery returned HTTP ${response.status}.`);
            return Response.json(
              { error: "We could not send your enquiry. Please try again shortly." },
              { status: 502 },
            );
          }
        } catch (error) {
          console.error(
            "Lead automation delivery failed.",
            error instanceof Error ? error.name : "UnknownError",
          );
          return Response.json(
            { error: "We could not send your enquiry. Please try again shortly." },
            { status: 502 },
          );
        }

        return Response.json({ ok: true, delivery: formspreeFormId ? "formspree" : "automation" });
      },
    },
  },
});
