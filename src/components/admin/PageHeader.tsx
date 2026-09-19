export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold text-ink-100">{title}</h1>
      {description && <p className="mt-1 text-sm text-ink-400">{description}</p>}
    </div>
  );
}
