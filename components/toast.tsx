'use client'
import { createContext, useCallback, useContext, useRef, useState } from 'react'

type Toast = { id: number; message: string; action?: { label: string; onClick: () => void } }
const Ctx = createContext<(message: string, action?: Toast['action']) => void>(() => {})

export const useToast = () => useContext(Ctx)

// Toast sederhana: 1 pesan aktif, hilang sendiri. `action` dipakai untuk "Urungkan".
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const show = useCallback((message: string, action?: Toast['action']) => {
    clearTimeout(timer.current)
    setToast({ id: Date.now(), message, action })
    timer.current = setTimeout(() => setToast(null), action ? 6000 : 3000)
  }, [])
  return (
    <Ctx.Provider value={show}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
        {toast && (
          <div className="pointer-events-auto flex max-w-md items-center gap-4 rounded-lg bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-lg">
            <span>{toast.message}</span>
            {toast.action && (
              <button
                className="shrink-0 rounded-sm px-2 py-1 font-bold text-brand-soft underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-soft"
                onClick={() => { toast.action!.onClick(); setToast(null) }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </Ctx.Provider>
  )
}
