import { Fragment, useEffect, useRef, useState } from "react"
import { useInView, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"

/**
 * 터미널에 치듯 한 글자씩 나오는 제목. 글자 자리는 처음부터 다 잡아 두고(안 친 글자는 투명) 커서만 따라가서
 * 치는 동안 줄바꿈이나 높이가 바뀌지 않는다. 화면 읽기 프로그램에는 처음부터 전체 문장을 준다.
 * 움직임 줄이기면 바로 전체를 보여 준다. `start`가 false인 동안은 기다린다.
 */
export function Typed({
  lines,
  as: Tag = "h2",
  className,
  delay = 0,
  speed = 70,
}: {
  lines: string[]
  as?: "h1" | "h2"
  className?: string
  /** 화면에 보이고 나서 치기 시작할 때까지 (ms) */
  delay?: number
  /** 한 글자에 걸리는 시간 (ms) */
  speed?: number
}) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLHeadingElement>(null)
  const seen = useInView(ref, { once: true, amount: 0.6 })
  const chars = lines.map((l) => [...l])
  const total = chars.reduce((n, l) => n + l.length, 0)
  const [typed, setTyped] = useState(0)
  const shown = reduce ? total : typed

  useEffect(() => {
    if (reduce || !seen) return
    let n = 0
    let timer = setTimeout(function tick() {
      n += 1
      setTyped(n)
      if (n < total) timer = setTimeout(tick, speed)
    }, delay)
    return () => clearTimeout(timer)
  }, [reduce, seen, total, delay, speed])

  // 줄마다 앞에 있는 글자 수 (몇 번째 글자인지 세려고)
  const starts = chars.map((_, li) => chars.slice(0, li).reduce((n, l) => n + l.length, 0))
  const caret = <span className="caret" data-typing={shown < total ? "" : undefined} />
  return (
    <Tag ref={ref} className={cn("prompt", className)}>
      <span className="sr-only">{lines.join(" ")}</span>
      {/* 줄마다 친 부분과 남은(투명한) 부분 두 덩어리로 나눈다. 글자마다 나누면 글이 조각나 읽고 재기 어렵다 */}
      <span aria-hidden>
        {chars.map((line, li) => {
          const k = Math.min(line.length, Math.max(0, shown - starts[li]))
          const here = shown === 0 ? li === 0 : k > 0 && starts[li] + k === shown
          return (
            <Fragment key={li}>
              {li > 0 && <br />}
              {line.slice(0, k).join("")}
              {here && caret}
              {k < line.length && <span className="opacity-0">{line.slice(k).join("")}</span>}
            </Fragment>
          )
        })}
      </span>
    </Tag>
  )
}
