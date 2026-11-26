import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-[550] whitespace-nowrap outline-none select-none disabled:pointer-events-none disabled:opacity-45 aria-invalid:shadow-[inset_0_0_0_1px_var(--rk-alarm)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // 브랜드 V5: 파란 채움은 한 화면에 하나(주 동작), 나머지는 컨트롤 면 + 1px 선
        default: "bg-rk-accent-fill text-white hover:bg-rk-accent-fill-hover active:bg-rk-accent-fill-press",
        outline:
          "bg-rk-control text-rk-text shadow-[inset_0_0_0_1px_var(--rk-control-line)] hover:bg-rk-control-hover hover:text-rk-head hover:shadow-[inset_0_0_0_1px_var(--rk-control-line-hover)] active:bg-rk-control-press aria-expanded:bg-rk-control-press aria-expanded:text-rk-head",
        secondary:
          "bg-rk-control text-rk-text shadow-[inset_0_0_0_1px_var(--rk-control-line)] hover:bg-rk-control-hover hover:text-rk-head hover:shadow-[inset_0_0_0_1px_var(--rk-control-line-hover)] active:bg-rk-control-press aria-expanded:bg-rk-control-press aria-expanded:text-rk-head",
        ghost: "text-rk-soft hover:bg-rk-hover hover:text-rk-head aria-expanded:bg-rk-hover aria-expanded:text-rk-head",
        // 되돌릴 수 없는 동작: 빨간 테 + 빨간 글자 (채운 빨강은 확인 창의 한 단추뿐: destructiveFill)
        destructive:
          "bg-transparent text-rk-alarm-text shadow-[inset_0_0_0_1px_var(--rk-alarm)] hover:bg-rk-alarm-soft",
        destructiveFill: "bg-rk-alarm text-white hover:bg-[color-mix(in_srgb,var(--rk-alarm),white_8%)]",
        link: "text-rk-accent underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
