import type { ReactNode } from "react"
import { m, useReducedMotion } from "motion/react"

import { RELEASE, REPO_URL } from "@/lib/site"
import { AppWindow } from "@/components/app-window"

/**
 * 최신 릴리스와 어디까지 확인했는지를 앱의 카드 줄처럼 "이름 값" 줄로. 보일 때 한 줄씩 찍힌다.
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
        <span className="font-[650] text-rk-head">v{RELEASE.version}</span> 미리보기
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
    v: <span className="text-rk-note">게시자 서명 전 · 처음 실행할 때 Windows 경고 창이 뜰 수 있어요</span>,
  },
]

export function Status() {
  const reduce = useReducedMotion()
  return (
    <section id="status" className="border-y border-rk-line bg-rk-side py-20 sm:py-28">
      <div className="frame grid gap-10 lg:grid-cols-12 lg:gap-8">
        <h2 className="section-title lg:col-span-4">최신 버전</h2>

        <AppWindow
          title={`RobinX ${RELEASE.version}`}
          className="lg:col-span-8"
          bodyClassName="text-fine sm:text-[14px]"
        >
          <m.dl
            className="flex flex-col px-2 py-1 sm:px-3"
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
                className="grid grid-cols-[5rem_1fr] gap-x-3 px-2 py-2.5 [&+&]:border-t [&+&]:border-rk-line sm:grid-cols-[7rem_1fr] sm:px-3"
              >
                <dt className="text-rk-faint">{k}</dt>
                <dd className="min-w-0 text-rk-text">{v}</dd>
              </m.div>
            ))}
          </m.dl>
          <div className="flex flex-wrap gap-2 border-t border-rk-line px-4 py-3.5 sm:px-5">
            <a href={RELEASE.pageUrl} target="_blank" rel="noreferrer" className="rk-btn press h-8 px-3 text-fine">
              릴리스 노트
            </a>
            <a
              href={`${REPO_URL}/commits/main`}
              target="_blank"
              rel="noreferrer"
              className="rk-btn press h-8 px-3 text-fine"
            >
              변경 기록
            </a>
          </div>
        </AppWindow>
      </div>
    </section>
  )
}
