import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { FadeUp } from "@/components/motion"

/** 브랜드 V5: 아이콘 타일은 같은 컨트롤 면이고, 색은 주의(살구색)만 아이콘에 남긴다 */
const toneClasses = {
  "chart-1": "text-rk-head",
  "chart-2": "text-rk-head",
  "chart-3": "text-rk-note",
  "chart-5": "text-rk-head",
  /** 아직 모르는 값 (불러오는 중·불러오지 못함) */
  muted: "text-rk-faint",
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
          "v5-card relative flex h-full w-full items-center gap-3 overflow-hidden px-4 py-3.5 text-left",
          "transition-[transform,box-shadow] duration-200 ease-(--rk-ease-out)",
          onClick && "cursor-pointer hover:bg-rk-hover active:scale-[0.99] motion-reduce:active:scale-100",
          active && "shadow-[inset_0_0_0_1px_var(--rk-note)]!",
        )}
      >
        <span className={cn("v5-tile size-9", toneClasses[tone])}>
          <Icon className="size-[1.125rem]" />
        </span>
        <span className="relative min-w-0 flex-1">
          <span className="block truncate text-xs text-rk-soft">{label}</span>
          <span className="flex flex-wrap items-baseline gap-x-2.5">
            {value == null ? (
              <span className="my-1 block h-5 w-20 animate-pulse rounded-md bg-muted" />
            ) : (
              <span className="block text-[22px] leading-7 font-[650] tracking-tight text-rk-head tabular-nums">
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
