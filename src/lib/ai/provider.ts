import { env } from "@/lib/env";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionResult {
  text: string;
  raw: unknown;
}

/**
 * Configurable LLM provider (spec section 28: "LLM API with configurable
 * provider"). Supports Anthropic and OpenAI-compatible chat APIs via plain
 * fetch, so no vendor SDK is required. Set AI_PROVIDER=anthropic|openai in
 * the environment; defaults to anthropic.
 */
export async function complete(messages: ChatMessage[], opts?: { maxTokens?: number }): Promise<CompletionResult> {
  const provider = env.ai.provider;
  if (provider === "openai") {
    return completeOpenAI(messages, opts);
  }
  return completeAnthropic(messages, opts);
}

async function completeAnthropic(messages: ChatMessage[], opts?: { maxTokens?: number }): Promise<CompletionResult> {
  const system = messages.find((m) => m.role === "system")?.content;
  const rest = messages.filter((m) => m.role !== "system");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ai.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: env.ai.model,
      system,
      max_tokens: opts?.maxTokens ?? 800,
      messages: rest.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${detail}`);
  }

  const json = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (json.content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("\n")
    .trim();

  return { text, raw: json };
}

async function completeOpenAI(messages: ChatMessage[], opts?: { maxTokens?: number }): Promise<CompletionResult> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.ai.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: env.ai.model,
      max_tokens: opts?.maxTokens ?? 800,
      messages,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${detail}`);
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = json.choices?.[0]?.message?.content?.trim() ?? "";

  return { text, raw: json };
}

/**
 * Generate an embedding vector for RAG (spec section 39). Uses OpenAI's
 * embeddings endpoint regardless of chat provider, since Anthropic doesn't
 * offer a first-party embeddings API. Requires AI_API_KEY to be an OpenAI
 * key when AI_PROVIDER=anthropic and embeddings are needed — see README.
 */
export async function embed(text: string): Promise<number[]> {
  const apiKey = process.env.EMBEDDING_API_KEY || env.ai.apiKey;
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Embedding API error (${res.status}): ${detail}`);
  }

  const json = (await res.json()) as { data: { embedding: number[] }[] };
  const embedding = json.data[0]?.embedding;
  if (!embedding) throw new Error("Embedding API returned no data.");
  return embedding;
}
