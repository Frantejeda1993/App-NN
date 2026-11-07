export function ComingSoonPage({ title }: { title: string }) {
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-4 rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
        Próximamente
      </p>
    </section>
  )
}
