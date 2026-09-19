export function ConfigWarning({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-6 rounded-lg border border-yellow-600/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
      <p className="font-medium">Not fully configured yet</p>
      <ul className="mt-1 list-inside list-disc text-yellow-200/90">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-yellow-200/70">See README.md for setup steps and where to add each credential.</p>
    </div>
  );
}
