import { PageHeader } from "@/components/admin/PageHeader";
import { ConfigWarning } from "@/components/admin/ConfigWarning";
import { Badge } from "@/components/admin/Badge";
import { supabaseServer } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { SCORING_SIGNALS } from "@/lib/crm/leadScoring";

export const dynamic = "force-dynamic";

export default async function AutomationPage() {
  if (!env.isConfigured.supabase()) {
    return (
      <div>
        <PageHeader title="Automation" />
        <ConfigWarning items={["Supabase not configured yet."]} />
      </div>
    );
  }

  const supabase = await supabaseServer();
  const [{ data: followups }, { data: handoffs }] = await Promise.all([
    supabase
      .from("followups")
      .select("*, customers(display_name, wa_id)")
      .order("scheduled_at", { ascending: true })
      .limit(50),
    supabase.from("handoffs").select("*").order("created_at", { ascending: false }).limit(20),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Automation"
        description="Follow-up queue, escalations, and the lead scoring rules driving them."
      />

      <ConfigWarning
        items={
          process.env.CRON_SECRET
            ? []
            : ["CRON_SECRET not set — /api/cron/followups is unauthenticated. Set it before wiring a scheduler in production."]
        }
      />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink-200">Follow-up queue</h2>
        <div className="card overflow-x-auto !p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-700 text-xs uppercase text-ink-400">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Trigger</th>
                <th className="px-4 py-3">Scheduled</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(followups ?? []).map((f) => {
                const customer = Array.isArray(f.customers) ? f.customers[0] : f.customers;
                return (
                  <tr key={f.id} className="border-b border-ink-700/60 last:border-0">
                    <td className="px-4 py-3 text-ink-100">{customer?.display_name || customer?.wa_id}</td>
                    <td className="px-4 py-3 text-ink-400">{f.trigger_reason}</td>
                    <td className="px-4 py-3 text-ink-400">{new Date(f.scheduled_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Badge label={f.status} />
                    </td>
                  </tr>
                );
              })}
              {(!followups || followups.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-ink-400">
                    No follow-ups scheduled.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink-200">Human handoffs</h2>
        <div className="space-y-2">
          {(handoffs ?? []).map((h) => (
            <div key={h.id} className="card !p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-ink-100">{h.reason}</p>
                <Badge label={h.status} />
              </div>
              <p className="mt-1 text-xs text-ink-400">{new Date(h.created_at).toLocaleString()}</p>
            </div>
          ))}
          {(!handoffs || handoffs.length === 0) && <p className="text-sm text-ink-400">No handoffs yet.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink-200">Lead scoring signals</h2>
        <p className="mb-3 text-xs text-ink-400">Internal only — never shown to the customer.</p>
        <div className="card grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
          {Object.entries(SCORING_SIGNALS).map(([signal, weight]) => (
            <div key={signal} className="flex items-center justify-between rounded-lg bg-ink-700/50 px-3 py-2">
              <span className="text-ink-300">{signal.replace(/_/g, " ")}</span>
              <span className="font-semibold text-brand-300">+{weight}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
