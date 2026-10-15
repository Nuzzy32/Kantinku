import type { Metadata } from 'next'
import { QueueBoard } from '@/components/tenant/queue-board'

export const metadata: Metadata = { title: 'Antrean' }

export default function TenantQueuePage() {
  return <QueueBoard />
}
