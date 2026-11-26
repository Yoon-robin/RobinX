import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * 앱 화면·예시 조각을 담는 창: 카드 면에 1px 선, 위에 제목 줄. 앱의 창 단추를 흉내 내지 않는다(누를 수 없는 그림이라).
 * `actions`는 제목 줄 오른쪽에 넣을 진짜 단추.
 */
export function AppWindow({
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
    <div className={cn("window overflow-hidden", className)}>
      <div
        data-ui
        className="flex h-10 items-center gap-3 border-b border-rk-line px-4 text-fine font-[550] text-rk-soft sm:px-5"
      >
        <span className="min-w-0 truncate">{title}</span>
        {actions && <span className="ml-auto flex items-center gap-3">{actions}</span>}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  )
}
