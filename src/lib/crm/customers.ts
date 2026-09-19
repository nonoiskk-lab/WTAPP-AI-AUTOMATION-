import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Finds or creates a customer by WhatsApp id (phone number, digits only).
 * Phone number is the unique identity key (spec section 19) — this is the
 * single place new customers are created so we never get duplicates.
 */
export async function findOrCreateCustomer(waId: string, displayName?: string) {
  const db = supabaseAdmin();

  const { data: existing } = await db.from("customers").select("*").eq("wa_id", waId).maybeSingle();

  if (existing) {
    await db
      .from("customers")
      .update({
        last_seen_at: new Date().toISOString(),
        ...(displayName && !existing.display_name ? { display_name: displayName } : {}),
      })
      .eq("id", existing.id);
    return existing;
  }

  const { data: created, error } = await db
    .from("customers")
    .insert({ wa_id: waId, display_name: displayName ?? null })
    .select("*")
    .single();

  if (error) throw error;

  await db.from("customer_profiles").insert({ customer_id: created.id });

  return created;
}

/** Finds or creates the single active conversation for a customer. */
export async function findOrCreateActiveConversation(customerId: string) {
  const db = supabaseAdmin();

  const { data: existing } = await db
    .from("conversations")
    .select("*")
    .eq("customer_id", customerId)
    .eq("is_active", true)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await db
    .from("conversations")
    .insert({ customer_id: customerId })
    .select("*")
    .single();

  if (error) throw error;
  return created;
}

export async function isOptedOut(customerId: string): Promise<boolean> {
  const db = supabaseAdmin();
  const { data } = await db.from("customers").select("marketing_opt_out").eq("id", customerId).maybeSingle();
  return Boolean(data?.marketing_opt_out);
}

/** Immediately honors an opt-out request (spec section 24). */
export async function optOutCustomer(customerId: string, reason?: string) {
  const db = supabaseAdmin();
  const now = new Date().toISOString();

  await db
    .from("customers")
    .update({ marketing_opt_out: true, opted_out_at: now })
    .eq("id", customerId);

  await db.from("opt_outs").upsert({ customer_id: customerId, reason: reason ?? "customer request" }, {
    onConflict: "customer_id",
  });

  // Cancel any pending automated follow-ups for this customer.
  await db
    .from("followups")
    .update({ status: "skipped_opt_out" })
    .eq("customer_id", customerId)
    .eq("status", "scheduled");
}
