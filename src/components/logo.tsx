import { useId } from "react"

import { cn } from "@/lib/utils"

/**
 * RobinX 로고: 검은 타일 위에 시작 화면 로고(index.html .tty-logo)의 R을 5×5 칸 그대로 찍은 마크.
 * 색도 시작 화면처럼 흰색에서 회색으로. src-tauri/app-icon.svg 와 같은 모양.
 */
export function Logo({ className }: { className?: string }) {
  // 한 화면에 여러 개가 있어도 그라데이션 ID가 겹치지 않게
  const id = useId().replace(/:/g, "")
  return (
    <svg viewBox="0 0 64 64" className={cn("size-8", className)} aria-hidden>
      <defs>
        <linearGradient id={`${id}-ink`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#9a9a9a" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="62" height="62" rx="14" fill="#0b0b0b" />
      <rect x="1.5" y="1.5" width="61" height="61" rx="13.5" fill="none" stroke="#ffffff" strokeOpacity="0.18" />
      {/* 한 칸 = 8. 칸 모서리는 계단처럼 또렷하게 */}
      <path
        fill={`url(#${id}-ink)`}
        shapeRendering="crispEdges"
        d="M12 12h8v40h-8zM20 12h24v8H20zM44 20h8v8h-8zM20 28h24v8H20zM36 36h8v8h-8zM44 44h8v8h-8z"
      />
    </svg>
  )
}
