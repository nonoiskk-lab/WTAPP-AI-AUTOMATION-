import { PageHeader } from "@/components/admin/PageHeader";
import { ConfigWarning } from "@/components/admin/ConfigWarning";
import { supabaseServer } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { addFaq, ingestTextDocument, updateServicePricing } from "./actions";

export const dynamic = "force-dynamic";

export default async function KnowledgeBasePage() {
  if (!env.isConfigured.supabase()) {
    return (
      <div>
        <PageHeader title="Knowledge Base" />
        <ConfigWarning items={["Supabase not configured yet."]} />
      </div>
    );
  }

  const supabase = await supabaseServer();
  const [{ data: services }, { data: faqs }, { data: documents }] = await Promise.all([
    supabase.from("services").select("*").order("category"),
    supabase.from("faqs").select("*").order("created_at", { ascending: false }),
    supabase.from("knowledge_documents").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Knowledge Base"
        description="Everything the AI is allowed to state as fact. If it's not here, the AI will say the team will confirm it — never invents an answer."
      />

      {!env.isConfigured.ai() && (
        <ConfigWarning items={["AI_API_KEY not set — new documents will be stored but not embedded until it's configured."]} />
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink-200">Services & pricing</h2>
        <div className="card overflow-x-auto !p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-700 text-xs uppercase text-ink-400">
              <tr>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Starting price</th>
                <th className="px-4 py-3">Fixed?</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {(services ?? []).map((s) => (
                <tr key={s.id} className="border-b border-ink-700/60 last:border-0">
                  <td className="px-4 py-3 font-medium text-ink-100">{s.name}</td>
                  <td className="px-4 py-3 text-ink-400">{s.category}</td>
                  <td className="px-4 py-3 text-ink-300">{s.starting_price ? `₹${s.starting_price}` : "Not set"}</td>
                  <td className="px-4 py-3 text-ink-300">{s.price_is_fixed ? "Yes" : "Custom quote"}</td>
                  <td className="px-4 py-3 text-ink-400">{s.price_notes ?? "—"}</td>
                  <td className="px-4 py-3">
                    <details>
                      <summary className="cursor-pointer text-xs text-brand-300">Edit pricing</summary>
                      <form action={updateServicePricing} className="mt-2 space-y-2">
                        <input type="hidden" name="service_id" value={s.id} />
                        <input
                          type="number"
                          name="starting_price"
                          defaultValue={s.starting_price ?? ""}
                          placeholder="Starting price (₹)"
                          className="input"
                        />
                        <label className="flex items-center gap-2 text-xs text-ink-300">
                          <input type="checkbox" name="price_is_fixed" defaultChecked={s.price_is_fixed} />
                          Fixed price (not custom quote)
                        </label>
                        <textarea name="price_notes" defaultValue={s.price_notes ?? ""} placeholder="Notes" className="input" rows={2} />
                        <button type="submit" className="btn-secondary text-xs">
                          Save
                        </button>
                      </form>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink-200">FAQs</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="card">
            <form action={addFaq} className="space-y-3">
              <input name="question" placeholder="Question" required className="input" />
              <textarea name="answer" placeholder="Answer" required rows={3} className="input" />
              <input name="category" placeholder="Category (optional)" className="input" />
              <button type="submit" className="btn-primary">
                Add FAQ
              </button>
            </form>
          </div>
          <div className="max-h-80 space-y-3 overflow-y-auto">
            {(faqs ?? []).map((f) => (
              <div key={f.id} className="card !p-3">
                <p className="text-sm font-medium text-ink-100">{f.question}</p>
                <p className="mt-1 text-xs text-ink-400">{f.answer}</p>
              </div>
            ))}
            {(!faqs || faqs.length === 0) && <p className="text-sm text-ink-400">No FAQs yet.</p>}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink-200">Documents (pasted text)</h2>
        <p className="mb-3 text-xs text-ink-400">
          PDF/DOC upload with automatic text extraction isn&apos;t wired up in this build yet — paste the
          extracted text below and it will be chunked and embedded for retrieval.
        </p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="card">
            <form action={ingestTextDocument} className="space-y-3">
              <input name="title" placeholder="Document title" required className="input" />
              <select name="category" className="input">
                <option>COMPANY</option>
                <option>SERVICES</option>
                <option>PACKAGES</option>
                <option>FAQ</option>
                <option>PRICING</option>
                <option>PROCESS</option>
                <option>TECHNOLOGY</option>
                <option>DELIVERY</option>
                <option>SUPPORT</option>
                <option>PAYMENT</option>
                <option>POLICIES</option>
                <option>CASE_STUDIES</option>
                <option>CONTACT</option>
                <option>MEETING</option>
                <option>OFFERS</option>
              </select>
              <textarea name="raw_text" placeholder="Paste document text" required rows={6} className="input" />
              <button type="submit" className="btn-primary">
                Ingest & embed
              </button>
            </form>
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {(documents ?? []).map((d) => (
              <div key={d.id} className="card !p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink-100">{d.title}</p>
                  <p className="text-xs text-ink-400">{d.category}</p>
                </div>
                <span className={`badge ${d.status === "indexed" ? "bg-green-500/20 text-green-300" : d.status === "failed" ? "bg-red-500/20 text-red-300" : "bg-yellow-500/20 text-yellow-300"}`}>
                  {d.status}
                </span>
              </div>
            ))}
            {(!documents || documents.length === 0) && <p className="text-sm text-ink-400">No documents yet.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
