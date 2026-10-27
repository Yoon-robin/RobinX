# 코드 서명 방법과 비용 (F3, 조사만)

조사일 2026-10-27. 구매·신청은 하지 않았다. 아래 가격과 조건은 출처의 글이며, 결정하기 전에 해당 사이트에서 다시 확인한다.

## 왜 필요한가

RobinX 설치 파일(`RobinX_<버전>_x64-setup.exe`)에는 Windows 게시자 서명이 없다. 처음 실행하면 SmartScreen의 "Windows의 PC 보호" 창이 뜨고,
릴리스 글의 SHA-256으로 직접 확인하게 하고 있다. 이것과 별개로 **자동 업데이트 서명**(`robinx-updater.key`)은 이미 있다. 그것은 앱이 받은 파일이
우리가 올린 것인지 확인하는 용도라 Windows가 보는 게시자 서명을 대신하지 않는다.

## 먼저 알아 둘 것: 서명해도 경고가 바로 사라지지 않는다

- 2024년부터 **EV와 OV를 SmartScreen이 똑같이 다룬다.** EV라도 첫 다운로드부터 경고가 없는 것은 아니다. 평판은 다운로드가 쌓이면서 만들어진다.
  Microsoft 문서도 "서명한 새 파일은 평판이 쌓일 때까지 경고가 뜰 수 있고, 같은 게시자로 계속 서명하면 다음 버전이 평판을 이어받는다"고 적는다.
- 그래서 **EV(연 $400 이상)는 SmartScreen 때문이라면 살 이유가 없다.**
- 서명은 경고를 없애는 약속이 아니라 "게시자가 누구인지 보이게 하고 평판이 쌓일 바탕을 만드는 것"이다.

## 선택지

| 선택지 | 비용 | 한국 개인 개발자가 쓸 수 있나 | 메모 |
|---|---|---|---|
| **Azure Artifact Signing** (예전 Trusted Signing) | 월 약 $9.99 | **안 됨.** 개인은 미국·캐나다만, 조직은 미국·캐나다·EU·영국만 | 가장 싸고 CI에 붙이기 쉽지만 한국은 대상이 아니다. 대상 지역이 넓어지는지는 가끔 확인 |
| **OV 인증서** (DigiCert, Sectigo, SSL.com 등) | 연 $150~300 (개인 검증 상품은 더 싼 곳도 있음) | 됨 | 2023년 6월부터 개인 키를 하드웨어 토큰이나 클라우드 HSM에 둬야 한다. 한국 안의 판매처 가격은 검색되지 않았다 |
| **SignPath Foundation** (오픈소스 무료) | 무료 | 조건부 | 아래에 자세히 |
| **Microsoft Store (MSIX)** | 무료 (Store가 다시 서명) | 이론상 됨 | RobinX가 MSIX 안에서 돌면 레지스트리·파일 접근이 격리되어 프로그램 제거·정리의 핵심이 막힐 수 있다. 검증하지 않았고 큰 개편이 필요하다 |
| EV 인증서 | 연 $400 이상 | 됨 | 위의 이유로 권하지 않음 |
| 자체 서명 | 무료 | — | 공개 배포에는 못 씀 (설치가 막힌다) |

### SignPath Foundation이 RobinX에 맞는지

맞는 것: 저장소가 공개이고 라이선스가 Apache-2.0(OSI 승인)이다. 서명 요청마다 사람이 승인하는 방식이라 혼자 해도 된다(저자·승인자를 한 사람이 겸하는지는 확인 필요).

걸리는 것:

1. **자동 빌드가 필수.** 서명하는 파일은 "소스 저장소에서 검증 가능한 자동 빌드"여야 한다. 지금은 이 PC에서 `scripts/release.sh`로 빌드해 올린다.
   GitHub Actions 같은 CI에서 빌드해야 하는데, **GitHub CI는 사용자 결정으로 뺐다.** 서명을 쓰려면 이 결정을 되돌려야 한다.
2. **"어느 정도 확인되는 평판"을 요구한다.** 0.1.x의 신생 프로젝트가 통과할지는 신청해 봐야 안다(기준은 공개되지 않음).
3. 사이트·릴리스 페이지에 **"Code signing policy"** 를 싣고 "Free code signing provided by SignPath.io, certificate by SignPath Foundation"을 밝혀야 한다.
4. 서명하는 파일의 제품 이름·버전 메타데이터가 일정해야 한다. 정보를 보내는 프로그램은 개인정보 설명이 필요하다(RobinX는 PC 정보를 어디에도 보내지 않는다).

## 이 저장소에 붙이는 자리 (유료 OV를 쓸 때)

RobinX는 NSIS 설치 파일을 쓰지 않는다. `target/release/robinx.exe`가 곧 설치 파일이다(`scripts/release.sh`의 `cp target/release/robinx.exe "$SETUP"`).
따라서 서명할 파일은 `robinx.exe` 하나다. 순서가 중요하다:

1. `pnpm tauri build --no-bundle`
2. **`signtool`(또는 인증서 제공처의 도구)으로 `robinx.exe`에 서명** ← 새로 넣을 단계
3. `cp`로 `..._x64-setup.exe` 만들기
4. `pnpm tauri signer sign`으로 자동 업데이트 서명 (**서명한 뒤의 파일**로 해야 한다. 순서가 바뀌면 업데이트 확인이 실패한다)
5. 그 뒤는 지금과 같다 (SHA-256 기록, 올리기, 올라간 파일 다시 받아 비교)

그리고 릴리스 글의 "코드 서명이 아직 없어요" 문구와 `CLAUDE.md`·사이트의 안내를 바꾼다. 클라우드 HSM을 쓰면 키가 이 PC 밖에 있어 `release.sh`가 그 서비스의 서명 도구를 부르는 한 줄이면 된다.
서명 인증서나 토큰 정보는 비밀 키와 마찬가지로 저장소에 넣지 않는다.

## 결정할 것 (🔒)

1. 서명에 돈을 쓸지. 쓴다면 연 $150~300(대략 20~40만 원)과, 본인 확인(실명·신분증) 절차를 받아들일지.
2. 또는 CI를 다시 쓰고 SignPath Foundation을 신청할지 (무료이지만 위 1~3번 조건).
3. 아무것도 안 하고 지금처럼 SHA-256 확인으로 둘지. 사용자 수가 적은 동안은 경고가 뜨는 것 자체는 서명을 사도 달라지지 않을 수 있다(평판이 쌓여야 하므로).

내 의견: 지금은 서명 없이 두고, 다운로드가 어느 정도 쌓이고 한국 쪽 판매처 가격과 SignPath 조건을 직접 확인한 뒤 정하는 것이 낫다.
EV는 사지 않는다. 서명을 한다면 같은 게시자 이름으로 계속 이어서 해야 평판이 쌓인다.

## 출처

- [Code signing options for Windows app developers (Microsoft Learn, 2026-08-29)](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options) — 가격, 지역, EV·OV 비교, SignPath 안내
- [SignPath Foundation 이용 조건](https://signpath.org/terms) — 라이선스, 자동 빌드, 평판, 승인, 코드 서명 정책 게시
- [Tauri v2 Windows 코드 서명](https://v2.tauri.app/distribute/sign/windows/) — `signCommand`로 외부 서명 도구를 붙이는 방법 (RobinX는 `--no-bundle`이라 `release.sh`에서 직접 서명)
- [Reputation with OV certificates and are EV certificates still the better option? (Microsoft Q&A)](https://learn.microsoft.com/en-us/answers/questions/417016/reputation-with-ov-certificates-and-are-ev-certifi) — 평판이 인증서 종류가 아니라 파일·다운로드로 쌓인다는 설명 (사용자 글이라 공식 문서가 아님)
