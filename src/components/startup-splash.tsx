import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react"

import { api, scanApi, settingsApi, startupApi, storeApi, type BootInfo } from "@/lib/api"
import { formatBytes } from "@/lib/format"
import { WindowControls } from "@/components/window-controls"
import {
  beginStartupUpdateCheck,
  downloadAndInstall,
  markStartupUpdateAnswered,
  type CheckResult,
} from "@/features/updates/updates"

/** index.html의 #boot와 같은 로고 (한 글자를 바꾸면 두 곳 다 바꾼다) */
const LOGO = [
  "████████              ██        ██            ██      ██",
  "██      ██    ████    ██████        ██████      ██  ██",
  "████████    ██    ██  ██    ██  ██  ██    ██      ██",
  "██    ██    ██    ██  ██    ██  ██  ██    ██    ██  ██",
  "██      ██    ████    ██████    ██  ██    ██  ██      ██",
]
const COMMAND = "robinx"
const VERSION = import.meta.env.VITE_APP_VERSION

/** 무언가 멈춰 이보다 오래 걸리면 시작 화면을 걷고 목록 화면(스켈레톤)으로 넘어간다 */
const MAX_MS = 20000
/** 업데이트 서버의 답을 이만큼 기다린다. 늦으면 시작 화면은 넘어가고 답은 뒤에서 받는다 */
const UPDATE_WAIT_MS = 8000
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
  /** y/n 질문. 답하기 전에는 `answer`가 빈 문자열 */
  | { kind: "ask"; text: string; answer: string }
  /** 업데이트 받기 진행 막대 */
  | { kind: "download"; done: number; total: number | null }

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

/** 업데이트 받기 막대. 전체 크기를 모르면 받은 크기만 */
function DownloadBar({ done, total }: { done: number; total: number | null }) {
  const ratio = total ? Math.min(1, done / total) : 0
  const filled = Math.round(ratio * BAR)
  return (
    // 위 줄의 글자와 같은 칸에서 시작한다 ([ 태그 ] 다음)
    <span className="tty-dim pl-[9ch]">
      [<span className="tty-bar">{"█".repeat(filled)}</span>
      {"░".repeat(BAR - filled)}]{" "}
      {total ? `${Math.round(ratio * 100)}% · ${formatBytes(done)} / ${formatBytes(total)}` : formatBytes(done)}
    </span>
  )
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
 * 앱이 켜면서 실제로 읽는 것(설치 목록, Store 앱, 시작 프로그램, 백업, 제거 기록)을 한 줄씩 점검하고,
 * 이 순서에 이르러 GitHub에 업데이트를 실제로 묻는다. 새 버전이 있으면 y/n으로 묻고, y면 여기서 받아 설치한다(앱이 다시 열린다).
 * 다 적으면 브라운관이 꺼지듯 걷히고 앱 화면이 자리 잡는다(`onDone`). 건너뛸 수 없다 (사용자 요청).
 * PC 정보는 화면에만 쓰고 어디에도 보내지 않는다.
 */
export function StartupSplash({ onDone }: { onDone?: () => void }) {
  const queryClient = useQueryClient()
  const reduce = useReducedMotion()
  const opened = useBootOpened()
  const [lines, setLines] = useState<Line[]>([])
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [done, setDone] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  // y/n을 기다리거나 업데이트를 받는 동안은 멈춘 것이 아니므로 시간 제한을 세지 않는다
  const [holding, setHolding] = useState(false)
  // 지금 기다리는 y/n 답 (묻는 중이 아니면 null)
  const answerRef = useRef<((yes: boolean) => void) | null>(null)
  const answer = (yes: boolean) => {
    const resolve = answerRef.current
    answerRef.current = null
    resolve?.(yes)
  }

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
    if (holding) return
    const t = setTimeout(() => setTimedOut(true), MAX_MS)
    return () => clearTimeout(t)
  }, [holding])

  // y/n 답. 한글 입력 상태에서도 받게 글자 대신 키 자리(KeyY·KeyN)로 본다.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!answerRef.current || e.repeat) return
      const key = e.key.toLowerCase()
      const yes = e.code === "KeyY" || key === "y"
      const no = e.code === "KeyN" || key === "n"
      if (!yes && !no) return
      e.preventDefault()
      answer(yes)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    if (!opened) return
    let alive = true
    const wait = (ms: number) => sleep(reduce ? 0 : ms)
    const push = (line: Line) => alive && setLines((l) => [...l, line])
    const updateLast = (f: (line: Line) => Line) => alive && setLines((l) => [...l.slice(0, -1), f(l[l.length - 1])])

    // 업데이트 확인 결과 (다음 줄의 비교와 끝의 y/n 질문이 쓴다)
    const updateCheck: { result: CheckResult | null } = { result: null }

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
        // 이때 처음으로 GitHub에 묻는다. 기다리는 시간이 실제 서버 응답 시간이다.
        "업데이트 정보 받는 중 (GitHub)",
        async () => {
          const t0 = performance.now()
          const check = beginStartupUpdateCheck()
          if (!check) return { tag: "SKIP", tone: "dim", text: "업데이트 자동 확인 꺼짐 (설정에서 켤 수 있음)" }
          const result = await within(check, UPDATE_WAIT_MS)
          if (result === null)
            return { tag: "..", tone: "dim", text: "업데이트 서버 응답 늦음 · 새 버전이 있으면 사이드바에 표시" }
          if (!result || result.kind === "error")
            return { tag: "FAIL", tone: "warn", text: `업데이트 확인 못 함: ${result?.message ?? "알 수 없는 오류"}` }
          updateCheck.result = result
          return { tag: "OK", tone: "ok", text: `업데이트 정보 받음 (${took(performance.now() - t0)})` }
        },
      ],
      [
        `지금 버전(v${VERSION})과 비교하는 중`,
        async () => {
          const result = updateCheck.result
          if (!result) return null
          return result.kind === "available"
            ? {
                tag: "NEW",
                tone: "new",
                text: `새 버전 v${result.update.version} 있음 (지금 v${result.update.currentVersion})`,
              }
            : { tag: "OK", tone: "ok", text: `최신 버전 사용 중 (v${VERSION})` }
        },
      ],
    ]

    /** 새 버전을 y/n으로 묻는다. y면 받아 설치하고(앱이 닫혔다 다시 열린다) 끝까지 돌아오지 않는다. */
    const offerUpdate = async () => {
      const result = updateCheck.result
      if (result?.kind !== "available" || !alive) return
      setHolding(true)
      push({ kind: "ask", text: "지금 업데이트할까요?", answer: "" })
      const yes = await new Promise<boolean>((resolve) => (answerRef.current = resolve))
      if (!alive) return
      markStartupUpdateAnswered()
      updateLast((l) => (l.kind === "ask" ? { ...l, answer: yes ? "y" : "n" } : l))
      await wait(240)
      if (!yes) {
        push({ kind: "check", tag: "SKIP", tone: "dim", text: "업데이트 나중에 · 사이드바에서 언제든 할 수 있음" })
        setHolding(false)
        return
      }
      push({ kind: "check", tag: "run", tone: "run", text: `v${result.update.version} 받는 중` })
      push({ kind: "download", done: 0, total: null })
      const t0 = performance.now()
      let got = 0
      try {
        await downloadAndInstall(
          result.update,
          {
            progress: (p) => {
              got = p.done
              updateLast((l) => (l.kind === "download" ? { ...l, ...p } : l))
            },
            installing: () =>
              alive &&
              setLines((l) => [
                ...l.slice(0, -2),
                {
                  kind: "check",
                  tag: "OK",
                  tone: "ok",
                  text: `받음 (${formatBytes(got)}, ${took(performance.now() - t0)})`,
                },
                { kind: "check", tag: "run", tone: "run", text: "설치하는 중 · 곧 다시 열려요" },
              ]),
          },
          () => alive,
        )
      } catch (e) {
        // 받지 못했으면 앱으로 넘어간다. 새 버전은 사이드바에 남아 다시 시도할 수 있다.
        if (!alive) return
        setLines((l) => [
          ...l.filter((x) => x.kind !== "download" && !(x.kind === "check" && x.tag === "run")),
          { kind: "check", tag: "FAIL", tone: "warn", text: `업데이트 못 함: ${(e as Error).message}` },
        ])
        setHolding(false)
        return
      }
      // 설치가 시작되면 설치 프로그램이 앱을 닫는다. 그때까지 이 화면에 머문다.
      await new Promise(() => {})
    }

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

      // 4. 새 버전이 있으면 y/n
      await offerUpdate()
      if (!alive) return

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
  const visible = !finished && !done && !timedOut
  useEffect(() => {
    if (visible) return
    setFinished(true)
    onDone?.()
  }, [visible, onDone])

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
                {line.kind === "ask" && (
                  <>
                    <span className="tty-tag">
                      [<b className="tty-new">?</b>]
                    </span>{" "}
                    <span className="tty-strong">{line.text}</span>{" "}
                    {line.answer ? (
                      <span className="tty-dim">(y/n)</span>
                    ) : (
                      // 마우스로도 고를 수 있게
                      <span className="tty-dim">
                        (
                        <button type="button" className="tty-key-button" onClick={() => answer(true)}>
                          y
                        </button>
                        /
                        <button type="button" className="tty-key-button" onClick={() => answer(false)}>
                          n
                        </button>
                        )
                      </span>
                    )}{" "}
                    {line.answer}
                  </>
                )}
                {line.kind === "download" && <DownloadBar done={line.done} total={line.total} />}
                {i === last && line.kind !== "blank" && line.kind !== "rule" && line.kind !== "download" && cursor}
              </div>
            ))}
            {progress && progress.done < progress.total && (
              <div className="tty-line tty-dim">
                [<span className="tty-bar">{"█".repeat(filled)}</span>
                {"░".repeat(BAR - filled)}] {progress.done}/{progress.total}
              </div>
            )}
          </div>
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
