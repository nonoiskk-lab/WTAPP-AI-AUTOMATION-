import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/admin/Badge";
import { ConfigWarning } from "@/components/admin/ConfigWarning";
import { supabaseServer } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function ConversationsPage() {
  if (!env.isConfigured.supabase()) {
    return (
      <div>
        <PageHeader title="Conversations" />
        <ConfigWarning items={["Supabase not configured yet — connect it to see live conversations."]} />
      </div>
    );
  }

  const supabase = await supabaseServer();
  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("id, current_intent, ai_confidence, last_message_preview, last_message_at, customers(wa_id, display_name), leads(stage, score)")
    .order("last_message_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <PageHeader title="Conversations" description="Every WhatsApp conversation, newest first." />
      {error && <ConfigWarning items={[error.message]} />}

      <div className="card overflow-hidden !p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink-700 text-xs uppercase text-ink-400">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Intent</th>
              <th className="px-4 py-3">Lead stage</th>
              <th className="px-4 py-3">Last message</th>
              <th className="px-4 py-3">Confidence</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {(conversations ?? []).map((c) => {
              const customer = Array.isArray(c.customers) ? c.customers[0] : c.customers;
              const lead = Array.isArray(c.leads) ? c.leads[0] : c.leads;
              return (
                <tr key={c.id} className="border-b border-ink-700/60 last:border-0 hover:bg-ink-700/40">
                  <td className="px-4 py-3">
                    <Link href={`/conversations/${c.id}`} className="font-medium text-brand-300 hover:underline">
                      {customer?.display_name || customer?.wa_id || "Unknown"}
                    </Link>
                    <p className="text-xs text-ink-400">{customer?.wa_id}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-300">{c.current_intent ?? "—"}</td>
                  <td className="px-4 py-3">{lead ? <Badge label={lead.stage} /> : <span className="text-ink-500">—</span>}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-ink-300">{c.last_message_preview ?? "—"}</td>
                  <td className="px-4 py-3">{c.ai_confidence ? <Badge label={c.ai_confidence} /> : "—"}</td>
                  <td className="px-4 py-3 text-xs text-ink-400">
                    {c.last_message_at ? new Date(c.last_message_at).toLocaleString() : "—"}
                  </td>
                </tr>
              );
            })}
            {(!conversations || conversations.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-400">
                  No conversations yet. They&rsquo;ll appear here as soon as WhatsApp messages come in.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
