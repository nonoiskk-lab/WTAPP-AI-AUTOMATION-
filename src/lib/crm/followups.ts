import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendTextMessage } from "@/lib/whatsapp/client";

// Follow-up delay policy (spec section 23). Kept as simple constants for now;
// move to `settings` table if the admin UI needs to edit cadence per trigger.
const FOLLOWUP_DELAYS_HOURS = {
  new_lead_no_response: 24,
  quote_no_response: 48,
  demo_reminder: 2,
} as const;

export type FollowupTrigger = keyof typeof FOLLOWUP_DELAYS_HOURS;

/** Schedules a follow-up unless the customer has opted out (spec section 23/24). */
export async function scheduleFollowup(params: {
  customerId: string;
  leadId?: string | null;
  trigger: FollowupTrigger;
}) {
  const db = supabaseAdmin();

  const { data: customer } = await db
    .from("customers")
    .select("marketing_opt_out")
    .eq("id", params.customerId)
    .single();

  if (customer?.marketing_opt_out) return null;

  const delayHours = FOLLOWUP_DELAYS_HOURS[params.trigger];
  const scheduledAt = new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString();

  const { data, error } = await db
    .from("followups")
    .insert({
      customer_id: params.customerId,
      lead_id: params.leadId ?? null,
      trigger_reason: params.trigger,
      scheduled_at: scheduledAt,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/**
 * Sends any due follow-ups. Intended to be invoked by a scheduled job
 * (Vercel Cron / n8n) hitting POST /api/cron/followups — see route handler
 * and README for wiring instructions, since this repo does not include a
 * standalone worker process.
 */
export async function processDueFollowups() {
  const db = supabaseAdmin();
  const nowIso = new Date().toISOString();

  const { data: due } = await db
    .from("followups")
    .select("*, customers!inner(wa_id, marketing_opt_out)")
    .eq("status", "scheduled")
    .lte("scheduled_at", nowIso)
    .limit(50);

  if (!due || due.length === 0) return { processed: 0 };

  let processed = 0;
  for (const followup of due) {
    const customer = (followup as unknown as { customers: { wa_id: string; marketing_opt_out: boolean } }).customers;

    if (customer.marketing_opt_out) {
      await db.from("followups").update({ status: "skipped_opt_out" }).eq("id", followup.id);
      continue;
    }

    try {
      const body = followupMessageFor(followup.trigger_reason);
      await sendTextMessage({ to: customer.wa_id, body });
      await db
        .from("followups")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", followup.id);
      processed += 1;
    } catch (err) {
      console.error("[followups] failed to send", followup.id, err);
    }
  }

  return { processed };
}

function followupMessageFor(trigger: string): string {
  switch (trigger) {
    case "quote_no_response":
      return "Hi 👋 following up on the quote we discussed — any questions before we move ahead? Happy to help.";
    case "demo_reminder":
      return "Hi 👋 just checking in on the demo you were interested in — want me to set a time that works for you?";
    default:
      return "Hi 👋 just following up on your requirement — still exploring, or would it help to talk it through with our team?";
  }
}
