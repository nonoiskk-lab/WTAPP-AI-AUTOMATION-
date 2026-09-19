import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";
import { ConfigWarning } from "@/components/admin/ConfigWarning";
import { supabaseServer } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import type { LeadStage } from "@/lib/types/database";

export const dynamic = "force-dynamic";

const STAGES: LeadStage[] = ["new", "qualifying", "qualified", "hot", "proposal", "negotiation", "converted", "lost"];

const STAGE_LABELS: Record<LeadStage, string> = {
  new: "New",
  qualifying: "Qualifying",
  qualified: "Qualified",
  hot: "Hot",
  proposal: "Proposal",
  negotiation: "Negotiation",
  converted: "Converted",
  lost: "Lost",
};

export default async function CrmPage() {
  if (!env.isConfigured.supabase()) {
    return (
      <div>
        <PageHeader title="CRM Pipeline" />
        <ConfigWarning items={["Supabase not configured yet — connect it to see the live pipeline."]} />
      </div>
    );
  }

  const supabase = await supabaseServer();
  const { data: leads } = await supabase
    .from("leads")
    .select("id, stage, score, service_interest, budget_range, timeline, conversation_id, customers(display_name, wa_id)")
    .order("score", { ascending: false });

  const byStage = new Map<LeadStage, typeof leads>();
  for (const stage of STAGES) byStage.set(stage, []);
  for (const lead of leads ?? []) {
    byStage.get(lead.stage)?.push(lead);
  }

  return (
    <div>
      <PageHeader title="CRM Pipeline" description="Leads grouped by stage. Sorted by internal lead score within each column." />

      <div className="grid grid-cols-1 gap-4 overflow-x-auto sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {STAGES.map((stage) => {
          const stageLeads = byStage.get(stage) ?? [];
          return (
            <div key={stage} className="min-w-[220px]">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-300">{STAGE_LABELS[stage]}</p>
                <span className="text-xs text-ink-500">{stageLeads.length}</span>
              </div>
              <div className="space-y-2">
                {stageLeads.map((lead) => {
                  const customer = Array.isArray(lead.customers) ? lead.customers[0] : lead.customers;
                  return (
                    <Link
                      key={lead.id}
                      href={lead.conversation_id ? `/conversations/${lead.conversation_id}` : "#"}
                      className="card block !p-3 transition hover:border-brand-500"
                    >
                      <p className="truncate text-sm font-medium text-ink-100">
                        {customer?.display_name || customer?.wa_id || "Unknown"}
                      </p>
                      {lead.service_interest && lead.service_interest.length > 0 && (
                        <p className="mt-1 truncate text-xs text-ink-400">{lead.service_interest.join(", ")}</p>
                      )}
                      <div className="mt-2 flex items-center justify-between text-xs text-ink-500">
                        <span>Score {lead.score}</span>
                        {lead.budget_range && <span className="truncate">{lead.budget_range}</span>}
                      </div>
                    </Link>
                  );
                })}
                {stageLeads.length === 0 && (
                  <p className="rounded-lg border border-dashed border-ink-700 px-3 py-4 text-center text-xs text-ink-500">
                    No leads
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
