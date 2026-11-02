import release from "./release.json"

export const REPO_URL = "https://github.com/Yoon-robin/RobinX"
/** 가장 최근 릴리스 페이지 (릴리스 노트, 파일별 SHA-256) */
export const RELEASES_URL = `${REPO_URL}/releases/latest`

/**
 * 최신 릴리스의 설치 파일. 빌드할 때 scripts/release-info.mjs가 GitHub에서 가져와 release.json에 적는다.
 * 그 값이 없으면 릴리스 페이지로 보낸다.
 */
export const RELEASE = {
  version: release.version as string,
  /** 설치 파일을 바로 받는 주소 */
  downloadUrl: (release.url as string | undefined) ?? RELEASES_URL,
  pageUrl: (release.pageUrl as string | undefined) ?? RELEASES_URL,
  file: release.file as string,
  sizeMb: Math.round(((release.size as number) / 1024 / 1024) * 10) / 10,
  sha256: release.sha256 as string | null,
  publishedAt: new Date(release.publishedAt as string),
}

/**
 * iPhone 앱의 최신 ipa (`ios-v` 릴리스, Latest로 표시하지 않는다). 값이 없으면 릴리스 목록으로 보낸다.
 */
const ios = release.ios as
  | { version: string; pageUrl: string; url: string; size: number; sha256: string | null }
  | undefined
export const IOS_RELEASE = {
  version: ios?.version ?? null,
  downloadUrl: ios?.url ?? `${REPO_URL}/releases`,
  pageUrl: ios?.pageUrl ?? `${REPO_URL}/releases`,
  sizeMb: ios ? Math.round((ios.size / 1024 / 1024) * 10) / 10 : null,
}

/** iPhone 앱 소스 (scripts/release-info.mjs가 만든다). 늘 배포된 주소를 쓴다: LiveContainer가 iPhone에서 읽는다 */
export const IOS_SOURCE_URL = "https://yoon-robin.github.io/RobinX/altstore.json"
/** LiveContainer가 열리며 소스 추가를 묻는다 (LiveContainer의 `livecontainer://source?url=`) */
export const IOS_SOURCE_ADD = `livecontainer://source?url=${encodeURIComponent(IOS_SOURCE_URL)}`

/** 픽셀 R 로고. PNG를 줄이면 칸 모서리가 흐려져서 SVG를 쓴다 */
export const LOGO = `${import.meta.env.BASE_URL}logo.svg`
export const shot = (name: string) => `${import.meta.env.BASE_URL}shots/${name}.webp`
/** 고해상도 화면(배율 2 근처)에는 2배로 찍은 그림을 준다 (website/scripts/capture.mjs) */
export const shotSrcSet = (name: string) => `${shot(name)} 1x, ${import.meta.env.BASE_URL}shots/${name}@2x.webp 2x`
