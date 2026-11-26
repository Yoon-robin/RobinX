import type { ReactNode } from "react"
import { ChevronDown } from "lucide-react"

import { REPO_URL } from "@/lib/site"

type Faq = { q: string; a: ReactNode }

/** 받기 전에 궁금한 것부터 (받기·되돌리기·내 파일·인터넷) */
const faqs: Faq[] = [
  {
    q: "어디서 받고, 어떻게 확인하나요?",
    a: (
      <>
        GitHub 릴리스에서 받아요. 실행하기 전에 <span className="whitespace-nowrap">Get-FileHash</span> 값이 릴리스
        페이지의 SHA-256과 같은지 보고, 다르면 실행하지 마세요.
      </>
    ),
  },
  {
    q: "지운 건 다 되돌릴 수 있나요?",
    a: "남은 흔적은 백업이 있는 동안 되돌릴 수 있어요. 프로그램 제거와 임시 파일·휴지통 정리는 되돌릴 수 없어요.",
  },
  {
    q: "내 파일이 지워지지는 않나요?",
    a: "문서·다운로드·바탕 화면 안의 것은 미리 고르지 않아요. 고른 것도 백업한 뒤에 정리해요.",
  },
  {
    q: "인터넷으로 무엇이 나가나요?",
    a: "저절로 하는 건 새 버전 확인뿐이에요(설정에서 끌 수 있어요). 프로그램 목록과 정리 기록은 어디로도 보내지 않아요.",
  },
  {
    q: "정리하면 공간이 바로 늘어나나요?",
    a: "임시 파일은 바로 늘어나요. 남은 흔적은 백업으로 옮기므로, 백업이 지워질 때 늘어나요.",
  },
  { q: "백업은 어디에 있나요?", a: String.raw`이 PC 안에만 있어요. %LOCALAPPDATA%\RobinX\backups` },
  {
    q: "관리자 권한이 필요한가요?",
    a: "평소에는 필요 없어요. 모든 사용자용 프로그램이나 시스템 항목을 다룰 때만 Windows가 물어요.",
  },
  { q: "소스 코드를 볼 수 있나요?", a: "네, GitHub에 공개돼 있어요 (Apache 2.0)." },
]

/** 질문만 보여 주고 누르면 답이 열린다 (카드 줄). 여는 움직임은 index.css의 details 규칙 (지원하는 브라우저에서만). */
export function Faq() {
  return (
    <section id="faq" className="frame py-20 sm:py-28">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
        <h2 className="section-title">자주 묻는 질문</h2>
        <a href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer" className="fact-link text-fine">
          다른 질문은 GitHub에
        </a>
      </div>

      {/* 질문마다 카드 안의 한 줄. 열면 꺾쇠가 돌고 답이 그 아래에 열린다 */}
      <div className="mt-8 max-w-4xl overflow-hidden rounded-xl bg-rk-card shadow-[0_0_0_1px_var(--rk-line)] sm:mt-10">
        {faqs.map((f) => (
          <details key={f.q} className="faq group [&+&]:border-t [&+&]:border-rk-line">
            <summary className="flex min-h-14 cursor-pointer list-none items-center gap-4 px-5 py-3 text-body font-[550] text-rk-head transition-colors duration-150 hover:bg-rk-hover focus-visible:outline-rk-ring focus-visible:-outline-offset-2 sm:px-6 sm:text-lead [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1">{f.q}</span>
              <ChevronDown
                aria-hidden
                className="size-4 shrink-0 text-rk-faint transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <div className="max-w-[64ch] px-5 pb-5 text-body leading-relaxed text-pretty text-rk-soft sm:px-6">
              {f.a}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}
