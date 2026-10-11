export type Safe<T> = { ok: true; data: T } | { ok: false; error: string; kind: "db" | "other" };

/** Runs a data loader and converts failures into a renderable error state (no crash, no fake data). */
export async function safe<T>(fn: () => Promise<T>): Promise<Safe<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    const err = e as Error;
    const db = err.name === "DatabaseNotConfiguredError" || /ECONNREFUSED|relation .* does not exist|connect/i.test(err.message);
    console.error(JSON.stringify({ level: "error", msg: "section load failed", error: err.message }));
    return { ok: false, error: db ? "قاعدة البيانات غير متاحة أو غير مُهيّأة (شغّل npm run db:migrate)" : "خطأ أثناء تحميل هذا القسم", kind: db ? "db" : "other" };
  }
}
