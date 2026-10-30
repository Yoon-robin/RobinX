// 브랜드 키트(docs/brand)의 로고 파일을 만든다: 글로우 워드마크 SVG·PNG, 아이콘 PNG, 프로필 이미지.
// 워드마크는 시작 화면(src/components/startup-splash.tsx의 LOGO)과 같은 5×28 칸이다.
//
//   node scripts/make-brand.mjs      # Windows는 Edge를 자동으로 찾는다. 다른 곳은 CHROMIUM_PATH
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const out = `${root}/docs/brand`
mkdirSync(out, { recursive: true })
const require = createRequire(`${root}/package.json`)
const { chromium } = require("playwright-core")

// 시작 화면과 같은 글자(한 칸 = "██" 두 글자). 시작 화면 코드에서 읽어 와서 어긋나지 않게 한다.
const src = readFileSync(`${root}/src/components/startup-splash.tsx`, "utf8")
const block = src.match(/const LOGO = \[([\s\S]*?)\n\]/)[1]
const rows = [...block.matchAll(/"([^"]*)"/g)].map((m) => m[1])
if (rows.length !== 5) throw new Error("로고 줄 수가 5가 아니에요: " + rows.length)
const cols = Math.max(...rows.map((r) => r.length)) / 2
const grid = rows.map((r) => {
  const padded = r.padEnd(cols * 2, " ")
  return Array.from({ length: cols }, (_, c) => {
    const pair = padded.slice(c * 2, c * 2 + 2)
    if (pair !== "██" && pair !== "  ") throw new Error(`칸이 이상해요: "${pair}"`)
    return pair === "██"
  })
})

const CW = 20, CH = 18, GAP = 2 // 칸 크기와 칸 사이 틈 (시작 화면처럼 칸 경계가 보이게)
const W = cols * CW, H = rows.length * CH
const PAD = 90
const cells = grid
  .flatMap((row, r) => row.map((on, c) => (on ? `<rect x="${c * CW + GAP / 2}" y="${r * CH + GAP / 2}" width="${CW - GAP}" height="${CH - GAP}"/>` : "")))
  .filter(Boolean)
  .join("")

const defs = (id) => `<defs>
    <linearGradient id="ink${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${H}">
      <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#9a9a9a"/>
    </linearGradient>
    <filter id="glow${id}" x="-30%" y="-120%" width="160%" height="340%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceAlpha" stdDeviation="8" result="near"/>
      <feFlood flood-color="#ffffff" flood-opacity="0.30"/><feComposite in2="near" operator="in" result="nearGlow"/>
      <feGaussianBlur in="SourceAlpha" stdDeviation="26" result="far"/>
      <feFlood flood-color="#ffffff" flood-opacity="0.12"/><feComposite in2="far" operator="in" result="farGlow"/>
      <feMerge><feMergeNode in="farGlow"/><feMergeNode in="nearGlow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>`

const wordmark = (glow) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-PAD} ${-PAD} ${W + PAD * 2} ${H + PAD * 2}" width="${W + PAD * 2}" height="${H + PAD * 2}">
  <!-- RobinX 워드마크: 시작 화면 로고와 같은 5줄 × ${cols}칸. 흰색에서 회색으로(위→아래)${glow ? ", 흰 글로우" : ""} -->
  ${defs("")}
  <g fill="url(#ink)" shape-rendering="crispEdges"${glow ? ' filter="url(#glow)"' : ""}>${cells}</g>
</svg>
`
writeFileSync(`${out}/wordmark-glow.svg`, wordmark(true))
writeFileSync(`${out}/wordmark.svg`, wordmark(false))

// 아이콘(타일)은 앱 아이콘 원본을 그대로 쓴다
const icon = readFileSync(`${root}/src-tauri/app-icon.svg`, "utf8")
writeFileSync(`${out}/logo-icon.svg`, icon)

// 프로필 이미지: 검은 바탕 가운데에 R(아이콘의 칸 그대로)을 크게, 글로우와 함께
const R = "M12 12h8v40h-8zM20 12h24v8H20zM44 20h8v8h-8zM20 28h24v8H20zM36 36h8v8h-8zM44 44h8v8h-8z"
const avatar = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <!-- 프로필 이미지: 검정(#0b0b0b) 바탕, 가운데에 R, 흰 글로우. 원형으로 잘려도 R이 남는다 -->
  <defs>
    <linearGradient id="ink" gradientUnits="userSpaceOnUse" x1="0" y1="12" x2="0" y2="52">
      <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#9a9a9a"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceAlpha" stdDeviation="0.9" result="near"/>
      <feFlood flood-color="#ffffff" flood-opacity="0.32"/><feComposite in2="near" operator="in" result="nearGlow"/>
      <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="far"/>
      <feFlood flood-color="#ffffff" flood-opacity="0.14"/><feComposite in2="far" operator="in" result="farGlow"/>
      <feMerge><feMergeNode in="farGlow"/><feMergeNode in="nearGlow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="1024" height="1024" fill="#0b0b0b"/>
  <g transform="translate(512 512) scale(14) translate(-32 -32)">
    <path d="${R}" fill="url(#ink)" shape-rendering="crispEdges" filter="url(#glow)"/>
  </g>
</svg>
`
writeFileSync(`${out}/avatar-glow.svg`, avatar)

// iOS 앱 아이콘: 모서리는 iOS가 깎으므로 바탕을 끝까지 채운다 (투명 없음, 글로우 없음)
const iosIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="ink" gradientUnits="userSpaceOnUse" x1="0" y1="12" x2="0" y2="52">
      <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#9a9a9a"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" fill="#0b0b0b"/>
  <path d="${R}" fill="url(#ink)" shape-rendering="crispEdges"/>
</svg>
`

// PNG로 뽑는다
const executablePath =
  process.env.CHROMIUM_PATH ??
  (process.platform === "win32" ? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" : "/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
const browser = await chromium.launch({ executablePath })
async function png(svg, file, width, height, { transparent = false, background = "#0b0b0b", scale = 1 } = {}) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale })
  await page.setContent(`<!doctype html><body style="margin:0;background:${transparent ? "transparent" : background}">${svg.replace(/<svg /, `<svg style="display:block;width:${width}px;height:${height}px" `)}</body>`)
  await page.screenshot({ path: `${out}/${file}`, omitBackground: transparent })
  await page.close()
}
const wmW = W + PAD * 2, wmH = H + PAD * 2
await png(wordmark(true), "wordmark-glow-black.png", wmW, wmH, { scale: 4 })
await png(wordmark(true), "wordmark-glow-transparent.png", wmW, wmH, { transparent: true, scale: 4 })
await png(icon, "logo-icon-1024.png", 64, 64, { transparent: true, scale: 16 })
await png(avatar, "avatar-glow-1024.png", 1024, 1024)
{
  const page = await browser.newPage({ viewport: { width: 64, height: 64 }, deviceScaleFactor: 16 })
  await page.setContent(`<!doctype html><body style="margin:0;background:#0b0b0b">${iosIcon.replace(/<svg /, '<svg style="display:block;width:64px;height:64px" ')}</body>`)
  await page.screenshot({ path: `${root}/ios/RobinX/Assets.xcassets/AppIcon.appiconset/icon-1024.png` })
  await page.close()
}
await browser.close()
console.log(`칸 ${cols}×${rows.length}, 워드마크 ${wmW}×${wmH}`)
