# iPhone 앱 화면(CI가 시뮬레이터에서 가짜 자료로 찍은 것)을 사이트용 webp로 만든다.
# 위의 상태 막대(시각·배터리)는 잘라 낸다. 1x(400px 너비)와 2x(800px)를 만든다. 소스용 앱 아이콘도 만든다.
#
#   gh run download --name robinx-ios --dir ios/out      # 저장소 루트에서, 먼저 CI 결과를 받는다
#   python website/scripts/ios-shots.py [ios/out/shots]
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "ios" / "out" / "shots"
OUT = ROOT / "website" / "public" / "shots"

# 사이트 이름 ← CI 캡처 이름
SHOTS = {"ios-summary": "2-summary", "ios-photos": "3-photos", "ios-similar": "5-similar"}
# 상태 막대 높이 (1206×2622 화면 기준)
STATUS_BAR = 184

for name, src in SHOTS.items():
    image = Image.open(SRC / f"{src}.png").convert("RGB")
    image = image.crop((0, STATUS_BAR, image.width, image.height))
    for suffix, width in (("", 400), ("@2x", 800)):
        height = round(image.height * width / image.width)
        image.resize((width, height), Image.LANCZOS).save(OUT / f"{name}{suffix}.webp", "WEBP", quality=88)
    print("saved", f"website/public/shots/{name}.webp, {name}@2x.webp ({width}x{height})")

# 소스(altstore.json)의 앱 아이콘. 원본은 scripts/make-brand.mjs가 만든 1024px 아이콘
ICON = ROOT / "ios" / "RobinX" / "Assets.xcassets" / "AppIcon.appiconset" / "icon-1024.png"
Image.open(ICON).convert("RGB").resize((256, 256), Image.LANCZOS).save(ROOT / "website" / "public" / "ios-icon.png")
print("saved", "website/public/ios-icon.png (256x256)")
