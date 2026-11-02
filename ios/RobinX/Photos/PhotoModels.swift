import Foundation

/// 사진 보관함의 항목 하나 (PHAsset의 localIdentifier로 가리킨다)
struct PhotoItem: Identifiable, Hashable, Codable {
    let id: String
    var bytes: Int64
    let isVideo: Bool
    var duration: Double = 0
    var created: Date? = nil
}

struct PhotoScanOptions {
    var largeVideoBytes: Int64 = 50_000_000
    /// 비슷한 사진으로 묶는 dHash 거리
    var similarDistance = 8
    /// 이 시간 안에 찍은 사진끼리만 비슷한지 본다
    var similarWindow: TimeInterval = 60
    var skipFavorites = true
    /// 찾지 않을 앨범 (PHAssetCollection의 localIdentifier)
    var excludedAlbums: Set<String> = []
}

enum PhotoKind: String, CaseIterable, Identifiable, Hashable {
    case duplicates, similar, videos, screenshots, bursts

    var id: String { rawValue }

    /// 묶음으로 보여 주는 칸 (묶음마다 하나를 남긴다고 본다)
    var isGrouped: Bool { self == .duplicates || self == .similar }

    var title: String {
        switch self {
        case .duplicates: "중복 사진"
        case .similar: "비슷한 사진"
        case .videos: "큰 동영상"
        case .screenshots: "스크린샷"
        case .bursts: "연속 촬영"
        }
    }

    func detail(_ result: PhotoScanResult) -> String {
        switch self {
        case .duplicates: "내용이 똑같은 사진"
        case .similar: "1분 안에 찍은 거의 같은 사진"
        case .videos: "\(Bytes.format(result.videoThreshold)) 이상, 큰 것부터"
        case .screenshots: "화면을 찍은 사진"
        case .bursts: "대표 사진을 뺀 나머지 장"
        }
    }

    /// 묶음의 맨 앞 사진에 붙는 표시 (그 사진을 남기자는 뜻)
    var keepBadge: String {
        self == .similar ? "가장 큼" : "가장 오래됨"
    }

    var symbol: String {
        switch self {
        case .duplicates: "square.on.square"
        case .similar: "square.stack"
        case .videos: "video"
        case .screenshots: "iphone"
        case .bursts: "square.stack.3d.down.right"
        }
    }
}

struct PhotoScanResult {
    /// 묶음마다 가장 오래된 사진이 맨 앞
    var duplicates: [[PhotoItem]] = []
    /// 묶음마다 가장 큰 사진이 맨 앞
    var similar: [[PhotoItem]] = []
    var videos: [PhotoItem] = []
    var screenshots: [PhotoItem] = []
    var bursts: [PhotoItem] = []
    var totalCount = 0
    var totalBytes: Int64 = 0
    var videoThreshold: Int64 = 50_000_000

    func groups(_ kind: PhotoKind) -> [[PhotoItem]] {
        switch kind {
        case .duplicates: duplicates
        case .similar: similar
        default: []
        }
    }

    func items(_ kind: PhotoKind) -> [PhotoItem] {
        switch kind {
        case .duplicates, .similar: groups(kind).flatMap { $0 }
        case .videos: videos
        case .screenshots: screenshots
        case .bursts: bursts
        }
    }

    /// 목록에 보일 크기. 묶음은 하나를 남긴다고 보고 나머지만 센다
    func bytes(_ kind: PhotoKind) -> Int64 {
        if kind.isGrouped {
            return groups(kind).reduce(0) { $0 + $1.dropFirst().reduce(0) { $0 + $1.bytes } }
        }
        return items(kind).reduce(0) { $0 + $1.bytes }
    }

    func count(_ kind: PhotoKind) -> Int {
        kind.isGrouped ? groups(kind).count : items(kind).count
    }

    /// 찾은 것 전체 크기 (여러 칸에 같이 든 사진은 한 번만 센다)
    var foundBytes: Int64 {
        var seen = Set<String>()
        var sum: Int64 = 0
        let pools = (duplicates + similar).map { Array($0.dropFirst()) } + [videos, screenshots, bursts]
        for item in pools.joined() where seen.insert(item.id).inserted {
            sum += item.bytes
        }
        return sum
    }

    /// 지운 항목을 빼고, 하나만 남은 묶음은 없앤다
    mutating func remove(_ ids: Set<String>) {
        var gone = [String: Int64]()
        for item in items(.duplicates) + items(.similar) + videos + screenshots + bursts where ids.contains(item.id) {
            gone[item.id] = item.bytes
        }
        totalCount -= gone.count
        totalBytes -= gone.values.reduce(0, +)
        duplicates = duplicates.map { $0.filter { !ids.contains($0.id) } }.filter { $0.count > 1 }
        similar = similar.map { $0.filter { !ids.contains($0.id) } }.filter { $0.count > 1 }
        videos.removeAll { ids.contains($0.id) }
        screenshots.removeAll { ids.contains($0.id) }
        bursts.removeAll { ids.contains($0.id) }
    }
}

/// 비슷한 사진 묶기: 찍은 시각 순으로 늘어놓고, 바로 앞 사진과 시간이 가깝고 그림도 가까우면 같은 묶음
struct SimilarCandidate {
    let id: String
    let date: Date
    let hash: UInt64
}

enum SimilarGrouper {
    static func groups(_ items: [SimilarCandidate], window: TimeInterval, maxDistance: Int) -> [[String]] {
        let sorted = items.sorted { $0.date < $1.date }
        var groups: [[String]] = []
        var current: [SimilarCandidate] = []
        for item in sorted {
            if let last = current.last,
                item.date.timeIntervalSince(last.date) <= window,
                DHash.distance(last.hash, item.hash) <= maxDistance
            {
                current.append(item)
            } else {
                if current.count > 1 { groups.append(current.map(\.id)) }
                current = [item]
            }
        }
        if current.count > 1 { groups.append(current.map(\.id)) }
        return groups
    }
}
