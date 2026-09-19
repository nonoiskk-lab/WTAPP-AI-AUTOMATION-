import { complete } from "./provider";
import { KRTECH_SYSTEM_PROMPT, buildUserTurnPrompt } from "./systemPrompt";
import { retrieveKnowledge } from "./knowledge";
import { detectIntent, detectLanguageStyle, type Intent } from "./intent";
import type { AiConfidence } from "@/lib/types/database";

const FACT_SENSITIVE_INTENTS: Intent[] = ["PRICING", "QUOTE_REQUEST"];

export interface AgentInput {
  latestMessage: string;
  history: { role: "customer" | "ai"; body: string }[];
  customerProfileSummary: string;
}

export interface AgentOutput {
  replyText: string;
  intent: Intent;
  confidence: AiConfidence;
  languageStyle: "english" | "hindi" | "hinglish";
  usedFallback: boolean;
}

const FALLBACK_NO_INFO =
  "Is requirement ke exact scope aur pricing ko team confirm karegi. Main aapka requirement note karke expert ke saath connect karwa deta hoon.";

/**
 * Core AI pipeline (spec sections 9-17, 33, 35). Deterministic intent
 * detection + grounded retrieval happen first; the LLM call only ever sees
 * verified context and is instructed never to go beyond it.
 */
export async function generateAgentReply(input: AgentInput): Promise<AgentOutput> {
  const { intent } = detectIntent(input.latestMessage);
  const languageStyle = detectLanguageStyle(input.latestMessage);
  const { contextText, groundedCount } = await retrieveKnowledge(input.latestMessage, intent);

  const confidence: AiConfidence = computeConfidence(intent, groundedCount);

  // Fact-sensitive question with zero grounded knowledge: skip the LLM
  // entirely and use the canned anti-hallucination response verbatim
  // (spec section 15/16) rather than risk an invented number.
  if (FACT_SENSITIVE_INTENTS.includes(intent) && groundedCount === 0) {
    return {
      replyText: FALLBACK_NO_INFO,
      intent,
      confidence: "low",
      languageStyle,
      usedFallback: true,
    };
  }

  const historyText = input.history
    .slice(-8)
    .map((m) => `${m.role === "customer" ? "Customer" : "AI"}: ${m.body}`)
    .join("\n");

  const userPrompt = buildUserTurnPrompt({
    knowledgeContext: contextText,
    customerProfileSummary: input.customerProfileSummary,
    conversationHistory: historyText,
    latestMessage: input.latestMessage,
    detectedLanguage: languageStyle,
  });

  const result = await complete([
    { role: "system", content: KRTECH_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ]);

  return {
    replyText: result.text || FALLBACK_NO_INFO,
    intent,
    confidence,
    languageStyle,
    usedFallback: !result.text,
  };
}

function computeConfidence(intent: Intent, groundedCount: number): AiConfidence {
  if (FACT_SENSITIVE_INTENTS.includes(intent)) {
    return groundedCount > 0 ? "high" : "low";
  }
  if (intent === "UNKNOWN") return "medium";
  return "high";
}
