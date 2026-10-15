import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

// Cek cepat (optimistic): belum login -> ke halaman login. Pemeriksaan peran yang sebenarnya ada di layout (lib/auth.ts).
export async function proxy(request: NextRequest) {
  const { response, signedIn } = await updateSession(request)
  const { pathname } = request.nextUrl
  const area = pathname.startsWith('/admin') ? '/admin' : '/tenant'
  if (!signedIn && pathname !== `${area}/login`) {
    const url = request.nextUrl.clone()
    url.pathname = `${area}/login`
    url.search = ''
    const redirect = NextResponse.redirect(url)
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c))
    return redirect
  }
  return response
}

// Hanya halaman staf yang memakai sesi. Halaman pembeli (/t, /checkout, /order) tidak lewat sini.
export const config = { matcher: ['/tenant/:path*', '/admin/:path*'] }
