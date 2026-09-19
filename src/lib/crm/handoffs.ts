import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Intent } from "@/lib/ai/intent";
import type { AiConfidence } from "@/lib/types/database";

const ALWAYS_ESCALATE_INTENTS: Intent[] = ["HUMAN_SUPPORT", "COMPLAINT", "PAYMENT"];

export interface HandoffDecision {
  shouldEscalate: boolean;
  reason?: string;
}

/** Escalation rules from spec section 21. */
export function decideHandoff(params: {
  intent: Intent;
  confidence: AiConfidence;
  message: string;
}): HandoffDecision {
  if (ALWAYS_ESCALATE_INTENTS.includes(params.intent)) {
    return { shouldEscalate: true, reason: `Intent requires human attention: ${params.intent}` };
  }
  if (params.confidence === "low") {
    return { shouldEscalate: true, reason: "AI confidence too low to answer safely" };
  }

  const negotiationMarkers = ["discount", "negotiate", "kam karo price", "best price", "final price"];
  const normalized = params.message.toLowerCase();
  if (negotiationMarkers.some((m) => normalized.includes(m))) {
    return { shouldEscalate: true, reason: "Pricing negotiation request" };
  }

  return { shouldEscalate: false };
}

/**
 * Creates a handoff record with a structured summary for the sales/support
 * team (spec section 21) and a notification. Does not send anything to the
 * customer — the caller is responsible for telling them a human will follow up.
 */
export async function createHandoff(params: {
  conversationId: string;
  leadId?: string | null;
  reason: string;
  customerBusiness?: string | null;
  requirement?: string | null;
  problem?: string | null;
  solution?: string | null;
  budget?: string | null;
  timeline?: string | null;
  questions?: string[];
  nextAction?: string;
}) {
  const db = supabaseAdmin();

  const { data: handoff, error } = await db
    .from("handoffs")
    .insert({
      conversation_id: params.conversationId,
      lead_id: params.leadId ?? null,
      reason: params.reason,
      summary: {
        business: params.customerBusiness ?? null,
        requirement: params.requirement ?? null,
        problem: params.problem ?? null,
        solution: params.solution ?? null,
        budget: params.budget ?? null,
        timeline: params.timeline ?? null,
        questions: params.questions ?? [],
        next_action: params.nextAction ?? "Contact customer to continue the conversation.",
      },
    })
    .select("*")
    .single();

  if (error) throw error;

  await db.from("notifications").insert({
    type: "handoff",
    title: "New human handoff",
    body: params.reason,
    related_conversation_id: params.conversationId,
    related_lead_id: params.leadId ?? null,
  });

  return handoff;
}
