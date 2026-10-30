import Foundation

/// 사진 보관함의 항목 하나 (PHAsset의 localIdentifier로 가리킨다)
struct PhotoItem: Identifiable, Hashable {
    let id: String
    let bytes: Int64
    let isVideo: Bool
    var duration: Double = 0
    var created: Date? = nil
}

enum PhotoKind: String, CaseIterable, Identifiable, Hashable {
    case duplicates, videos, screenshots, bursts

    var id: String { rawValue }

    var title: String {
        switch self {
        case .duplicates: "중복 사진"
        case .videos: "큰 동영상"
        case .screenshots: "스크린샷"
        case .bursts: "연속 촬영"
        }
    }

    var detail: String {
        switch self {
        case .duplicates: "내용이 똑같은 사진"
        case .videos: "50 MB 이상, 큰 것부터"
        case .screenshots: "화면을 찍은 사진"
        case .bursts: "대표 사진을 뺀 나머지 장"
        }
    }

    var symbol: String {
        switch self {
        case .duplicates: "square.on.square"
        case .videos: "video"
        case .screenshots: "iphone"
        case .bursts: "square.stack.3d.down.right"
        }
    }
}

struct PhotoScanResult {
    /// 묶음마다 가장 오래된 사진이 맨 앞
    var duplicates: [[PhotoItem]] = []
    var videos: [PhotoItem] = []
    var screenshots: [PhotoItem] = []
    var bursts: [PhotoItem] = []
    var totalCount = 0
    var totalBytes: Int64 = 0

    func items(_ kind: PhotoKind) -> [PhotoItem] {
        switch kind {
        case .duplicates: duplicates.flatMap { $0 }
        case .videos: videos
        case .screenshots: screenshots
        case .bursts: bursts
        }
    }

    /// 목록에 보일 크기. 중복은 묶음마다 하나를 남긴다고 보고 나머지만 센다
    func bytes(_ kind: PhotoKind) -> Int64 {
        switch kind {
        case .duplicates: duplicates.reduce(0) { $0 + $1.dropFirst().reduce(0) { $0 + $1.bytes } }
        default: items(kind).reduce(0) { $0 + $1.bytes }
        }
    }

    func count(_ kind: PhotoKind) -> Int {
        kind == .duplicates ? duplicates.count : items(kind).count
    }

    /// 찾은 것 전체 크기 (여러 칸에 같이 든 사진은 한 번만 센다)
    var foundBytes: Int64 {
        var seen = Set<String>()
        var sum: Int64 = 0
        let pools = duplicates.map { Array($0.dropFirst()) } + [videos, screenshots, bursts]
        for item in pools.joined() where seen.insert(item.id).inserted {
            sum += item.bytes
        }
        return sum
    }

    /// 지운 항목을 빼고, 하나만 남은 중복 묶음은 없앤다
    mutating func remove(_ ids: Set<String>) {
        let removed = (duplicates.joined().filter { ids.contains($0.id) }
            + videos.filter { ids.contains($0.id) }
            + screenshots.filter { ids.contains($0.id) }
            + bursts.filter { ids.contains($0.id) })
        var gone = Set<String>()
        for item in removed where gone.insert(item.id).inserted {
            totalCount -= 1
            totalBytes -= item.bytes
        }
        duplicates = duplicates.map { $0.filter { !ids.contains($0.id) } }.filter { $0.count > 1 }
        videos.removeAll { ids.contains($0.id) }
        screenshots.removeAll { ids.contains($0.id) }
        bursts.removeAll { ids.contains($0.id) }
    }
}
