import UIKit

/// `-demo YES`로 띄울 때 쓰는 가짜 자료 (시뮬레이터 화면 캡처용). 진짜 사진·파일은 건드리지 않는다.
enum Demo {
    private static let base = Date(timeIntervalSince1970: 1_760_000_000)  // 2025-10

    private static func days(_ n: Double) -> Date { base.addingTimeInterval(n * 86_400) }

    // MARK: 사진

    static let photos: PhotoScanResult = {
        var r = PhotoScanResult()
        // 같은 그림은 "#" 앞이 같아서 썸네일도 같게 그려진다
        r.duplicates = [
            (1..<4).map { PhotoItem(id: "dup-a#\($0)", bytes: 4_820_000, isVideo: false, created: days(Double(-$0))) },
            (1..<3).map { PhotoItem(id: "dup-b#\($0)", bytes: 3_140_000, isVideo: false, created: days(Double(-20 - $0))) },
            (1..<3).map { PhotoItem(id: "dup-c#\($0)", bytes: 2_410_000, isVideo: false, created: days(Double(-40 - $0))) },
        ]
        let videos: [(Int64, Double)] = [
            (1_820_000_000, 252), (918_000_000, 131), (611_000_000, 88), (342_000_000, 49), (176_000_000, 25),
            (74_000_000, 11),
        ]
        r.videos = videos.enumerated().map { i, v in
            PhotoItem(id: "video-\(i)", bytes: v.0, isVideo: true, duration: v.1, created: days(Double(-i * 9)))
        }
        r.screenshots = (0..<24).map { i in
            PhotoItem(id: "shot-\(i)", bytes: Int64(420_000 + (i * 97_000) % 1_200_000), isVideo: false, created: days(Double(-i)))
        }
        r.bursts = (0..<9).map { i in
            PhotoItem(id: "burst-\(i)", bytes: 2_930_000, isVideo: false, created: days(-60))
        }
        r.totalCount = 8_412
        r.totalBytes = 41_700_000_000
        return r
    }()

    /// 회색 줄무늬 썸네일 (같은 이름이면 같은 그림)
    static func thumbnail(_ id: String) -> UIImage {
        let key = id.split(separator: "#").first.map(String.init) ?? id
        var seed = key.unicodeScalars.reduce(UInt32(7)) { ($0 &* 31) &+ $1.value }
        func next() -> CGFloat {
            seed = seed &* 1_103_515_245 &+ 12_345
            return CGFloat((seed >> 16) & 0xff) / 255
        }
        let side: CGFloat = 120
        return UIGraphicsImageRenderer(size: CGSize(width: side, height: side)).image { ctx in
            let top = 0.15 + next() * 0.5
            UIColor(white: top, alpha: 1).setFill()
            ctx.fill(CGRect(x: 0, y: 0, width: side, height: side))
            for _ in 0..<5 {
                UIColor(white: 0.1 + next() * 0.75, alpha: 1).setFill()
                let w = 20 + next() * 70, h = 20 + next() * 70
                ctx.fill(CGRect(x: next() * (side - w), y: next() * (side - h), width: w, height: h))
            }
        }
    }

    // MARK: 파일

    private static let root = URL(fileURLWithPath: "/demo/Downloads")

    private static func file(_ path: String, _ bytes: Int64, _ day: Double) -> FileItem {
        FileItem(url: root.appendingPathComponent(path), path: path, bytes: bytes, modified: days(day))
    }

    static let files: FileScanResult = {
        var r = FileScanResult()
        let iso = file("ubuntu-24.04.1-desktop-amd64.iso", 6_114_000_000, -420)
        let lecture = file("강의 녹화 03-14.mov", 2_310_000_000, -230)
        let backup = file("사진 백업 2023.zip", 1_420_000_000, -700)
        let patch = file("game-patch-1.8.2.pak", 812_000_000, -35)
        let slides = file("발표 자료 최종.key", 214_000_000, -12)
        let audio = file("podcast-ep42.wav", 96_000_000, -3)
        let setupOld = file("old/setup-tool-2.3.exe", 64_200_000, -510)
        r.large = [iso, lecture, backup, patch, slides, audio, setupOld]
        r.duplicates = [
            [file("old/setup-tool-2.3.exe", 64_200_000, -510), file("setup-tool-2.3.exe", 64_200_000, -90)],
            [file("보고서.pdf", 18_200_000, -61), file("보고서 (1).pdf", 18_200_000, -60)],
            [
                file("IMG_2041.HEIC", 3_400_000, -150), file("공유/IMG_2041.HEIC", 3_400_000, -149),
                file("IMG_2041 사본.HEIC", 3_400_000, -20),
            ],
        ]
        r.old = [iso, backup, setupOld]
        r.children = [
            ChildSize(name: iso.name, bytes: iso.bytes, isFolder: false),
            ChildSize(name: lecture.name, bytes: lecture.bytes, isFolder: false),
            ChildSize(name: backup.name, bytes: backup.bytes, isFolder: false),
            ChildSize(name: "old", bytes: 1_124_000_000, isFolder: true),
            ChildSize(name: patch.name, bytes: patch.bytes, isFolder: false),
            ChildSize(name: "공유", bytes: 421_000_000, isFolder: true),
            ChildSize(name: slides.name, bytes: slides.bytes, isFolder: false),
            ChildSize(name: "기타 파일 1,262개", bytes: 318_000_000, isFolder: false),
        ]
        r.totalBytes = r.children.reduce(0) { $0 + $1.bytes }
        r.fileCount = 1_284
        return r
    }()

    static let folders: [SavedFolder] = [
        SavedFolder(
            id: UUID(uuidString: "6F1C2B0E-0000-4000-8000-000000000001")!, name: "Downloads", bookmark: Data(),
            lastTotal: files.totalBytes, lastCount: files.fileCount, lastScanned: Date().addingTimeInterval(-3 * 3600)),
        SavedFolder(
            id: UUID(uuidString: "6F1C2B0E-0000-4000-8000-000000000002")!, name: "iCloud Drive", bookmark: Data(),
            lastTotal: 21_300_000_000, lastCount: 6_920, lastScanned: Date().addingTimeInterval(-26 * 3600)),
    ]
}
