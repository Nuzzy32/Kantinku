import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// Secret key: melewati RLS. Hanya untuk server (webhook, checkout, buat akun). Jangan import dari client.
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)
