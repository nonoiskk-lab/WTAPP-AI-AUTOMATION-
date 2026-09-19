import { supabaseAdmin } from "@/lib/supabase/admin";
import type { LeadStage } from "@/lib/types/database";

// Signals and weights from spec section 18. Kept as named constants (not
// magic numbers) so the admin "automation" settings page can eventually
// expose and edit them via the `settings.lead_scoring_weights` row.
export const SCORING_SIGNALS = {
  clear_requirement: 10,
  business_identified: 10,
  budget_provided: 10,
  timeline_provided: 10,
  decision_maker_identified: 10,
  demo_requested: 15,
  quotation_requested: 15,
  implementation_discussion: 10,
  urgent_requirement: 10,
} as const;

export type ScoringSignal = keyof typeof SCORING_SIGNALS;

/** Records a scoring signal (idempotent per signal per lead) and recomputes the total. */
export async function recordLeadSignal(leadId: string, signal: ScoringSignal, metadata?: Record<string, unknown>) {
  const db = supabaseAdmin();

  const { data: existing } = await db
    .from("lead_events")
    .select("id")
    .eq("lead_id", leadId)
    .eq("event_type", signal)
    .limit(1);

  if (existing && existing.length > 0) {
    return; // Signal already credited — don't double count.
  }

  await db.from("lead_events").insert({
    lead_id: leadId,
    event_type: signal,
    score_delta: SCORING_SIGNALS[signal],
    metadata: metadata ?? {},
  });

  await db.rpc("recompute_lead_score", { p_lead_id: leadId });
}

export function classifyScore(score: number): "cold" | "warm" | "qualified" | "hot" {
  if (score <= 25) return "cold";
  if (score <= 50) return "warm";
  if (score <= 75) return "qualified";
  return "hot";
}

/** Maps a numeric score band to the CRM pipeline stage, without regressing
 * a stage the lead has already progressed past (e.g. proposal/negotiation). */
export function nextStageForScore(currentStage: LeadStage, score: number): LeadStage {
  const advancedStages: LeadStage[] = ["proposal", "negotiation", "converted", "lost"];
  if (advancedStages.includes(currentStage)) return currentStage;

  const band = classifyScore(score);
  if (band === "hot") return "hot";
  if (band === "qualified") return "qualified";
  if (band === "warm") return "qualifying";
  return currentStage === "new" ? "new" : "qualifying";
}
