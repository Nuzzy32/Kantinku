'use client'
import { useSyncExternalStore } from 'react'
import { cn } from '@/lib/utils'
import { closesAt, opensAt } from './canteen'

const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']

// Indeks hari ini (0 = Senin) dibaca di peramban saja. Di server dan render hydration pertama hasilnya -1 (tidak ada yang ditebalkan),
// jadi tidak ada hydration mismatch karena zona waktu server berbeda.
const noop = () => () => {}
const useToday = () => useSyncExternalStore(noop, () => (new Date().getDay() + 6) % 7, () => -1)

export function OpeningHours() {
  const today = useToday()
  return (
    <section aria-labelledby="hours-title">
      <h2 id="hours-title" className="mb-2 text-base font-bold">Jam Operasional</h2>
      {/* Pembungkus yang melengkungkan sudut: border-radius tidak berlaku pada <table> bergaya collapse. */}
      <div className="overflow-hidden rounded-2xl border border-border">
        <table className="w-full">
          <tbody>
            {days.map((day, i) => {
              const isToday = i === today
              const weight = isToday ? 'font-bold' : 'font-normal'
              return (
                <tr key={day} className={cn('border-b border-border last:border-b-0', isToday && 'bg-accent')}>
                  <th scope="row" className={cn('h-11 px-4 text-left', weight)}>
                    {day}
                    {isToday && <span className="ml-2 text-xs font-bold text-accent-foreground">Hari ini</span>}
                  </th>
                  <td className={cn('px-4 text-right', weight)}>{opensAt}–{closesAt}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
