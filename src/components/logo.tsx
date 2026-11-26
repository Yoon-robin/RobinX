import { cn } from "@/lib/utils"

/**
 * RobinX 로고: 브랜드 V5의 브랜드 칸 표. 짙은 표(--rk-mark) 위의 흰 R과 파란 번짐 (index.html .tty-mark와 같은 모양).
 * 밝은 테마에서도 같은 그림이다.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-8", className)} aria-hidden>
      <rect width="64" height="64" rx="15" fill="#060a14" />
      <text
        x="32"
        y="44.5"
        textAnchor="middle"
        fontSize="33"
        fontWeight="900"
        fill="#ffffff"
        style={{
          fontFamily: "var(--rk-font)",
          letterSpacing: "-0.02em",
          filter: "drop-shadow(0 0 7px rgb(75 125 254 / 90%))",
        }}
      >
        R
      </text>
    </svg>
  )
}
