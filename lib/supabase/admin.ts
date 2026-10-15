import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Secret key: melewati RLS. Hanya untuk server (webhook, checkout, buat akun). Jangan import dari client.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)
