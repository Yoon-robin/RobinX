import type { ReactNode } from "react"
import { Minus, Square, X } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * 터미널 창 틀: 위 막대(제목과 창 단추 모양) + 내용. 앱 화면 그림·녹화·예시 조각을 이 틀에 담는다.
 * 창 단추는 그림일 뿐이라 누를 수 없고 읽지도 않는다. `actions`는 막대 오른쪽에 넣을 진짜 단추.
 */
export function TermWindow({
  title,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <div className={cn("term overflow-hidden", className)}>
      <div
        data-ui
        className="flex h-9 items-center gap-3 border-b border-white/10 pr-3 pl-4 text-fine text-muted-foreground" // taste-skill-ignore: 창 위 막대
      >
        <span className="min-w-0 truncate">{title}</span>
        <span className="ml-auto flex items-center gap-3">
          {actions}
          <span aria-hidden className="flex items-center gap-3.5 text-white/35">
            <Minus className="size-3.5" />
            <Square className="size-3" />
            <X className="size-3.5" />
          </span>
        </span>
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  )
}
