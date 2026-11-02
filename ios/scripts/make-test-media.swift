// 시뮬레이터 사진 보관함에 넣을 시험용 그림을 만든다 (ci.sh가 쓴다).
// 서로 다른 무늬 4장, sample-1을 그대로 복사한 1장(중복), sample-1에 작은 조각만 바꾼 1장(10초 뒤에 찍은 것으로).
// → 앱이 중복 1묶음과 비슷한 사진 1묶음을 찾아야 한다.
//   swift scripts/make-test-media.swift <폴더>
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

let out = URL(fileURLWithPath: CommandLine.arguments[1])
try FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)

/// seed마다 다른 회색 칸 무늬. edited면 왼쪽 위에 작은 흰 조각을 더한다
func write(_ name: String, seed: UInt32, taken: String, edited: Bool = false) {
    let w = 1200, h = 900
    let ctx = CGContext(
        data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0,
        space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
    var state = seed &* 2_654_435_761
    func next() -> CGFloat {
        state = state &* 1_103_515_245 &+ 12_345
        return CGFloat((state >> 16) & 0xff) / 255
    }
    for row in 0..<4 {
        for col in 0..<6 {
            let g = next()
            ctx.setFillColor(red: g, green: g, blue: g, alpha: 1)
            ctx.fill(CGRect(x: col * 200, y: row * 225, width: 200, height: 225))
        }
    }
    if edited {
        ctx.setFillColor(red: 1, green: 1, blue: 1, alpha: 1)
        ctx.fill(CGRect(x: 40, y: 40, width: 50, height: 50))
    }
    let dest = CGImageDestinationCreateWithURL(
        out.appendingPathComponent(name) as CFURL, UTType.jpeg.identifier as CFString, 1, nil)!
    // 찍은 시각을 넣어 둔다 (비슷한 사진은 1분 안에 찍은 것끼리만 비교한다)
    let exif: [CFString: Any] = [kCGImagePropertyExifDateTimeOriginal: taken]
    CGImageDestinationAddImage(dest, ctx.makeImage()!, [kCGImagePropertyExifDictionary: exif] as CFDictionary)
    CGImageDestinationFinalize(dest)
}

for s in 1...4 { write("sample-\(s).jpg", seed: UInt32(s), taken: "2025:10:0\(s) 10:00:00") }
try FileManager.default.copyItem(
    at: out.appendingPathComponent("sample-1.jpg"), to: out.appendingPathComponent("sample-1-copy.jpg"))
write("sample-1-edit.jpg", seed: 1, taken: "2025:10:01 10:00:10", edited: true)
print("시험 그림 6장: \(out.path)")
