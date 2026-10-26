import type { ReactNode } from "react"
import { m, useReducedMotion } from "motion/react"

import { RELEASE, REPO_URL } from "@/lib/site"
import { TermWindow } from "@/components/term"
import { Typed } from "@/components/typed"

/**
 * 최신 릴리스와 어디까지 확인했는지를 앱 시작 화면 같은 "이름 값" 줄로. 보일 때 한 줄씩 찍힌다.
 * 버전과 날짜는 빌드할 때 GitHub 릴리스에서 가져온다 (scripts/release-info.mjs).
 */
const released = RELEASE.publishedAt.toLocaleDateString("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  // 방문자 시간대가 아니라 공개한 곳(한국) 날짜로 적는다
  timeZone: "Asia/Seoul",
})

const rows: { k: string; v: ReactNode }[] = [
  {
    k: "버전",
    v: (
      <>
        <span className="font-bold">v{RELEASE.version}</span> 미리보기
      </>
    ),
  },
  { k: "공개", v: released },
  {
    k: "파일",
    v: (
      <>
        <span className="[overflow-wrap:anywhere]">{RELEASE.file}</span> · {RELEASE.sizeMb} MB
      </>
    ),
  },
  ...(RELEASE.sha256 ? [{ k: "SHA-256", v: <code className="break-all">{RELEASE.sha256}</code> }] : []),
  { k: "확인", v: "테스트 앱으로 확인함 · 실제 프로그램은 확인하는 중" },
  {
    k: "서명",
    v: <span className="text-review">게시자 서명 전 · 처음 실행할 때 Windows 경고 창이 뜰 수 있어요</span>,
  },
]

const link = "underline decoration-white/40 underline-offset-4 hover:decoration-white"

export function Status() {
  const reduce = useReducedMotion()
  return (
    <section id="status" className="bg-white/[0.02] py-20 sm:py-28">
      <div className="frame grid gap-10 lg:grid-cols-12 lg:gap-8">
        <Typed lines={["최신 버전"]} className="section-title lg:col-span-4" />

        <TermWindow
          title="robinx --version"
          className="lg:col-span-8"
          bodyClassName="p-5 text-fine sm:p-7 sm:text-body"
        >
          <m.dl
            className="flex flex-col gap-1.5"
            initial={reduce ? false : "off"}
            whileInView="on"
            viewport={{ once: true, amount: 0.5 }}
            variants={{ off: {}, on: { transition: { staggerChildren: 0.09 } } }}
          >
            {rows.map(({ k, v }) => (
              <m.div
                key={k}
                variants={{ off: { opacity: 0 }, on: { opacity: 1 } }}
                transition={{ duration: 0.01 }}
                className="grid grid-cols-[5.5rem_1fr] gap-x-3 sm:grid-cols-[7rem_1fr]"
              >
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="min-w-0">{v}</dd>
              </m.div>
            ))}
          </m.dl>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 font-medium">
            <a href={RELEASE.pageUrl} target="_blank" rel="noreferrer" className={link}>
              릴리스 노트
            </a>
            <a href={`${REPO_URL}/commits/main`} target="_blank" rel="noreferrer" className={link}>
              변경 기록
            </a>
          </div>
        </TermWindow>
      </div>
    </section>
  )
}
