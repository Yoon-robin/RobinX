// 사이트 아이콘을 앱 아이콘 그림(src-tauri/app-icon.png, 저장소 scripts/make-icon.mjs가 만든 1024 타일)에서 만든다.
//   node website/scripts/icons.mjs   → website/public/logo.png(256, 모서리 투명), apple-touch-icon.png(180, 모서리까지 채움)
// iPhone은 홈 화면 아이콘의 모서리를 스스로 둥글게 자르므로 apple-touch-icon은 투명한 곳 없이 표 색으로 채운다.
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

if (!process.env.CHROMIUM_PATH && process.platform === "win32") {
  process.env.CHROMIUM_PATH = String.raw`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`
}
const site = join(dirname(fileURLToPath(import.meta.url)), "..")
const { launch } = await import(pathToFileURL(join(site, "..", "scripts", "ui-mock", "mock.mjs")).href)
const src = `data:image/png;base64,${readFileSync(join(site, "..", "src-tauri", "app-icon.png")).toString("base64")}`

const browser = await launch()
const page = await browser.newPage()
const make = (size, fill) =>
  page.evaluate(
    async ({ src, size, fill }) => {
      const img = new Image()
      img.src = src
      await img.decode()
      const canvas = document.createElement("canvas")
      canvas.width = canvas.height = size
      const ctx = canvas.getContext("2d")
      ctx.imageSmoothingQuality = "high"
      if (fill) {
        ctx.fillStyle = fill
        ctx.fillRect(0, 0, size, size)
      }
      ctx.drawImage(img, 0, 0, size, size)
      return canvas.toDataURL("image/png").split(",")[1]
    },
    { src, size, fill },
  )
writeFileSync(join(site, "public", "logo.png"), Buffer.from(await make(256, null), "base64"))
writeFileSync(join(site, "public", "apple-touch-icon.png"), Buffer.from(await make(180, "#060a14"), "base64"))
await browser.close()
console.log("saved website/public/logo.png, apple-touch-icon.png")
