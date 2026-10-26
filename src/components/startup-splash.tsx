import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react"

import { api, scanApi, settingsApi, startupApi, storeApi, type BootInfo } from "@/lib/api"
import { formatBytes } from "@/lib/format"
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
const COMMAND = "robinx"

/** 이보다 오래 걸리면 시작 화면을 걷고 목록 화면(스켈레톤)으로 넘어간다 */
const MAX_MS = 12000
/** 점검 한 줄을 적어도 이만큼은 보여 준다 (빨리 끝나도 돌아가는 표시가 보이게) */
const CHECK_MIN_MS = 260
/** 진행 막대 칸 수 */
const BAR = 24

type Tone = "ok" | "run" | "new" | "warn" | "dim"
type CheckLine = { tag: string; tone: Tone; text: string }
type Line =
  | { kind: "head"; text: string }
  | { kind: "rule"; width: number }
  | { kind: "kv"; key: string; value: string; shown: number }
  | { kind: "blank" }
  | { kind: "prompt"; prompt: string; command: string }
  | ({ kind: "check" } & CheckLine)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function took(ms: number) {
  return ms < 1000 ? `${Math.max(1, Math.round(ms))}ms` : `${(ms / 1000).toFixed(1)}초`
}

function uptime(secs: number) {
  const m = Math.floor(secs / 60)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}일 ${h % 24}시간`
  if (h > 0) return `${h}시간 ${m % 60}분`
  return `${Math.max(1, m)}분`
}

/** 이 PC 정보를 "이름 값" 줄로. 못 읽은 값은 줄째 뺀다. */
function systemLines(info: BootInfo): [string, string][] {
  const rows: [string, string | null][] = [
    ["운영체제", info.os && (info.build ? `${info.os} · 빌드 ${info.build}` : info.os)],
    ["프로세서", info.cpu && (info.threads ? `${info.cpu} · ${info.threads}스레드` : info.cpu)],
    [
      "메모리",
      info.memoryTotal != null && info.memoryFree != null
        ? `${formatBytes(info.memoryTotal)} 중 ${formatBytes(info.memoryFree)} 남음`
        : null,
    ],
    [
      "디스크",
      info.diskTotal != null && info.diskFree != null
        ? `${info.systemDrive ?? ""} ${formatBytes(info.diskTotal)} 중 ${formatBytes(info.diskFree)} 남음`.trim()
        : null,
    ],
    ["가동 시간", info.uptimeSecs != null ? uptime(info.uptimeSecs) : null],
    ["권한", info.admin ? "관리자" : "일반 사용자"],
  ]
  return rows.filter((r): r is [string, string] => Boolean(r[1]))
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

/** 늦게 오면 기다리지 않고 `null`(뒤에서 계속 읽는다), 실패하면 `undefined` */
function within<T>(p: Promise<T>, ms: number): Promise<T | null | undefined> {
  return Promise.race([p.catch(() => undefined), sleep(ms).then(() => null)])
}

/**
 * 앱을 처음 열 때 보이는 터미널 부팅 화면. index.html의 시작 화면(로고·버전·커서)을 같은 자리·모양으로
 * 이어받아, 이 PC 정보(사용자, Windows, 프로세서, 메모리, 디스크)를 적고 `robinx`를 친 뒤,
 * 앱이 켜면서 실제로 읽는 것(설치 목록, Store 앱, 시작 프로그램, 백업, 제거 기록, 업데이트)을 한 줄씩 점검한다.
 * 다 적으면 브라운관이 꺼지듯 걷히고 앱 화면이 자리 잡는다(`onDone`). 아무 키나 누르면 바로 건너뛴다.
 * PC 정보는 화면에만 쓰고 어디에도 보내지 않는다.
 */
export function StartupSplash({ onDone }: { onDone?: () => void }) {
  const queryClient = useQueryClient()
  const reduce = useReducedMotion()
  const opened = useBootOpened()
  const [lines, setLines] = useState<Line[]>([])
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [done, setDone] = useState(false)
  const [skipped, setSkipped] = useState(false)
  const [timedOut, setTimedOut] = useState(false)

  // 읽을 것은 화면을 그리기 전에 모두 시작한다. 프로그램·시작 프로그램 화면과 같은 캐시라 두 번 읽지 않는다.
  const [jobs] = useState(() => {
    const ensure = <T,>(queryKey: string[], queryFn: () => Promise<T>) => {
      const t0 = performance.now()
      return queryClient.ensureQueryData({ queryKey, queryFn }).then((value) => ({ value, ms: performance.now() - t0 }))
    }
    return {
      info: api.bootInfo().catch(() => null),
      apps: ensure(["installed-apps"], api.listInstalledApps),
      store: ensure(["store-apps"], storeApi.list),
      startup: ensure(["startup-items"], startupApi.list),
      backups: ensure(["backup-usage"], settingsApi.backupUsage),
      removed: ensure(["recently-removed"], scanApi.recentlyRemoved),
    }
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
    const updateLast = (f: (line: Line) => Line) => alive && setLines((l) => [...l.slice(0, -1), f(l[l.length - 1])])

    // 실제로 읽는 것만 적는다. null이면 그 줄을 지운다(읽지 못한 것).
    const checks: [string, () => Promise<CheckLine | null>][] = [
      [
        "설치된 프로그램 읽는 중",
        async () => {
          const r = await jobs.apps.catch(() => undefined)
          return r
            ? { tag: "OK", tone: "ok", text: `설치된 프로그램 ${r.value.length}개 (${took(r.ms)})` }
            : { tag: "FAIL", tone: "warn", text: "설치된 프로그램 읽기 실패" }
        },
      ],
      [
        "Store 앱 읽는 중",
        async () => {
          const r = await within(jobs.store, 1500)
          if (r === null) return { tag: "..", tone: "dim", text: "Store 앱 아직 읽는 중" }
          return r ? { tag: "OK", tone: "ok", text: `Store 앱 ${r.value.length}개 (${took(r.ms)})` } : null
        },
      ],
      [
        "시작 프로그램 읽는 중",
        async () => {
          const r = await within(jobs.startup, 1500)
          if (r === null) return { tag: "..", tone: "dim", text: "시작 프로그램 아직 읽는 중" }
          if (!r) return null
          const on = r.value.filter((e) => e.enabled).length
          return { tag: "OK", tone: "ok", text: `시작 프로그램 ${r.value.length}개, 켜짐 ${on}개 (${took(r.ms)})` }
        },
      ],
      [
        "백업 보관함 확인 중",
        async () => {
          const r = await within(jobs.backups, 1500)
          if (!r) return null
          return r.value.count === 0
            ? { tag: "OK", tone: "ok", text: "백업 보관함 비어 있음" }
            : { tag: "OK", tone: "ok", text: `백업 ${r.value.count}개 보관 중 (${formatBytes(r.value.bytes)})` }
        },
      ],
      [
        "제거 기록 확인 중",
        async () => {
          const r = await within(jobs.removed, 1500)
          if (!r) return null
          const all = r.value.length
          const unscanned = r.value.filter((x) => !x.scanned).length
          if (all === 0) return { tag: "OK", tone: "ok", text: "최근 제거한 프로그램 없음" }
          return unscanned > 0
            ? { tag: "NOTE", tone: "new", text: `최근 제거한 프로그램 ${all}개, 남은 흔적 확인 전 ${unscanned}개` }
            : { tag: "OK", tone: "ok", text: `최근 제거한 프로그램 ${all}개` }
        },
      ],
      [
        "업데이트 확인 중",
        async () => {
          const check = startupUpdateCheck()
          if (!check) return { tag: "SKIP", tone: "dim", text: "업데이트 자동 확인 꺼짐" }
          const result = await within(check, 900)
          if (!result) return { tag: "..", tone: "dim", text: "업데이트 아직 확인 중" }
          if (result.kind === "latest") return { tag: "OK", tone: "ok", text: "최신 버전" }
          if (result.kind === "available")
            return { tag: "NEW", tone: "new", text: `새 버전 ${result.update.version} 있음` }
          return { tag: "SKIP", tone: "dim", text: `업데이트 확인 못 함: ${result.message}` }
        },
      ],
    ]

    void (async () => {
      await wait(260)
      const info = await jobs.info

      // 1. 이 PC 정보: 값을 빠르게 쳐 내려간다
      const rows = info ? systemLines(info) : []
      if (rows.length > 0) {
        // 터미널의 시스템 정보 도구처럼 사용자@PC 이름과 밑줄로 시작한다
        const who = info?.user ? (info.computer ? `${info.user}@${info.computer}` : info.user) : null
        if (who) {
          push({ kind: "head", text: who })
          push({ kind: "rule", width: who.length })
          await wait(140)
        }
        for (const [key, value] of rows) {
          if (!alive) return
          push({ kind: "kv", key, value, shown: reduce ? value.length : 0 })
          for (let n = 0; !reduce && n < value.length && alive;) {
            n = Math.min(value.length, n + 3)
            const shown = n
            updateLast((l) => (l.kind === "kv" ? { ...l, shown } : l))
            await sleep(16)
          }
          await wait(80)
        }
        push({ kind: "blank" })
        await wait(180)
      }

      // 2. 프롬프트에 robinx를 친다
      push({ kind: "prompt", prompt: `${info?.home ?? "C:"}>`, command: "" })
      await wait(360)
      for (let i = 1; i <= COMMAND.length && alive; i++) {
        const command = COMMAND.slice(0, i)
        updateLast((l) => (l.kind === "prompt" ? { ...l, command } : l))
        await wait(55 + Math.random() * 45)
      }
      await wait(240)

      // 3. 점검
      if (alive) setProgress({ done: 0, total: checks.length })
      for (const [i, [running, run]] of checks.entries()) {
        if (!alive) return
        push({ kind: "check", tag: "run", tone: "run", text: running })
        const [line] = await Promise.all([run(), wait(CHECK_MIN_MS)])
        if (!alive) return
        if (line) updateLast(() => ({ kind: "check", ...line }))
        else setLines((l) => l.slice(0, -1))
        setProgress({ done: i + 1, total: checks.length })
        await wait(90)
      }

      await wait(200)
      push({ kind: "check", tag: "OK", tone: "ok", text: "준비 완료" })
      await wait(700)
      if (alive) setDone(true)
    })()
    return () => {
      alive = false
    }
  }, [opened, reduce, jobs])

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

  const cursor = (
    <>
      {" "}
      <span className="tty-cursor" />
    </>
  )
  const last = lines.length - 1
  const filled = progress ? Math.round((progress.done / progress.total) * BAR) : 0
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
            {lines.length === 0 && <div className="tty-line">{cursor}</div>}
            {lines.map((line, i) => (
              <div key={i} className="tty-line">
                {line.kind === "head" && <span className="tty-strong">{line.text}</span>}
                {line.kind === "rule" && <span className="tty-dim">{"-".repeat(line.width)}</span>}
                {line.kind === "kv" && (
                  <>
                    <span className="tty-key">{line.key}</span>
                    {line.value.slice(0, line.shown)}
                  </>
                )}
                {line.kind === "prompt" && (
                  <>
                    <span className="tty-prompt">{line.prompt}</span>
                    {line.command}
                  </>
                )}
                {line.kind === "check" && (
                  <>
                    <span className="tty-tag">
                      [<b className={`tty-${line.tone}`}>{line.tag === "run" ? <Spinner /> : line.tag}</b>]
                    </span>{" "}
                    <span className={line.tone === "dim" ? "tty-dim" : undefined}>{line.text}</span>
                  </>
                )}
                {i === last && line.kind !== "blank" && line.kind !== "rule" && cursor}
              </div>
            ))}
            {progress && progress.done < progress.total && (
              <div className="tty-line tty-dim">
                [<span className="tty-bar">{"█".repeat(filled)}</span>
                {"░".repeat(BAR - filled)}] {progress.done}/{progress.total}
              </div>
            )}
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
