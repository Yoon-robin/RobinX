import { Fragment, useRef, useState } from "react"
import {
  AnimatePresence,
  animate,
  m,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "motion/react"
import { Folder, KeyRound, ListTree, ShieldCheck } from "lucide-react"

import { cn } from "@/lib/utils"
import { easeOutQuint } from "@/components/motion"
import { TermWindow } from "@/components/term"

/**
 * 남은 흔적 정리를 스크롤로 넘기는 장면. 화면에 붙어 있는 터미널 창 하나가 내려 볼수록
 * 찾기 → 고르기 → 백업 → 정리 → 되돌리기로 바뀐다. 왼쪽에는 지금 단계 이름만 크게.
 * 예시 데이터(website/scripts/capture.mjs의 Pixel Forge 3D)이고, 단계와 말은 앱의 동작과 같다:
 * 설치 정보와 연결된 것만 미리 고르고, 정리는 백업(격리)으로 옮기는 것이며, 백업이 있는 동안 되돌릴 수 있다.
 * 움직임 줄이기면 단계는 바뀌지만 움직이지 않고 바로 바뀐다.
 */
const STEPS = [
  { key: "find", label: "찾기", title: "남은 흔적을 찾고", sub: "설치 폴더 · AppData · 레지스트리" },
  { key: "pick", label: "고르기", title: "확실한 것만 골라요", sub: "애매한 건 직접 확인 · 내 파일은 빼고" },
  { key: "backup", label: "백업", title: "먼저 백업하고", sub: "지우기 전에 늘" },
  { key: "clean", label: "정리", title: "정리해요", sub: "원래 자리에서 백업으로 옮겨요" },
  { key: "undo", label: "되돌리기", title: "되돌릴 수도 있어요", sub: "백업이 있는 동안 · 처음 설정은 30일" },
] as const

const rows: { sure: boolean; icon: typeof Folder; path: string; reason: string }[] = [
  {
    sure: true,
    icon: Folder,
    path: String.raw`C:\Program Files\Forge Interactive\Pixel Forge 3D`,
    reason: "설치 폴더",
  },
  {
    sure: true,
    icon: ListTree,
    path: String.raw`HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\PixelForge3D`,
    reason: "제거 등록 정보",
  },
  { sure: true, icon: KeyRound, path: String.raw`HKCU\…\CurrentVersion\Run › PixelForgeHelper`, reason: "자동 실행" },
  {
    sure: false,
    icon: Folder,
    path: String.raw`C:\Users\me\AppData\Roaming\Forge Interactive\Pixel Forge 3D`,
    reason: "이름 일치",
  },
  { sure: false, icon: Folder, path: String.raw`C:\Users\me\AppData\Local\Pixel Forge 3D`, reason: "이름 일치" },
  {
    sure: false,
    icon: ListTree,
    path: String.raw`HKCU\SOFTWARE\Forge Interactive\Pixel Forge 3D`,
    reason: "이름 일치",
  },
  { sure: false, icon: Folder, path: String.raw`C:\Users\me\Documents\Pixel Forge Projects`, reason: "이름 일부" },
]
const SURE = rows.filter((r) => r.sure).length
const BAR = 20

// 단계 제목: 낱말이 차례로 올라오고, 설명은 조금 늦게. 나갈 때는 빨리 위로 빠진다
const captionIn = { on: { transition: { staggerChildren: 0.07 } }, out: { transition: { staggerChildren: 0.03 } } }
const wordIn = {
  off: { y: "110%" },
  on: { y: 0, transition: { duration: 0.6, ease: easeOutQuint } },
  out: { y: "-110%", transition: { duration: 0.22, ease: [0.55, 0, 1, 0.45] as const } },
}
const subIn = {
  off: { opacity: 0, y: 8 },
  on: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.15, ease: easeOutQuint } },
  out: { opacity: 0, transition: { duration: 0.15 } },
}

/** 창 맨 위 상태 줄 (단계마다) */
function Status({ step, backedUp, fill }: { step: number; backedUp: number; fill: number }) {
  const done = <b className="text-white">OK</b>
  const tag = (t: React.ReactNode) => <span className="text-white/45">[ {t} ]</span>
  if (step === 0) return <>{tag(done)} 7개 찾음 · 보호 규칙으로 3개 뺌</>
  if (step === 1)
    return (
      <>
        {tag(done)} {SURE}개 미리 선택 · <span className="text-review">4개 직접 확인</span>
      </>
    )
  if (step === 2) {
    const n = Math.round(fill * BAR)
    return (
      <>
        백업 중 <span className="text-white/45">[</span>
        {"█".repeat(n)}
        <span className="text-white/30">{"░".repeat(BAR - n)}</span>
        <span className="text-white/45">]</span> {backedUp}/{SURE}
      </>
    )
  }
  if (step === 3)
    return (
      <>
        {tag(done)} {SURE}개 정리 · 백업으로 옮김
      </>
    )
  return (
    <>
      {tag(done)} {SURE}개 원래 자리로 되돌림
    </>
  )
}

function Check({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-[3px] border transition-colors duration-300",
        on ? "border-white bg-white" : "border-white/35",
      )}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-3" fill="none" stroke="oklch(0.13 0 0)" strokeWidth={3.5}>
        <m.path
          d="M20 6 9 17l-5-5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: on ? 1 : 0, opacity: on ? 1 : 0 }}
          transition={{ duration: 0.3, ease: easeOutQuint }}
        />
      </svg>
    </span>
  )
}

export function Story() {
  const reduce = useReducedMotion()
  const track = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] })
  const [step, setStep] = useState(0)
  // 백업 단계의 진행 막대 (0~1). 그 단계에 들어오면 차오른다
  const fill = useMotionValue(0)
  const [fillNow, setFillNow] = useState(0)
  useMotionValueEvent(fill, "change", setFillNow)

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const s = Math.min(STEPS.length - 1, Math.max(0, Math.floor(p * STEPS.length)))
    if (s === step) return
    setStep(s)
    // jump는 돌던 막대 움직임도 멈춘다 (빨리 지나가도 다음 단계에서 막대가 계속 차지 않게)
    if (s === 2) {
      fill.jump(0)
      animate(fill, 1, { duration: reduce ? 0 : 1.6, ease: "linear" })
    } else fill.jump(s > 2 ? 1 : 0)
  })

  const backedUp = step > 2 ? SURE : step === 2 ? Math.min(SURE, Math.floor(fillNow * SURE + 0.001)) : 0
  const now = STEPS[step]

  return (
    <section id="story" ref={track} className="relative h-[460svh]">
      <div className="sticky top-0 h-svh overflow-hidden pt-14 sm:pt-16">
        {/*
          창 위쪽을 고정한다: 정리 단계에서 줄이 접혀 창이 짧아져도 위치가 흔들리지 않게.
          여백은 다 펼친 창이 화면 가운데쯤 오도록 폭마다 장면 높이(37/40/29rem)로 셈한다.
        */}
        <div className="frame mt-[max(1rem,calc((100svh_-_4rem_-_37rem)/2))] grid w-full items-start gap-6 sm:mt-[max(1rem,calc((100svh_-_4rem_-_40rem)/2))] lg:mt-[max(1.5rem,calc((100svh_-_4rem_-_29rem)/2))] lg:grid-cols-12 lg:gap-10">
          <div className="min-w-0 lg:col-span-5 lg:pt-24">
            {/* 단계 목록: 지금 단계 앞에 > */}
            <ol className="flex flex-wrap gap-x-4 gap-y-1 text-fine text-muted-foreground">
              {STEPS.map((s, i) => (
                <li
                  key={s.key}
                  aria-current={i === step ? "step" : undefined}
                  className={cn("transition-colors duration-300", i === step && "text-foreground")}
                >
                  <span className={cn(i === step ? "opacity-100" : "opacity-0")}>&gt; </span>
                  {s.label}
                </li>
              ))}
            </ol>
            <div className="relative mt-5 h-[6.5rem] sm:mt-8 sm:h-[9.5rem] lg:h-[11rem]">
              <AnimatePresence mode="popLayout" initial={false}>
                <m.div
                  key={now.key}
                  initial={reduce ? false : "off"}
                  animate="on"
                  exit={reduce ? undefined : "out"}
                  variants={captionIn}
                  className="absolute inset-x-0 top-0"
                >
                  <h2 className="section-title">
                    <span className="sr-only">{now.title}</span>
                    {/* 낱말마다 가려진 틀 안에서 아래로부터 올라온다 */}
                    <span aria-hidden>
                      {now.title.split(" ").map((word, wi) => (
                        <Fragment key={wi}>
                          {wi > 0 && " "}
                          <span className="inline-block overflow-hidden py-[0.06em] align-bottom">
                            <m.span variants={wordIn} className="inline-block">
                              {word}
                            </m.span>
                          </span>
                        </Fragment>
                      ))}
                    </span>
                  </h2>
                  <m.p variants={subIn} className="mt-3 text-body text-muted-foreground sm:text-lead">
                    {now.sub}
                  </m.p>
                </m.div>
              </AnimatePresence>
            </div>
          </div>

          {/* min-w-0: 긴 경로가 칸을 화면 밖으로 밀지 않고 말줄임으로 잘리게 */}
          <div className="min-w-0 lg:col-span-7">
            <TermWindow title="남은 흔적 · Pixel Forge 3D" bodyClassName="text-fine">
              <div data-ui className="flex h-11 items-center px-4 whitespace-nowrap sm:px-5">
                <AnimatePresence mode="wait" initial={false}>
                  <m.span
                    key={step}
                    initial={reduce ? false : { opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, x: 8 }}
                    transition={{ duration: reduce ? 0 : 0.2 }}
                    className="truncate"
                  >
                    <Status step={step} backedUp={backedUp} fill={fillNow} />
                  </m.span>
                </AnimatePresence>
              </div>
              <ul data-ui className="pb-2">
                {rows.map((r, i) => {
                  // 정리 단계에서는 고른 줄이 접혀 사라지고, 되돌리기에서 다시 펼쳐진다
                  const gone = r.sure && step === 3
                  const label = !r.sure
                    ? step >= 1
                      ? "직접 확인"
                      : r.reason
                    : step === 4
                      ? "되돌림"
                      : step >= 2 && i < backedUp
                        ? "백업됨"
                        : step >= 1
                          ? "설치 정보와 연결"
                          : r.reason
                  return (
                    <m.li
                      key={r.path}
                      initial={false}
                      animate={{
                        height: gone ? 0 : "auto",
                        opacity: gone ? 0 : !r.sure && step >= 2 ? 0.45 : 1,
                      }}
                      transition={{
                        duration: reduce ? 0 : 0.4,
                        delay: reduce ? 0 : gone ? 0.08 * i : 0,
                        ease: easeOutQuint,
                      }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-3 px-4 py-2 sm:px-5">
                        <Check on={r.sure && step >= 1 && step !== 4} />
                        <r.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <code className="min-w-0 flex-1 truncate">{r.path}</code>
                        <span
                          className={cn(
                            "shrink-0 rounded-sm border px-1.5 py-0.5 transition-colors duration-300",
                            !r.sure && step >= 1
                              ? "border-review/50 text-review"
                              : label === "백업됨" || label === "되돌림"
                                ? "border-white bg-white text-background"
                                : step >= 1
                                  ? "border-white/40 text-foreground"
                                  : "border-white/15 text-muted-foreground",
                          )}
                        >
                          {label}
                        </span>
                      </div>
                    </m.li>
                  )
                })}
              </ul>
              <div
                data-ui
                className={cn(
                  "flex items-center gap-2 px-4 pb-4 text-muted-foreground transition-colors duration-300 sm:px-5",
                  step === 1 && "text-foreground",
                )}
              >
                <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">보호 규칙으로 3개 뺌 · 문서·바탕 화면 같은 사용자 폴더, Windows 폴더</span>
              </div>
            </TermWindow>
            <p className="mt-3 text-fine text-muted-foreground">예시 화면이에요.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
