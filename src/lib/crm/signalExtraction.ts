import type { Intent } from "@/lib/ai/intent";
import type { ScoringSignal } from "./leadScoring";

// Lightweight, deterministic signal + field extraction from a single message.
// This intentionally does NOT call the LLM to "understand" the business —
// keeping extraction rule-based means it's auditable and never invents a
// business name/category/budget that wasn't actually said. A future
// iteration can add an LLM extraction pass that still only writes fields
// the model quotes verbatim evidence for.

const BUSINESS_CATEGORY_KEYWORDS: Record<string, string[]> = {
  Restaurant: ["restaurant", "cafe", "dhaba", "food business"],
  Hotel: ["hotel", "resort", "guest house"],
  Retail: ["retail", "shop", "store", "showroom"],
  "E-commerce": ["ecommerce", "e-commerce", "online store"],
  "Real Estate": ["real estate", "property business", "builder"],
  School: ["school", "coaching", "institute", "academy"],
  Clinic: ["clinic", "hospital", "doctor", "dental"],
  Agency: ["agency", "marketing agency", "digital agency"],
  Manufacturer: ["manufacturer", "factory", "manufacturing"],
  Distributor: ["distributor", "wholesaler", "supplier"],
  Startup: ["startup", "start-up"],
  Corporate: ["corporate", "company hai", "our company", "enterprise"],
};

const URGENCY_KEYWORDS = ["urgent", "asap", "jaldi", "immediately", "turant"];
const BUDGET_PATTERN = /(₹|rs\.?|inr)\s?[\d,]+|[\d,]+\s?(k|thousand|lakh|lac)|budget\s+(is|hai)?\s*[\d,]+/i;
const TIMELINE_PATTERN = /\b(this week|next week|this month|\d+\s?(day|days|week|weeks|month|months))\b/i;
const DECISION_MAKER_PATTERN = /\b(i am the owner|i'm the owner|main owner|founder|ceo|proprietor|main decision leta)\b/i;

export interface ExtractedSignals {
  signals: ScoringSignal[];
  businessCategory?: string;
  budgetRange?: string;
  timeline?: string;
  isDecisionMaker?: boolean;
  urgent?: boolean;
}

export function extractSignals(message: string, intent: Intent): ExtractedSignals {
  const normalized = message.toLowerCase();
  const signals: ScoringSignal[] = [];
  const result: ExtractedSignals = { signals };

  for (const [category, keywords] of Object.entries(BUSINESS_CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => normalized.includes(k))) {
      result.businessCategory = category;
      signals.push("business_identified");
      break;
    }
  }

  const budgetMatch = message.match(BUDGET_PATTERN);
  if (budgetMatch) {
    result.budgetRange = budgetMatch[0];
    signals.push("budget_provided");
  }

  const timelineMatch = message.match(TIMELINE_PATTERN);
  if (timelineMatch) {
    result.timeline = timelineMatch[0];
    signals.push("timeline_provided");
  }

  if (DECISION_MAKER_PATTERN.test(normalized)) {
    result.isDecisionMaker = true;
    signals.push("decision_maker_identified");
  }

  if (URGENCY_KEYWORDS.some((k) => normalized.includes(k))) {
    result.urgent = true;
    signals.push("urgent_requirement");
  }

  if (intent === "DEMO_REQUEST") signals.push("demo_requested");
  if (intent === "QUOTE_REQUEST") signals.push("quotation_requested");
  if (message.trim().split(/\s+/).length >= 8 && intent !== "UNKNOWN" && intent !== "GENERAL_QUERY") {
    signals.push("clear_requirement");
  }
  if (intent === "PROJECT_INQUIRY" || intent === "QUOTE_REQUEST") {
    signals.push("implementation_discussion");
  }

  return result;
}
