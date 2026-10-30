import CoreGraphics
import Photos
import UIKit

/// 사진 보관함을 한 번 훑어 정리할 만한 것을 찾는다 (읽기만 한다).
enum PhotoScanner {
    /// 이보다 큰 동영상만 "큰 동영상"에 넣는다
    static let largeVideoBytes: Int64 = 50_000_000

    static func scan(progress: @escaping (Int, Int) -> Void) -> PhotoScanResult {
        let options = PHFetchOptions()
        // 연속 촬영의 대표가 아닌 장들도 받는다 (사진 앱에서는 묶음 안에 숨어 있다)
        options.includeAllBurstAssets = true
        options.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: true)]
        let fetch = PHAsset.fetchAssets(with: options)
        let total = fetch.count

        var result = PhotoScanResult()
        // 가로·세로 픽셀과 용량이 같은 사진끼리만 그림을 비교한다 (모두 비교하면 너무 느리다)
        var candidates: [String: [(PHAsset, PhotoItem)]] = [:]

        fetch.enumerateObjects { asset, index, _ in
            autoreleasepool {
                let bytes = size(of: asset)
                let item = PhotoItem(
                    id: asset.localIdentifier, bytes: bytes, isVideo: asset.mediaType == .video,
                    duration: asset.duration, created: asset.creationDate)
                result.totalCount += 1
                result.totalBytes += bytes
                switch asset.mediaType {
                case .video:
                    if bytes >= largeVideoBytes { result.videos.append(item) }
                case .image:
                    if asset.mediaSubtypes.contains(.photoScreenshot) { result.screenshots.append(item) }
                    if asset.burstIdentifier != nil && !asset.representsBurst { result.bursts.append(item) }
                    if bytes > 0 {
                        candidates["\(asset.pixelWidth)x\(asset.pixelHeight)/\(bytes)", default: []].append((asset, item))
                    }
                default:
                    break
                }
            }
            if index % 200 == 0 { progress(index, total) }
        }

        for group in candidates.values where group.count > 1 {
            var byHash: [UInt64: [PhotoItem]] = [:]
            for (asset, item) in group {
                if let hash = autoreleasepool(invoking: { thumbnailHash(asset) }) {
                    byHash[hash, default: []].append(item)
                }
            }
            for same in byHash.values where same.count > 1 {
                result.duplicates.append(same)  // 만든 날짜 순으로 받았으니 맨 앞이 가장 오래된 것
            }
        }
        result.duplicates.sort { a, b in
            a.dropFirst().reduce(0) { $0 + $1.bytes } > b.dropFirst().reduce(0) { $0 + $1.bytes }
        }
        result.videos.sort { $0.bytes > $1.bytes }
        result.screenshots.reverse()  // 최근 것부터
        progress(total, total)
        return result
    }

    /// 원본·편집본·라이브 포토 동영상까지 합한 크기
    static func size(of asset: PHAsset) -> Int64 {
        PHAssetResource.assetResources(for: asset).reduce(Int64(0)) { sum, resource in
            sum + ((resource.value(forKey: "fileSize") as? NSNumber)?.int64Value ?? 0)
        }
    }

    /// 작은 그림을 받아 dHash를 만든다. iCloud에서 받아 오지는 않는다
    private static func thumbnailHash(_ asset: PHAsset) -> UInt64? {
        let options = PHImageRequestOptions()
        options.isSynchronous = true
        options.deliveryMode = .highQualityFormat
        options.resizeMode = .exact
        options.isNetworkAccessAllowed = false
        var image: UIImage?
        PHImageManager.default().requestImage(
            for: asset, targetSize: CGSize(width: 64, height: 64), contentMode: .aspectFill, options: options
        ) { result, _ in image = result }
        guard let cg = image?.cgImage else { return nil }
        return DHash.compute(cg)
    }
}

/// 차이 해시: 9×8 흑백으로 줄여 옆 칸보다 밝은지를 64비트로 적는다.
/// 같은 그림이면 크기를 바꿔도 거의 같은 값이 나온다.
enum DHash {
    static func compute(_ image: CGImage) -> UInt64? {
        let width = 9, height = 8
        var pixels = [UInt8](repeating: 0, count: width * height)
        let drawn = pixels.withUnsafeMutableBytes { buffer -> Bool in
            guard
                let ctx = CGContext(
                    data: buffer.baseAddress, width: width, height: height, bitsPerComponent: 8,
                    bytesPerRow: width, space: CGColorSpaceCreateDeviceGray(),
                    bitmapInfo: CGImageAlphaInfo.none.rawValue)
            else { return false }
            ctx.interpolationQuality = .medium
            ctx.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
            return true
        }
        guard drawn else { return nil }
        var hash: UInt64 = 0
        for y in 0..<height {
            for x in 0..<(width - 1) {
                hash <<= 1
                if pixels[y * width + x] > pixels[y * width + x + 1] { hash |= 1 }
            }
        }
        return hash
    }

    static func distance(_ a: UInt64, _ b: UInt64) -> Int {
        (a ^ b).nonzeroBitCount
    }
}
