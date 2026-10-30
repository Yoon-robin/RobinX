# RobinX for iPhone

Windows용 RobinX와 같은 원칙으로 만든 iPhone 정리 앱. SwiftUI, iOS 16 이상, iPhone 전용.

## 하는 일

- **저장공간:** 전체 용량과 남은 공간.
- **사진:** 사진 보관함에서 중복 사진(크기·용량이 같고 작은 그림의 dHash가 같은 것), 50 MB 이상 동영상, 스크린샷, 연속 촬영의 대표가 아닌 장을 찾는다. 지우면 iOS가 확인 창을 띄우고, 지운 사진은 "최근 삭제된 항목"에 30일 남는다.
- **파일:** 사용자가 고른 폴더(나의 iPhone, iCloud Drive, 파일 앱에 보이는 다른 앱의 폴더)를 북마크로 기억하고, 큰 파일·중복 파일(SHA-256)·오래된 파일·폴더별 크기를 보여 준다. 지울 때는 휴지통으로 먼저 옮겨 보고, 옮기지 못한 파일만 한 번 더 물어 영구 삭제한다.

iOS는 다른 앱의 캐시, 앱별 용량, 시스템 데이터를 열어 주지 않는다. 그래서 하지 않는다 (탈옥·TrollStore 같은 방법도 쓰지 않는다).
지우는 원칙은 데스크톱과 같다: 직접 고른 것만, 미리 골라 두지 않기, 되돌릴 수 없는 삭제는 따로 한 번 더 확인.

## 빌드

Windows PC에는 Xcode가 없으므로 GitHub Actions의 macOS 서버(`.github/workflows/ios.yml`)가 빌드한다. `ios/**`를 push하면 돈다.

1. XcodeGen으로 `project.yml`에서 Xcode 프로젝트를 만든다 (`RobinX.xcodeproj`와 `RobinX/Info.plist`는 저장소에 넣지 않는다).
2. 시뮬레이터 사진 보관함에 시험 그림(`scripts/make-test-media.swift`, 같은 그림 두 장 포함)을 넣는다.
3. 단위 테스트(`RobinXTests`, 워드마크가 데스크톱 시작 화면의 `LOGO`와 같은지도 본다)와 UI 테스트(`RobinXUITests`: 사용자처럼 사진 허용 → "전체 접근" → 중복 1묶음을 찾는지).
4. 서명하지 않은 `RobinX.ipa`를 만든다.
5. 시뮬레이터 화면을 찍는다: `-demo YES`(가짜 자료)로 화면마다 한 장, 그리고 진짜 사진 보관함 두 장.

결과는 실행의 아티팩트 `robinx-ios`에 있다:

```bash
gh run download --name robinx-ios --dir ios/out
```

Mac이 있으면 `brew install xcodegen` 뒤 `bash ios/scripts/ci.sh`로 같은 일을 한다.

## iPhone에 설치

서명하지 않은 ipa라 설치하는 앱이 서명한다. LiveContainer에서는 + 단추로 `RobinX.ipa`를 고른다. 사진 접근 허용 창이 뜨지 않으면 Flekstore 같은 서명 앱으로 직접 설치한다.

## 시험

- 지우기 시험은 **시뮬레이터에서만** 한다 (시험 그림, 임시 폴더). 실제 iPhone의 사진·파일로 지우기를 시험하지 않는다.
- 실행 인자: `-demo YES`(가짜 자료, 아무것도 지우지 않음), `-skipBoot YES`, `-bootHold YES`(시작 화면에서 멈춤), `-tab summary|photos|files|info`, `-route duplicates|folder`.

## 디자인

[docs/BRAND.md](../docs/BRAND.md)를 따른다: 검정·흰색·회색, 글로우는 화면에 하나뿐인 큰 요소(시작 화면 워드마크, 남은 공간 숫자)에만, `> 제목█` 터미널 제목, 각진 모서리, `[ OK ]`·`[SKIP]`·`[FAIL]` 로그 태그.
앱 아이콘(`Assets.xcassets/AppIcon.appiconset/icon-1024.png`)은 `node scripts/make-brand.mjs`가 만든다.
