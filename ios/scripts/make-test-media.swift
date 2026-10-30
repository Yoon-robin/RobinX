// 시뮬레이터 사진 보관함에 넣을 시험용 그림을 만든다 (ci.sh가 쓴다).
// 줄무늬 그림 4장과, 그중 하나를 그대로 복사한 1장 → 앱이 중복 1묶음을 찾아야 한다.
//   swift scripts/make-test-media.swift <폴더>
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

let out = URL(fileURLWithPath: CommandLine.arguments[1])
try FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)

func write(_ name: String, seed: Int) {
    let w = 1200, h = 900
    let ctx = CGContext(
        data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0,
        space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
    for i in 0..<12 {
        let g = CGFloat((seed * 53 + i * 29) % 256) / 255
        ctx.setFillColor(red: g, green: g, blue: g, alpha: 1)
        ctx.fill(CGRect(x: i * 100, y: 0, width: 100, height: h))
    }
    let dest = CGImageDestinationCreateWithURL(
        out.appendingPathComponent(name) as CFURL, UTType.jpeg.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(dest, ctx.makeImage()!, nil)
    CGImageDestinationFinalize(dest)
}

for s in 1...4 { write("sample-\(s).jpg", seed: s) }
try FileManager.default.copyItem(
    at: out.appendingPathComponent("sample-1.jpg"), to: out.appendingPathComponent("sample-1-copy.jpg"))
print("시험 그림 5장: \(out.path)")
