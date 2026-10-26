import type { CSSProperties } from "react"

import { cn } from "@/lib/utils"
import { shot, shotSrcSet } from "@/lib/site"

/**
 * 남은 흔적 말고 앱에 있는 도구. 칸끼리 가는 선을 같이 쓰는 격자 (터미널 창을 나눈 것처럼).
 * 두 칸씩: 제거와 복구 기록, 저장공간과 시작프로그램, 그림 없는 두 기능.
 */
type Tile = {
  name: string
  text: string
  /** 큰 화면에서 6칸 중 넓이 */
  span: string
  shot: string
  alt: string
  /** 앱 화면에서 보여 줄 부분: 사이드바를 빼고 내용만 확대한다 (그림 너비 대비 비율이라 화면 너비가 바뀌어도 같은 부분이 보인다) */
  crop: CSSProperties
}

const tiles: Tile[] = [
  {
    name: "프로그램 제거",
    text: "설치된 프로그램과 크기를 보고, 원래 언인스톨러로 지워요. 끝나면 바로 남은 흔적을 찾아볼 수 있어요.",
    span: "lg:col-span-3",
    shot: "programs",
    alt: "설치된 프로그램 화면: 이름·게시자·크기·설치일이 있는 목록",
    // 요약 카드와 목록 부분 (이름·게시자·크기·설치일)
    crop: { width: "132%", marginLeft: "-29.3%", marginTop: "-31%" },
  },
  {
    name: "복구 기록",
    text: "남은 흔적을 정리할 때마다 백업이 남아요. 보관하는 동안 원래 자리로 되돌릴 수 있어요.",
    span: "lg:col-span-3",
    shot: "restore",
    alt: "복구 기록 화면: 정리한 작업마다 되돌리기 단추가 있어요",
    crop: { width: "150%", marginLeft: "-40.8%", marginTop: "-36.3%" },
  },
  {
    name: "저장공간 정리",
    text: "프로그램이 다시 만드는 임시 파일만 미리 골라요. 휴지통처럼 되돌릴 수 없는 것은 따로 물어봐요.",
    span: "lg:col-span-3",
    shot: "storage",
    alt: "저장공간 정리 화면: 휴지통은 되돌릴 수 없다는 표시와 함께 고르지 않은 상태예요",
    crop: { width: "132%", marginLeft: "-29.3%", marginTop: "-33%" },
  },
  {
    name: "시작프로그램",
    text: "PC를 켤 때 같이 실행되는 프로그램을 끄고 켜요. 끄고 켜는 건 설정만 바꾸고, 실행 파일이 사라진 항목은 백업한 뒤 정리할 수 있어요.",
    span: "lg:col-span-3",
    shot: "startup",
    alt: "시작프로그램 화면: 항목마다 켜고 끄는 스위치가 있어요",
    crop: { width: "132%", marginLeft: "-29.3%", marginTop: "-30.5%" },
  },
]

/** 그림 없이 설명하는 두 기능: 한 칸 안에서 반씩 */
const pairs = [
  {
    name: "강제 제거",
    text: "언인스톨러가 없거나 고장 난 프로그램도 등록 정보와 남은 파일을 찾아 백업한 뒤 정리해요. 백신·VPN 같은 보안 프로그램과 장치 드라이버는 다루지 않아요.",
  },
  {
    name: "큰 폴더·큰 파일 찾기",
    text: "어떤 폴더와 파일이 공간을 많이 차지하는지 찾아 크기순으로 보여 줘요. 내 파일일 수 있어서 지우지 않고, 탐색기로 열어 주기만 해요.",
  },
]

function Shot({ t }: { t: Tile }) {
  return (
    <div data-ui className="mt-auto ml-6 h-56 overflow-hidden border-t border-l border-white/15 sm:ml-8 sm:h-72">
      <img
        src={shot(t.shot)}
        srcSet={shotSrcSet(t.shot)}
        alt={t.alt}
        width={1280}
        height={800}
        loading="lazy"
        decoding="async"
        className="block max-w-none"
        style={t.crop}
      />
    </div>
  )
}

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-24">
      <div className="frame">
        <div className="max-w-3xl">
          <h2 className="section-title prompt">남은 흔적 말고도 할 수 있는 일</h2>
          <p className="mt-5 max-w-[46ch] text-lead leading-relaxed text-muted-foreground">
            프로그램 제거와 저장공간 정리, 시작프로그램, 백업 관리도 들어 있어요.
          </p>
        </div>

        <div className="mt-12 grid gap-px overflow-hidden border border-white/15 bg-white/15 sm:mt-14 lg:grid-cols-6">
          {tiles.map((t) => (
            <article key={t.name} className={cn("flex flex-col bg-background", t.span)}>
              <div className="p-6 sm:p-8">
                <h3 className="text-lead leading-snug font-bold">{t.name}</h3>
                <p className="mt-2 max-w-[46ch] text-body text-muted-foreground">{t.text}</p>
              </div>
              <Shot t={t} />
            </article>
          ))}
          {pairs.map((p) => (
            <article key={p.name} className="bg-background p-6 sm:p-8 lg:col-span-3">
              <h3 className="text-lead leading-snug font-bold">{p.name}</h3>
              <p className="mt-2 max-w-[50ch] text-body text-muted-foreground">{p.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
