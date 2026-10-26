import type { ReactNode } from "react"

import { RELEASE, REPO_URL } from "@/lib/site"
import { TermWindow } from "@/components/term"

/**
 * 어디까지 만들었고 어디까지 확인했는지 있는 그대로. 버전과 날짜는 빌드할 때 GitHub 릴리스에서 가져온다
 * (scripts/release-info.mjs). 목록이 바뀌면 여기부터 고친다.
 */
const blocks = [
  {
    title: "테스트 앱으로 확인함",
    items: [
      "설치된 프로그램 목록과 제거",
      "남은 흔적 찾기, 백업 후 정리, 복구 기록에서 되돌리기",
      "강제 제거, 시작프로그램, 저장공간 정리",
      "앱 안에서 새 버전 확인, 누르면 설치 (RobinX 서명 키로 확인한 파일만)",
    ],
  },
  {
    title: "확인하는 중",
    items: ["실제 프로그램에서 남은 흔적을 얼마나 정확히 찾는지", "여러 PC 환경(Windows 10/11)에서의 동작"],
  },
  {
    title: "알아 둘 것",
    items: [
      "코드 서명 인증서(게시자 서명)가 아직 없어요. 처음 실행할 때 Windows가 알 수 없는 게시자라는 경고 창을 띄울 수 있어요.",
      "아직 미리보기예요. 정리하기 전에 목록을 한 번 훑어보세요.",
    ],
  },
]

const released = RELEASE.publishedAt.toLocaleDateString("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  // 방문자 시간대가 아니라 공개한 곳(한국) 날짜로 적는다
  timeZone: "Asia/Seoul",
})

/** 터미널의 "이름 값" 줄 (앱 시작 화면과 같은 모양) */
function Kv({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-x-3 sm:grid-cols-[8rem_1fr]">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  )
}

export function Status() {
  return (
    <section id="status" className="bg-white/[0.02] py-20 sm:py-24">
      <div className="frame">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <h2 className="section-title prompt">어디까지 됐는지</h2>
            <p className="mt-5 max-w-[40ch] text-lead leading-relaxed text-muted-foreground">
              지금까지는 직접 만든 테스트 앱으로 시험했어요. 실제 프로그램으로 하는 검증은 진행 중이에요.
            </p>
          </div>

          {/* 최신 릴리스: 버전·날짜·파일·확인 방법 */}
          <TermWindow title="최신 릴리스" className="lg:col-span-7" bodyClassName="p-5 text-fine sm:p-7 sm:text-body">
            <dl className="flex flex-col gap-1.5">
              <Kv k="버전">
                <span className="font-bold">v{RELEASE.version}</span> (미리보기)
              </Kv>
              <Kv k="공개">{released}</Kv>
              <Kv k="파일">
                <span className="[overflow-wrap:anywhere]">{RELEASE.file}</span> · {RELEASE.sizeMb} MB
              </Kv>
              {RELEASE.sha256 && (
                <Kv k="SHA-256">
                  <code className="break-all">{RELEASE.sha256}</code>
                </Kv>
              )}
            </dl>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 font-medium">
              <a
                href={RELEASE.pageUrl}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-white/40 underline-offset-4 hover:decoration-white"
              >
                릴리스 노트
              </a>
              <a
                href={`${REPO_URL}/commits/main`}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-white/40 underline-offset-4 hover:decoration-white"
              >
                변경 기록
              </a>
            </div>
          </TermWindow>
        </div>

        <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {blocks.map((g) => (
            <div key={g.title}>
              <h3 className="text-lead font-bold">{g.title}</h3>
              <ul className="mt-4 flex flex-col gap-2.5 text-body text-pretty">
                {g.items.map((t) => (
                  <li key={t} className="grid grid-cols-[1.5ch_1fr] gap-x-2">
                    <span aria-hidden className="text-muted-foreground">
                      -
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
