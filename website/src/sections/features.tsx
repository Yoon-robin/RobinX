import type { CSSProperties } from "react"
import { m, useReducedMotion } from "motion/react"

import { shot, shotSrcSet } from "@/lib/site"
import { easeOutQuint } from "@/components/motion"
import { Typed } from "@/components/typed"

/**
 * 남은 흔적 말고 앱에 있는 도구. 칸끼리 가는 선을 같이 쓰는 격자 (터미널 창을 나눈 것처럼).
 * 칸마다 이름과 한 줄만. 앱 화면은 보일 때 아래에서 위로 열리듯 나타난다.
 */
type Tile = {
  name: string
  text: string
  shot: string
  alt: string
  /** 앱 화면에서 보여 줄 부분: 사이드바를 빼고 내용만 확대한다 (그림 너비 대비 비율이라 화면 너비가 바뀌어도 같은 부분이 보인다) */
  crop: CSSProperties
}

const tiles: Tile[] = [
  {
    name: "프로그램 제거",
    text: "원래 언인스톨러로 지우고, 바로 흔적을 찾아요",
    shot: "programs",
    alt: "설치된 프로그램 화면: 이름·게시자·크기·설치일이 있는 목록",
    // 요약 카드와 목록 부분 (이름·게시자·크기·설치일)
    crop: { width: "132%", marginLeft: "-29.3%", marginTop: "-31%" },
  },
  {
    name: "복구 기록",
    text: "정리한 것을 원래 자리로 되돌려요",
    shot: "restore",
    alt: "복구 기록 화면: 정리한 작업마다 되돌리기 단추가 있어요",
    crop: { width: "150%", marginLeft: "-40.8%", marginTop: "-36.3%" },
  },
  {
    name: "저장공간 정리",
    text: "다시 생기는 임시 파일만 미리 골라요",
    shot: "storage",
    alt: "저장공간 정리 화면: 휴지통은 되돌릴 수 없다는 표시와 함께 고르지 않은 상태예요",
    crop: { width: "132%", marginLeft: "-29.3%", marginTop: "-33%" },
  },
  {
    name: "시작프로그램",
    text: "설정만 바꿔서, 언제든 다시 켤 수 있어요",
    shot: "startup",
    alt: "시작프로그램 화면: 항목마다 켜고 끄는 스위치가 있어요",
    crop: { width: "132%", marginLeft: "-29.3%", marginTop: "-30.5%" },
  },
]

/** 그림 없는 두 기능: 한 칸 안에서 반씩 */
const pairs = [
  { name: "강제 제거", text: "언인스톨러가 없어도 백업하고 정리해요" },
  { name: "큰 폴더·큰 파일 찾기", text: "크기순으로 보여 주고, 지우지는 않아요" },
]

// 칸이 보이면(칸 기준으로 본다: 잘라 낸 그림 자체는 브라우저가 안 보인다고 여긴다) 그림 틀이 아래에서 열리고 그림이 따라 올라온다
const frameIn = { off: { clipPath: "inset(100% 0 0 0)" }, on: { clipPath: "inset(0% 0 0 0)" } }
const imageIn = { off: { y: 40 }, on: { y: 0 } }

function Shot({ t, i }: { t: Tile; i: number }) {
  const ease = { delay: (i % 2) * 0.12, ease: easeOutQuint }
  return (
    <m.div
      data-ui
      variants={frameIn}
      transition={{ duration: 0.9, ...ease }}
      className="mt-auto ml-6 h-56 overflow-hidden border-t border-l border-white/15 sm:ml-8 sm:h-72" // taste-skill-ignore: 앱 화면 창의 모서리
    >
      <m.img
        src={shot(t.shot)}
        srcSet={shotSrcSet(t.shot)}
        alt={t.alt}
        width={1280}
        height={800}
        loading="lazy"
        decoding="async"
        variants={imageIn}
        transition={{ duration: 1.1, ...ease }}
        className="block max-w-none"
        style={t.crop}
      />
    </m.div>
  )
}

export function Features() {
  const reduce = useReducedMotion()
  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="frame">
        <Typed lines={["그 밖의 기능"]} className="section-title" />

        <div className="mt-10 grid gap-px overflow-hidden border border-white/15 bg-white/15 sm:mt-12 lg:grid-cols-2">
          {tiles.map((t, i) => (
            <m.article
              key={t.name}
              initial={reduce ? false : "off"}
              whileInView="on"
              viewport={{ once: true, amount: 0.35 }}
              className="flex flex-col bg-background"
            >
              <div className="p-6 sm:p-8">
                <h3 className="text-lead leading-snug font-bold">{t.name}</h3>
                <p className="mt-1.5 text-body text-muted-foreground">{t.text}</p>
              </div>
              <Shot t={t} i={i} />
            </m.article>
          ))}
          {pairs.map((p) => (
            <article key={p.name} className="bg-background p-6 sm:p-8">
              <h3 className="text-lead leading-snug font-bold">{p.name}</h3>
              <p className="mt-1.5 text-body text-muted-foreground">{p.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
