import { TenantProvider } from '@/components/tenant/tenant-provider'
import { TenantShell } from '@/components/tenant/tenant-shell'

// Route group (app): rangka tenant membungkus /tenant, /tenant/menu, /tenant/rekap, tetapi tidak /tenant/login.
export default function TenantAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TenantProvider>
      <TenantShell>{children}</TenantShell>
    </TenantProvider>
  )
}
