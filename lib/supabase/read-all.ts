// Paginasi mencegah total terpotong oleh batas hasil Data API (default 1.000 baris).
export async function readAll<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = []
  for (let from = 0; ; from += 500) {
    const { data, error } = await query(from, from + 499)
    if (error) throw new Error('Data belum bisa dimuat.', { cause: error })
    rows.push(...(data ?? []))
    if (!data || data.length < 500) return rows
  }
}
