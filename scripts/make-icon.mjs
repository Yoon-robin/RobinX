// 앱 아이콘(브랜드 V5의 브랜드 칸 표: 짙은 표 위의 흰 R과 파란 번짐)을 그려 src-tauri/icons/를 다시 만든다.
//   node scripts/make-icon.mjs      # Windows는 Edge를 자동으로 찾는다. 다른 곳은 CHROMIUM_PATH
// R은 Pretendard Black(node_modules/pretendard)으로 그린다. 그림은 src-tauri/app-icon.png(1024)에 두고 `tauri icon`에 넘긴다.
import { execSync } from "node:child_process"
import { copyFileSync, existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { chromium } from "playwright-core"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const font = pathToFileURL(join(root, "node_modules/pretendard/dist/web/static/woff2/Pretendard-Black.woff2")).href
const png = join(root, "src-tauri/app-icon.png")
const executablePath =
  process.env.CHROMIUM_PATH ??
  (process.platform === "win32" ? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" : undefined)

// 값은 src/brand-kit/robin-ui.css: --rk-mark #060a14, 파란 번짐 rgb(75 125 254 / 90%) (글자 15px에 10px 번짐의 비율)
const html = `<!doctype html><style>
@font-face { font-family: P; src: url("${font}") format("woff2"); font-weight: 900; }
html, body { margin: 0; background: transparent; }
.tile { width: 1024px; height: 1024px; border-radius: 232px; background: #060a14; box-sizing: border-box;
  border: 6px solid #1a1f2b; display: grid; place-items: center; }
.r { font: 900 600px/1 P; color: #fff; letter-spacing: -0.02em; margin-top: 8px;
  text-shadow: 0 0 120px rgb(75 125 254 / 90%), 0 0 40px rgb(75 125 254 / 55%); }
</style><div class="tile"><span class="r">R</span></div>`

const browser = await chromium.launch({ executablePath })
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } })
await page.setContent(html)
await page.evaluate(() => document.fonts.ready)
await page.locator(".tile").screenshot({ path: png, omitBackground: true })
await browser.close()
console.log("saved", png)

// tauri icon은 android·ios 폴더도 만든다. 이 앱은 Windows용이라 임시 폴더에 만든 뒤 원래 있던 파일만 옮긴다.
const icons = join(root, "src-tauri/icons")
const tmp = mkdtempSync(join(tmpdir(), "robinx-icon-"))
execSync(`pnpm tauri icon "${png}" --output "${tmp}"`, { cwd: root, stdio: "inherit" })
for (const name of readdirSync(icons)) {
  if (existsSync(join(tmp, name))) copyFileSync(join(tmp, name), join(icons, name))
}
rmSync(tmp, { recursive: true, force: true })
console.log("updated", icons)
