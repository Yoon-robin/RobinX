# 브랜드 키트 사본 (Robin V5.1)

이 폴더는 yoonrobin.xyz 저장소 `brand-kit/`의 사본이에요(원본 커밋 `948ec44`, 2026-11-26). 값은 원본에서만 고치고, 바뀌면 세 파일을 다시 복사해요.

| 파일 | 쓰는 곳 |
| --- | --- |
| `robin-ui.css` | 토큰 `--rk-*`(어둡게 기본, `data-theme="light"`면 밝게). `src/index.css`가 읽어서 shadcn 변수(`--background` 등)를 이 값에 잇는다 |
| `tailwind.css` | `bg-rk-card`, `text-rk-soft`, `rounded-rk-chip` 같은 유틸리티 |
| `AGENTS.md` | 화면 규칙(메뉴·표시기, 파란 채움은 한 화면에 하나, 초록·노랑 없음, 글자 단계). 화면을 고치기 전에 읽어요 |

`src/index.css` 끝의 "브랜드 V5 부품" 층(`.v5-note` 안내 상자, `.v5-tile` 아이콘 타일, `.v5-card`, 떠 있는 면·토스트·스위치·메뉴 열림)이 이 값으로 shadcn 부품을 V5 모습으로 덮어요. prettier는 이 폴더를 건드리지 않아요(`.prettierignore`).
