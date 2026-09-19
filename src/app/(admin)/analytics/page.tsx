import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { ConfigWarning } from "@/components/admin/ConfigWarning";
import { supabaseServer } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  if (!env.isConfigured.supabase()) {
    return (
      <div>
        <PageHeader title="Analytics" />
        <ConfigWarning items={["Supabase not configured yet."]} />
      </div>
    );
  }

  const supabase = await supabaseServer();

  const [messages, aiMessages, humanHandoffs, topIntents, dailyRows] = await Promise.all([
    supabase.from("messages").select("id", { count: "exact", head: true }),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("sender_type", "ai").eq("direction", "outbound"),
    supabase.from("handoffs").select("id", { count: "exact", head: true }),
    supabase.from("conversations").select("current_intent"),
    supabase.from("analytics_daily").select("*").order("day", { ascending: false }).limit(14),
  ]);

  const intentCounts = new Map<string, number>();
  for (const row of topIntents.data ?? []) {
    if (!row.current_intent) continue;
    intentCounts.set(row.current_intent, (intentCounts.get(row.current_intent) ?? 0) + 1);
  }
  const sortedIntents = [...intentCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxIntentCount = sortedIntents[0]?.[1] ?? 1;

  return (
    <div className="space-y-8">
      <PageHeader title="Analytics" description="Conversation volume, resolution rate, and top customer interests." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total messages" value={messages.count ?? 0} />
        <StatCard label="AI-sent replies" value={aiMessages.count ?? 0} />
        <StatCard label="Human handoffs" value={humanHandoffs.count ?? 0} />
        <StatCard
          label="AI resolution rate"
          value={
            (messages.count ?? 0) > 0
              ? `${Math.round((1 - (humanHandoffs.count ?? 0) / Math.max(1, aiMessages.count ?? 1)) * 100)}%`
              : "—"
          }
          hint="Approx. — AI replies that didn't trigger a handoff"
        />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink-200">Top customer intents</h2>
        <div className="card space-y-2">
          {sortedIntents.map(([intent, count]) => (
            <div key={intent} className="flex items-center gap-3">
              <span className="w-40 shrink-0 truncate text-xs text-ink-300">{intent}</span>
              <div className="h-2 flex-1 rounded-full bg-ink-700">
                <div
                  className="h-2 rounded-full bg-brand-500"
                  style={{ width: `${Math.max(4, (count / maxIntentCount) * 100)}%` }}
                />
              </div>
              <span className="w-8 text-right text-xs text-ink-400">{count}</span>
            </div>
          ))}
          {sortedIntents.length === 0 && <p className="text-sm text-ink-400">No intent data yet.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink-200">Daily rollups</h2>
        <p className="mb-3 text-xs text-ink-400">
          Populated by a scheduled job writing to <code>analytics_daily</code> — not yet wired up in this
          build (see README). Live counts above are computed on the fly instead.
        </p>
        <div className="card overflow-x-auto !p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-700 text-xs uppercase text-ink-400">
              <tr>
                <th className="px-4 py-3">Day</th>
                <th className="px-4 py-3">Conversations</th>
                <th className="px-4 py-3">New leads</th>
                <th className="px-4 py-3">Hot leads</th>
                <th className="px-4 py-3">Conversions</th>
              </tr>
            </thead>
            <tbody>
              {(dailyRows.data ?? []).map((d) => (
                <tr key={d.id} className="border-b border-ink-700/60 last:border-0">
                  <td className="px-4 py-3 text-ink-300">{d.day}</td>
                  <td className="px-4 py-3 text-ink-300">{d.total_conversations}</td>
                  <td className="px-4 py-3 text-ink-300">{d.new_leads}</td>
                  <td className="px-4 py-3 text-ink-300">{d.hot_leads}</td>
                  <td className="px-4 py-3 text-ink-300">{d.conversions}</td>
                </tr>
              ))}
              {(!dailyRows.data || dailyRows.data.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ink-400">
                    No daily rollups yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
