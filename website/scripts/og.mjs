// 공유 미리 보기 이미지(1200×630)를 만든다: 로고 + 제목 + 앱 화면. 로고(public/logo.png)는 scripts/icons.mjs가 만든다.
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
const logo = data(join(site, "public", "logo.png"), "image/png")
const shot = data(join(site, "public", "shots", "leftovers@2x.webp"), "image/webp")
// 빈 페이지에서는 file:// 글꼴을 읽지 못하므로 data URI로 넣는다
const pretendard = data(
  join(site, "node_modules", "pretendard", "dist", "web", "variable", "woff2", "PretendardVariable.woff2"),
  "font/woff2",
)

// 사이트와 같은 브랜드 V5: 판(#0e1012) 위에 왼쪽은 로고·제목·한 줄, 오른쪽은 앱의 "남은 흔적" 창.
const html = `<!doctype html><html><head><style>
@font-face { font-family: P; src: url("${pretendard}") format("woff2"); font-weight: 100 900; }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; overflow: hidden; font-family: P, sans-serif; color: #e6e7e9; background: #0e1012; word-break: keep-all; }
.wrap { position: absolute; left: 72px; top: 0; bottom: 0; width: 540px; display: flex; flex-direction: column; justify-content: center; }
.brand { display: flex; align-items: center; gap: 14px; font-size: 28px; font-weight: 650; color: #f0f0f0; }
.brand img { width: 48px; height: 48px; }
h1 { margin-top: 44px; font-size: 78px; line-height: 1.08; font-weight: 650; letter-spacing: -0.04em; color: #f0f0f0; }
p { margin-top: 28px; font-size: 25px; line-height: 1.55; color: #8a8e94; }
.stage { position: absolute; left: 650px; top: 80px; right: -14px; bottom: -14px; background: #0f1115; border-radius: 14px; box-shadow: 0 0 0 1px #17191b, inset 0 1px 0 #212428, 0 18px 60px rgb(0 0 0 / 55%); overflow: hidden; }
.crop { position: absolute; inset: 0; overflow: hidden; }
/* 앱의 남은 흔적 창(그림의 x 66, y 91부터)이 카드 왼쪽 위에 맞게 */
.crop img { position: absolute; width: 1000px; left: -74px; top: -102px; }
</style></head><body>
<div class="wrap">
  <div class="brand"><img src="${logo}">RobinX</div>
  <h1>남은 흔적까지<br>정리해요</h1>
  <p>지운 뒤 남은 파일과 레지스트리를 찾아<br>백업하고 정리하는 무료 Windows 앱</p>
</div>
<div class="stage"><div class="crop"><img src="${shot}"></div></div>
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
