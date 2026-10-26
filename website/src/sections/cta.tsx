import { REPO_URL } from "@/lib/site"
import { DownloadButton, DownloadFacts, LineButton } from "@/components/download"
import { GithubIcon } from "@/components/github-icon"
import { Typed } from "@/components/typed"

/** 마지막 구역: 치듯 나오는 제목 아래에 내려받기와 소스 보기, 받기 전에 알아야 할 것. */
export function Cta() {
  return (
    <section className="py-24 sm:py-36">
      <div className="frame">
        <Typed lines={["이제 직접 써 보세요"]} className="display" />
        <div className="mt-10 flex flex-wrap items-center gap-3">
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
