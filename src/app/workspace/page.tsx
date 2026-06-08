const columns = ["Goal", "Plan", "Task"];

export default function WorkspacePage() {
  return (
    <main className="min-h-screen px-6 py-8">
      <h1 className="text-2xl font-semibold">Workspace</h1>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_1fr_360px]">
        {columns.map((column) => (
          <section key={column} className="min-h-96 rounded-lg border bg-card p-4">
            <h2 className="text-sm font-medium text-muted-foreground">{column}</h2>
          </section>
        ))}
        <aside className="min-h-96 rounded-lg border bg-card p-4">
          <h2 className="text-sm font-medium text-muted-foreground">Detail Panel</h2>
        </aside>
      </div>
    </main>
  );
}
