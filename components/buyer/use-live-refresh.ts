import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Stok habis / tenant tutup sampai ke HP pembeli ≤ 5 detik: ambil ulang data server selama tab terlihat (state klien tetap).
// ponytail: polling 3 query per 5 detik per pembeli; ganti Supabase Realtime pada menu_items/tenants bila beban DB terasa.
export function useLiveRefresh() {
  const router = useRouter()
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') router.refresh() }, 5000)
    return () => clearInterval(id)
  }, [router])
}
