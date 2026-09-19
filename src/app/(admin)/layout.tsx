import { Sidebar } from "@/components/admin/Sidebar";
import { supabaseServer } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let adminEmail: string | undefined;

  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    adminEmail = user?.email ?? undefined;
  } catch {
    // Supabase not configured yet — layout still renders so the
    // "not configured" message in each page can be shown.
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar adminEmail={adminEmail} />
      <main className="flex-1 overflow-y-auto bg-ink-900 px-8 py-6">{children}</main>
    </div>
  );
}
