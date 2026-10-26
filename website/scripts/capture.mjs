// 웹사이트에 넣을 앱 화면을 만든다. 실제 PC 정보가 아니라 **가상의 프로그램**을 가짜 응답으로 넣어 캡처한다.
//
//   (저장소 루트에서) pnpm exec vite --port 1420 --strictPort    # 앱 개발 서버 (pnpm tauri dev 중이면 생략)
//   node website/scripts/capture.mjs                              # → website/public/shots/*.webp
//
// Windows에서는 Edge를 쓴다. 다른 브라우저는 CHROMIUM_PATH로 지정한다.
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

if (!process.env.CHROMIUM_PATH && process.platform === "win32") {
  process.env.CHROMIUM_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
}
const { launch, openApp } = await import("../../scripts/ui-mock/mock.mjs")

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "shots")
mkdirSync(out, { recursive: true })

const { appList, icons, removed, leftovers, backups, startup, storage } = await import("../app-demo/data.mjs")

const overrides = {
  list_installed_apps: appList,
  measure_app_sizes: {},
  get_app_icon: `(args) => (${JSON.stringify(icons)})[args.id] ?? null`,
  scan_leftovers: leftovers,
  recently_removed: [removed],
  list_backups: backups,
  backup_usage: { count: 3, bytes: 264_400_000, expired: 0 },
  list_startup_items: startup,
  scan_storage: storage,
  disk_usage: { drive: "C:\\", total: 1_000e9, free: 214e9 },
}

const browser = await launch()
// PNG보다 가벼운 WebP로 저장한다. 브라우저의 canvas 인코더를 쓰므로 따로 설치할 것이 없다.
// 글자가 많은 화면이라 품질은 높게 둔다. 2배로 찍어 <name>@2x.webp(2560×1600)와,
// 그것을 줄인 <name>.webp(1280×800)를 만든다 (사이트는 화면 배율에 따라 srcset으로 고른다).
const encoder = await browser.newPage()
const shot = async (name, page) => {
  const png = await page.screenshot()
  const [big, small] = await encoder.evaluate(
    async (src) => {
      const img = new Image()
      img.src = src
      await img.decode()
      const encode = (scale) => {
        const canvas = document.createElement("canvas")
        canvas.width = img.naturalWidth * scale
        canvas.height = img.naturalHeight * scale
        const ctx = canvas.getContext("2d")
        ctx.imageSmoothingQuality = "high"
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        return canvas.toDataURL("image/webp", 0.9).split(",")[1]
      }
      return [encode(1), encode(0.5)]
    },
    `data:image/png;base64,${png.toString("base64")}`,
  )
  writeFileSync(join(out, `${name}@2x.webp`), Buffer.from(big, "base64"))
  writeFileSync(join(out, `${name}.webp`), Buffer.from(small, "base64"))
  console.log("saved", `website/public/shots/${name}.webp, ${name}@2x.webp`)
}
const nav = async (page, name) => {
  await page.getByRole("button", { name, exact: true }).first().click()
  await page.waitForTimeout(1600)
}

// 사이트가 어두운 바탕이라 앱도 어두운 테마로 찍는다 (CAPTURE_SCHEME=light로 바꿀 수 있다)
const page = await openApp(browser, {
  overrides,
  width: 1280,
  height: 800,
  scale: 2,
  scheme: process.env.CAPTURE_SCHEME ?? "dark",
})
await page.waitForTimeout(2500)
await shot("programs", page)

await nav(page, "남은 흔적 정리")
await page
  .getByRole("button", { name: /남은 흔적 찾기/ })
  .first()
  .click()
await page.waitForTimeout(2200)
await shot("leftovers", page)
await page.keyboard.press("Escape")
await page.waitForTimeout(500)

await nav(page, "복구 기록")
await page.waitForTimeout(900)
await shot("restore", page)

await nav(page, "시작프로그램")
await page.waitForTimeout(1200)
await shot("startup", page)

await nav(page, "저장공간")
await page.waitForTimeout(1800)
await shot("storage", page)

await browser.close()
