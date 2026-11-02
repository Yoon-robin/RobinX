// 최신 GitHub 릴리스의 설치 파일 정보를 src/lib/release.json에 적는다. 빌드 전에 실행한다 (deploy.sh).
// 사이트의 내려받기 단추가 설치 파일로 바로 이어지고, 버전·크기·SHA-256이 실제 릴리스와 맞게 하려는 것이다.
// iPhone 앱은 Latest로 표시하지 않는 `ios-v` 릴리스라 목록에서 따로 찾아 `ios` 칸에 적고,
// 모든 버전을 담은 소스(public/altstore.json)도 만든다.
// 가져오지 못한 쪽은 있던 값을 그대로 둔다 (사이트는 그 값이나 릴리스 페이지 주소로 만들어진다).
//
//   node website/scripts/release-info.mjs
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const SITE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..")
const OUT = join(SITE_DIR, "src", "lib", "release.json")
/** iPhone 앱 소스 (AltStore 형식). LiveContainer·SideStore에 이 주소를 넣으면 앱 안에서 새 버전을 설치할 수 있다 */
const SOURCE = join(SITE_DIR, "public", "altstore.json")
const SITE = "https://yoon-robin.github.io/RobinX/"
const API = "https://api.github.com/repos/Yoon-robin/RobinX/releases"

/** 버전은 새것부터 (LiveContainer는 맨 앞을 최신으로 본다) */
function altSource(versions) {
  const description = "사진 보관함과 직접 고른 폴더에서 중복·비슷한 사진, 큰 동영상, 큰 파일을 찾아 정리해요."
  return {
    name: "RobinX",
    identifier: "com.yoonrobin.robinx.source",
    subtitle: "RobinX iPhone 앱",
    description,
    iconURL: `${SITE}ios-icon.png`,
    website: SITE,
    tintColor: "#FFFFFF",
    apps: [
      {
        name: "RobinX",
        bundleIdentifier: "com.yoonrobin.robinx.ios",
        developerName: "Yoon-robin",
        subtitle: "사진·파일 정리",
        localizedDescription: description,
        iconURL: `${SITE}ios-icon.png`,
        tintColor: "#FFFFFF",
        category: "utilities",
        screenshotURLs: ["ios-summary", "ios-photos", "ios-similar"].map((n) => `${SITE}shots/${n}@2x.webp`),
        versions: versions.map((v) => ({
          version: v.version,
          date: v.publishedAt,
          localizedDescription: v.notes,
          downloadURL: v.url,
          size: v.size,
          minOSVersion: "16.0",
        })),
        appPermissions: {
          entitlements: [],
          privacy: {
            NSPhotoLibraryUsageDescription:
              "중복 사진, 큰 동영상, 스크린샷을 찾아 크기를 보여 주려면 사진 보관함을 읽어야 해요. 지우는 것은 직접 고른 사진뿐이에요.",
          },
        },
      },
    ],
    news: [],
  }
}

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
  // 앱의 새 버전 알림(UpdateChecker.newest)과 같은 규칙: 초안·미리보기가 아니고 ipa가 붙은 ios-v
  const releases = await get(`${API}?per_page=100`)
  const ios = []
  for (const r of releases) {
    const ipa = r.assets.find((a) => a.name.endsWith(".ipa"))
    if (r.draft || r.prerelease || !r.tag_name.startsWith("ios-v") || !ipa) continue
    ios.push({
      version: r.tag_name.slice("ios-v".length),
      publishedAt: r.published_at,
      pageUrl: r.html_url,
      url: ipa.browser_download_url,
      size: ipa.size,
      sha256: sha256Of(ipa),
      notes: r.body ?? "",
    })
  }
  if (ios.length === 0) throw new Error("iPhone 릴리스가 없어요")
  ios.sort((a, b) => (newer(a.version, b.version) ? -1 : newer(b.version, a.version) ? 1 : 0))
  const { notes: _notes, ...best } = ios[0]
  info.ios = best
  writeFileSync(SOURCE, JSON.stringify(altSource(ios), null, 2) + "\n")
  console.log(`iPhone 릴리스 정보: ${best.version} (${best.size} 바이트), 소스 ${ios.length}개 버전`)
} catch (e) {
  console.warn(`iPhone 릴리스 정보를 가져오지 못해 있던 값을 써요: ${e.message}`)
}

writeFileSync(OUT, JSON.stringify(info, null, 2) + "\n")
