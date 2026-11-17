import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { FadeUp } from "@/components/motion"

const toneClasses = {
  "chart-1": "bg-chart-1/12 text-chart-1",
  "chart-2": "bg-chart-2/12 text-chart-2",
  "chart-3": "bg-chart-3/12 text-warning",
  "chart-5": "bg-chart-5/12 text-success",
  /** 아직 모르는 값 (불러오는 중·불러오지 못함) */
  muted: "bg-muted text-muted-foreground",
} as const

export function StatCard({
  icon: Icon,
  tone,
  label,
  value,
  unit,
  hint,
  active,
  onClick,
}: {
  icon: LucideIcon
  tone: keyof typeof toneClasses
  label: string
  value: ReactNode | null
  unit?: string
  hint?: string
  active?: boolean
  onClick?: () => void
}) {
  const Tag = onClick ? "button" : "div"
  return (
    <FadeUp className="h-full">
      {/* 낮게 만든다: 이 카드들 아래에 목록이 있어, 카드가 높으면 기본 창 크기에서 목록이 몇 줄밖에 보이지 않았다.
          설명은 자리가 있으면 숫자 옆에, 없으면 아래 줄로 간다. */}
      <Tag
        type={onClick ? "button" : undefined}
        onClick={onClick}
        aria-pressed={onClick ? active : undefined}
        className={cn(
          "relative flex h-full w-full items-center gap-3 overflow-hidden rounded-2xl border bg-card px-4 py-3.5 text-left shadow-sm",
          "transition-[transform,border-color,box-shadow] duration-200 ease-(--ease-out-quint)",
          onClick &&
            "cursor-pointer hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-[0.99] motion-reduce:active:scale-100",
          active && "border-chart-3/60 ring-1 ring-chart-3/40",
        )}
      >
        <span className={cn("relative flex size-9 shrink-0 items-center justify-center rounded-xl", toneClasses[tone])}>
          <Icon className="size-[1.125rem]" />
        </span>
        <span className="relative min-w-0 flex-1">
          <span className="block truncate text-xs text-muted-foreground">{label}</span>
          <span className="flex flex-wrap items-baseline gap-x-2.5">
            {value == null ? (
              <span className="my-1 block h-5 w-20 animate-pulse rounded-md bg-muted" />
            ) : (
              <span className="block text-xl leading-7 font-bold tracking-tight tabular-nums">
                {value}
                {unit && <span className="ml-0.5 text-sm font-medium text-muted-foreground">{unit}</span>}
              </span>
            )}
            {hint && <span className="block text-xs text-pretty text-muted-foreground">{hint}</span>}
          </span>
        </span>
      </Tag>
    </FadeUp>
  )
}
