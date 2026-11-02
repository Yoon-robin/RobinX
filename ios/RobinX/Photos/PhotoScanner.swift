import CoreGraphics
import Photos
import UIKit

/// 사진 보관함을 한 번 훑어 정리할 만한 것을 찾는다 (읽기만 한다).
enum PhotoScanner {
    enum Stage { case reading, comparing }

    /// cache에 든 크기·그림 지문은 사진이 바뀌지 않았으면 다시 재지 않는다. 끝나면 이번에 본 사진만 남긴다.
    /// isCancelled가 true가 되면 중간에 멈춘다 (그때 결과는 버린다)
    static func scan(
        options: PhotoScanOptions, cache: inout PhotoCache, isCancelled: @escaping () -> Bool = { false },
        progress: @escaping (Stage, Int, Int) -> Void
    ) -> PhotoScanResult {
        let old = cache
        var fresh = PhotoCache()
        defer {
            // 멈췄으면 지금까지 잰 것을 예전 것에 보태 둔다 (다음에 덜 잰다)
            if isCancelled() {
                cache.entries.merge(fresh.entries) { _, new in new }
            } else {
                cache = fresh
            }
        }
        let skipped = assetIDs(inAlbums: options.excludedAlbums)
        let fetchOptions = PHFetchOptions()
        // 연속 촬영의 대표가 아닌 장들도 받는다 (사진 앱에서는 묶음 안에 숨어 있다)
        fetchOptions.includeAllBurstAssets = true
        fetchOptions.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: true)]
        let fetch = PHAsset.fetchAssets(with: fetchOptions)
        let total = fetch.count

        var result = PhotoScanResult()
        result.videoThreshold = options.largeVideoBytes
        // 가로·세로 픽셀과 용량이 같은 사진끼리만 그림을 비교한다 (모두 비교하면 너무 느리다)
        var candidates: [String: [(PHAsset, PhotoItem)]] = [:]
        // 비슷한 사진 후보: 찍은 시각 순 (연속 촬영의 나머지 장은 빼고)
        var timeline: [(PHAsset, PhotoItem, Date)] = []

        fetch.enumerateObjects { asset, index, stop in
            if index % 200 == 0 && isCancelled() {
                stop.pointee = true
                return
            }
            autoreleasepool {
                let id = asset.localIdentifier
                let stamp = asset.modificationDate?.timeIntervalSinceReferenceDate ?? 0
                let known = old.entries[id].flatMap { $0.modified == stamp ? $0 : nil }
                let bytes = known?.bytes ?? size(of: asset)
                fresh.entries[id] = PhotoCache.Entry(modified: stamp, bytes: bytes, hash: known?.hash)
                let item = PhotoItem(
                    id: asset.localIdentifier, bytes: bytes, isVideo: asset.mediaType == .video,
                    duration: asset.duration, created: asset.creationDate)
                result.totalCount += 1
                result.totalBytes += bytes
                if (options.skipFavorites && asset.isFavorite) || skipped.contains(asset.localIdentifier) { return }
                switch asset.mediaType {
                case .video:
                    if bytes >= options.largeVideoBytes { result.videos.append(item) }
                case .image:
                    let burstExtra = asset.burstIdentifier != nil && !asset.representsBurst
                    if asset.mediaSubtypes.contains(.photoScreenshot) { result.screenshots.append(item) }
                    if burstExtra { result.bursts.append(item) }
                    if bytes > 0 {
                        candidates["\(asset.pixelWidth)x\(asset.pixelHeight)/\(bytes)", default: []].append((asset, item))
                    }
                    if !burstExtra, let date = asset.creationDate { timeline.append((asset, item, date)) }
                default:
                    break
                }
            }
            if index % 200 == 0 { progress(.reading, index, total) }
        }
        if isCancelled() { return result }
        progress(.reading, total, total)

        func hash(_ asset: PHAsset) -> UInt64? {
            let id = asset.localIdentifier
            if let known = fresh.entries[id]?.hash { return known }
            let made = autoreleasepool { thumbnailHash(asset) }
            if let made { fresh.entries[id]?.hash = made }
            return made
        }

        // 중복: 크기·용량이 같고 작은 그림도 같은 것
        for group in candidates.values where group.count > 1 {
            if isCancelled() { return result }
            var byHash: [UInt64: [PhotoItem]] = [:]
            for (asset, item) in group {
                if let h = hash(asset) { byHash[h, default: []].append(item) }
            }
            for same in byHash.values where same.count > 1 {
                result.duplicates.append(same)  // 만든 날짜 순으로 받았으니 맨 앞이 가장 오래된 것
            }
        }
        result.duplicates.sort { wasted($0) > wasted($1) }

        // 비슷한 사진: 중복으로 이미 잡힌 사본은 빼고, 가까운 시각에 찍은 이웃이 있는 사진만 그림을 비교한다
        let copies = Set(result.duplicates.flatMap { $0.dropFirst().map(\.id) })
        let pool = timeline.filter { !copies.contains($0.1.id) }
        var needed: [Int] = []
        for i in pool.indices {
            let before = i > 0 && pool[i].2.timeIntervalSince(pool[i - 1].2) <= options.similarWindow
            let after = i + 1 < pool.count && pool[i + 1].2.timeIntervalSince(pool[i].2) <= options.similarWindow
            if before || after { needed.append(i) }
        }
        var compared: [SimilarCandidate] = []
        for (n, i) in needed.enumerated() {
            if n % 50 == 0 && isCancelled() { return result }
            if let h = hash(pool[i].0) { compared.append(SimilarCandidate(id: pool[i].1.id, date: pool[i].2, hash: h)) }
            if n % 50 == 0 { progress(.comparing, n, needed.count) }
        }
        let byID = Dictionary(pool.map { ($0.1.id, $0.1) }, uniquingKeysWith: { a, _ in a })
        result.similar = SimilarGrouper.groups(
            compared, window: options.similarWindow, maxDistance: options.similarDistance
        )
        .map { ids in ids.compactMap { byID[$0] }.sorted { $0.bytes > $1.bytes } }
        .filter { $0.count > 1 }
        result.similar.sort { wasted($0) > wasted($1) }

        result.videos.sort { $0.bytes > $1.bytes }
        result.screenshots.reverse()  // 최근 것부터
        progress(.comparing, needed.count, needed.count)
        return result
    }

    /// 묶음에서 하나를 남기고 지우면 늘어나는 공간
    static func wasted(_ group: [PhotoItem]) -> Int64 {
        group.dropFirst().reduce(0) { $0 + $1.bytes }
    }

    /// 찾지 않을 앨범에 든 사진들
    static func assetIDs(inAlbums albums: Set<String>) -> Set<String> {
        guard !albums.isEmpty else { return [] }
        var ids = Set<String>()
        PHAssetCollection.fetchAssetCollections(withLocalIdentifiers: Array(albums), options: nil)
            .enumerateObjects { collection, _, _ in
                PHAsset.fetchAssets(in: collection, options: nil).enumerateObjects { asset, _, _ in
                    ids.insert(asset.localIdentifier)
                }
            }
        return ids
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

extension PHAsset {
    /// localIdentifier로 사진을 찾는다. 연속 촬영의 대표가 아닌 장도 찾도록 includeAllBurstAssets를 켠다
    /// (기본값이면 그 장들은 없는 것처럼 빠져서 썸네일이 비고 지우기도 되지 않는다)
    static func fetch(ids: [String]) -> PHFetchResult<PHAsset> {
        let options = PHFetchOptions()
        options.includeAllBurstAssets = true
        return fetchAssets(withLocalIdentifiers: ids, options: options)
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

/// 사진마다 잰 크기와 그림 지문. 사진이 바뀌지 않았으면(수정 시각이 같으면) 다음에 다시 재지 않는다
struct PhotoCache: Codable {
    struct Entry: Codable, Equatable {
        var modified: Double
        var bytes: Int64
        /// 아직 만들지 않았거나 만들지 못했으면 nil
        var hash: UInt64?
    }

    var entries: [String: Entry] = [:]

    static var file: URL { AppFiles.url("photo-cache.plist") }

    /// UInt64를 그대로 담으려고 JSON 대신 바이너리 plist로 저장한다
    static func load(from url: URL = file) -> PhotoCache {
        guard let data = try? Data(contentsOf: url),
            let cache = try? PropertyListDecoder().decode(PhotoCache.self, from: data)
        else { return PhotoCache() }
        return cache
    }

    func save(to url: URL = file) {
        let encoder = PropertyListEncoder()
        encoder.outputFormat = .binary
        guard let data = try? encoder.encode(self) else { return }
        try? data.write(to: url, options: .atomic)
    }
}
