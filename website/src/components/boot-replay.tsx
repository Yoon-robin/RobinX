import { useEffect, useRef, useState } from "react"
import { AnimatePresence, m, useInView, useReducedMotion } from "motion/react"
import { Pause, Play, RotateCcw } from "lucide-react"

import { RELEASE, demo } from "@/lib/site"
import { TermWindow } from "@/components/term"

/**
 * 앱을 켤 때 나오는 터미널 시작 화면(src/components/startup-splash.tsx)을 그대로 다시 보여 주고,
 * 다 적으면 브라운관이 꺼지듯 걷힌 뒤 앱 창이 열리며 남은 흔적을 정리하는 녹화가 이어서 돈다.
 * PC 정보와 숫자는 예시다 (앱 화면 그림과 같은 가짜 응답: scripts/ui-mock/mock.mjs의 boot_info),
 * 녹화는 시험용 앱 Fixture Notes로 찍었다 (scripts/ui-mock/record-demo.mjs).
 * - 화면에 들어오면 한 번 재생하고, 끝나면 "다시 보기"로 다시 볼 수 있다.
 * - 녹화의 재생·일시정지 단추는 창 위 막대에 늘 있다. 화면에서 벗어나면 멈추고, 사용자가 멈춘 것은 다시 틀지 않는다.
 * - 움직임 줄이기면 시작 화면 없이 녹화의 첫 장면만 보여 주고 저절로 재생하지 않는다.
 * - 좁은 화면에서는 창 전체를 줄이면 글자가 4~5px이 되어, 대화창 부분만 찍은 녹화를 쓴다.
 */
const NARROW_QUERY = "(max-width: 639px)"
// 2배로 찍은 영상은 3배 무거워서, 고해상도 화면에만 준다 (휴대폰용 영상은 늘 2배)
const wideVideo = () => demo(devicePixelRatio >= 1.5 ? "leftovers@2x.webm" : "leftovers.webm")

function useNarrow() {
  const [narrow, setNarrow] = useState(() => matchMedia(NARROW_QUERY).matches)
  useEffect(() => {
    const mq = matchMedia(NARROW_QUERY)
    const onChange = () => setNarrow(mq.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])
  return narrow
}

/** 앱의 로고와 같은 글자 (index.html의 #boot) */
const LOGO = [
  "████████              ██        ██            ██      ██",
  "██      ██    ████    ██████        ██████      ██  ██",
  "████████    ██    ██  ██    ██  ██  ██    ██      ██",
  "██    ██    ██    ██  ██    ██  ██  ██    ██    ██  ██",
  "██      ██    ████    ██████    ██  ██    ██  ██      ██",
]

const WHO = "user@DESKTOP-DEMO"
const SYSTEM: [string, string][] = [
  ["운영체제", "Windows 11 Pro 25H2 · 빌드 26200.6899"],
  ["프로세서", "AMD Ryzen 7 7700 8-Core Processor · 16스레드"],
  ["메모리", "32.0 GB 중 17.7 GB 남음"],
  ["디스크", "C: 931.3 GB 중 199.3 GB 남음"],
  ["가동 시간", "3시간 12분"],
  ["권한", "일반 사용자"],
]
const PROMPT = String.raw`C:\Users\user>`
const COMMAND = "robinx"

type Tone = "ok" | "new"
/** [돌아가는 동안 문구, 끝난 표시, 끝난 문구, 걸리는 시간(ms)] — 앱이 켜면서 실제로 읽는 것과 같은 순서 */
const CHECKS: [string, string, Tone, string, number][] = [
  ["설치된 프로그램 읽는 중", "OK", "ok", "설치된 프로그램 14개 (212ms)", 520],
  ["Store 앱 읽는 중", "OK", "ok", "Store 앱 3개 (88ms)", 340],
  ["시작 프로그램 읽는 중", "OK", "ok", "시작 프로그램 7개, 켜짐 5개 (41ms)", 300],
  ["백업 보관함 확인 중", "OK", "ok", "백업 3개 보관 중 (252 MB)", 280],
  ["제거 기록 확인 중", "NOTE", "new", "최근 제거한 프로그램 1개, 남은 흔적 확인 전 1개", 300],
  ["업데이트 확인 중", "OK", "ok", "최신 버전", 460],
]
const BAR = 24

type Line =
  | { kind: "head" }
  | { kind: "rule" }
  | { kind: "kv"; key: string; value: string; shown: number }
  | { kind: "blank" }
  | { kind: "prompt"; command: string }
  | { kind: "check"; tag: string; tone: Tone | "run"; text: string }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function Spinner() {
  const frames = "|/-\\"
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % frames.length), 90)
    return () => clearInterval(t)
  }, [])
  return <>{frames[i]}</>
}

/**
 * 로고를 글자 대신 칸으로 그린다. 블록 글자(█)를 글꼴로 그리면 글자 폭이 소수점 px라 칸 사이에 가는 틈이 보인다.
 * 한 칸은 고정폭 글자 한 개 크기(폭 0.6em, 높이 1.05em)이고, 이어진 칸은 한 사각형으로 합친다.
 */
function Logo() {
  const cw = 0.6
  const ch = 1.05
  const width = Math.max(...LOGO.map((r) => r.length))
  const rects: { x: number; y: number; w: number }[] = []
  LOGO.forEach((row, y) => {
    for (const seg of row.matchAll(/█+/g)) rects.push({ x: seg.index, y, w: seg[0].length })
  })
  return (
    <svg
      viewBox={`0 0 ${width * cw} ${LOGO.length * ch}`}
      className="mb-[1.1em] block"
      // 앱에서는 13px 글자 크기의 로고. 창이 좁으면 줄인다
      style={{ width: `min(${width * cw * 13}px, 100%)` }}
      fill="#ededed"
      shapeRendering="crispEdges"
    >
      {rects.map((r, i) => (
        // 위아래 줄이 맞닿는 곳에 틈이 생기지 않게 높이를 조금 겹친다
        <rect key={i} x={r.x * cw} y={r.y * ch} width={r.w * cw} height={ch + 0.02} />
      ))}
    </svg>
  )
}

const toneClass = { ok: "text-white", new: "text-review", run: "text-white/70" }
const barButton =
  "-my-1 inline-flex h-7 items-center gap-1.5 rounded-sm px-2 text-fine text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"

export function BootReplay() {
  const reduce = useReducedMotion()
  const box = useRef<HTMLDivElement>(null)
  const inView = useInView(box, { amount: 0.35, once: true })
  // 몇 번째 재생인지 (다시 보기를 누르면 늘어난다)
  const [run, setRun] = useState(0)
  const [lines, setLines] = useState<Line[]>([])
  const [progress, setProgress] = useState<number | null>(null)
  const [phase, setPhase] = useState<"boot" | "app">("boot")

  useEffect(() => {
    if (reduce || !inView) return
    let alive = true
    const push = (line: Line) => alive && setLines((l) => [...l, line])
    const updateLast = (f: (line: Line) => Line) => alive && setLines((l) => [...l.slice(0, -1), f(l[l.length - 1])])
    void (async () => {
      await sleep(500)
      push({ kind: "head" })
      push({ kind: "rule" })
      await sleep(140)
      for (const [key, value] of SYSTEM) {
        if (!alive) return
        push({ kind: "kv", key, value, shown: 0 })
        for (let n = 0; n < value.length && alive;) {
          n = Math.min(value.length, n + 3)
          const shown = n
          updateLast((l) => (l.kind === "kv" ? { ...l, shown } : l))
          await sleep(16)
        }
        await sleep(80)
      }
      push({ kind: "blank" })
      await sleep(180)

      push({ kind: "prompt", command: "" })
      await sleep(420)
      for (let i = 1; i <= COMMAND.length && alive; i++) {
        const command = COMMAND.slice(0, i)
        updateLast((l) => (l.kind === "prompt" ? { ...l, command } : l))
        await sleep(70 + ((i * 37) % 40))
      }
      await sleep(260)

      setProgress(0)
      for (const [i, [running, tag, tone, text, ms]] of CHECKS.entries()) {
        if (!alive) return
        push({ kind: "check", tag: "run", tone: "run", text: running })
        await sleep(ms)
        updateLast(() => ({ kind: "check", tag, tone, text }))
        if (alive) setProgress(i + 1)
        await sleep(90)
      }
      await sleep(200)
      push({ kind: "check", tag: "OK", tone: "ok", text: "준비 완료" })
      await sleep(900)
      if (alive) setPhase("app")
    })()
    return () => {
      alive = false
    }
  }, [reduce, inView, run])

  const showApp = reduce || phase === "app"

  // 앱 녹화: 재생 상태를 단추에 맞추고, 화면에서 벗어나면 멈췄다가 돌아오면 다시 튼다
  const narrow = useNarrow()
  // 녹화는 시작 화면이 다 걷힌 뒤에야 붙으므로, 붙는 순간을 알 수 있게 요소를 상태로 받는다
  const [el, setEl] = useState<HTMLVideoElement | null>(null)
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    if (!el) return
    const sync = () => setPlaying(!el.paused)
    sync()
    // 사용자가 직접 멈췄으면 다시 보일 때도 저절로 틀지 않는다
    let pausedByUser = false
    const onPause = () => {
      if (el.dataset.auto !== "1") pausedByUser = true
      delete el.dataset.auto
      sync()
    }
    const onPlay = () => {
      pausedByUser = false
      sync()
    }
    el.addEventListener("pause", onPause)
    el.addEventListener("play", onPlay)
    const io = reduce
      ? null
      : new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              if (!pausedByUser) el.play().catch(() => {})
            } else if (!el.paused) {
              el.dataset.auto = "1"
              el.pause()
            }
          },
          { threshold: 0.4 },
        )
    io?.observe(el)
    return () => {
      io?.disconnect()
      el.removeEventListener("pause", onPause)
      el.removeEventListener("play", onPlay)
    }
  }, [el, reduce])
  const toggle = () => {
    if (!el) return
    if (el.paused) el.play().catch(() => {})
    else el.pause()
  }

  const last = lines.length - 1
  const filled = progress == null ? 0 : Math.round((progress / CHECKS.length) * BAR)
  const cursor = (
    <span className="ml-[1ch] inline-block h-[1.15em] w-[0.6em] animate-[blink_1s_steps(1)_infinite] bg-white/90 align-[-0.2em]" />
  )

  return (
    <TermWindow
      title={showApp ? "RobinX" : `${PROMPT}${COMMAND}`}
      actions={
        showApp && (
          <>
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? "녹화 일시정지" : "녹화 재생"}
              className={barButton}
            >
              {playing ? <Pause className="size-3.5" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
              <span className="hidden sm:inline">{playing ? "일시정지" : "재생"}</span>
            </button>
            {!reduce && (
              <button
                type="button"
                onClick={() => {
                  // 처음 상태(로고와 커서)로 돌려놓고 다시 재생한다
                  setLines([])
                  setProgress(null)
                  setPhase("boot")
                  setRun((n) => n + 1)
                }}
                className={barButton}
              >
                <RotateCcw className="size-3.5" aria-hidden />
                {/* 좁은 화면에서는 막대가 좁아 짧게 */}
                <span className="sm:hidden">다시 보기</span>
                <span className="hidden sm:inline">시작 화면 다시 보기</span>
              </button>
            )}
          </>
        )
      }
      bodyClassName="relative overflow-hidden"
    >
      {/* 창 비율은 녹화와 같게: 넓은 화면 16:10, 좁은 화면은 대화창만 찍은 784×736 */}
      <div ref={box} className="relative aspect-[784/736] [container-type:inline-size] sm:aspect-[16/10]">
        <AnimatePresence initial={false} mode="wait">
          {showApp ? (
            <m.div
              key="app"
              className="absolute inset-0"
              // 앱 창이 열리듯 조금 작게 시작해 제자리로
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <video
                // 폭이 바뀌어 다른 영상으로 갈아 끼울 때 처음부터 다시 읽게 한다
                key={narrow ? "narrow" : "wide"}
                ref={setEl}
                src={narrow ? demo("leftovers-narrow.webm") : wideVideo()}
                poster={demo(narrow ? "leftovers-narrow-poster.jpg" : "leftovers-poster.jpg")}
                width={narrow ? 784 : 1280}
                height={narrow ? 736 : 800}
                muted
                loop
                playsInline
                autoPlay={!reduce}
                preload={reduce ? "metadata" : "auto"}
                onClick={toggle}
                aria-label="RobinX 녹화: 남은 흔적을 찾아 고르고, 백업한 뒤 정리하는 장면"
                className="block size-full cursor-pointer object-cover"
              />
            </m.div>
          ) : (
            <m.div
              key={`boot-${run}`}
              aria-hidden
              className="absolute inset-0 bg-term pt-[2.5cqw] pb-[2.5cqw] text-[#d9d9d9]"
              style={{ fontSize: "clamp(10px, 1.1cqw, 12.5px)", lineHeight: 1.6 }}
              // 꺼지는 브라운관처럼: 세로로 접혀 한 줄이 됐다가 가로로 사라진다 (앱과 같은 움직임)
              exit={{
                scaleY: [1, 0.006, 0.006],
                scaleX: [1, 1, 0],
                opacity: [1, 1, 0],
                transition: { duration: 0.42, times: [0, 0.55, 1], ease: [0.6, 0, 0.4, 1] },
              }}
            >
              {/* 줄이 창보다 길어지면 위쪽이 밀려 올라간다 (터미널처럼). 넘치지 않을 때는 위에서부터 쌓인다 */}
              <div className="mx-auto flex max-h-full w-[min(40rem,calc(100%-2.5rem))] flex-col justify-end overflow-hidden *:shrink-0">
                <Logo />
                <div className="truncate text-white/45">RobinX {RELEASE.version} · Windows x64</div>
                {lines.length === 0 && <div className="min-h-[1.6em]">{cursor}</div>}
                {lines.map((line, i) => (
                  <div key={i} className="min-h-[1.6em] truncate">
                    {line.kind === "head" && <span className="font-bold text-white">{WHO}</span>}
                    {line.kind === "rule" && <span className="text-white/45">{"-".repeat(WHO.length)}</span>}
                    {line.kind === "kv" && (
                      <>
                        <span className="inline-block w-[8em] pl-[2ch] text-white/55">{line.key}</span>
                        {line.value.slice(0, line.shown)}
                      </>
                    )}
                    {line.kind === "prompt" && (
                      <>
                        <span className="font-bold text-white">{PROMPT}</span>
                        {line.command}
                      </>
                    )}
                    {line.kind === "check" && (
                      <>
                        <span className="text-white/45">
                          [
                          <b className={`inline-block w-[6ch] text-center ${toneClass[line.tone]}`}>
                            {line.tag === "run" ? <Spinner /> : line.tag}
                          </b>
                          ]
                        </span>{" "}
                        {line.text}
                      </>
                    )}
                    {i === last && line.kind !== "blank" && line.kind !== "rule" && cursor}
                  </div>
                ))}
                {progress != null && progress < CHECKS.length && (
                  <div className="min-h-[1.6em] text-white/45">
                    [<span className="text-white/90">{"█".repeat(filled)}</span>
                    {"░".repeat(BAR - filled)}] {progress}/{CHECKS.length}
                  </div>
                )}
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </TermWindow>
  )
}
