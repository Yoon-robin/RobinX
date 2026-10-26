import type { ReactNode } from "react"
import { Download } from "lucide-react"

import { RELEASE } from "@/lib/site"
import { cn } from "@/lib/utils"

/** 단추 모양 두 가지: 흰 바탕(내려받기 하나만)과 테두리만 있는 것 */
export const buttonClass = {
  solid:
    "inline-flex h-12 items-center gap-2.5 rounded-sm bg-primary px-6 text-body font-semibold text-primary-foreground transition-[transform,background-color] hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none active:scale-[0.98]",
  line: "inline-flex h-12 items-center gap-2 rounded-sm border border-white/25 px-5 text-body font-medium transition-colors hover:border-white/60 hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
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
    <p className={cn("max-w-[60ch] text-fine text-muted-foreground", className)}>
      <span className="block">
        v{RELEASE.version} · {RELEASE.sizeMb} MB · Windows 10/11 (x64)
      </span>
      <span className="block">
        미리보기 · 게시자 서명 전 {/* 좁은 화면에서 "·"만 줄 앞에 떨어지지 않게 링크와 묶는다 */}
        <span className="whitespace-nowrap">
          ·{" "}
          <a
            href={RELEASE.pageUrl}
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline decoration-white/40 underline-offset-4 hover:decoration-white"
          >
            릴리스 노트와 SHA-256
          </a>
        </span>
      </span>
    </p>
  )
}
