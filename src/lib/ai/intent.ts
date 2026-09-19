// Rule-based intent engine (spec section 9). Deterministic and cheap to run
// on every inbound message before the LLM call, so we can:
//   1. ground the AI's response in the right knowledge slice, and
//   2. drive lead scoring / routing without depending on LLM output shape.
// Swap in an LLM-based classifier later by replacing detectIntent's body —
// callers only depend on the IntentResult shape.

export type Intent =
  | "AI_AUTOMATION"
  | "WHATSAPP_AUTOMATION"
  | "AI_AGENT"
  | "CHATBOT"
  | "CRM"
  | "WEBSITE"
  | "WEB_APP"
  | "ECOMMERCE"
  | "DIGITAL_MARKETING"
  | "LEAD_GENERATION"
  | "META_ADS"
  | "GOOGLE_ADS"
  | "SALES_AUTOMATION"
  | "CUSTOM_SOFTWARE"
  | "BUSINESS_AUTOMATION"
  | "IT_SOLUTION"
  | "PRICING"
  | "QUOTE_REQUEST"
  | "PROJECT_INQUIRY"
  | "DEMO_REQUEST"
  | "MEETING_REQUEST"
  | "SUPPORT"
  | "EXISTING_CUSTOMER"
  | "COMPLAINT"
  | "PAYMENT"
  | "GENERAL_QUERY"
  | "HUMAN_SUPPORT"
  | "OPT_OUT"
  | "UNKNOWN";

export interface IntentResult {
  intent: Intent;
  matchedKeywords: string[];
}

const INTENT_KEYWORDS: Record<Exclude<Intent, "UNKNOWN">, string[]> = {
  OPT_OUT: ["stop", "unsubscribe", "don't contact", "do not contact", "no message", "remove me"],
  HUMAN_SUPPORT: ["human", "agent se baat", "talk to expert", "real person", "insaan", "representative"],
  COMPLAINT: ["complaint", "shikayat", "not working", "bahut problem", "disappointed", "angry", "gussa"],
  PAYMENT: ["payment", "invoice", "refund", "paisa", "bill", "transaction"],
  SUPPORT: ["not working", "issue", "problem aa rahi", "bug", "error", "support chahiye", "help chahiye"],
  EXISTING_CUSTOMER: ["already client", "existing customer", "hamara project", "purana client", "my project status"],
  MEETING_REQUEST: ["meeting", "call schedule", "baat karni hai call pe", "milna hai"],
  DEMO_REQUEST: ["demo", "trial dikhao", "demo dikha do", "show me demo"],
  QUOTE_REQUEST: ["quotation", "quote chahiye", "estimate do", "proposal bhejo"],
  PRICING: ["price", "pricing", "cost", "kitna lagega", "charges", "rate kya hai", "budget kitna"],
  WHATSAPP_AUTOMATION: ["whatsapp automation", "whatsapp bot", "auto reply whatsapp", "whatsapp pe automatic"],
  AI_AGENT: ["ai agent", "ai assistant banao", "ai employee"],
  CHATBOT: ["chatbot", "bot banwana hai"],
  CRM: ["crm", "lead management system", "customer data track"],
  ECOMMERCE: ["ecommerce", "e-commerce", "online store", "shopify", "online shop"],
  WEB_APP: ["web app", "web application", "saas app", "custom application"],
  WEBSITE: ["website", "landing page", "web design", "website banwana"],
  META_ADS: ["meta ads", "facebook ads", "instagram ads"],
  GOOGLE_ADS: ["google ads", "google adwords", "search ads"],
  LEAD_GENERATION: ["lead generation", "leads chahiye", "leads nahi aa rahe"],
  DIGITAL_MARKETING: ["digital marketing", "social media marketing", "marketing chahiye"],
  SALES_AUTOMATION: ["sales automation", "sales follow-up automate", "sales process automate"],
  BUSINESS_AUTOMATION: ["business automation", "process automate", "manual kaam automate", "workflow automate"],
  CUSTOM_SOFTWARE: ["custom software", "software banwana", "apna software"],
  IT_SOLUTION: ["it solution", "it consulting", "cloud solution", "digital transformation"],
  AI_AUTOMATION: ["ai automation", "automation chahiye", "ai use karna hai"],
  PROJECT_INQUIRY: ["project banwana hai", "project chahiye", "kaam karwana hai"],
  GENERAL_QUERY: ["kya karte ho", "what do you do", "aap kya services dete ho", "info chahiye"],
};

export function detectIntent(message: string): IntentResult {
  const normalized = message.toLowerCase();
  const matches: { intent: Intent; keyword: string }[] = [];

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as [Intent, string[]][]) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        matches.push({ intent, keyword });
      }
    }
  }

  if (matches.length === 0) {
    return { intent: "UNKNOWN", matchedKeywords: [] };
  }

  // Priority: safety/opt-out/human > support/complaint > commercial intents.
  const priorityOrder: Intent[] = [
    "OPT_OUT",
    "HUMAN_SUPPORT",
    "COMPLAINT",
    "PAYMENT",
    "SUPPORT",
    "EXISTING_CUSTOMER",
    "MEETING_REQUEST",
    "DEMO_REQUEST",
    "QUOTE_REQUEST",
    "PRICING",
  ];

  for (const p of priorityOrder) {
    const found = matches.find((m) => m.intent === p);
    if (found) return { intent: p, matchedKeywords: matches.filter((m) => m.intent === p).map((m) => m.keyword) };
  }

  const top = matches[0]!.intent;
  return { intent: top, matchedKeywords: matches.filter((m) => m.intent === top).map((m) => m.keyword) };
}

/** Very lightweight language style detector (spec section 7). */
export function detectLanguageStyle(message: string): "english" | "hindi" | "hinglish" {
  const hasDevanagari = /[ऀ-ॿ]/.test(message);
  if (hasDevanagari) return "hindi";

  const hinglishMarkers = [
    "hai",
    "chahiye",
    "kya",
    "kaise",
    "kitna",
    "bhai",
    "aap",
    "karna",
    "karo",
    "banwana",
    "wala",
  ];
  const normalized = message.toLowerCase();
  const hits = hinglishMarkers.filter((w) => normalized.includes(w)).length;
  return hits >= 1 ? "hinglish" : "english";
}
