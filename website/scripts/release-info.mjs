// 최신 GitHub 릴리스의 설치 파일 정보를 src/lib/release.json에 적는다. 빌드 전에 실행한다 (deploy.sh).
// 사이트의 내려받기 단추가 설치 파일로 바로 이어지고, 버전·크기·SHA-256이 실제 릴리스와 맞게 하려는 것이다.
// iPhone 앱은 Latest로 표시하지 않는 `ios-v` 릴리스라 목록에서 따로 찾아 `ios` 칸에 적는다.
// 가져오지 못한 쪽은 있던 값을 그대로 둔다 (사이트는 그 값이나 릴리스 페이지 주소로 만들어진다).
//
//   node website/scripts/release-info.mjs
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "lib", "release.json")
const API = "https://api.github.com/repos/Yoon-robin/RobinX/releases"

async function get(url) {
  const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } })
  if (!res.ok) throw new Error(`GitHub API ${res.status}`)
  return res.json()
}

const sha256Of = (asset) => (asset.digest?.startsWith("sha256:") ? asset.digest.slice("sha256:".length) : null)

/** "0.2.10" > "0.2.9" (앱의 AppVersion.isNewer와 같은 비교) */
function newer(a, b) {
  const x = a.split(".").map((p) => parseInt(p) || 0)
  const y = b.split(".").map((p) => parseInt(p) || 0)
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0)
  }
  return false
}

let info = {}
try {
  info = JSON.parse(readFileSync(OUT, "utf8"))
} catch {
  // 처음이면 빈 값에서 시작한다
}

try {
  const release = await get(`${API}/latest`)
  const asset = release.assets.find((a) => /_x64-setup\.exe$/.test(a.name))
  if (!asset) throw new Error("설치 파일이 릴리스에 없어요")
  Object.assign(info, {
    version: release.tag_name.replace(/^v/, ""),
    publishedAt: release.published_at,
    pageUrl: release.html_url,
    file: asset.name,
    url: asset.browser_download_url,
    size: asset.size,
    sha256: sha256Of(asset),
  })
  console.log(`릴리스 정보: v${info.version} ${info.file} (${info.size} 바이트)`)
} catch (e) {
  console.warn(`릴리스 정보를 가져오지 못해 있던 값을 써요: ${e.message}`)
}

try {
  // 앱의 새 버전 알림(UpdateChecker.newest)과 같은 규칙: 초안·미리보기가 아니고 ipa가 붙은 ios-v 중 가장 높은 버전
  const releases = await get(`${API}?per_page=100`)
  let best = null
  for (const r of releases) {
    const ipa = r.assets.find((a) => a.name.endsWith(".ipa"))
    if (r.draft || r.prerelease || !r.tag_name.startsWith("ios-v") || !ipa) continue
    const version = r.tag_name.slice("ios-v".length)
    if (!best || newer(version, best.version)) {
      best = {
        version,
        publishedAt: r.published_at,
        pageUrl: r.html_url,
        url: ipa.browser_download_url,
        size: ipa.size,
        sha256: sha256Of(ipa),
      }
    }
  }
  if (!best) throw new Error("iPhone 릴리스가 없어요")
  info.ios = best
  console.log(`iPhone 릴리스 정보: ${best.version} (${best.size} 바이트)`)
} catch (e) {
  console.warn(`iPhone 릴리스 정보를 가져오지 못해 있던 값을 써요: ${e.message}`)
}

writeFileSync(OUT, JSON.stringify(info, null, 2) + "\n")
