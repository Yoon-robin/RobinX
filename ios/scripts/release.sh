#!/usr/bin/env bash
# iPhone 앱 릴리스: CI(macOS)가 지금 커밋으로 만든 RobinX.ipa를 받아 GitHub Release ios-v<버전>에 올린다. (Git Bash)
# 앱은 이 릴리스를 읽어 새 버전을 알려 준다 (RobinX/Updates/UpdateChecker.swift).
#
#   bash ios/scripts/release.sh                          # ipa를 받아 버전만 확인 (올리지 않음)
#   bash ios/scripts/release.sh --publish "바뀐 점"       # GitHub Release ios-v<버전>을 만들어 올린다 (공개 행동이라 먼저 묻는다)
#
# 필요한 것:
# - 버전: ios/project.yml의 MARKETING_VERSION. 올릴 때마다 높인다.
# - 지금 커밋(HEAD)이 push되어 있고, 그 커밋의 iOS CI가 성공해 있어야 한다.
# - 데스크톱 자동 업데이트는 "Latest" 릴리스의 latest.json을 읽으므로 iOS 릴리스는 Latest로 표시하지 않는다(--latest=false).
set -euo pipefail
cd "$(dirname "$0")/../.."

PUBLISH=0
NOTES=""
if [ "${1:-}" = "--publish" ]; then
  PUBLISH=1
  NOTES="${2:-}"
  if [ -z "$NOTES" ]; then
    echo "바뀐 점을 적어 주세요: bash ios/scripts/release.sh --publish \"...\"" >&2
    exit 1
  fi
fi

REPO=Yoon-robin/RobinX
VERSION=$(grep -m1 'MARKETING_VERSION' ios/project.yml | sed -E 's/.*"(.*)".*/\1/')
TAG="ios-v$VERSION"
COMMIT=$(git rev-parse HEAD)

if gh release view "$TAG" --repo "$REPO" >/dev/null 2>&1; then
  echo "$TAG 릴리스가 이미 있어요. ios/project.yml의 MARKETING_VERSION을 높여 주세요." >&2
  exit 1
fi

RUN=$(gh run list --repo "$REPO" --workflow ios.yml --commit "$COMMIT" --status success --limit 1 --json databaseId -q '.[0].databaseId')
if [ -z "$RUN" ]; then
  echo "커밋 ${COMMIT:0:7}의 성공한 iOS CI가 없어요. push하고 CI가 끝나길 기다려 주세요." >&2
  exit 1
fi

OUT="ios/out/release-$VERSION"
rm -rf "$OUT"
gh run download "$RUN" --repo "$REPO" --name robinx-ios --dir "$OUT"
IPA="$OUT/RobinX.ipa"

# ipa 안의 버전이 project.yml과 같은지 본다
INNER=$(python -c "
import plistlib, sys, zipfile
z = zipfile.ZipFile(sys.argv[1])
name = next(n for n in z.namelist() if n.endswith('.app/Info.plist') and n.count('/') == 2)
print(plistlib.loads(z.read(name))['CFBundleShortVersionString'])
" "$IPA")
if [ "$INNER" != "$VERSION" ]; then
  echo "ipa 버전($INNER)이 project.yml($VERSION)과 달라요." >&2
  exit 1
fi
echo "RobinX iOS $VERSION · 커밋 ${COMMIT:0:7} · CI $RUN · $(du -h "$IPA" | cut -f1)"

if [ "$PUBLISH" = 1 ]; then
  gh release create "$TAG" "$IPA" --repo "$REPO" --target "$COMMIT" --title "RobinX iOS $VERSION" \
    --notes "$NOTES" --latest=false
  echo "올렸어요: https://github.com/$REPO/releases/tag/$TAG"
else
  echo "올리지 않았어요. 올리려면: bash ios/scripts/release.sh --publish \"바뀐 점\""
fi
