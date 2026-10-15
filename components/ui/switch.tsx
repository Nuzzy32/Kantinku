"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "@/lib/utils"

// Saklar besar untuk tablet/HP. Beri label teks di sebelahnya: status tidak boleh hanya dari warna.
function Switch({ className, size = "default", ...props }: SwitchPrimitive.Root.Props & { size?: "sm" | "default" }) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-colors outline-none after:absolute after:-inset-x-1 after:-inset-y-2 focus-visible:ring-3 focus-visible:ring-ring/50 data-[size=default]:h-8 data-[size=default]:w-14 data-[size=sm]:h-6 data-[size=sm]:w-11 data-checked:bg-primary data-unchecked:bg-input data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-full bg-card shadow-sm transition-transform group-data-[size=default]/switch:size-6 group-data-[size=sm]/switch:size-[18px] group-data-[size=default]/switch:data-checked:translate-x-[29px] group-data-[size=sm]/switch:data-checked:translate-x-[23px] data-unchecked:translate-x-[3px]"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
