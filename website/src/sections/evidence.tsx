import { Fragment, useEffect, useRef, useState } from "react"
import { Folder, KeyRound, ListTree, ShieldCheck } from "lucide-react"
import { m, useInView, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"
import { easeOutQuint } from "@/components/motion"
import { TermWindow } from "@/components/term"

type Group = "sure" | "review" | "protected"

/**
 * 남은 흔적을 어떤 근거로 나누는지. 앱의 탐지 규칙(crates/scanner)과 같은 말로 쓴다.
 * 왼쪽은 앱의 "남은 흔적" 창을 HTML로 옮긴 조각(data-ui, 예시 데이터, 앱의 터미널 모양), 오른쪽은 세 갈래 설명.
 * 오른쪽에서 하나를 고르면 왼쪽에서 그 갈래의 항목만 또렷해진다. 화면에 보이는 동안 저절로 차례대로 넘어가고,
 * 직접 고르면 멈춘다 (움직임 줄이기면 저절로 넘어가지 않는다).
 */
const groups: {
  key: Group
  tone: string
  chip: string
  label: string
  title: string
  text: string
}[] = [
  {
    key: "sure",
    tone: "text-foreground",
    chip: "border-white/40 text-foreground",
    label: "설치 정보와 연결",
    title: "미리 골라 둬요",
    text: "Windows에 기록된 설치 폴더나 남은 제거 등록 정보처럼, 등록 정보가 그 프로그램 것이라고 직접 가리키는 항목이에요.",
  },
  {
    key: "review",
    tone: "text-review",
    chip: "border-review/50 text-review",
    label: "직접 확인 필요",
    title: "직접 보고 골라요",
    text: "이름만 같거나 다른 프로그램과 함께 쓰는 것 같은 폴더예요. 다른 프로그램 것일 수 있어서 미리 고르지 않아요.",
  },
  {
    key: "protected",
    tone: "text-muted-foreground",
    chip: "border-white/20 text-muted-foreground",
    label: "보호 규칙으로 뺌",
    title: "건드리지 않아요",
    text: "Windows 폴더, 여러 프로그램이 함께 쓰는 폴더, 문서·바탕 화면 같은 사용자 폴더, RobinX 자신의 파일은 찾아도 목록에 넣지 않아요.",
  },
]

/** 앱 화면과 같은 예시 (website/scripts/capture.mjs의 Pixel Forge 3D) */
const rows: {
  group: Exclude<Group, "protected">
  icon: typeof Folder
  path: string
  value?: string
  reason: string
  size?: string
}[] = [
  {
    group: "sure",
    icon: Folder,
    path: String.raw`C:\Program Files\Forge Interactive\Pixel Forge 3D`,
    reason: "등록된 설치 폴더",
    size: "204 MB",
  },
  {
    group: "sure",
    icon: ListTree,
    path: String.raw`HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\PixelForge3D`,
    reason: "남은 제거 등록 정보",
  },
  {
    group: "sure",
    icon: KeyRound,
    path: String.raw`HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run`,
    value: "PixelForgeHelper",
    reason: "설치 폴더를 가리킴",
  },
  {
    group: "review",
    icon: Folder,
    path: String.raw`C:\Users\me\AppData\Roaming\Forge Interactive\Pixel Forge 3D`,
    reason: "게시자 › 제품 이름 일치",
    size: "37 MB",
  },
  {
    group: "review",
    icon: Folder,
    path: String.raw`C:\Users\me\AppData\Local\Pixel Forge 3D`,
    reason: "이름 일치",
    size: "1.2 GB",
  },
  {
    group: "review",
    icon: ListTree,
    path: String.raw`HKCU\SOFTWARE\Forge Interactive\Pixel Forge 3D`,
    reason: "게시자 › 제품 이름 일치",
  },
  {
    group: "review",
    icon: Folder,
    path: String.raw`C:\Users\me\Documents\Pixel Forge Projects`,
    reason: "이름 일부 일치 · 직접 만든 문서 14개 포함",
    size: "92 MB",
  },
]

/** 앱의 체크 상자 (터미널 모양: 각진 흰 상자). 미리 고른 항목은 화면에 들어오면 차례로 체크가 그어진다 */
function Check({ on, delay, animate }: { on: boolean; delay: number; animate: boolean }) {
  return (
    <span
      className={cn(
        "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[3px] border transition-colors duration-300",
        on ? "border-white bg-white" : "border-white/35",
      )}
      style={{ transitionDelay: animate && on ? `${delay}s` : "0s" }}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-3" fill="none" stroke="oklch(0.13 0 0)" strokeWidth={3.5}>
        <m.path
          d="M20 6 9 17l-5-5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: on ? 1 : 0, opacity: on ? 1 : 0 }}
          transition={{ duration: animate ? 0.35 : 0, delay: animate && on ? delay + 0.1 : 0, ease: easeOutQuint }}
        />
      </svg>
    </span>
  )
}

export function Evidence() {
  const reduce = useReducedMotion()
  const panel = useRef<HTMLElement>(null)
  const inView = useInView(panel, { amount: 0.4 })
  const seen = useInView(panel, { amount: 0.3, once: true })
  // 저절로 넘어가는 갈래(보여 주기만)와 사용자가 고른 갈래를 나눈다. 고른 것만 aria-pressed로 알린다.
  const [auto, setAuto] = useState<Group>("sure")
  const [chosen, setChosen] = useState<Group | null>(null)
  const active = chosen ?? auto
  const touched = chosen != null
  // 마우스를 올려 두거나 키보드 초점이 들어와 있으면 잠깐 멈춘다 (읽는 중에 바뀌지 않게)
  const [hovering, setHovering] = useState(false)
  const [focused, setFocused] = useState(false)

  // 보이는 동안 세 갈래를 차례로 보여 준다. 직접 고르면 멈춘다
  useEffect(() => {
    if (reduce || touched || !inView || hovering || focused) return
    const order: Group[] = ["sure", "review", "protected"]
    const t = setInterval(() => setAuto((g) => order[(order.indexOf(g) + 1) % order.length]), 3600)
    return () => clearInterval(t)
  }, [reduce, touched, inView, hovering, focused])

  const pick = (g: Group) => setChosen(g)

  return (
    <section id="evidence" className="py-20 sm:py-24">
      <div className="frame">
        <div className="max-w-3xl">
          <h2 className="section-title prompt">왜 그 프로그램 것인지 근거를 보여 줘요</h2>
          <p className="mt-5 max-w-[46ch] text-lead leading-relaxed text-muted-foreground">
            찾은 흔적마다 이유가 붙어요. 확실한 것만 미리 고르고, 애매한 건 직접 보고 정하게 남겨 둬요.
          </p>
        </div>

        <div
          className="mt-12 grid items-start gap-10 sm:mt-14 lg:grid-cols-12 lg:gap-12"
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false)
          }}
        >
          {/* 앱의 남은 흔적 창을 옮긴 조각 */}
          <div className="lg:col-span-7">
            {/* 좁은 화면에서는 설명이 예시 창 아래로 내려가 누르면 바뀌는 게 안 보여서, 창 위에서 고르게 한다 */}
            <div className="mb-3 flex flex-wrap gap-2 lg:hidden" role="group" aria-label="근거 갈래 고르기">
              {groups.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  aria-pressed={chosen === g.key}
                  onClick={() => pick(g.key)}
                  className={cn(
                    "rounded-sm border px-3 py-1.5 text-fine transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    active === g.key ? "border-white/60 text-foreground" : "border-white/15 text-muted-foreground",
                  )}
                >
                  {g.title}
                </button>
              ))}
            </div>
            <figure
              ref={panel}
              aria-label="남은 흔적 창 예시: 설치 정보와 연결된 3개는 미리 골라 두고, 직접 확인이 필요한 4개는 고르지 않은 상태"
            >
              <TermWindow title="남은 흔적 · Pixel Forge 3D" className="bg-card" bodyClassName="text-fine">
                <div data-ui className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3 sm:px-5">
                  <span className="rounded-sm border border-white/40 px-2 py-0.5 font-semibold">
                    설치 정보와 연결 3
                  </span>
                  <span className="rounded-sm border border-review/50 px-2 py-0.5 font-semibold text-review">
                    직접 확인 필요 4
                  </span>
                  <span
                    className={cn(
                      "ml-auto inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 transition-colors duration-300",
                      active === "protected" ? "bg-white text-background" : "text-muted-foreground",
                    )}
                  >
                    <ShieldCheck className="size-3.5" aria-hidden />
                    보호 규칙으로 3개 뺌
                  </span>
                </div>
                <ul data-ui>
                  {rows.map((r, i) => {
                    const lit = active === r.group
                    return (
                      <m.li
                        key={r.path + (r.value ?? "")}
                        initial={reduce ? false : { opacity: 0 }}
                        animate={seen ? { opacity: lit ? 1 : 0.4 } : undefined}
                        transition={{ duration: 0.4, delay: seen && !touched ? 0.05 * i : 0, ease: easeOutQuint }}
                        className="flex gap-3 border-b border-white/[0.07] px-4 py-3 last:border-b-0 sm:px-5" // taste-skill-ignore: 앱 화면 조각(data-ui)의 줄
                      >
                        <Check on={r.group === "sure" && seen} delay={0.25 + 0.18 * i} animate={!reduce} />
                        <span className="sr-only">{r.group === "sure" ? "미리 골라 둠:" : "직접 확인 필요:"}</span>
                        <r.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="leading-5 [overflow-wrap:anywhere]">
                            <code>
                              {/* 좁은 화면에서 낱말 중간이 아니라 폴더 구분자 뒤에서 줄이 바뀌게 */}
                              {r.path.split("\\").map((part, j) => (
                                <Fragment key={j}>
                                  {j > 0 && (
                                    <>
                                      {"\\"}
                                      <wbr />
                                    </>
                                  )}
                                  {part}
                                </Fragment>
                              ))}
                            </code>
                            {r.value && (
                              <span className="ml-1.5 rounded-sm bg-white/10 px-1.5 py-0.5 whitespace-nowrap">
                                값: {r.value}
                              </span>
                            )}
                          </p>
                          <span className="mt-1.5 inline-flex rounded-sm border border-white/15 px-1.5 py-0.5 text-muted-foreground">
                            {r.reason}
                          </span>
                        </div>
                        {r.size && <span className="shrink-0 text-muted-foreground tabular-nums">{r.size}</span>}
                      </m.li>
                    )
                  })}
                </ul>
                <div
                  data-ui
                  className="flex items-center gap-3 border-t border-white/10 px-4 py-3 text-muted-foreground sm:px-5" // taste-skill-ignore: 앱 화면 조각(data-ui)의 아래 막대
                >
                  3개 선택 · 204 MB
                  <span className="ml-auto rounded-sm bg-destructive/15 px-2.5 py-1 font-semibold text-destructive">
                    선택 항목 정리
                  </span>
                </div>
              </TermWindow>
            </figure>
            <p className="mt-3 text-fine text-muted-foreground">
              앱의 남은 흔적 창을 옮긴 예시예요. 갈래를 고르면 그 항목이 또렷해져요.
            </p>
          </div>

          <div className="flex flex-col lg:col-span-5" role="group" aria-label="근거 갈래">
            {groups.map((g) => {
              const on = active === g.key
              return (
                <button
                  key={g.key}
                  type="button"
                  aria-pressed={chosen === g.key}
                  onClick={() => pick(g.key)}
                  className={cn(
                    "relative w-full border-l-2 py-5 pr-2 pl-5 text-left transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:pl-6", // taste-skill-ignore: 고른 갈래를 가리키는 왼쪽 막대
                    on ? "border-white bg-white/[0.04]" : "border-white/10 hover:border-white/30",
                  )}
                >
                  <span data-ui className={`inline-flex rounded-sm border px-2 py-0.5 text-fine ${g.chip}`}>
                    {g.label}
                  </span>
                  <span className={cn("mt-3 block text-lead leading-snug font-bold", g.tone)}>{g.title}</span>
                  <span className="mt-2 block text-body text-muted-foreground">{g.text}</span>
                </button>
              )
            })}
            <p className="mt-6 pl-5 text-body sm:pl-6">
              바탕 화면·문서·다운로드 안의 파일은 이유가 있어도 미리 고르지 않아요. 고른 것도 지우기 전에 백업해요.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
