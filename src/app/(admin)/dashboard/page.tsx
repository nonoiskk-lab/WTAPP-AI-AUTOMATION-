import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { ConfigWarning } from "@/components/admin/ConfigWarning";
import { supabaseServer } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

async function getStats() {
  const supabase = await supabaseServer();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    conversations,
    newLeads,
    qualifiedLeads,
    hotLeads,
    openHandoffs,
    scheduledFollowups,
    converted,
  ] = await Promise.all([
    supabase.from("conversations").select("id", { count: "exact", head: true }),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("stage", "new"),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("stage", "qualified"),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("stage", "hot"),
    supabase.from("handoffs").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("followups").select("id", { count: "exact", head: true }).eq("status", "scheduled"),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("stage", "converted"),
  ]);

  return {
    conversations: conversations.count ?? 0,
    newLeads: newLeads.count ?? 0,
    qualifiedLeads: qualifiedLeads.count ?? 0,
    hotLeads: hotLeads.count ?? 0,
    openHandoffs: openHandoffs.count ?? 0,
    scheduledFollowups: scheduledFollowups.count ?? 0,
    converted: converted.count ?? 0,
  };
}

export default async function DashboardPage() {
  const configIssues: string[] = [];
  if (!env.isConfigured.supabase()) configIssues.push("Supabase project URL / keys not set — data below will be empty or fail to load.");
  if (!env.isConfigured.whatsapp()) configIssues.push("WhatsApp Cloud API credentials not set — the webhook cannot send/receive real messages yet.");
  if (!env.isConfigured.ai()) configIssues.push("AI_API_KEY not set — the AI agent cannot generate replies yet.");

  let stats = {
    conversations: 0,
    newLeads: 0,
    qualifiedLeads: 0,
    hotLeads: 0,
    openHandoffs: 0,
    scheduledFollowups: 0,
    converted: 0,
  };

  if (env.isConfigured.supabase()) {
    try {
      stats = await getStats();
    } catch (err) {
      configIssues.push(`Could not load stats from Supabase: ${(err as Error).message}`);
    }
  }

  return (
    <div>
      <PageHeader title="Dashboard" description="Live snapshot of KRTECH.SPACE's WhatsApp AI pipeline." />
      <ConfigWarning items={configIssues} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total conversations" value={stats.conversations} />
        <StatCard label="New leads" value={stats.newLeads} />
        <StatCard label="Qualified leads" value={stats.qualifiedLeads} />
        <StatCard label="Hot leads" value={stats.hotLeads} />
        <StatCard label="Open handoffs" value={stats.openHandoffs} hint="Waiting on a human" />
        <StatCard label="Scheduled follow-ups" value={stats.scheduledFollowups} />
        <StatCard label="Converted" value={stats.converted} />
      </div>
    </div>
  );
}
