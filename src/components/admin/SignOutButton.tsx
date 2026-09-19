"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button onClick={handleSignOut} className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-ink-300 transition hover:bg-ink-700 hover:text-white">
      Sign out
    </button>
  );
}
