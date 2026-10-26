import { REPO_URL } from "@/lib/site"
import { DownloadButton, DownloadFacts, LineButton } from "@/components/download"
import { GithubIcon } from "@/components/github-icon"

/** 마지막 구역: 프롬프트처럼 끝나는 제목 아래에 내려받기와 소스 보기, 받기 전에 알아야 할 것. */
export function Cta() {
  return (
    <section className="py-24 sm:py-32">
      <div className="frame">
        <h2 className="section-title prompt cursor">이제 직접 써 보세요</h2>
        <p className="mt-5 max-w-[40ch] text-lead leading-relaxed text-muted-foreground">
          무료이고, 무엇을 어떻게 지우는지 소스 코드로 확인할 수 있어요.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <DownloadButton />
          <LineButton href={REPO_URL} external>
            <GithubIcon className="size-4" />
            소스 보기
          </LineButton>
        </div>
        <DownloadFacts className="mt-5" />
      </div>
    </section>
  )
}
