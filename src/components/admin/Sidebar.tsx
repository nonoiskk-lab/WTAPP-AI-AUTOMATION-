import Link from "next/link";
import { SignOutButton } from "./SignOutButton";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/conversations", label: "Conversations" },
  { href: "/crm", label: "CRM Pipeline" },
  { href: "/knowledge-base", label: "Knowledge Base" },
  { href: "/automation", label: "Automation" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar({ adminEmail }: { adminEmail?: string }) {
  return (
    <aside className="flex h-screen w-60 flex-col border-r border-ink-700 bg-ink-800 px-4 py-5">
      <div className="mb-8 flex items-center gap-2 px-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">
          K
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-ink-100">KRTECH.SPACE</p>
          <p className="text-[11px] leading-tight text-ink-400">AI Business Agent</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-lg px-3 py-2 text-sm text-ink-200 transition hover:bg-ink-700 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-ink-700 pt-4">
        {adminEmail && <p className="truncate px-1 text-xs text-ink-400">{adminEmail}</p>}
        <SignOutButton />
      </div>
    </aside>
  );
}
