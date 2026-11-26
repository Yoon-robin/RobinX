import type { ReactNode } from "react"
import { Download } from "lucide-react"

import { RELEASE } from "@/lib/site"
import { cn } from "@/lib/utils"

/**
 * 단추 두 가지 (키트 rk-btn): 파란 채움은 한 화면에 하나, 설치 파일을 받는 단추뿐. 나머지는 보통 컨트롤.
 * 누르면 0.97배로 줄었다 돌아온다 (V5.1).
 */
export const buttonClass = {
  solid: "rk-btn rk-btn--primary press h-11 px-5 text-body",
  line: "rk-btn press h-11 px-4 text-body",
}

/** 설치 파일을 바로 받는 단추. 문구는 누르면 일어나는 일(파일을 받음)과 같아야 한다. */
export function DownloadButton({ className }: { className?: string }) {
  return (
    <a href={RELEASE.downloadUrl} className={cn(buttonClass.solid, className)}>
      <Download className="size-[1.1rem]" aria-hidden />
      Windows용 무료 다운로드
    </a>
  )
}

export function LineButton({ href, children, external }: { href: string; children: ReactNode; external?: boolean }) {
  return (
    <a
      href={href}
      className={cn(buttonClass.line, "group")}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {children}
    </a>
  )
}

/** 받기 전에 알아야 할 것: 버전, 크기, 지원 환경, 미리보기·서명 상태. 릴리스 페이지에서 SHA-256을 확인할 수 있다. */
export function DownloadFacts({ className }: { className?: string }) {
  return (
    <p className={cn("max-w-[60ch] text-fine text-rk-soft", className)}>
      <span className="block">
        v{RELEASE.version} · {RELEASE.sizeMb} MB · Windows 10/11 (x64)
      </span>
      <span className="block">
        미리보기 · 게시자 서명 전 {/* 좁은 화면에서 "·"만 줄 앞에 떨어지지 않게 링크와 묶는다 */}
        <span className="whitespace-nowrap">
          ·{" "}
          <a href={RELEASE.pageUrl} target="_blank" rel="noreferrer" className="fact-link">
            릴리스 노트와 SHA-256
          </a>
        </span>
      </span>
    </p>
  )
}
