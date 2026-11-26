import * as React from "react"
import { cn } from "cn"
import { Switch as SwitchPrimitive } from "radix-ui"

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // 브랜드 V5: 34×19, 켬 파랑 + 흰 손잡이, 끔 어두운 홈 + 1px 선 + 회색 손잡이. 누르는 동안 손잡이가 4px 늘어난다(index.css)
        "peer relative inline-flex h-[19px] w-[34px] shrink-0 items-center rounded-[10px] outline-none transition-[background-color,box-shadow] duration-[165ms] ease-out disabled:cursor-not-allowed disabled:opacity-45 data-[state=checked]:bg-rk-accent data-[state=unchecked]:bg-rk-switch-off data-[state=unchecked]:shadow-[inset_0_0_0_1px_var(--rk-control-line)]",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block h-[14px] w-[14px] rounded-full transition-[transform,width,background-color] duration-[165ms] ease-out data-[state=checked]:translate-x-[17.5px] data-[state=checked]:bg-rk-knob data-[state=unchecked]:translate-x-[2.5px] data-[state=unchecked]:bg-rk-switch-knob"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
