import { PageHeader } from "@/components/admin/PageHeader";
import { ConfigWarning } from "@/components/admin/ConfigWarning";
import { Badge } from "@/components/admin/Badge";
import { supabaseServer } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  if (!env.isConfigured.supabase()) {
    return (
      <div>
        <PageHeader title="Settings" />
        <ConfigWarning items={["Supabase not configured yet."]} />
      </div>
    );
  }

  const supabase = await supabaseServer();
  const [{ data: admins }, { data: settingsRows }] = await Promise.all([
    supabase.from("admins").select("*").order("created_at"),
    supabase.from("settings").select("*"),
  ]);

  const integrationStatus = [
    { name: "Supabase", ok: env.isConfigured.supabase() },
    { name: "WhatsApp Cloud API", ok: env.isConfigured.whatsapp() },
    { name: "AI provider", ok: env.isConfigured.ai() },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="Team access and system configuration status." />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink-200">Integration status</h2>
        <div className="card grid grid-cols-1 gap-3 sm:grid-cols-3">
          {integrationStatus.map((i) => (
            <div key={i.name} className="flex items-center justify-between rounded-lg bg-ink-700/50 px-3 py-2">
              <span className="text-sm text-ink-200">{i.name}</span>
              <Badge label={i.ok ? "connected" : "not configured"} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink-200">Admin team</h2>
        <div className="card overflow-x-auto !p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-700 text-xs uppercase text-ink-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(admins ?? []).map((a) => (
                <tr key={a.id} className="border-b border-ink-700/60 last:border-0">
                  <td className="px-4 py-3 text-ink-100">{a.full_name}</td>
                  <td className="px-4 py-3 text-ink-400">{a.email}</td>
                  <td className="px-4 py-3 text-ink-300">{a.role}</td>
                  <td className="px-4 py-3">
                    <Badge label={a.is_active ? "resolved" : "open"} />
                  </td>
                </tr>
              ))}
              {(!admins || admins.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-ink-400">
                    No admin accounts yet — see README to create the first one via Supabase Auth.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink-200">System settings</h2>
        <div className="card space-y-2">
          {(settingsRows ?? []).map((s) => (
            <details key={s.key} className="rounded-lg bg-ink-700/50 px-3 py-2">
              <summary className="cursor-pointer text-sm text-ink-200">{s.key}</summary>
              <pre className="mt-2 overflow-x-auto text-xs text-ink-400">{JSON.stringify(s.value, null, 2)}</pre>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
