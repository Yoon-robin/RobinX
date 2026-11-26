import { cn } from "@/lib/utils"

/**
 * 아이콘이 없는 프로그램·시작 항목의 첫 글자 아이콘.
 * 브랜드 V5의 아이콘 타일: 컨트롤 면(--rk-tile) + 1px 선 위의 흰 글자 (이름마다 색을 바꾸지 않는다).
 */
export function LetterAvatar({ name, className }: { name: string; className?: string }) {
  const letter = [...name.trim()][0]?.toUpperCase() ?? "?"
  return <div className={cn("v5-tile size-9 text-sm font-[650]", className)}>{letter}</div>
}
