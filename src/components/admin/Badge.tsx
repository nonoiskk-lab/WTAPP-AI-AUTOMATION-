const STAGE_COLORS: Record<string, string> = {
  new: "bg-ink-600 text-ink-100",
  qualifying: "bg-blue-500/20 text-blue-300",
  qualified: "bg-indigo-500/20 text-indigo-300",
  hot: "bg-orange-500/20 text-orange-300",
  proposal: "bg-purple-500/20 text-purple-300",
  negotiation: "bg-yellow-500/20 text-yellow-300",
  converted: "bg-green-500/20 text-green-300",
  lost: "bg-red-500/20 text-red-300",
  high: "bg-green-500/20 text-green-300",
  medium: "bg-yellow-500/20 text-yellow-300",
  low: "bg-red-500/20 text-red-300",
  open: "bg-orange-500/20 text-orange-300",
  resolved: "bg-green-500/20 text-green-300",
};

export function Badge({ label }: { label: string }) {
  const color = STAGE_COLORS[label.toLowerCase()] ?? "bg-ink-600 text-ink-200";
  return <span className={`badge ${color}`}>{label}</span>;
}
