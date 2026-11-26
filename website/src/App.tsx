import { LazyMotion, MotionConfig, domAnimation } from "motion/react"

import { Nav } from "@/sections/nav"
import { Hero } from "@/sections/hero"
import { Story } from "@/sections/story"
import { Features } from "@/sections/features"
import { Iphone } from "@/sections/iphone"
import { Status } from "@/sections/status"
import { Faq } from "@/sections/faq"
import { Cta } from "@/sections/cta"
import { Footer } from "@/sections/footer"

export default function App() {
  return (
    // 쓰는 움직임(나타나기·보일 때 재생)만 담은 가벼운 묶음을 쓴다. strict라 실수로 motion.*을 쓰면 오류로 알려 준다.
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        {/* 키보드로 들어오면 위 막대 링크를 건너뛰고 본문으로 갈 수 있게 */}
        <a
          href="#main"
          className="rk-btn rk-btn--primary sr-only px-4 focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
        >
          본문으로 건너뛰기
        </a>
        <Nav />
        <main id="main" tabIndex={-1}>
          <Hero />
          <Story />
          <Features />
          <Iphone />
          <Status />
          <Faq />
          <Cta />
        </main>
        <Footer />
      </MotionConfig>
    </LazyMotion>
  )
}
