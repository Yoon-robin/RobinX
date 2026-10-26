// 실제 앱 화면을 커서가 차례로 눌러 가며 보여 주는 순서. 앱 코드는 건드리지 않고 화면의 단추를 찾아 누른다.
// 사이트(website/src/components/app-demo.tsx)와는 postMessage로 주고받는다:
//   보냄 robin-demo:focus { rect }  — 지금 볼 곳 (사이트가 그쪽으로 확대해 따라간다). rect가 없으면 창 전체
//   받음 robin-demo:visible { visible } — 창이 화면에 보이는지 (안 보이면 다음 동작을 미룬다)
// 처음에는 앱의 시작 화면을 그대로 보여 주고, 한 바퀴 돈 뒤 다시 불러올 때(#again)는 시작 화면을 건너뛴다.
// 움직임 줄이기면 커서·확대 없이 남은 흔적 찾기 결과 화면에서 멈춘다.

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches
const again = location.hash === "#again"
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── 사이트와 주고받기 ─────────────────────────────────────────────
let visible = true
let wake = null
addEventListener("message", (e) => {
  if (e.source !== window.parent || e.data?.type !== "robin-demo:visible") return
  visible = e.data.visible
  if (visible) wake?.()
})
const post = (data) => window.parent !== window && window.parent.postMessage(data, location.origin)

/** 창이 보이는 동안만 흐르는 시간 */
async function wait(ms) {
  for (let left = ms; left > 0; left -= 100) {
    while (!visible) await new Promise((r) => (wake = r))
    await sleep(Math.min(left, 100))
  }
}

/** 지금 볼 곳. 요소면 둘레를 조금 넉넉히 잡는다 */
function focus(el, pad = 24) {
  if (!el) return post({ type: "robin-demo:focus", rect: null })
  const r = el.getBoundingClientRect()
  post({
    type: "robin-demo:focus",
    rect: { x: r.x - pad, y: r.y - pad, width: r.width + pad * 2, height: r.height + pad * 2 },
  })
}

/** 대화상자 가운데 열 (확인·완료 화면은 글이 가운데에 모여 있다) */
function focusMiddle(el, width = 440) {
  const r = el.getBoundingClientRect()
  post({ type: "robin-demo:focus", rect: { x: r.x + (r.width - width) / 2, y: r.y, width, height: r.height } })
}

// ── 화면에서 찾기 ─────────────────────────────────────────────────
const shown = (e) => e.getClientRects().length > 0
const name = (e) => (e.getAttribute("aria-label") ?? e.textContent ?? "").trim()
const matches = (e, label) => (label instanceof RegExp ? label.test(name(e)) : name(e) === label)

/** 조건에 맞는 요소가 나올 때까지 기다린다 */
async function until(get, timeout = 10000) {
  const end = Date.now() + timeout
  for (;;) {
    const found = get()
    if (found) return found
    if (Date.now() > end) throw new Error("시연: 화면에서 찾지 못함")
    await sleep(60)
  }
}
const control = (label, root = document) =>
  until(() =>
    [...root.querySelectorAll("button, [role=switch], [role=checkbox], [role=radio]")].find(
      (e) => shown(e) && !e.disabled && matches(e, label),
    ),
  )
const sidebar = (label) => control(label, document.querySelector("[data-sidebar=sidebar]") ?? document)
const dialog = () => until(() => document.querySelector("[data-slot=dialog-content]"))
/** 요소가 든 줄이나 카드 (확대해 볼 곳) */
const block = (el) => el.closest("li, [data-slot=card]") ?? el.parentElement

// ── 커서 ──────────────────────────────────────────────────────────
const cursor = document.createElement("div")
cursor.setAttribute("aria-hidden", "true")
cursor.innerHTML = `<svg width="22" height="28" viewBox="0 0 22 28"><path d="M2 2v20.5l5.2-5 3.6 8.3 3.3-1.4-3.5-8.1H18z" fill="#fff" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/></svg>`
Object.assign(cursor.style, {
  position: "fixed",
  left: "0",
  top: "0",
  zIndex: "2147483647",
  pointerEvents: "none",
  opacity: "0",
  filter: "drop-shadow(0 2px 3px rgb(0 0 0 / 0.5))",
  transition: "opacity 0.3s",
})
const arrow = cursor.firstElementChild
arrow.style.transformOrigin = "2px 2px"
arrow.style.transition = "transform 0.12s"
let at = { x: 1000, y: 700 }
const place = (p, ms) => {
  cursor.style.transition = `opacity 0.3s, transform ${ms}ms cubic-bezier(0.45, 0, 0.2, 1)`
  cursor.style.transform = `translate(${p.x}px, ${p.y}px)`
  at = p
}

/** 요소 가운데(조금 왼쪽 위)로 커서를 옮긴다. 거리만큼 시간이 걸린다 */
async function moveTo(el) {
  const r = el.getBoundingClientRect()
  const p = { x: r.x + Math.min(r.width / 2, 40), y: r.y + r.height / 2 }
  const ms = Math.min(950, 380 + Math.hypot(p.x - at.x, p.y - at.y) * 0.55)
  place(p, ms)
  await wait(ms + 60)
}

/** 눌린 자리에 퍼지는 동그라미 */
function ripple(p) {
  const ring = document.createElement("div")
  Object.assign(ring.style, {
    position: "fixed",
    left: `${p.x - 18}px`,
    top: `${p.y - 18}px`,
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    border: "2px solid rgb(255 255 255 / 0.9)",
    zIndex: "2147483646",
    pointerEvents: "none",
  })
  document.documentElement.append(ring)
  ring
    .animate(
      [
        { transform: "scale(0.3)", opacity: 1 },
        { transform: "scale(1.2)", opacity: 0 },
      ],
      { duration: 480, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
    )
    .finished.then(() => ring.remove())
}

/** 커서를 옮겨 누른다. 앱이 듣는 순서대로 포인터·마우스 이벤트를 보낸 뒤 click */
async function press(el) {
  await moveTo(el)
  arrow.style.transform = "scale(0.82)"
  ripple(at)
  const init = { bubbles: true, cancelable: true, clientX: at.x, clientY: at.y, button: 0, pointerType: "mouse" }
  el.dispatchEvent(new PointerEvent("pointerdown", init))
  el.dispatchEvent(new MouseEvent("mousedown", init))
  await sleep(110)
  el.dispatchEvent(new PointerEvent("pointerup", init))
  el.dispatchEvent(new MouseEvent("mouseup", init))
  el.click()
  arrow.style.transform = ""
  await wait(160)
}

/** 목록 안에서 요소가 보이게 부드럽게 내린다 */
async function reveal(el) {
  el.scrollIntoView({ behavior: "smooth", block: "center" })
  await wait(650)
}

// ── 시작 화면 ─────────────────────────────────────────────────────
async function bootFinished() {
  const splash = () =>
    document.getElementById("boot") ?? document.querySelector('[aria-label="RobinX를 준비하는 중이에요"]')
  await until(() => document.querySelector("[data-sidebar=sidebar]"), 20000)
  while (splash()) {
    // 다시 볼 때는 앱처럼 아무 키나 눌러 건너뛴다 (창이 다 열린 뒤에만 듣는다)
    if (again && window.__bootOpened) dispatchEvent(new KeyboardEvent("keydown", { key: "Shift" }))
    await sleep(120)
  }
  await sleep(reduce ? 0 : 500)
}

// ── 순서 ──────────────────────────────────────────────────────────
async function tour() {
  focus(null)
  document.documentElement.append(cursor)
  place(at, 0)
  await wait(700)
  cursor.style.opacity = "1"

  // 프로그램: 안내를 닫고, 큰 프로그램만 골라 봤다가 되돌린다
  await press(await control("알겠어요"))
  await wait(600)
  await press(await control(/^1 GB 이상/))
  await wait(1300)
  await press(await control(/^전체/))
  await wait(500)

  // 남은 흔적 정리: 방금 지운 프로그램의 흔적을 찾는다
  await press(await sidebar("남은 흔적 정리"))
  await wait(700)
  const find = await control("남은 흔적 찾기")
  focus(block(find), 32)
  await wait(500)
  await press(find)
  const box = await dialog()
  await wait(400)
  focus(box, 8)
  await wait(1700)

  // 직접 확인이 필요한 항목 하나를 골라 함께 정리한다
  const pick = await control(/Roaming\\Forge Interactive\\Pixel Forge 3D 선택$/, box)
  await reveal(pick)
  focus(block(pick), 16)
  await wait(500)
  await press(pick)
  await wait(900)
  focus(box, 8)
  await press(await control("선택 항목 정리", box))
  focusMiddle(box)
  await wait(1300)
  await press(await control("백업하고 정리", box))
  await control("복구 기록 보기", box)
  await wait(1800)
  await press(await until(() => [...box.querySelectorAll("button")].find((b) => b.textContent.trim() === "닫기")))
  focus(null)
  await wait(700)

  // 저장공간: 다시 만들어지는 것만 찾아 보여 준다 (찾은 항목이 하나씩 붙는다)
  await press(await sidebar("저장공간"))
  await wait(400)
  const list = await control("사용자 임시 파일 선택")
  focus(block(list.closest("ul") ?? list), 24)
  await wait(2600)
  focus(null)

  // 시작프로그램: 하나를 끈다
  await press(await sidebar("시작프로그램"))
  await wait(800)
  const toggle = await control("Kite Chat 끄기")
  focus(block(toggle), 16)
  await wait(500)
  await press(toggle)
  await wait(1500)
  focus(null)

  // 복구 기록: 방금 정리한 것이 맨 위에 있고, 되돌릴 수 있다
  await press(await sidebar("복구 기록"))
  await wait(700)
  const undo = await control("정리 되돌리기")
  focus(block(undo), 24)
  await moveTo(undo)
  await wait(2600)

  // 처음부터 (시작 화면은 건너뛴다)
  cursor.style.opacity = "0"
  focus(null)
  await wait(600)
  location.hash = "again"
  location.reload()
}

/** 움직임 줄이기: 커서와 확대 없이 남은 흔적 찾기 결과에서 멈춘다 */
async function still() {
  ;(await sidebar("남은 흔적 정리")).click()
  ;(await control("남은 흔적 찾기")).click()
  focus(await dialog(), 8)
}

export async function runTour() {
  // 시작 화면은 가운데 640px 칸에 글이 왼쪽부터 쌓인다. 좁은 화면에서는 그 칸의 왼쪽(로고와 글)을 본다
  const body = document.querySelector("#boot .tty-body")
  if (body) {
    const r = body.getBoundingClientRect()
    post({ type: "robin-demo:focus", rect: { x: r.x - 16, y: 0, width: 480, height: innerHeight } })
  }
  try {
    await bootFinished()
    await (reduce ? still() : tour())
  } catch (e) {
    // 화면이 바뀌어 단추를 찾지 못하면 그 자리에 멈춘다 (앱은 그대로 보인다)
    cursor.remove()
    console.warn(e)
  }
}
