#!/usr/bin/env bash
# GitHub Actions(macOS)에서 돈다: 프로젝트 만들기 → 테스트 → 서명 안 된 ipa → 시뮬레이터 화면 캡처.
# 결과는 ios/out/ (RobinX.ipa, test.log, shots/*.png). Mac이 있으면 그대로 돌려도 된다 (xcodegen 필요).
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${OUT:-out}"
rm -rf "$OUT" && mkdir -p "$OUT/shots"
BUNDLE=com.yoonrobin.robinx.ios

xcodegen generate

# 가장 새 iOS 런타임의 첫 iPhone 시뮬레이터
UDID=$(xcrun simctl list devices available -j | python3 -c '
import json, sys
devs = json.load(sys.stdin)["devices"]
for runtime in sorted((k for k in devs if ".iOS-" in k), reverse=True):
    phones = [d for d in devs[runtime] if d["name"].startswith("iPhone")]
    if phones:
        print(phones[0]["udid"]); break
')
echo "시뮬레이터: $UDID"
xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b >/dev/null

# 시험 그림을 사진 보관함에 넣는다 (같은 그림 두 장 → UI 테스트가 중복 1묶음을 찾아야 한다). 시뮬레이터 안에서만
swift scripts/make-test-media.swift "$OUT/media"
xcrun simctl addmedia "$UDID" "$OUT"/media/*.jpg

echo "::group::테스트"
xcodebuild -project RobinX.xcodeproj -scheme RobinX -destination "id=$UDID" -derivedDataPath build/sim test 2>&1 \
  | tee "$OUT/test.log" | grep -E "error:|warning: .*RobinX/|Test Case .*(passed|failed)|Executed|\*\* TEST" || true
echo "::endgroup::"
grep -q "\*\* TEST SUCCEEDED \*\*" "$OUT/test.log" || { echo "테스트 실패"; exit 1; }

echo "::group::ipa (서명 없음, LiveContainer 등이 설치할 때 서명한다)"
xcodebuild -project RobinX.xcodeproj -scheme RobinX -configuration Release -sdk iphoneos -derivedDataPath build/device \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" build -quiet
rm -rf build/Payload && mkdir -p build/Payload
cp -R build/device/Build/Products/Release-iphoneos/RobinX.app build/Payload/
(cd build && zip -qry "../$OUT/RobinX.ipa" Payload)
ls -l "$OUT/RobinX.ipa"
echo "::endgroup::"

echo "::group::화면 캡처"
xcrun simctl install "$UDID" build/sim/Build/Products/Debug-iphonesimulator/RobinX.app
xcrun simctl status_bar "$UDID" override --time 9:41 --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3 || true
shot() {
  local name=$1; shift
  xcrun simctl terminate "$UDID" "$BUNDLE" 2>/dev/null || true
  xcrun simctl launch "$UDID" "$BUNDLE" "$@" >/dev/null
  sleep 5
  xcrun simctl io "$UDID" screenshot "$OUT/shots/$name.png" >/dev/null
  echo "$name"
}
# 가짜 자료(-demo)로 화면마다 한 장
shot 1-boot -demo YES -bootHold YES
shot 2-summary -demo YES -skipBoot YES
shot 3-photos -demo YES -skipBoot YES -tab photos
shot 4-duplicates -demo YES -skipBoot YES -tab photos -route duplicates
shot 5-files -demo YES -skipBoot YES -tab files
shot 6-folder -demo YES -skipBoot YES -tab files -route folder
shot 7-info -demo YES -skipBoot YES -tab info
# 진짜 사진 보관함: UI 테스트(RobinXUITests)가 허용을 누른 뒤라 권한이 있다
shot 8-real-photos -skipBoot YES -tab photos
shot 9-real-duplicates -skipBoot YES -tab photos -route duplicates
echo "::endgroup::"
