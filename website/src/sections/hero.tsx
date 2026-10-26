import { m, useReducedMotion } from "motion/react"
import { ArrowDown } from "lucide-react"

import { AppDemo } from "@/components/app-demo"
import { DownloadButton, DownloadFacts, LineButton } from "@/components/download"
import { easeOutQuint } from "@/components/motion"
import { Typed } from "@/components/typed"

/**
 * 첫 화면: 터미널에 치듯 나오는 제목, 오른쪽에 한 줄과 받기, 그 아래 큰 터미널 창.
 * 창에서는 실제 앱(같은 화면 코드)이 시작 화면부터 돌고, 커서가 저절로 눌러 가며 기능을 보여 준다.
 * PC 정보와 프로그램은 가짜 응답으로 만든 예시라 실제 PC의 이름이나 프로그램은 나오지 않는다.
 */
export function Hero() {
  const reduce = useReducedMotion()
  return (
    <section id="top" className="pt-24 sm:pt-28">
      <div className="frame grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-10">
        <Typed as="h1" lines={["남은 흔적까지", "정리해요"]} delay={250} className="display lg:col-span-7" />
        <m.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: easeOutQuint }}
          className="lg:col-span-5 lg:pb-2"
        >
          <p className="text-lead text-muted-foreground">Windows용 무료 언인스톨러. 소스 코드 공개.</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <DownloadButton />
            <LineButton href="#story">
              정리 과정
              <ArrowDown
                className="size-4 transition-transform group-hover:translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0"
                aria-hidden
              />
            </LineButton>
          </div>
          <DownloadFacts className="mt-5" />
        </m.div>
      </div>

      <figure className="frame mt-8 sm:mt-10">
        <AppDemo />
        <figcaption className="mt-3 max-w-[60ch] text-fine text-muted-foreground">
          실제 앱 화면이에요. 프로그램과 PC 정보는 예시예요.
        </figcaption>
      </figure>
    </section>
  )
}
