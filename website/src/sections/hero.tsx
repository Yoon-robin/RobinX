import { ArrowDown } from "lucide-react"

import { BootReplay } from "@/components/boot-replay"
import { DownloadButton, DownloadFacts, LineButton } from "@/components/download"

/**
 * 첫 화면: 왼쪽 정렬 제목(앱의 페이지 제목처럼 > 와 커서), 오른쪽에 한 문장과 받기, 그 아래 큰 터미널 창.
 * 창은 앱을 켤 때 나오는 시작 화면을 다시 보여 준 뒤 앱 화면("남은 흔적" 창)으로 넘어간다.
 * 그림과 PC 정보는 가짜 응답으로 만든 예시라 실제 PC의 이름이나 프로그램은 나오지 않는다.
 */
export function Hero() {
  return (
    <section id="top" className="pt-24 sm:pt-28">
      <div className="frame grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-10">
        <h1 className="display prompt cursor lg:col-span-7">
          남은 흔적까지
          <br />
          정리해요
        </h1>
        <div className="lg:col-span-5 lg:pb-2">
          <p className="max-w-[40ch] text-lead leading-relaxed text-muted-foreground">
            프로그램을 지우고 남은 파일과 레지스트리를 찾아 줘요. 근거를 보고 고른 것만, 백업한 다음 정리해요.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <DownloadButton />
            <LineButton href="#walkthrough">
              정리하는 모습
              <ArrowDown
                className="size-4 transition-transform group-hover:translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0"
                aria-hidden
              />
            </LineButton>
          </div>
          <DownloadFacts className="mt-5" />
        </div>
      </div>

      <figure className="frame mt-8 sm:mt-10">
        <BootReplay />
        <figcaption className="mt-4 text-fine text-muted-foreground">
          RobinX를 켜면 나오는 시작 화면과 앱 화면이에요. PC 정보와 프로그램 이름·경로·크기는 예시예요.
        </figcaption>
      </figure>
    </section>
  )
}
