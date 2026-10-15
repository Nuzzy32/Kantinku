'use client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/toast'

// Tampilan saja. Login Supabase Auth disambungkan di Story 6 (tenant) dan Story 14 (admin/kasir).
export function LoginForm({ title, subtitle }: { title: string; subtitle: string }) {
  const toast = useToast()
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div>
        <div className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">KantinKu</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-ink-2">{subtitle}</p>
      </div>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => { e.preventDefault(); toast('Login belum tersambung. Itu dikerjakan di Story 6.') }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="username" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Kata sandi</Label>
          <Input id="password" type="password" autoComplete="current-password" required />
        </div>
        <Button type="submit" size="lg">Masuk</Button>
      </form>
      <p className="text-sm text-muted-foreground">Akun dibuat oleh pengelola kantin. Tidak ada pendaftaran mandiri.</p>
    </main>
  )
}
