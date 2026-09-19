import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Intent } from "@/lib/ai/intent";
import { nextStageForScore } from "./leadScoring";

const COMMERCIAL_INTENTS: Intent[] = [
  "AI_AUTOMATION",
  "WHATSAPP_AUTOMATION",
  "AI_AGENT",
  "CHATBOT",
  "CRM",
  "WEBSITE",
  "WEB_APP",
  "ECOMMERCE",
  "DIGITAL_MARKETING",
  "LEAD_GENERATION",
  "META_ADS",
  "GOOGLE_ADS",
  "SALES_AUTOMATION",
  "CUSTOM_SOFTWARE",
  "BUSINESS_AUTOMATION",
  "IT_SOLUTION",
  "PRICING",
  "QUOTE_REQUEST",
  "PROJECT_INQUIRY",
  "DEMO_REQUEST",
];

/**
 * Ensures a lead record exists for this conversation once the customer shows
 * commercial intent (spec section 17/19). Support/complaint/general chit-chat
 * does not create a lead. Never creates duplicate leads for the same open
 * conversation.
 */
export async function ensureLeadForIntent(params: {
  customerId: string;
  conversationId: string;
  intent: Intent;
}) {
  if (!COMMERCIAL_INTENTS.includes(params.intent)) return null;

  const db = supabaseAdmin();

  const { data: existing } = await db
    .from("leads")
    .select("*")
    .eq("conversation_id", params.conversationId)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await db
    .from("leads")
    .insert({
      customer_id: params.customerId,
      conversation_id: params.conversationId,
      stage: "new",
      service_interest: [params.intent],
    })
    .select("*")
    .single();

  if (error) throw error;
  return created;
}

export async function updateLeadStageFromScore(leadId: string) {
  const db = supabaseAdmin();
  const { data: lead } = await db.from("leads").select("stage, score").eq("id", leadId).single();
  if (!lead) return;

  const newStage = nextStageForScore(lead.stage, lead.score);
  if (newStage !== lead.stage) {
    await db.from("leads").update({ stage: newStage }).eq("id", leadId);

    if (newStage === "hot") {
      await db.from("notifications").insert({
        type: "hot_lead",
        title: "Hot lead detected",
        body: `Lead ${leadId} crossed the hot threshold (score ${lead.score}).`,
        related_lead_id: leadId,
      });
    }
  }
}

/** Merges newly-extracted profile fields without clobbering existing ones (spec section 20). */
type ProfileFields = Partial<{
  business_name: string;
  business_category: string;
  problem_statement: string;
  desired_solution: string;
  budget_range: string;
  timeline: string;
  is_decision_maker: boolean;
}>;

export async function upsertCustomerProfile(customerId: string, fields: ProfileFields) {
  const db = supabaseAdmin();
  const cleaned = Object.fromEntries(
    Object.entries(fields).filter(([, v]) => v !== undefined && v !== null && v !== "")
  ) as ProfileFields;
  if (Object.keys(cleaned).length === 0) return;

  await db.from("customer_profiles").update(cleaned).eq("customer_id", customerId);

  // Mirror budget/timeline onto the active lead for pipeline visibility.
  const { data: lead } = await db
    .from("leads")
    .select("id")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lead && (cleaned.budget_range || cleaned.timeline)) {
    await db
      .from("leads")
      .update({
        ...(cleaned.budget_range ? { budget_range: cleaned.budget_range as string } : {}),
        ...(cleaned.timeline ? { timeline: cleaned.timeline as string } : {}),
        ...(typeof cleaned.is_decision_maker === "boolean" ? { decision_maker: cleaned.is_decision_maker } : {}),
      })
      .eq("id", lead.id);
  }
}
