import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react"

import { api, scanApi } from "@/lib/api"
import { WindowControls } from "@/components/window-controls"
import { startupUpdateCheck } from "@/features/updates/updates"

/** index.html의 #boot와 같은 로고 (한 글자를 바꾸면 두 곳 다 바꾼다) */
const LOGO = [
  "████████              ██        ██            ██      ██",
  "██      ██    ████    ██████        ██████      ██  ██",
  "████████    ██    ██  ██    ██  ██  ██    ██      ██",
  "██    ██    ██    ██  ██    ██  ██  ██    ██    ██  ██",
  "██      ██    ████    ██████    ██  ██    ██  ██      ██",
]
const PROMPT = "C:\\>"
const COMMAND = "robinx"

/** 이보다 오래 걸리면 시작 화면을 걷고 목록 화면(스켈레톤)으로 넘어간다 */
const MAX_MS = 8000

type Tone = "ok" | "run" | "new" | "warn" | "dim"
type Line = { tag: string; tone: Tone; text: string }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function took(ms: number) {
  return ms < 1000 ? `${Math.max(1, Math.round(ms))}ms` : `${(ms / 1000).toFixed(1)}초`
}

/** index.html이 창 열림 애니메이션을 끝냈는지. 그 전에는 #boot가 위를 덮고 있어 글자를 쳐도 보이지 않는다. */
function useBootOpened() {
  const [opened, setOpened] = useState(() => Boolean((window as Window & { __bootOpened?: boolean }).__bootOpened))
  useEffect(() => {
    if (opened) return
    const on = () => setOpened(true)
    window.addEventListener("robin:boot-opened", on, { once: true })
    return () => window.removeEventListener("robin:boot-opened", on)
  }, [opened])
  return opened
}

function Spinner() {
  const frames = "|/-\\"
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % frames.length), 90)
    return () => clearInterval(t)
  }, [])
  return <>{frames[i]}</>
}

// 꺼지는 브라운관처럼: 세로로 접혀 밝은 한 줄이 됐다가 가로로 사라진다
const CRT: Variants = {
  exit: {
    scaleY: [1, 0.006, 0.006],
    scaleX: [1, 1, 0],
    opacity: [1, 1, 0],
    transition: { duration: 0.42, times: [0, 0.55, 1], ease: [0.6, 0, 0.4, 1] },
  },
}
const FLASH: Variants = {
  // 다 접힐 무렵에만 밝아진다 (일찍 밝아지면 화면 전체가 하얗게 번쩍인다)
  exit: { opacity: [0, 0.2, 1, 1], transition: { duration: 0.42, times: [0, 0.4, 0.55, 1] } },
}

/**
 * 앱을 처음 열 때 보이는 터미널 부팅 화면. index.html의 시작 화면(로고·버전·프롬프트)을 같은 자리·모양으로
 * 이어받아, 앱이 켜면서 실제로 하는 일(설치 목록 읽기, 제거 기록, 업데이트 확인)을 한 줄씩 적는다.
 * 다 적으면 브라운관이 꺼지듯 걷히고 앱 화면이 자리 잡는다(`onDone`). 아무 키나 누르면 바로 건너뛴다.
 */
export function StartupSplash({ onDone }: { onDone?: () => void }) {
  const queryClient = useQueryClient()
  const reduce = useReducedMotion()
  const opened = useBootOpened()
  const [typed, setTyped] = useState(0)
  const [lines, setLines] = useState<Line[]>([])
  const [done, setDone] = useState(false)
  const [skipped, setSkipped] = useState(false)
  const [timedOut, setTimedOut] = useState(false)

  // 첫 화면에 필요한 설치 목록은 바로 읽기 시작한다 (프로그램 화면과 같은 캐시라 두 번 읽지 않는다)
  const [apps] = useState(() => {
    const t0 = performance.now()
    return queryClient
      .ensureQueryData({ queryKey: ["installed-apps"], queryFn: api.listInstalledApps })
      .then((list) => ({ count: list.length, ms: performance.now() - t0 }))
  })

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), MAX_MS)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!opened) return
    let alive = true
    const wait = (ms: number) => sleep(reduce ? 0 : ms)
    const push = (line: Line) => alive && setLines((l) => [...l, line])
    const replaceLast = (line: Line) => alive && setLines((l) => [...l.slice(0, -1), line])

    void (async () => {
      await wait(180)
      for (let i = 1; i <= COMMAND.length && alive; i++) {
        setTyped(i)
        await wait(45 + Math.random() * 40)
      }
      if (!alive) return
      setTyped(COMMAND.length)
      await wait(200)

      push({ tag: "run", tone: "run", text: "설치된 프로그램 읽는 중" })
      const found = await apps.catch(() => null)
      await wait(120)
      replaceLast(
        found
          ? { tag: "OK", tone: "ok", text: `설치된 프로그램 ${found.count}개 (${took(found.ms)})` }
          : { tag: "FAIL", tone: "warn", text: "설치된 프로그램을 읽지 못했어요" },
      )
      await wait(140)

      const removed = await queryClient
        .ensureQueryData({ queryKey: ["recently-removed"], queryFn: scanApi.recentlyRemoved })
        .catch(() => null)
      if (removed) {
        const unscanned = removed.filter((r) => !r.scanned).length
        push(
          removed.length === 0
            ? { tag: "OK", tone: "ok", text: "최근 제거한 프로그램 없음" }
            : unscanned > 0
              ? {
                  tag: "NOTE",
                  tone: "new",
                  text: `최근 제거한 프로그램 ${removed.length}개, 남은 흔적 확인 전 ${unscanned}개`,
                }
              : { tag: "OK", tone: "ok", text: `최근 제거한 프로그램 ${removed.length}개` },
        )
        await wait(140)
      }

      const check = startupUpdateCheck()
      const result = check ? await Promise.race([check, sleep(reduce ? 0 : 300).then(() => null)]) : undefined
      push(
        result === undefined
          ? { tag: "SKIP", tone: "dim", text: "업데이트 자동 확인 꺼짐" }
          : result === null
            ? { tag: "..", tone: "dim", text: "업데이트 확인은 뒤에서 계속" }
            : result.kind === "latest"
              ? { tag: "OK", tone: "ok", text: "최신 버전" }
              : result.kind === "available"
                ? { tag: "NEW", tone: "new", text: `새 버전 ${result.update.version} 있음` }
                : { tag: "SKIP", tone: "dim", text: `업데이트 확인 못 함: ${result.message}` },
      )
      await wait(160)

      push({ tag: "OK", tone: "ok", text: "준비 완료" })
      await wait(450)
      if (alive) setDone(true)
    })()
    return () => {
      alive = false
    }
  }, [opened, reduce, apps, queryClient])

  // 한 번 걷히면 다시 덮지 않는다
  const [finished, setFinished] = useState(false)
  const visible = !finished && !done && !skipped && !timedOut
  useEffect(() => {
    if (visible) return
    setFinished(true)
    onDone?.()
  }, [visible, onDone])

  // 아무 키나 누르면 건너뛴다. 마우스는 창을 끌 때 쓰므로 건너뛰지 않는다.
  useEffect(() => {
    if (!visible || !opened) return
    const skip = () => setSkipped(true)
    window.addEventListener("keydown", skip)
    return () => window.removeEventListener("keydown", skip)
  }, [visible, opened])

  const commandDone = typed >= COMMAND.length
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          role="status"
          aria-live="polite"
          aria-label="RobinX를 준비하는 중이에요"
          className="tty"
          variants={reduce ? { exit: { opacity: 0, transition: { duration: 0 } } } : CRT}
          exit="exit"
        >
          {/* 시작 화면에서도 창을 옮기고 닫을 수 있게. 화면은 늘 어두우므로 단추도 어두운 테마 색으로 */}
          <div data-tauri-drag-region className="dark absolute inset-x-0 top-0 z-10 flex h-12 items-center justify-end">
            <WindowControls />
          </div>
          <div data-tauri-drag-region className="tty-body">
            <pre className="tty-logo" aria-hidden="true">
              {LOGO.map((row, i) => (
                <span key={i}>{row}</span>
              ))}
            </pre>
            <div className="tty-line tty-dim">RobinX {import.meta.env.VITE_APP_VERSION} · Windows x64</div>
            <div className="tty-line">
              <span className="tty-prompt">{PROMPT}</span> {COMMAND.slice(0, typed)}
              {lines.length === 0 && <span className="tty-cursor" />}
            </div>
            {commandDone &&
              lines.map((line, i) => (
                <div key={i} className="tty-line">
                  <span className="tty-tag">
                    [<b className={`tty-${line.tone}`}>{line.tag === "run" ? <Spinner /> : line.tag}</b>]
                  </span>{" "}
                  <span className={line.tone === "dim" ? "tty-dim" : undefined}>{line.text}</span>
                  {i === lines.length - 1 && (
                    <>
                      {" "}
                      <span className="tty-cursor" />
                    </>
                  )}
                </div>
              ))}
          </div>
          {opened && <div className="tty-hint">아무 키나 누르면 건너뛰어요</div>}
          {!reduce && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-20 bg-white opacity-0"
              variants={FLASH}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
