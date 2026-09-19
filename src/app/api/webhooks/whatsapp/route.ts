import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyWebhookSignature, sendTextMessage, markMessageRead } from "@/lib/whatsapp/client";
import type { WhatsAppInboundMessage, WhatsAppWebhookPayload } from "@/lib/whatsapp/types";
import { findOrCreateActiveConversation, findOrCreateCustomer, isOptedOut, optOutCustomer } from "@/lib/crm/customers";
import { generateAgentReply } from "@/lib/ai/agent";
import { detectIntent } from "@/lib/ai/intent";
import { ensureLeadForIntent, updateLeadStageFromScore, upsertCustomerProfile } from "@/lib/crm/leads";
import { recordLeadSignal } from "@/lib/crm/leadScoring";
import { extractSignals } from "@/lib/crm/signalExtraction";
import { decideHandoff, createHandoff } from "@/lib/crm/handoffs";
import { scheduleFollowup } from "@/lib/crm/followups";

const OPT_OUT_PHRASES = ["stop", "unsubscribe", "no message", "don't contact", "do not contact", "remove me"];

/**
 * Webhook verification (Meta calls this once when you configure the
 * webhook URL in the WhatsApp app dashboard). Requires WHATSAPP_VERIFY_TOKEN
 * to match exactly what you enter in the Meta dashboard — see .env.example.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === env.whatsapp.verifyToken) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * Main inbound message pipeline (spec section 31):
 * validate -> identify customer -> store message -> dedup -> detect intent
 * -> retrieve knowledge -> generate AI response -> send -> update CRM -> log.
 *
 * Always returns 200 quickly (WhatsApp retries aggressively on non-2xx),
 * even when an individual message fails — errors are logged, not thrown,
 * once we're past payload validation.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const messages = payload.entry?.flatMap((e) => e.changes.flatMap((c) => c.value.messages ?? [])) ?? [];

  for (const message of messages) {
    try {
      await processInboundMessage(message);
    } catch (err) {
      console.error("[webhook] failed to process message", message.id, err);
    }
  }

  return NextResponse.json({ received: true });
}

async function processInboundMessage(message: WhatsAppInboundMessage) {
  const db = supabaseAdmin();

  // Idempotency guard (spec section 32): if we've already stored this
  // WhatsApp message id, skip — prevents duplicate AI replies on webhook retries.
  const { data: alreadyProcessed } = await db
    .from("messages")
    .select("id")
    .eq("wa_message_id", message.id)
    .maybeSingle();
  if (alreadyProcessed) return;

  const body = extractMessageBody(message);
  const customer = await findOrCreateCustomer(message.from);
  const conversation = await findOrCreateActiveConversation(customer.id);

  const { error: insertError } = await db.from("messages").insert({
    conversation_id: conversation.id,
    customer_id: customer.id,
    wa_message_id: message.id,
    direction: "inbound",
    sender_type: "customer",
    content_type: message.type,
    body,
    status: "received",
  });
  // Unique constraint on wa_message_id is the authoritative dedup guard —
  // if a race lost to a concurrent webhook retry, stop here.
  if (insertError) return;

  await markMessageRead(message.id);

  if (!body) return; // Non-text content (image/doc/location) — no AI reply yet.

  // Opt-out handling takes priority over everything else (spec section 24).
  if (OPT_OUT_PHRASES.some((p) => body.toLowerCase().includes(p))) {
    await optOutCustomer(customer.id);
    await sendAndLog(conversation.id, customer.id, customer.wa_id,
      "Aapko samajh gaya 👍 Hum aapko promotional messages nahi bhejenge. Agar future mein help chahiye ho, aap kabhi bhi message kar sakte hain."
    );
    return;
  }

  if (await isOptedOut(customer.id)) {
    // Customer opted out previously but is messaging us again — still answer
    // their direct question, we just won't push proactive follow-ups.
  }

  const { intent } = detectIntent(body);
  const lead = await ensureLeadForIntent({ customerId: customer.id, conversationId: conversation.id, intent });

  const extracted = extractSignals(body, intent);
  if (lead) {
    for (const signal of extracted.signals) {
      await recordLeadSignal(lead.id, signal);
    }
    await updateLeadStageFromScore(lead.id);
  }

  await upsertCustomerProfile(customer.id, {
    business_category: extracted.businessCategory,
    budget_range: extracted.budgetRange,
    timeline: extracted.timeline,
    is_decision_maker: extracted.isDecisionMaker,
  });

  const { data: profile } = await db
    .from("customer_profiles")
    .select("*")
    .eq("customer_id", customer.id)
    .maybeSingle();

  const { data: historyRows } = await db
    .from("messages")
    .select("sender_type, body")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const history = (historyRows ?? [])
    .reverse()
    .filter((m) => m.body)
    .map((m) => ({ role: (m.sender_type === "customer" ? "customer" : "ai") as "customer" | "ai", body: m.body! }));

  const agentResult = await generateAgentReply({
    latestMessage: body,
    history,
    customerProfileSummary: summarizeProfile(profile),
  });

  const handoffDecision = decideHandoff({ intent: agentResult.intent, confidence: agentResult.confidence, message: body });

  let replyText = agentResult.replyText;
  if (handoffDecision.shouldEscalate) {
    await createHandoff({
      conversationId: conversation.id,
      leadId: lead?.id ?? null,
      reason: handoffDecision.reason ?? "Escalation triggered",
      customerBusiness: profile?.business_category ?? null,
      requirement: profile?.desired_solution ?? profile?.problem_statement ?? null,
      problem: profile?.problem_statement ?? null,
      budget: profile?.budget_range ?? null,
      timeline: profile?.timeline ?? null,
      questions: [body],
    });
    replyText = `${agentResult.replyText}\n\nMain aapki requirement note kar chuka hoon — humari team jald hi aapse connect karegi.`;
  }

  await sendAndLog(conversation.id, customer.id, customer.wa_id, replyText, {
    intent: agentResult.intent,
    ai_confidence: agentResult.confidence,
  });

  await db
    .from("conversations")
    .update({
      current_intent: agentResult.intent,
      ai_confidence: agentResult.confidence,
      last_message_at: new Date().toISOString(),
      last_message_preview: body.slice(0, 140),
    })
    .eq("id", conversation.id);

  if (lead && !handoffDecision.shouldEscalate) {
    await scheduleFollowup({ customerId: customer.id, leadId: lead.id, trigger: "new_lead_no_response" });
  }
}

async function sendAndLog(
  conversationId: string,
  customerId: string,
  waId: string,
  text: string,
  meta?: { intent?: string; ai_confidence?: "high" | "medium" | "low" }
) {
  const db = supabaseAdmin();
  let waMessageId: string | undefined;
  let status = "sent";
  let errorDetail: string | null = null;

  try {
    waMessageId = await sendTextMessage({ to: waId, body: text });
  } catch (err) {
    status = "failed";
    errorDetail = (err as Error).message;
    console.error("[webhook] send failed", err);
  }

  await db.from("messages").insert({
    conversation_id: conversationId,
    customer_id: customerId,
    wa_message_id: waMessageId ?? null,
    direction: "outbound",
    sender_type: "ai",
    content_type: "text",
    body: text,
    status,
    error_detail: errorDetail,
    intent: meta?.intent ?? null,
    ai_confidence: meta?.ai_confidence ?? null,
  });
}

function extractMessageBody(message: WhatsAppInboundMessage): string | null {
  if (message.type === "text") return message.text?.body ?? null;
  if (message.type === "interactive") {
    return message.interactive?.button_reply?.title ?? message.interactive?.list_reply?.title ?? null;
  }
  if (message.type === "button") return message.button?.text ?? null;
  return null;
}

function summarizeProfile(profile: Record<string, unknown> | null | undefined): string {
  if (!profile) return "";
  const lines: string[] = [];
  if (profile.business_name) lines.push(`Business name: ${profile.business_name}`);
  if (profile.business_category) lines.push(`Business category: ${profile.business_category}`);
  if (profile.problem_statement) lines.push(`Problem: ${profile.problem_statement}`);
  if (profile.desired_solution) lines.push(`Desired solution: ${profile.desired_solution}`);
  if (profile.budget_range) lines.push(`Budget: ${profile.budget_range}`);
  if (profile.timeline) lines.push(`Timeline: ${profile.timeline}`);
  return lines.join("\n");
}
