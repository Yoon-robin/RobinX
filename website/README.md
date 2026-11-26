# RobinX 웹사이트

주소: https://yoon-robin.github.io/RobinX/

소개용 한 페이지. React + Vite + Tailwind CSS v4 + shadcn/ui(메뉴 패널) + Motion, 글꼴은 Pretendard 하나.
앱과는 따로 설치하는 별도 프로젝트다 (`website/` 안에서 명령 실행).

```bash
pnpm install
pnpm dev                                   # 개발 서버
pnpm build                                 # dist/ 에 정적 파일
```

배포: 저장소 루트에서 `bash website/scripts/deploy.sh` → 최신 릴리스 정보를 가져와(`scripts/release-info.mjs` → `src/lib/release.json`) `BASE_PATH=/RobinX/`로 빌드해서 `gh-pages` 브랜치에 올린다 (GitHub Actions 안 씀).
앱을 새로 릴리스한 뒤에는 사이트도 다시 배포해야 다운로드 단추·버전·SHA-256이 새 릴리스를 가리킨다.

## 디자인 규칙

Robin 브랜드 V5.1 (2026-11-26, 사용자 요청: 앱과 같은 V5로. 그 전의 흑백 터미널은 docs/LOOP.md 기록에). 값과 규칙의 원본은 yoonrobin.xyz의 `docs/brand.md`·`brand-kit/`이고, 사이트는 앱의 사본 `../src/brand-kit/`을 **그대로 읽는다**(`src/index.css`의 `@import`, 따로 사본을 두지 않는다). 규칙은 `../src/brand-kit/AGENTS.md`가 이긴다. 이 사이트에만 있는 것:

- 면은 앱과 같은 셋: 판 `--rk-page`(바탕), 카드 `--rk-card`(창·격자·질문), 옆 기둥 `--rk-side`(최신 버전 띠·바닥). 1px 선 `--rk-line`으로 나눈다. 흐림·유리·그라데이션 면은 없다. 어두운 테마 하나다(사이트에는 테마 단추가 없다).
- 강조색은 파랑 하나. 파란 채움 단추는 설치 파일을 받는 단추뿐이다(첫 화면과 맨 아래). 위 막대의 받기, 정리 과정, 소스 보기, iPhone 단추는 보통 컨트롤(`rk-btn`).
- 상태는 표시기 칩(`rk-chip`, 짙은 면 + 왼쪽 짧은 색 막대): 하는 중·끝남은 `data-tone="on"`(파랑), 직접 확인은 `note`(살구색). 초록·노랑은 쓰지 않는다. 이유처럼 상태가 아닌 것은 꼬리표(`rk-tag`).
- 글꼴은 Pretendard, 굵기 450/550/650. 고정폭(`--rk-mono`)은 `<code>`(SHA-256, 소스 주소)에만. 제목은 큰 Pretendard 650에 자간을 좁힌다(`.display`·`.section-title`). 제목 위 꼬리표, `> ` 프롬프트, 타자 커서는 쓰지 않는다.
- 모서리: 컨트롤 7, 칩·꼬리표 5~6, 카드 12, 창 14(`.window`). 알약은 표시기에만.
- 글은 최소로 (2026-10-26, 사용자 요청: "쓸데없는 설명이 많다, 모션그래픽처럼"). 설명 문단을 두지 않고 움직임으로 보여 준다. 구역 제목 아래 소개 문장, 기능마다 두세 문장, 목록으로 늘어놓은 현황은 다시 넣지 않는다. 기능 설명은 한 줄, FAQ 답은 한두 문장.
- 앱 화면·예시 조각은 창(`AppWindow`: 카드 면, 위에 제목 줄)에 담는다. 앱의 창 단추를 흉내 내지 않는다.
- 첫 화면: 왼쪽 정렬 제목, 오른쪽에 한 줄과 받기, 그 아래 큰 창. 창에서는 **실제 앱**이 돈다: 앱의 화면 코드(`src/`)를 그대로 빌드하고 엔진 대신 가짜 응답을 붙인 것(`app-demo/`)을 iframe으로 띄운다(`components/app-demo.tsx`). 앱의 시작 화면이 끝나면 커서가 저절로 눌러 가며 남은 흔적 찾기 → 백업하고 정리 → 저장공간 → 시작프로그램 → 복구 기록을 보여 주고(`app-demo/tour.js`), 창은 앱이 알려 주는 볼 곳으로 확대해 따라간다. 한 바퀴 돌면 시작 화면부터 다시 돈다(앱처럼 시작 화면은 건너뛸 수 없다). 멈춘 그림 한 장("이거만 딸랑 떠서 별로"), 녹화 영상("영상 별로"), 앱을 흉내 낸 그림은 쓰지 않는다. 일시정지 같은 단추는 두지 않고(사용자 요청), 창은 누를 수 없다(`inert`). 창이 화면에서 벗어나면 다음 동작을 미룬다. 프로그램과 PC 정보는 예시(`app-demo/`의 가짜 PC, 프로그램은 앱 화면 그림과 같다)라고 밝힌다. 이 시연이 페이지에서 가장 눈에 띄는 것 하나이고, 나머지는 조용하게 둔다.
- 구역 차례: 첫 화면 → 정리 과정(`story.tsx`) → 그 밖의 기능 → iPhone 앱(`iphone.tsx`) → 최신 버전 → FAQ → 받기. 위 막대 링크(`nav.tsx`의 `links`)도 이 구역 id를 따르고, 지금 보는 구역의 링크는 고른 줄 면(`--rk-chosen`)이다.
- 정리 과정은 스크롤로 넘기는 장면이다: 화면에 붙은 "남은 흔적" 창 하나가 내려 볼수록 찾기 → 고르기 → 백업 → 정리 → 되돌리기로 바뀐다. 왼쪽에는 단계 묶음(지금 단계는 고른 줄 면)과 지금 단계 이름만 크게. 단계와 말은 앱의 동작과 같게 한다(설치 정보와 연결된 것만 미리 고름, 정리는 백업으로 옮기는 것, 백업이 있는 동안 되돌림, 처음 보관 기간 30일). 창 위쪽은 고정해서 줄이 접혀도 흔들리지 않는다. 체크 상자는 키트 `rk-check` 모양, 백업 막대는 3px `rk-meter`.
- 기능은 카드 하나를 1px 선으로 나눈 2칸 격자에 이름과 한 줄, 최신 버전은 카드 줄("이름 값") 창 하나, FAQ는 카드 안의 줄로 질문만 보이고 누르면 꺾쇠가 돌며 답이 열린다.
- 위 막대는 내려가면 불투명하다(반투명이면 뒤로 지나가는 글자가 메뉴에 겹쳐 비친다).
- iPhone 앱은 하는 일 네 줄, 앱 화면 세 장(카드 모서리와 선만, 휴대폰 틀 그림은 쓰지 않는다), 보통 단추 "LiveContainer에 소스 추가"·"ipa 받기"와 사실 줄(App Store에 없음, 서명 없는 ipa라 설치 앱이 필요함, 어디까지 확인했는지). 화면 속 사진과 숫자는 예시라고 밝힌다. 화면 그림은 iPhone 앱 자체의 모습이다(그 앱은 따로 릴리스한다).
- 내려받기 단추는 설치 파일로 바로 이어진다. 옆에 버전·크기·지원 환경·미리보기·서명 상태와 릴리스 노트(SHA-256) 링크를 둔다. 보안 경고를 그냥 넘기라고 쓰지 않는다: 공식 릴리스에서 받고 SHA-256을 확인하라고 쓴다.
- 움직임 (모두 움직임 줄이기면 처음부터 제자리, 첫 화면 창은 커서·확대 없이 남은 흔적 찾기 결과에서 멈춘다):
  - 첫 화면 창의 실제 앱 시연(커서가 누르고, 창이 볼 곳으로 0.9초 동안 확대·이동한다). 좁은 화면에서는 늘 조금 확대하고, 넓은 목록은 이름이 보이게 왼쪽에 맞춘다.
  - 첫 화면 제목과 오른쪽 칸이 처음 한 번 짧게 떠오른다(0.6~0.7초).
  - 정리 과정: 스크롤 단계마다 제목 낱말이 차례로 올라오고, 창에서는 체크가 그어지고 백업 막대가 차고 줄이 접혔다 다시 펼쳐진다.
  - 기능 칸의 앱 화면이 보이면 아래에서 열린다(잘라 낸 그림은 브라우저가 안 보인다고 여기므로 칸을 기준으로 시작한다). 최신 버전 창의 줄은 한 줄씩 찍힌다. FAQ 답은 높이가 부드럽게 열린다(`::details-content`를 아는 브라우저에서만).
  - 누르면 0.97배로 줄었다 돌아온다(`.press`, V5.1: 160ms·200ms).
  - 구역 전체가 떠오르는 흔한 움직임은 쓰지 않는다.
- 글자 크기는 다섯 단계(`text-fine` 13·`text-body` 16·`text-lead` 19·`text-section`·`text-display`)만 쓴다. 위 막대 링크와 단추 안 글자만 키트의 14.
- 앱 화면 그림은 앱의 어두운 테마로 찍는다 (`scripts/capture.mjs`). 타일 안의 그림은 사이드바를 빼고 내용 부분만 확대해 자른다. 앱 창의 가장 작은 크기(900 폭)로 찍는다: 넓은 창을 줄여 넣으면 칸 안의 글자를 읽을 수 없었다(휴대폰에서 5px쯤). 좁은 창은 앱이 그 폭에 맞게 배치하므로 내용 폭이 통째로 들어가고 오른쪽이 잘리지 않는다. 앱 화면 배치가 바뀌면 `features.tsx`의 `crop`(보여 줄 곳의 위쪽)도 맞춘다.
- 쓰지 않는 것: 제목 위 작은 꼬리표, 아이콘 카드 줄, 고객사 로고 줄·후기·수치 같은 꾸민 신뢰 표시, 마우스를 따라오는 빛.
- 앱 화면 조각(`data-ui`가 붙은 요소)은 앱의 모양을 그대로 따른다.
- 문구는 코드와 대조해 사실만 쓴다. 과장, "X가 아니라 Y" 식 대비, 상투어(한곳에, 올인원)는 쓰지 않는다. 화면 속 숫자와 PC 정보는 예시라고 밝힌다.

바꾼 뒤에는 키트의 확인 방법(`../src/brand-kit/AGENTS.md` "확인")대로 본다: 1440·390px로 구역마다 찍어 눈으로 보고, 보이는 요소마다 `getComputedStyle`로 흐림(`backdrop-filter`), 초록·노랑(색상각 40~170), 컨트롤의 알약 모서리, `<code>` 밖의 고정폭 글꼴을 세어 0이 될 때까지 고친다. 가로 넘침(`scrollWidth - innerWidth`)도 0이어야 한다. (그 전에 쓰던 taste-skill 검사기는 흑백 터미널 디자인에 맞춘 예외가 많아 V5부터 쓰지 않는다.)

## 앱 화면 (public/shots)

실제 PC의 프로그램 이름이 드러나지 않도록 **가상의 프로그램**을 가짜 응답으로 넣어 캡처한다.
앱 화면이 바뀌면 저장소 루트에서 다시 찍는다.

```bash
pnpm exec vite --port 1420 --strictPort        # 앱 개발 서버 (pnpm tauri dev 중이면 생략)
node website/scripts/capture.mjs               # 서버가 localhost(::1)에만 열리면 UI_MOCK_URL=http://localhost:1420/
```

앱의 시작 화면은 몇 초 걸려서 `scripts/ui-mock/mock.mjs`가 창이 열리면 키를 눌러 건너뛴다. 시작 화면을 찍으려면 `UI_MOCK_KEEP_BOOT=1`.

## 첫 화면의 실제 앱 시연 (public/app)

앱의 화면 코드를 그대로 빌드해 `public/app/`에 둔다(저장소에 넣지 않음). 배포할 때(`scripts/deploy.sh`) 먼저 만든다.
사이트 개발 서버로 볼 때도 한 번 만들어 둔다. 앱 화면이나 `app-demo/`를 바꾸면 다시 만든다.

```bash
pnpm exec vite build --config website/app-demo/vite.config.mjs   # 저장소 루트에서
```

- `app-demo/demo.js`: 가짜 응답(엔진 대신). 실제 PC를 읽지 않는다. 앱이 저장하는 설정은 사이트 저장소에 남지 않게 메모리에만 둔다.
- `app-demo/tour.js`: 누르는 순서. 화면의 단추를 이름(`aria-label`이나 글자)으로 찾으므로, 앱에서 단추 이름을 바꾸면 여기도 고친다. 찾지 못하면 그 자리에서 멈춘다.
- `app-demo/data.mjs`: 가상의 프로그램·흔적·백업·시작 항목·저장공간. 앱 화면 그림(`scripts/capture.mjs`)과 같이 쓴다.

## iPhone 앱 화면 (public/shots/ios-*)

iOS CI가 시뮬레이터에서 가짜 자료(`-demo YES`)로 찍은 화면을 쓴다. 상태 막대를 잘라 webp로 만든다. 앱 화면이 바뀌면 다시 만든다.

```bash
gh run download --name robinx-ios --dir ios/out   # 저장소 루트에서
python website/scripts/ios-shots.py               # ios/out/shots → website/public/shots/ios-*.webp
```

ipa 받기 단추와 버전·크기는 `scripts/release-info.mjs`가 `ios-v` 릴리스 중 가장 높은 버전을 찾아 `release.json`의 `ios`에 적는다(앱의 새 버전 알림과 같은 규칙). 같은 스크립트가 모든 `ios-v` 릴리스로 LiveContainer용 소스 `public/altstore.json`(AltStore 형식, 새 버전부터)을 만든다. 아이콘 `public/ios-icon.png`는 `ios-shots.py`가 만든다. iPhone 앱을 새로 릴리스하면(`ios/scripts/release.sh --publish`) 사이트도 저절로 다시 배포된다.

## 공유 이미지 (public/og.png)

첫 화면과 같은 구성(V5 판, 로고·큰 제목, 카드 창 안의 앱 남은 흔적 창)의 1200×630 그림. 로고는 `public/logo.png`. 바꾸면 `index.html`의 `og:image` 주소 뒤 `?v=` 숫자를 올려 SNS가 다시 받게 한다.

```bash
node website/scripts/og.mjs                    # Windows는 Edge를 자동으로 찾는다. 다른 곳은 CHROMIUM_PATH
```

## 아이콘 (public/logo.png, apple-touch-icon.png)

앱 아이콘 그림(`src-tauri/app-icon.png`, 저장소 `scripts/make-icon.mjs`)에서 만든다. 앱 아이콘을 바꾸면 다시 만들고 `index.html`의 `?v=` 숫자를 올린다.

```bash
node website/scripts/icons.mjs                 # 저장소 루트에서
```
