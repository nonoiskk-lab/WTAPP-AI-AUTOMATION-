import { supabaseAdmin } from "@/lib/supabase/admin";
import { embed } from "./provider";
import type { Intent } from "./intent";

/**
 * Retrieves grounded knowledge for a customer question (spec section 14/39).
 * Strategy:
 *   1. Always pull any active FAQ/service rows that keyword-match the intent
 *      or message (fast, free, always available even with zero embeddings).
 *   2. If embeddings are configured (EMBEDDING_API_KEY or AI_API_KEY with an
 *      OpenAI-compatible provider) AND at least one knowledge_chunk has been
 *      indexed, also run a vector similarity search and merge results.
 * Returns a single formatted context string plus a flag the agent uses to
 * decide confidence: groundedCount === 0 means "no verified info found" and
 * the anti-hallucination fallback response must be used.
 */
export interface KnowledgeContext {
  contextText: string;
  groundedCount: number;
}

export async function retrieveKnowledge(message: string, intent: Intent): Promise<KnowledgeContext> {
  const db = supabaseAdmin();
  const sections: string[] = [];
  let groundedCount = 0;

  const serviceSlugHint = intentToServiceCategory(intent);
  const { data: services } = await db
    .from("services")
    .select("name, short_description, full_description, starting_price, price_is_fixed, price_notes, category")
    .eq("is_active", true)
    .ilike("category", serviceSlugHint ? `%${serviceSlugHint}%` : "%")
    .limit(5);

  if (services && services.length > 0) {
    groundedCount += services.length;
    sections.push(
      "SERVICES:\n" +
        services
          .map((s) => {
            const price = s.price_is_fixed && s.starting_price ? `Starting price: ₹${s.starting_price}.` : "Pricing: custom quote required — do not state a number.";
            return `- ${s.name}: ${s.short_description ?? s.full_description ?? ""} ${price} ${s.price_notes ?? ""}`.trim();
          })
          .join("\n")
    );
  }

  const words = message.split(/\s+/).filter((w) => w.length > 3).slice(0, 6);
  if (words.length > 0) {
    const orFilter = words.map((w) => `question.ilike.%${w}%,answer.ilike.%${w}%`).join(",");
    const { data: faqs } = await db
      .from("faqs")
      .select("question, answer")
      .eq("is_active", true)
      .or(orFilter)
      .limit(5);

    if (faqs && faqs.length > 0) {
      groundedCount += faqs.length;
      sections.push("FAQs:\n" + faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n"));
    }
  }

  try {
    const canEmbed = Boolean(process.env.EMBEDDING_API_KEY || process.env.AI_API_KEY);
    if (canEmbed) {
      const queryEmbedding = await embed(message);
      const { data: chunks } = await db.rpc("match_knowledge_chunks", {
        query_embedding: queryEmbedding,
        match_count: 4,
        min_similarity: 0.72,
      });
      if (chunks && chunks.length > 0) {
        groundedCount += chunks.length;
        sections.push("KNOWLEDGE BASE EXCERPTS:\n" + chunks.map((c) => `- ${c.content}`).join("\n"));
      }
    }
  } catch (err) {
    // Embeddings are best-effort. Keyword-based grounding above still applies.
    console.warn("[knowledge] vector search skipped:", (err as Error).message);
  }

  return { contextText: sections.join("\n\n"), groundedCount };
}

function intentToServiceCategory(intent: Intent): string | null {
  const map: Partial<Record<Intent, string>> = {
    AI_AUTOMATION: "AI_AUTOMATION",
    WHATSAPP_AUTOMATION: "AI_AUTOMATION",
    AI_AGENT: "AI_AUTOMATION",
    CHATBOT: "AI_AUTOMATION",
    SALES_AUTOMATION: "AI_AUTOMATION",
    BUSINESS_AUTOMATION: "AI_AUTOMATION",
    WEBSITE: "WEBSITE",
    WEB_APP: "WEBSITE",
    ECOMMERCE: "WEBSITE",
    DIGITAL_MARKETING: "DIGITAL_MARKETING",
    LEAD_GENERATION: "DIGITAL_MARKETING",
    META_ADS: "DIGITAL_MARKETING",
    GOOGLE_ADS: "DIGITAL_MARKETING",
    CRM: "CRM_AUTOMATION",
    CUSTOM_SOFTWARE: "IT_SOLUTIONS",
    IT_SOLUTION: "IT_SOLUTIONS",
  };
  return map[intent] ?? null;
}
