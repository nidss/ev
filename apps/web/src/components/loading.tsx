// ระหว่างโหลด / สร้างข้อมูลตัวอย่างครั้งแรกในเบราว์เซอร์
export function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-muted" aria-busy="true">
      <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      Loading…
    </main>
  );
}
