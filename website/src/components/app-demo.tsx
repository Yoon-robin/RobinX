import { useEffect, useRef } from "react"
import { animate, m, useInView, useMotionValue, useReducedMotion } from "motion/react"

/**
 * 첫 화면의 실제 앱 시연. 앱의 화면 코드를 그대로 빌드한 것(website/app-demo → public/app)을 iframe으로 띄운다.
 * 그 안에서 커서가 저절로 눌러 가며 시작 화면 → 남은 흔적 정리 → 저장공간 → 시작프로그램 → 복구 기록을 보여 주고,
 * 이 창은 앱이 알려 주는 "지금 볼 곳"으로 확대해 따라간다 (화면 녹화 앱의 확대처럼). 모두 실제 글자라 흐려지지 않는다.
 * - 엔진 대신 가짜 응답이라 실제 PC를 읽지 않고, 프로그램과 PC 정보는 예시다 (app-demo/data.mjs).
 * - 누를 수 없다 (inert). 단추가 없고, 창이 화면에서 벗어나면 다음 동작을 미룬다.
 * - 움직임 줄이기면 확대 없이 남은 흔적 찾기 결과에서 멈춘다.
 */
const APP_W = 1280
const APP_H = 800

type Rect = { x: number; y: number; width: number; height: number }
/** 앱에서 사이드바(256px) 오른쪽의 내용 부분 */
const CONTENT: Rect = { x: 256, y: 0, width: APP_W - 256, height: APP_H }

export function AppDemo() {
  const reduce = useReducedMotion()
  const box = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const visible = useInView(box, { amount: 0.3 })
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const scale = useMotionValue(1)
  const target = useRef<Rect | null>(null)

  useEffect(() => {
    const el = box.current
    if (!el) return
    // 볼 곳이 창에 꽉 차게 확대한다. 넓은 화면에서는 앱 전체가 보이는 크기의 1.4배까지만 (주변이 보이게).
    // 좁은 화면은 앱 전체를 넣으면 글자가 너무 작아서 늘 조금 확대하고, 볼 곳이 없으면 사이드바 오른쪽 내용을 본다.
    const move = (instant: boolean) => {
      const W = el.clientWidth
      const H = el.clientHeight
      const narrow = W < 640
      const cover = Math.max(W / APP_W, H / APP_H)
      const r = target.current ?? (narrow ? CONTENT : null)
      let tx = 0
      let ty = 0
      let s = cover
      if (r) {
        const fit = Math.min(W / r.width, H / r.height) * 0.94
        s = Math.min(Math.max(fit, narrow ? Math.max(cover, 0.68) : cover), narrow ? 0.95 : cover * 1.4)
        // 다 들어가면 가운데에, 넘치면 글이 시작하는 왼쪽·위에 맞춘다 (목록의 이름이 잘리지 않게)
        tx = r.width * s <= W ? W / 2 - (r.x + r.width / 2) * s : 8 - r.x * s
        ty = r.height * s <= H ? H / 2 - (r.y + r.height / 2) * s : 8 - r.y * s
      }
      // 앱 밖(빈 곳)이 보이지 않게 가장자리에서 멈춘다
      tx = Math.min(0, Math.max(W - APP_W * s, tx))
      ty = Math.min(0, Math.max(H - APP_H * s, ty))
      if (instant || reduce) {
        x.jump(tx)
        y.jump(ty)
        scale.jump(s)
        return
      }
      const camera = { duration: 0.9, ease: [0.65, 0, 0.35, 1] as const }
      animate(x, tx, camera)
      animate(y, ty, camera)
      animate(scale, s, camera)
    }
    move(true)
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || e.data?.type !== "robin-demo:focus") return
      target.current = e.data.rect
      move(false)
    }
    const resize = new ResizeObserver(() => move(true))
    resize.observe(el)
    window.addEventListener("message", onMessage)
    return () => {
      resize.disconnect()
      window.removeEventListener("message", onMessage)
    }
  }, [reduce, x, y, scale])

  // 창이 화면에 보이는지 알려 준다 (안 보이면 시연이 다음 동작을 미룬다). 다시 불러온 뒤에도 알려 준다
  const tell = () =>
    frame.current?.contentWindow?.postMessage({ type: "robin-demo:visible", visible }, window.location.origin)
  useEffect(tell, [visible])

  return (
    <div
      ref={box}
      className="term relative aspect-[4/5] overflow-hidden sm:aspect-[16/10]"
      role="img"
      aria-label="RobinX 실제 화면: 남은 흔적을 찾아 백업하고 정리한 뒤 저장공간, 시작프로그램, 복구 기록을 차례로 보여 줘요"
    >
      <m.div style={{ x, y, scale, width: APP_W, height: APP_H }} className="absolute top-0 left-0 origin-top-left">
        <iframe
          ref={frame}
          src={`${import.meta.env.BASE_URL}app/index.html`}
          title="RobinX 실제 화면 (예시 데이터)"
          width={APP_W}
          height={APP_H}
          tabIndex={-1}
          inert
          aria-hidden
          onLoad={tell}
          className="pointer-events-none block border-0"
        />
      </m.div>
    </div>
  )
}
