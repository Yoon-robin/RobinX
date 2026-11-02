import { m, useReducedMotion } from "motion/react"
import { Download } from "lucide-react"

import { IOS_RELEASE } from "@/lib/site"
import { easeOutQuint } from "@/components/motion"
import { LineButton } from "@/components/download"
import { Typed } from "@/components/typed"

/**
 * iPhone 앱: 왼쪽에 하는 일 네 줄과 ipa 받기, 오른쪽에 앱 화면 세 장 (CI가 시뮬레이터에서 가짜 자료로 찍은 것,
 * scripts/ios-shots.py). 화면은 기능 칸처럼 보일 때 아래에서 열린다.
 * 흰 내려받기 단추는 Windows 설치 파일 하나뿐이라 여기는 테두리 단추를 쓴다.
 */
const rows = [
  { k: "사진", v: "중복·비슷한 사진, 큰 동영상, 스크린샷, 연속 촬영을 찾아요" },
  { k: "넘겨 보며 정리", v: "왼쪽으로 밀면 지울 것, 오른쪽은 남길 것. 모아서 한 번 더 확인해요" },
  { k: "파일", v: "고른 폴더에서 큰 파일과 중복 파일을 찾아요" },
  { k: "지운 사진", v: "사진 앱의 '최근 삭제된 항목'에 30일 남아요" },
]

const screens = [
  { name: "ios-summary", alt: "저장공간 화면: 남은 공간과 정리할 곳(사진, 파일)" },
  { name: "ios-photos", alt: "사진 화면: 중복 사진, 비슷한 사진, 큰 동영상, 스크린샷, 연속 촬영" },
  { name: "ios-similar", alt: "비슷한 사진 화면: 묶음마다 가장 큰 사진에 표시가 붙어 있어요" },
]

const src = (name: string) => `${import.meta.env.BASE_URL}shots/${name}.webp`
const srcSet = (name: string) => `${src(name)} 1x, ${import.meta.env.BASE_URL}shots/${name}@2x.webp 2x`

const frameIn = { off: { clipPath: "inset(100% 0 0 0)" }, on: { clipPath: "inset(0% 0 0 0)" } }
const imageIn = { off: { y: 32 }, on: { y: 0 } }

const link = "text-foreground underline decoration-white/40 underline-offset-4 hover:decoration-white"

export function Iphone() {
  const reduce = useReducedMotion()
  return (
    <section id="iphone" className="py-20 sm:py-28">
      <div className="frame grid gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <Typed lines={["iPhone 앱"]} className="section-title" />

          <dl className="mt-8 flex flex-col gap-5 sm:mt-10">
            {rows.map((r) => (
              <div key={r.k}>
                <dt className="text-lead leading-snug font-bold">{r.k}</dt>
                <dd className="mt-1 text-body text-muted-foreground">{r.v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-9">
            <LineButton href={IOS_RELEASE.downloadUrl}>
              <Download className="size-[1.1rem]" aria-hidden />
              iPhone용 ipa 받기
            </LineButton>
          </div>
          <p className="mt-5 max-w-[60ch] text-fine text-muted-foreground">
            <span className="block">
              {IOS_RELEASE.version && <>v{IOS_RELEASE.version} · </>}
              {IOS_RELEASE.sizeMb != null && <>{IOS_RELEASE.sizeMb} MB · </>}
              iOS 16 이상
            </span>
            <span className="block">App Store에는 없어요. 서명 없는 ipa라 LiveContainer 같은 설치 앱으로 설치해요.</span>
            <span className="block">시뮬레이터에서 확인함 · 실제 iPhone은 확인하는 중</span>
            <a href={IOS_RELEASE.pageUrl} target="_blank" rel="noreferrer" className={"mt-1 inline-block " + link}>
              릴리스 노트와 SHA-256
            </a>
          </p>
        </div>

        <figure className="lg:col-span-7">
          <m.div
            initial={reduce ? false : "off"}
            whileInView="on"
            viewport={{ once: true, amount: 0.3 }}
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4"
          >
            {screens.map((s, i) => (
              <m.div
                key={s.name}
                data-ui
                variants={frameIn}
                transition={{ duration: 0.9, delay: i * 0.1, ease: easeOutQuint }}
                className={
                  "overflow-hidden border border-white/15 " + // taste-skill-ignore: 앱 화면의 테두리
                  (i === 2 ? "hidden sm:block" : "")
                }
              >
                <m.img
                  src={src(s.name)}
                  srcSet={srcSet(s.name)}
                  alt={s.alt}
                  width={400}
                  height={809}
                  loading="lazy"
                  decoding="async"
                  variants={imageIn}
                  transition={{ duration: 1.1, delay: i * 0.1, ease: easeOutQuint }}
                  className="block h-auto w-full"
                />
              </m.div>
            ))}
          </m.div>
          <figcaption className="mt-3 text-fine text-muted-foreground">화면 속 사진과 숫자는 예시예요</figcaption>
        </figure>
      </div>
    </section>
  )
}
