# RobinX 웹사이트

주소: https://yoon-robin.github.io/RobinX/

소개용 한 페이지. React + Vite + Tailwind CSS v4 + shadcn/ui(메뉴 패널) + Motion, 글꼴은 Cascadia Code(영문·숫자)와 Pretendard(한글).
앱과는 따로 설치하는 별도 프로젝트다 (`website/` 안에서 명령 실행).

```bash
pnpm install
pnpm dev                                   # 개발 서버
pnpm build                                 # dist/ 에 정적 파일
```

배포: 저장소 루트에서 `bash website/scripts/deploy.sh` → 최신 릴리스 정보를 가져와(`scripts/release-info.mjs` → `src/lib/release.json`) `BASE_PATH=/RobinX/`로 빌드해서 `gh-pages` 브랜치에 올린다 (GitHub Actions 안 씀).
앱을 새로 릴리스한 뒤에는 사이트도 다시 배포해야 다운로드 단추·버전·SHA-256이 새 릴리스를 가리킨다.

## 디자인 규칙

흑백 터미널 (2026-10-26, 사용자 요청: 앱의 터미널 모양에 맞추고, 초록색 말고 흑백. 이전의 남색·파란 빛 디자인은 "AI가 만든 것 같다"는 평으로 바꿨다).

- 앱의 터미널 모양(`src/index.css`의 `.terminal.dark`)과 같은 말로 만든다: 검정 바탕(`--background`), 흰 글자, 그 사이 회색만. 색이 있는 것은 앱에서도 색이 있는 상태 표시뿐이다: 직접 확인(호박색 `--review`), 지우기(빨강 `--destructive`).
- 글꼴은 앱과 같은 Cascadia(영문·숫자·기호, 합자 끔)와 Pretendard(한글). 사이트 전체가 이 한 묶음이다.
- 모서리는 거의 각지게(`--radius` 0.2rem). 그림자, 빛 번짐, 글자 그라데이션, 흐린 유리, 둥근 알약 모양은 쓰지 않는다.
- 글은 최소로 (2026-10-26, 사용자 요청: "쓸데없는 설명이 많다, 모션그래픽처럼"). 설명 문단을 두지 않고 움직임으로 보여 준다. 구역 제목 아래 소개 문장, 기능마다 두세 문장, 목록으로 늘어놓은 현황은 다시 넣지 않는다. 기능 설명은 한 줄, FAQ 답은 한두 문장.
- 제목은 앱의 페이지 제목처럼 `> `로 시작하고, 보이면 터미널에 치듯 한 글자씩 나온다(`components/typed.tsx`, 커서 `.caret`이 글자를 따라간다).
- 앱 화면·녹화·예시 조각은 터미널 창 틀(`TermWindow`: 위 막대 + 그림일 뿐인 창 단추)에 담는다.
- 첫 화면: 왼쪽 정렬 제목, 오른쪽에 한 줄과 받기, 그 아래 큰 터미널 창. 창은 앱을 켤 때 나오는 시작 화면(`src/components/startup-splash.tsx`)을 예시 PC 정보(DESKTOP-DEMO)로 다시 보여 주고, 다 적으면 브라운관이 꺼지듯 걷힌 뒤 앱 창이 열리며 남은 흔적을 정리하는 녹화가 이어서 돈다(`boot-replay.tsx`). 멈춘 그림 한 장으로 끝내지 않는다(사용자 의견: "이거만 딸랑 떠서 별로"). 녹화의 재생·일시정지 단추는 창 위 막대에 있고, 녹화를 따로 보여 주는 구역은 두지 않는다. 숫자는 앱 화면 그림의 가짜 응답과 맞춘다(프로그램 14개, 시작 항목 7개 등). 로고는 블록 글자 대신 SVG 칸으로 그린다(글꼴로 그리면 칸 사이에 틈이 보인다).
- 구역 차례: 첫 화면 → 정리 과정(`story.tsx`) → 그 밖의 기능 → 최신 버전 → FAQ → 받기. 위 막대 링크(`nav.tsx`의 `links`)도 이 구역 id를 따른다.
- 정리 과정은 스크롤로 넘기는 장면이다: 화면에 붙은 "남은 흔적" 창 하나가 내려 볼수록 찾기 → 고르기 → 백업 → 정리 → 되돌리기로 바뀐다. 왼쪽에는 지금 단계 이름만 크게. 단계와 말은 앱의 동작과 같게 한다(설치 정보와 연결된 것만 미리 고름, 정리는 백업으로 옮기는 것, 백업이 있는 동안 되돌림, 처음 보관 기간 30일). 창 위쪽은 고정해서 줄이 접혀도 흔들리지 않는다.
- 기능은 선을 같이 쓰는 2칸 격자에 이름과 한 줄, 최신 버전은 "이름 값" 줄로 적은 창 하나, FAQ는 질문만 보이고 누르면 답이 열린다(`[+]`/`[-]`).
- 선은 실제로 나누는 곳에만: 터미널 창 틀과 위 막대, 기능 격자와 그 안 앱 화면의 모서리, 내려갔을 때 위 막대 아래. 구역 사이는 여백과 아주 옅은 바탕(`bg-white/[0.02]`)으로 나눈다.
- 내려받기 단추는 흰 바탕 하나뿐이고 설치 파일로 바로 이어진다. 옆에 버전·크기·지원 환경·미리보기·서명 상태와 릴리스 노트(SHA-256) 링크를 둔다. 보안 경고를 그냥 넘기라고 쓰지 않는다: 공식 릴리스에서 받고 SHA-256을 확인하라고 쓴다.
- 움직임 (모두 움직임 줄이기면 처음부터 제자리, 첫 화면 창은 앱 화면만):
  - 첫 화면 창의 시작 화면 재생(화면에 들어오면 한 번, "시작 화면 다시 보기"로 다시).
  - 제목 타이핑(보이면 한 번).
  - 정리 과정: 스크롤 단계마다 제목 글자가 차례로 올라오고, 창에서는 체크가 그어지고 백업 막대가 차고 줄이 접혔다 다시 펼쳐진다.
  - 기능 칸의 앱 화면이 보이면 아래에서 열린다(잘라 낸 그림은 브라우저가 안 보인다고 여기므로 칸을 기준으로 시작한다). 최신 버전 창의 줄은 한 줄씩 찍힌다. FAQ 답은 높이가 부드럽게 열린다(`::details-content`를 아는 브라우저에서만).
  - 구역 전체가 떠오르는 흔한 움직임은 쓰지 않는다.
- 영상은 창 위 막대에 늘 재생·일시정지 단추가 있고, 화면에 보일 때만 재생하며, 움직임 줄이기면 저절로 재생하지 않는다.
- 글자 크기는 다섯 단계(`text-fine`·`text-body`·`text-lead`·`text-section`·`text-display`)만 쓴다.
- 앱 화면 그림과 영상은 앱의 기본 모양(터미널, 어두운 테마)으로 찍는다 (`scripts/capture.mjs`, `scripts/ui-mock/record-demo.mjs`). 타일 안의 그림은 사이드바를 빼고 내용 부분만 확대해 자른다.
- 쓰지 않는 것: 제목 위 작은 꼬리표, 아이콘 카드 줄, 고객사 로고 줄·후기·수치 같은 꾸민 신뢰 표시, 마우스를 따라오는 빛.
- 앱 화면 조각(`data-ui`가 붙은 요소)은 앱의 모양을 그대로 따른다.
- 문구는 코드와 대조해 사실만 쓴다. 과장, "X가 아니라 Y" 식 대비, 상투어(한곳에, 올인원)는 쓰지 않는다. 화면 속 숫자와 PC 정보는 예시라고 밝힌다.

바꾼 뒤에는 [taste-skill](https://github.com/Leonxlnx/taste-skill)(MIT) 검사기로 확인한다. FAIL이 0개여야 한다. 단, 사용자가 고른 터미널 디자인 때문에 생기는 FAIL은 받아들인다: 고정폭 글꼴(mono), 터미널 창 틀과 테두리 단추(outlined-box). 정적 검사(lint)에서 실제로 나누는 선은 그 줄에 `taste-skill-ignore` 주석을 단다. 그 밖의 FAIL은 고친다.

```bash
git clone --depth 1 https://github.com/Leonxlnx/taste-skill.git "$TEMP/taste-skill"   # 처음 한 번 (저장소에 넣지 않음)
pnpm --dir website build                                                            # BASE_PATH 없이
node "$TEMP/taste-skill/skills/taste-skill/scripts/lint.mjs" website/src
(cd website/dist && node "$TEMP/taste-skill/skills/taste-skill/scripts/inspect.mjs" index.html --out "$TEMP/taste-out")
```

검사기는 지금 폴더를 웹 서버의 뿌리로 쓰므로 `website/dist` 안에서 실행해야 한다(밖에서 실행하면 `/assets/...`를 못 찾아 빈 페이지로 검사한다).
1440·768·390px 화면을 `$TEMP/taste-out`에 찍는다. 눈으로도 본다.

## 앱 화면 (public/shots)

실제 PC의 프로그램 이름이 드러나지 않도록 **가상의 프로그램**을 가짜 응답으로 넣어 캡처한다.
앱 화면이 바뀌면 저장소 루트에서 다시 찍는다.

```bash
pnpm exec vite --port 1420 --strictPort        # 앱 개발 서버 (pnpm tauri dev 중이면 생략)
node website/scripts/capture.mjs               # 서버가 localhost(::1)에만 열리면 UI_MOCK_URL=http://localhost:1420/
```

앱의 시작 화면은 몇 초 걸려서 `scripts/ui-mock/mock.mjs`가 창이 열리면 키를 눌러 건너뛴다. 시작 화면을 찍으려면 `UI_MOCK_KEEP_BOOT=1`.

## 앱 녹화 (public/demo)

"제거한 뒤 정리하는 장면" 영상(소리 없음, 반복)과 포스터. 가짜 응답(테스트 앱 Fixture Notes)으로만 찍는다.

```bash
pnpm exec vite --port 1420 --strictPort                      # 앱 개발 서버
node node_modules/playwright-core/cli.js install ffmpeg      # 처음 한 번
CHROMIUM_PATH=<chrome.exe> node scripts/ui-mock/record-demo.mjs   # 앞부분을 잘라 VP9로 다시 인코딩 (휴대폰용 대화창만 자른 영상도 함께)
```

## 공유 이미지 (public/og.png)

첫 화면과 같은 구성(흑백, `> ` 제목과 커서, 창 틀 안의 앱 화면)의 1200×630 그림. 바꾸면 `index.html`의 `og:image` 주소 뒤 `?v=` 숫자를 올려 SNS가 다시 받게 한다.

```bash
node website/scripts/og.mjs                    # Windows는 Edge를 자동으로 찾는다. 다른 곳은 CHROMIUM_PATH
```
