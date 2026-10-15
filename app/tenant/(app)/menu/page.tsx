import type { Metadata } from 'next'
import { MenuManager } from '@/components/tenant/menu-manager'

export const metadata: Metadata = { title: 'Menu' }

export default function TenantMenuPage() {
  return <MenuManager />
}
