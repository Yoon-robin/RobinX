import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const badgeVariants = cva(
  // 브랜드 V5의 꼬리표: 높이 20, 모서리 5, 컨트롤 면 + 1px 선, 11px
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-sm border-0 px-1.5 text-[11px] font-[550] whitespace-nowrap tabular-nums transition-colors has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-rk-accent-soft text-rk-accent",
        secondary: "bg-rk-control text-rk-text shadow-[inset_0_0_0_1px_var(--rk-control-line)]",
        destructive: "bg-rk-alarm-soft text-rk-alarm-text",
        outline: "bg-rk-control text-rk-soft shadow-[inset_0_0_0_1px_var(--rk-control-line)]",
        ghost: "text-rk-soft hover:bg-rk-hover",
        link: "text-rk-accent underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
