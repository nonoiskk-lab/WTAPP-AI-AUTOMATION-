import crypto from "node:crypto";
import { env } from "@/lib/env";
import type {
  OutboundInteractiveButtons,
  OutboundInteractiveList,
  OutboundTextMessage,
} from "./types";

const GRAPH_VERSION = "v20.0";

function graphUrl(path: string) {
  return `https://graph.facebook.com/${GRAPH_VERSION}/${path}`;
}

async function postToGraph(body: Record<string, unknown>) {
  const url = graphUrl(`${env.whatsapp.phoneNumberId}/messages`);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.whatsapp.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`WhatsApp API error (${res.status}): ${detail}`);
  }

  return res.json() as Promise<{ messages?: { id: string }[] }>;
}

/** Send a plain text message. Returns the WhatsApp message id. */
export async function sendTextMessage({ to, body, previewUrl }: OutboundTextMessage) {
  const result = await postToGraph({
    to,
    type: "text",
    text: { body, preview_url: previewUrl ?? false },
  });
  return result.messages?.[0]?.id;
}

/** Send up to 3 quick-reply buttons (spec section 25/8). */
export async function sendInteractiveButtons({
  to,
  bodyText,
  buttons,
  footerText,
}: OutboundInteractiveButtons) {
  if (buttons.length === 0 || buttons.length > 3) {
    throw new Error("WhatsApp interactive buttons must be between 1 and 3.");
  }
  const result = await postToGraph({
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      footer: footerText ? { text: footerText } : undefined,
      action: {
        buttons: buttons.map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    },
  });
  return result.messages?.[0]?.id;
}

/** Send an interactive list menu (spec section 8 / 25 main menu). */
export async function sendInteractiveList({
  to,
  bodyText,
  buttonText,
  sections,
}: OutboundInteractiveList) {
  const result = await postToGraph({
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: bodyText },
      action: { button: buttonText, sections },
    },
  });
  return result.messages?.[0]?.id;
}

/** Mark an inbound message as read (blue ticks). Best-effort, non-blocking. */
export async function markMessageRead(waMessageId: string) {
  try {
    await postToGraph({ status: "read", message_id: waMessageId });
  } catch {
    // Non-critical — don't fail the pipeline if this fails.
  }
}

/**
 * Verify the X-Hub-Signature-256 header Meta sends with every webhook POST.
 * Requires WHATSAPP_APP_SECRET to be set; if it isn't, verification is
 * skipped and a warning is logged (webhook GET verify_token is still
 * required regardless).
 */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = env.whatsapp.appSecret;
  if (!appSecret) {
    console.warn(
      "[whatsapp] WHATSAPP_APP_SECRET not set — skipping payload signature verification. " +
        "Set it in production to prevent spoofed webhook calls."
    );
    return true;
  }
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const provided = signatureHeader.slice("sha256=".length);

  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(provided, "hex");
  if (expectedBuf.length !== providedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}
