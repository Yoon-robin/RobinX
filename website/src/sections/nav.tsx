import { useEffect, useRef, useState } from "react"
import { Download, Menu } from "lucide-react"

import { RELEASE, REPO_URL } from "@/lib/site"
import { Logo } from "@/components/logo"
import { GithubIcon } from "@/components/github-icon"
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export const links = [
  { href: "#story", label: "정리 과정" },
  { href: "#features", label: "기능" },
  { href: "#iphone", label: "iPhone" },
  { href: "#status", label: "최신 버전" },
  { href: "#faq", label: "FAQ" },
]

/** 앵커로 이동하고 그 구역에 포커스를 둔다 (스크린리더·키보드 사용자가 이어서 읽도록) */
function goTo(href: string) {
  const el = document.querySelector<HTMLElement>(href)
  if (!el) return
  history.pushState(null, "", href)
  el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })
  if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1")
  el.focus({ preventScroll: true })
}

/**
 * 위에 붙는 막대: 왼쪽 이름과 링크, 오른쪽 GitHub 아이콘과 다운로드. 지금 보는 구역의 링크는 고른 줄 면(--rk-chosen).
 * 맨 위에서는 투명하고, 내려가면 불투명한 바탕과 아래 선을 깔아 글자 위에서도 읽힌다.
 */
export function Nav() {
  // 구역을 JS로 그려서, `/#faq`처럼 구역 주소로 열면 브라우저가 대상을 못 찾고 맨 위에 머문다. 그린 뒤에 직접 옮긴다.
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1))
    const el = id ? document.getElementById(id) : null
    if (!el) return
    // 글꼴·그림이 늦게 들어오면 위쪽 높이가 바뀌므로 몇 번 더 맞춘다. 사용자가 먼저 스크롤하면 그만둔다.
    let stopped = false
    const stop = () => (stopped = true)
    const align = () => !stopped && el.scrollIntoView({ behavior: "auto" })
    const opts = { passive: true, once: true }
    addEventListener("wheel", stop, opts)
    addEventListener("touchstart", stop, opts)
    addEventListener("keydown", stop, opts)
    requestAnimationFrame(align)
    document.fonts.ready.then(align)
    addEventListener("load", align, { once: true })
    const timers = [400, 1200].map((ms) => setTimeout(align, ms))
    return () => {
      stopped = true
      timers.forEach(clearTimeout)
      removeEventListener("wheel", stop)
      removeEventListener("touchstart", stop)
      removeEventListener("keydown", stop)
    }
  }, [])

  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pendingTarget = useRef<string | null>(null)
  // 지금 보고 있는 구역 (메뉴에 표시)
  const [current, setCurrent] = useState<string | null>(null)
  useEffect(() => {
    const sections = links
      .map((l) => document.querySelector<HTMLElement>(l.href))
      .filter((el): el is HTMLElement => el != null)
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setCurrent("#" + e.target.id)
      },
      // 화면 위쪽 1/3 띠에 걸친 구역을 지금 구역으로 본다
      { rootMargin: "-30% 0px -60% 0px" },
    )
    sections.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div
      className={
        "fixed inset-x-0 top-0 z-30 border-b transition-colors duration-200 " +
        // 내려가면 불투명하게: 반투명이면 뒤로 지나가는 글자가 메뉴 글자에 겹쳐 비쳤다
        (scrolled ? "border-rk-line bg-rk-page" : "border-transparent bg-rk-page/0")
      }
    >
      <header className="frame relative flex h-14 items-center gap-3 sm:h-16 sm:gap-6">
        <a href="#top" className="flex items-center gap-2.5 text-body font-[650] text-rk-head">
          <Logo className="size-7" />
          RobinX
        </a>
        <nav aria-label="페이지 메뉴" className="ml-6 hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              aria-current={current === l.href ? "true" : undefined}
              className="inline-flex h-8 items-center rounded-md px-3 text-[14px] font-[550] text-rk-soft transition-colors duration-150 hover:bg-rk-hover hover:text-rk-text aria-[current]:bg-rk-chosen aria-[current]:text-rk-head"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub에서 소스 보기"
          className="ml-auto hidden size-10 items-center justify-center rounded-md text-rk-soft transition-colors duration-150 hover:bg-rk-hover hover:text-rk-head sm:inline-flex"
        >
          <GithubIcon className="size-5" />
        </a>
        <a
          href={RELEASE.downloadUrl}
          // 파란 채움은 첫 화면의 받기 단추 하나라, 막대의 받기는 보통 단추
          className="rk-btn press ml-auto h-9 gap-2 px-3.5 text-[14px] sm:ml-0"
        >
          <Download className="size-4" aria-hidden />
          {/* 휴대폰에서 누르면 Windows 설치 파일을 받으므로 그걸 밝힌다 */}
          <span className="sm:hidden">Windows용</span>
          <span className="hidden sm:inline">다운로드</span>
        </a>

        {/* 좁은 화면: 메뉴 버튼 → 옆에서 나오는 패널 */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="메뉴 열기"
              className="-mr-2 inline-flex size-11 items-center justify-center rounded-md text-rk-text transition-colors duration-150 hover:bg-rk-hover lg:hidden"
            >
              <Menu className="size-5" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-72 border-l border-rk-line bg-rk-side p-5"
            onCloseAutoFocus={(e) => {
              const href = pendingTarget.current
              if (!href) return
              pendingTarget.current = null
              e.preventDefault()
              goTo(href)
            }}
          >
            <SheetTitle className="flex items-center gap-2.5 text-body font-[650] text-rk-head">
              <Logo className="size-7" />
              RobinX
            </SheetTitle>
            <SheetDescription className="sr-only">페이지 안의 다른 부분으로 이동해요</SheetDescription>
            <nav aria-label="페이지 메뉴" className="mt-5 flex flex-col gap-1">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={(e) => {
                    // 패널이 닫히면서 포커스가 메뉴 버튼으로 돌아가지 않도록, 닫힌 뒤 목적지로 옮긴다
                    e.preventDefault()
                    setMenuOpen(false)
                    pendingTarget.current = l.href
                  }}
                  aria-current={current === l.href ? "true" : undefined}
                  className="flex h-11 items-center rounded-md px-3 text-body font-[550] text-rk-soft transition-colors duration-150 hover:bg-rk-hover hover:text-rk-text aria-[current]:bg-rk-chosen aria-[current]:text-rk-head"
                >
                  {l.label}
                </a>
              ))}
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex h-11 items-center gap-2.5 border-t border-rk-line px-3 pt-1 text-body font-[550] text-rk-soft transition-colors duration-150 hover:text-rk-head"
              >
                <GithubIcon className="size-5" />
                GitHub
              </a>
            </nav>
          </SheetContent>
        </Sheet>
      </header>
    </div>
  )
}
