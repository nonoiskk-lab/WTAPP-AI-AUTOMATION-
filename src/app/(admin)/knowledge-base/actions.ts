"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { embed } from "@/lib/ai/provider";

export async function addFaq(formData: FormData) {
  const question = String(formData.get("question") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;

  if (!question || !answer) return;

  const db = supabaseAdmin();
  await db.from("faqs").insert({ question, answer, category });
  revalidatePath("/knowledge-base");
}

export async function updateServicePricing(formData: FormData) {
  const serviceId = String(formData.get("service_id") ?? "");
  const startingPrice = formData.get("starting_price");
  const priceIsFixed = formData.get("price_is_fixed") === "on";
  const priceNotes = String(formData.get("price_notes") ?? "").trim() || null;

  if (!serviceId) return;

  const db = supabaseAdmin();
  await db
    .from("services")
    .update({
      starting_price: startingPrice ? Number(startingPrice) : null,
      price_is_fixed: priceIsFixed,
      price_notes: priceNotes,
    })
    .eq("id", serviceId);

  revalidatePath("/knowledge-base");
}

/**
 * Ingests a pasted block of text as a knowledge document: splits into
 * paragraph-sized chunks and embeds each one (spec section 39). PDF/DOC
 * file upload with server-side extraction is not implemented in this
 * repo yet — see README "Known limitations". Paste extracted text here in
 * the meantime.
 */
export async function ingestTextDocument(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "COMPANY").trim();
  const rawText = String(formData.get("raw_text") ?? "").trim();

  if (!title || !rawText) return;

  const db = supabaseAdmin();
  const { data: doc, error } = await db
    .from("knowledge_documents")
    .insert({ title, category, source_type: "txt", raw_text: rawText, status: "processing" })
    .select("*")
    .single();

  if (error || !doc) {
    console.error("[knowledge-base] failed to create document", error);
    return;
  }

  const chunks = chunkText(rawText, 800);
  const canEmbed = Boolean(process.env.EMBEDDING_API_KEY || process.env.AI_API_KEY);

  try {
    for (const [i, chunk] of chunks.entries()) {
      const embedding = canEmbed ? await embed(chunk) : null;
      await db.from("knowledge_chunks").insert({
        document_id: doc.id,
        chunk_index: i,
        content: chunk,
        embedding,
      });
    }
    await db.from("knowledge_documents").update({ status: "indexed" }).eq("id", doc.id);
  } catch (err) {
    console.error("[knowledge-base] embedding failed", err);
    await db.from("knowledge_documents").update({ status: "failed" }).eq("id", doc.id);
  }

  revalidatePath("/knowledge-base");
}

function chunkText(text: string, maxChars: number): string[] {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const p of paragraphs) {
    if ((current + "\n\n" + p).length > maxChars && current) {
      chunks.push(current);
      current = p;
    } else {
      current = current ? `${current}\n\n${p}` : p;
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [text.slice(0, maxChars)];
}
