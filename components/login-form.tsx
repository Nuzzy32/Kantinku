'use client'
import { useActionState } from 'react'
import { signIn, type SignInState } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Login staf. Server Action memeriksa email + kata sandi lalu mengarahkan ke halaman awal sesuai peran.
export function LoginForm({ title, subtitle }: { title: string; subtitle: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, {})
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div>
        <div className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">KantinKu</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-ink-2">{subtitle}</p>
      </div>
      <form action={action} className="flex flex-col gap-4" aria-describedby={state.error ? 'login-error' : undefined}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="username" defaultValue={state.email} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Kata sandi</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={state.error ? true : undefined} />
        </div>
        {state.error && <p id="login-error" role="alert" className="text-sm font-medium text-destructive">{state.error}</p>}
        <Button type="submit" size="lg" disabled={pending}>{pending ? 'Memeriksa…' : 'Masuk'}</Button>
      </form>
      <p className="text-sm text-muted-foreground">Akun dibuat oleh pengelola kantin. Tidak ada pendaftaran mandiri.</p>
    </main>
  )
}
