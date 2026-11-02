# RobinX for iPhone

Windows용 RobinX와 같은 원칙으로 만든 iPhone 정리 앱. SwiftUI, iOS 16 이상, iPhone 전용.

## 하는 일

- **저장공간:** 전체 용량과 남은 공간.
- **사진:** 사진 보관함에서 중복 사진(크기·용량이 같고 작은 그림의 dHash가 같은 것), 비슷한 사진(1분 안에 찍었고 dHash 거리가 기준 이하, 묶음마다 가장 큰 것을 남긴다고 본다), 큰 동영상, 스크린샷, 연속 촬영의 대표가 아닌 장을 찾는다. 사진을 길게 누르면 크게 보며 묶음 안에서 넘겨 비교하고 확대할 수 있다. 지우면 iOS가 확인 창을 띄우고, 지운 사진은 "최근 삭제된 항목"에 30일 남는다.
  - 앱을 켜면 바로 찾는다. 사진마다 잰 크기와 dHash를 수정 시각과 함께 `photo-cache.plist`에 저장해, 다시 찾을 때는 바뀐 사진만 잰다.
  - 사진 앱에서 지우거나 새로 찍으면 잠시 뒤 다시 찾는다. 기준을 바꾸면 찾던 것을 멈추고 새 기준으로 다시 찾는다.
- **넘겨 보며 정리:** 사진을 한 장씩 보며 왼쪽으로 밀면 지울 것, 오른쪽으로 밀면 남길 것. 미는 순간에는 지우지 않고, 지울 것을 모아 한 번 더 보고(빼고 싶은 것은 눌러 뺀다) 확인해야 지운다. 남긴 사진과 표시는 `swipe.json`에 기억해 다음에 이어서 넘긴다.
- **파일:** 사용자가 고른 폴더(나의 iPhone, iCloud Drive, 파일 앱에 보이는 다른 앱의 폴더)를 북마크로 기억하고, 큰 파일·중복 파일(SHA-256)·오래된 파일·폴더별 크기를 보여 준다. 파일을 길게 누르면 미리 볼 수 있다(Quick Look). 지울 때는 휴지통으로 먼저 옮겨 보고, 옮기지 못한 파일만 한 번 더 물어 영구 삭제한다. 고른 폴더 바로 아래 폴더는 "찾지 않기"로 뺄 수 있다.
- **기록:** RobinX로 지운 사진·파일(`history.json`). 사진은 언제까지 "최근 삭제된 항목"에서 되살릴 수 있는지 함께 보여 준다.
- **설정:** 큰 동영상·큰 파일·오래된 파일 기준, 비슷한 사진 기준(좁게·보통·넓게), 즐겨찾기 사진 빼기, 찾지 않을 앨범·폴더, 넘겨 보며 남긴 사진 다시 보기. 그 아래에 지우는 원칙·범위·권한·링크.
- **새 버전 알림:** 앱을 켤 때 GitHub Release 중 `ios-v`로 시작하는 가장 높은 버전을 읽어, 지금보다 높으면 저장공간 탭과 설정 탭에 알린다. iOS는 앱이 스스로 바꿔 설치하게 두지 않으므로 ipa를 받는 데까지만 하고, 설치는 LiveContainer의 + 단추로 한다. 인터넷은 이 확인에만 쓴다.

iOS는 다른 앱의 캐시, 앱별 용량, 시스템 데이터를 열어 주지 않는다. 그래서 하지 않는다 (탈옥·TrollStore 같은 방법도 쓰지 않는다).
지우는 원칙은 데스크톱과 같다: 직접 고른 것만, 미리 골라 두지 않기, 되돌릴 수 없는 삭제는 따로 한 번 더 확인.

## 빌드

Windows PC에는 Xcode가 없으므로 GitHub Actions의 macOS 서버(`.github/workflows/ios.yml`)가 빌드한다. `ios/**`를 push하면 돈다.

1. XcodeGen으로 `project.yml`에서 Xcode 프로젝트를 만든다 (`RobinX.xcodeproj`와 `RobinX/Info.plist`는 저장소에 넣지 않는다).
2. 시뮬레이터 사진 보관함에 시험 그림(`scripts/make-test-media.swift`: 서로 다른 그림 4장, 같은 그림 1장, 조각 하나만 다른 그림 1장)을 넣는다.
3. 단위 테스트(`RobinXTests`, 워드마크가 데스크톱 시작 화면의 `LOGO`와 같은지도 본다)와 UI 테스트(`RobinXUITests`: 사용자처럼 사진 허용 → "전체 접근" → 중복 1묶음과 비슷한 사진 1묶음을 찾는지).
4. 서명하지 않은 `RobinX.ipa`를 만든다.
5. 시뮬레이터 화면을 찍는다: `-demo YES`(가짜 자료)로 화면마다 한 장, 그리고 진짜 사진 보관함 두 장.

결과는 실행의 아티팩트 `robinx-ios`에 있다:

```bash
gh run download --name robinx-ios --dir ios/out
```

Mac이 있으면 `brew install xcodegen` 뒤 `bash ios/scripts/ci.sh`로 같은 일을 한다.

## 릴리스

`ios/project.yml`의 `MARKETING_VERSION`을 높여 main에 push하고 CI가 끝나면:

```bash
bash ios/scripts/release.sh
```

ipa를 받아 버전만 확인한다. 올리는 것은 공개 행동이라 먼저 묻고, `--publish "바뀐 점"`으로 GitHub Release `ios-v<버전>`을 만든다.
iOS 릴리스는 "Latest"로 표시하지 않는다(`--latest=false`). 데스크톱 자동 업데이트가 Latest 릴리스의 `latest.json`을 읽기 때문이다.
`--publish`는 올린 뒤 소개 사이트도 다시 배포한다(`website/scripts/deploy.sh`). 그래야 사이트의 ipa 받기 단추와 소스(`altstore.json`)가 새 버전을 가리킨다. 바뀐 `website/src/lib/release.json`과 `website/public/altstore.json`은 커밋한다.

## iPhone에 설치

서명하지 않은 ipa라 설치하는 앱이 서명한다. LiveContainer에서는 + 단추로 `RobinX.ipa`를 고른다.

소스: https://yoon-robin.github.io/RobinX/altstore.json (AltStore 형식, `website/scripts/release-info.mjs`가 `ios-v` 릴리스로 만든다). LiveContainer의 소스 탭에 추가하면(사이트의 "LiveContainer에 소스 추가" 단추는 `livecontainer://source?url=…`) 새 버전을 거기서 설치할 수 있어 ipa를 받아 고를 필요가 없다. 같은 앱이 있으면 LiveContainer가 바꿀지 묻는다. 앱의 설정 탭에 "소스 주소 복사"가 있다. 사진 접근 허용 창이 뜨지 않으면 Flekstore 같은 서명 앱으로 직접 설치한다.

## 시험

- 지우기 시험은 **시뮬레이터에서만** 한다 (시험 그림, 임시 폴더). 실제 iPhone의 사진·파일로 지우기를 시험하지 않는다.
- 실행 인자: `-demo YES`(가짜 자료, 아무것도 지우지 않음), `-skipBoot YES`, `-bootHold YES`(시작 화면에서 멈춤), `-tab summary|photos|files|history|settings`, `-route duplicates|similar|viewer|swipe|folder|albums`, `-demoUpdate YES`(새 버전이 있는 것처럼).

## 디자인

[docs/BRAND.md](../docs/BRAND.md)를 따른다: 검정·흰색·회색, 글로우는 화면에 하나뿐인 큰 요소(시작 화면 워드마크, 남은 공간 숫자)에만, `> 제목█` 터미널 제목, 각진 모서리, `[ OK ]`·`[SKIP]`·`[FAIL]` 로그 태그.
앱 아이콘(`Assets.xcassets/AppIcon.appiconset/icon-1024.png`)은 `node scripts/make-brand.mjs`가 만든다.
