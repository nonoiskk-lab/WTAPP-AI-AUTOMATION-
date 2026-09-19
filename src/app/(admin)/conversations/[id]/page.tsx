import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/admin/Badge";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*, customers(*), leads(*)")
    .eq("id", id)
    .maybeSingle();

  if (!conversation) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  const customer = Array.isArray(conversation.customers) ? conversation.customers[0] : conversation.customers;
  const lead = Array.isArray(conversation.leads) ? conversation.leads[0] : conversation.leads;

  return (
    <div>
      <PageHeader
        title={customer?.display_name || customer?.wa_id || "Conversation"}
        description={customer?.wa_id}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {conversation.current_intent && <Badge label={conversation.current_intent} />}
        {conversation.ai_confidence && <Badge label={conversation.ai_confidence} />}
        {lead && <Badge label={lead.stage} />}
        {lead && <span className="badge bg-ink-600 text-ink-200">Score: {lead.score}</span>}
      </div>

      <div className="card space-y-4">
        {(messages ?? []).map((m) => (
          <div key={m.id} className={`flex ${m.direction === "inbound" ? "justify-start" : "justify-end"}`}>
            <div
              className={`max-w-md rounded-xl px-4 py-2 text-sm ${
                m.direction === "inbound" ? "bg-ink-700 text-ink-100" : "bg-brand-600 text-white"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.body}</p>
              <p className="mt-1 text-[10px] opacity-70">
                {m.sender_type} · {new Date(m.created_at).toLocaleString()}
                {m.status === "failed" && " · failed to send"}
              </p>
            </div>
          </div>
        ))}
        {(!messages || messages.length === 0) && <p className="text-sm text-ink-400">No messages yet.</p>}
      </div>
    </div>
  );
}
