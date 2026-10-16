'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/toast'
import { useTenant } from './tenant-provider'

const REASONS = ['Bahan habis', 'Tutup', 'Lainnya'] as const

// Form berada di dalam DialogContent: terpasang ulang tiap dialog dibuka, jadi isian selalu mulai bersih.
function RejectForm({ id, number, onClose }: { id: number; number: string; onClose: () => void }) {
  const { moveOrder } = useTenant()
  const toast = useToast()
  const [choice, setChoice] = useState<(typeof REASONS)[number]>('Bahan habis')
  const [other, setOther] = useState('')
  const [pending, setPending] = useState(false)
  const reason = choice === 'Lainnya' ? other.trim() : choice

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason || pending) return
    setPending(true)
    const saved = await moveOrder(id, 'cancelled', reason)
    setPending(false)
    if (!saved) return
    toast(`${number} ditolak. Pembeli melihat alasannya.`)
    onClose()
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle className="text-xl leading-snug">Tolak pesanan {number}?</DialogTitle>
        <DialogDescription className="text-base">Pembeli melihat alasannya. Uang dikembalikan pengelola.</DialogDescription>
      </DialogHeader>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-semibold">Alasan</legend>
        {REASONS.map((r) => (
          <label
            key={r}
            className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border bg-card px-4 text-base font-semibold has-checked:border-primary has-checked:bg-accent has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
          >
            <input type="radio" name="reject-reason" value={r} checked={choice === r} onChange={() => setChoice(r)} className="size-5 accent-primary" />
            {r}
          </label>
        ))}
      </fieldset>
      {choice === 'Lainnya' && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reject-other">Tulis alasannya</Label>
          <Input id="reject-other" value={other} onChange={(e) => setOther(e.target.value)} maxLength={100} autoComplete="off" autoFocus />
        </div>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" size="lg" onClick={onClose} disabled={pending}>
          Batal
        </Button>
        <Button type="submit" variant="destructive" size="lg" disabled={!reason || pending} aria-busy={pending}>
          Tolak pesanan
        </Button>
      </DialogFooter>
    </form>
  )
}

export function RejectDialog({ id, number, open, onOpenChange }: { id: number; number: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <RejectForm id={id} number={number} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
