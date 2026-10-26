// 공유 미리 보기 이미지(1200×630)를 만든다: 로고 + 제목 + 앱 화면.
//   node website/scripts/og.mjs   → website/public/og.png
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

if (!process.env.CHROMIUM_PATH && process.platform === "win32") {
  process.env.CHROMIUM_PATH = String.raw`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`
}
const site = join(dirname(fileURLToPath(import.meta.url)), "..")
const { launch } = await import(pathToFileURL(join(site, "..", "scripts", "ui-mock", "mock.mjs")).href)

const data = (path, type) => `data:${type};base64,${readFileSync(path).toString("base64")}`
const logo = data(join(site, "public", "logo.svg"), "image/svg+xml")
const shot = data(join(site, "public", "shots", "leftovers@2x.webp"), "image/webp")
// 빈 페이지에서는 file:// 글꼴을 읽지 못하므로 data URI로 넣는다
const pretendard = data(
  join(site, "node_modules", "pretendard", "dist", "web", "variable", "woff2", "PretendardVariable.woff2"),
  "font/woff2",
)
const cascadia = data(
  join(site, "node_modules", "@fontsource-variable", "cascadia-code", "files", "cascadia-code-latin-wght-normal.woff2"),
  "font/woff2",
)

// 사이트와 같은 흑백 터미널: 검정 바탕, 왼쪽은 프롬프트처럼 > 로 시작하고 커서로 끝나는 제목, 오른쪽은 창 틀 안의 "남은 흔적" 화면.
const html = `<!doctype html><html><head><style>
@font-face { font-family: C; src: url("${cascadia}") format("woff2"); font-weight: 200 700; }
@font-face { font-family: P; src: url("${pretendard}") format("woff2"); font-weight: 100 900; }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; overflow: hidden; font-family: C, P, monospace; color: #ededed; background: #070707; word-break: keep-all; font-variant-ligatures: none; }
.wrap { position: absolute; left: 72px; top: 0; bottom: 0; width: 540px; display: flex; flex-direction: column; justify-content: center; }
.brand { display: flex; align-items: center; gap: 14px; font-size: 28px; font-weight: 700; }
.brand img { width: 48px; height: 48px; }
h1 { margin-top: 44px; font-size: 76px; line-height: 1.12; font-weight: 700; letter-spacing: -0.02em; }
h1 .p { color: #8f8f8f; font-weight: 400; }
h1 .c { display: inline-block; width: 0.5em; height: 0.95em; margin-left: 0.15em; vertical-align: -0.08em; background: #ededed; }
p { margin-top: 30px; font-size: 25px; line-height: 1.55; color: #a8a8a8; }
.stage { position: absolute; left: 650px; top: 80px; right: 0; bottom: 0; background: #0b0b0b; border: 1px solid rgba(255,255,255,.18); border-right: 0; border-bottom: 0; border-top-left-radius: 4px; overflow: hidden; }
.bar { height: 38px; border-bottom: 1px solid rgba(255,255,255,.1); padding-left: 18px; display: flex; align-items: center; font-size: 15px; color: #8f8f8f; }
.crop { position: absolute; left: 0; top: 38px; right: 0; bottom: 0; overflow: hidden; }
.crop img { position: absolute; width: 1000px; left: -196px; top: -64px; }
</style></head><body>
<div class="wrap">
  <div class="brand"><img src="${logo}">RobinX</div>
  <h1><span class="p">&gt; </span>남은 흔적까지<br>정리해요<span class="c"></span></h1>
  <p>지운 뒤 남은 파일과 레지스트리를 찾아<br>백업하고 정리하는 무료 Windows 앱</p>
</div>
<div class="stage"><div class="bar">RobinX</div><div class="crop"><img src="${shot}"></div></div>
</body></html>`

const browser = await launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await page.setContent(html)
// 폰트와 그림이 다 그려진 뒤에 찍는다
await page.evaluate(async () => {
  await document.fonts.ready
  await Promise.all([...document.images].map((img) => img.decode().catch(() => {})))
})
await page.screenshot({ path: join(site, "public", "og.png") })
await browser.close()
console.log("saved website/public/og.png")
