import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/database.types'

// Dipanggil proxy.ts di setiap request halaman staf: memperbarui token sesi (refresh token) dan menulis cookie barunya.
// Server Component tidak bisa menulis cookie, jadi tanpa ini sesi habis setelah token akses kedaluwarsa (±1 jam).
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v))
        },
      },
    },
  )
  // Jangan taruh kode lain di antara createServerClient dan getClaims: getClaims yang memicu refresh token.
  const { data } = await supabase.auth.getClaims()
  return { response, signedIn: !!data?.claims }
}
