import CoreGraphics
import XCTest

@testable import RobinX

final class BytesTests: XCTestCase {
    func testFormat() {
        XCTAssertEqual(Bytes.format(0), "0 B")
        XCTAssertEqual(Bytes.format(999), "999 B")
        XCTAssertEqual(Bytes.format(1_500), "1.5 KB")
        XCTAssertEqual(Bytes.format(512_000_000), "512 MB")
        XCTAssertEqual(Bytes.format(23_400_000_000), "23.4 GB")
        XCTAssertEqual(Bytes.format(99_960_000), "100 MB")
        XCTAssertEqual(Bytes.format(999_970_000), "1.0 GB")
        XCTAssertEqual(Bytes.format(-5), "0 B")
    }
}

final class WordmarkTests: XCTestCase {
    /// iOS 워드마크가 데스크톱 시작 화면의 LOGO와 같은지 (시뮬레이터는 Mac의 파일을 읽을 수 있다)
    func testMatchesDesktopSplash() throws {
        let repo = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        let source = try String(contentsOf: repo.appendingPathComponent("src/components/startup-splash.tsx"), encoding: .utf8)
        let block = try XCTUnwrap(source.components(separatedBy: "const LOGO = [").dropFirst().first)
            .components(separatedBy: "\n]")[0]
        let rows = block.split(separator: "\n").compactMap { line -> String? in
            let parts = line.components(separatedBy: "\"")
            return parts.count >= 3 ? parts[1] : nil
        }
        XCTAssertEqual(rows, Wordmark.rows)
        XCTAssertEqual(Wordmark.columns, 28)
        XCTAssertTrue(Wordmark.grid.allSatisfy { $0.count == 28 })
    }
}

final class DHashTests: XCTestCase {
    private func stripes(_ seed: Int, width: Int = 300, height: Int = 200) -> CGImage {
        let ctx = CGContext(
            data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0,
            space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
        for i in 0..<12 {
            let g = CGFloat((seed * 53 + i * 29) % 256) / 255
            ctx.setFillColor(red: g, green: g, blue: g, alpha: 1)
            ctx.fill(CGRect(x: i * width / 12, y: 0, width: width / 12 + 1, height: height))
        }
        return ctx.makeImage()!
    }

    func testSameImageSameHash() {
        XCTAssertEqual(DHash.compute(stripes(1)), DHash.compute(stripes(1)))
    }

    func testResizedImageIsClose() throws {
        let a = try XCTUnwrap(DHash.compute(stripes(2)))
        let b = try XCTUnwrap(DHash.compute(stripes(2, width: 90, height: 60)))
        XCTAssertLessThanOrEqual(DHash.distance(a, b), 4)
    }

    func testDifferentImagesDiffer() throws {
        let a = try XCTUnwrap(DHash.compute(stripes(1)))
        let b = try XCTUnwrap(DHash.compute(stripes(3)))
        XCTAssertGreaterThan(DHash.distance(a, b), 8)
    }
}

final class PhotoResultTests: XCTestCase {
    private func item(_ id: String, _ bytes: Int64) -> PhotoItem {
        PhotoItem(id: id, bytes: bytes, isVideo: false)
    }

    func testDuplicateBytesKeepOne() {
        var r = PhotoScanResult()
        r.duplicates = [[item("a1", 10), item("a2", 10), item("a3", 10)]]
        XCTAssertEqual(r.bytes(.duplicates), 20)
        XCTAssertEqual(r.count(.duplicates), 1)
    }

    func testFoundBytesCountsSharedItemOnce() {
        var r = PhotoScanResult()
        r.duplicates = [[item("a1", 10), item("s1", 10)]]
        r.screenshots = [item("s1", 10), item("s2", 5)]
        XCTAssertEqual(r.foundBytes, 15)
    }

    func testRemoveDropsSingleGroups() {
        var r = PhotoScanResult()
        r.duplicates = [[item("a1", 10), item("a2", 10)], [item("b1", 4), item("b2", 4), item("b3", 4)]]
        r.screenshots = [item("a2", 10)]
        r.totalCount = 5
        r.totalBytes = 32
        r.remove([item("a2", 10), item("b3", 4)])
        XCTAssertEqual(r.duplicates.count, 1)
        XCTAssertEqual(r.duplicates[0].map(\.id), ["b1", "b2"])
        XCTAssertTrue(r.screenshots.isEmpty)
        XCTAssertEqual(r.totalCount, 3)
        XCTAssertEqual(r.totalBytes, 18)
    }

    func testRemoveFromSimilarGroups() {
        var r = PhotoScanResult()
        r.similar = [[item("s1", 30), item("s2", 20)], [item("t1", 9), item("t2", 8), item("t3", 7)]]
        XCTAssertEqual(r.bytes(.similar), 20 + 15, "묶음마다 맨 앞(가장 큰 것)을 남긴다고 본다")
        r.remove([item("s2", 20), item("t1", 9)])
        XCTAssertEqual(r.similar.map { $0.map(\.id) }, [["t2", "t3"]])
    }

    func testRemoveCountsPhotosNotInAnyList() {
        // 넘겨 보며 지운 사진은 찾아낸 칸에 없어도 전체 합계에서 빠져야 한다
        var r = PhotoScanResult()
        r.screenshots = [item("s1", 5)]
        r.totalCount = 10
        r.totalBytes = 100
        r.remove([item("x1", 30), item("x2", 20)])
        XCTAssertEqual(r.totalCount, 8)
        XCTAssertEqual(r.totalBytes, 50)
        XCTAssertEqual(r.screenshots.map(\.id), ["s1"])
    }
}

final class PhotoCacheTests: XCTestCase {
    func testRoundTripKeepsFullHash() throws {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("photo-cache-\(UUID().uuidString).plist")
        defer { try? FileManager.default.removeItem(at: url) }
        var cache = PhotoCache()
        // 2^53을 넘는 값도 그대로 돌아와야 한다 (JSON이면 깨질 수 있다)
        cache.entries["a"] = PhotoCache.Entry(modified: 12.5, bytes: 4_000_000, hash: UInt64.max - 7)
        cache.entries["b"] = PhotoCache.Entry(modified: 3, bytes: 9, hash: nil)
        cache.save(to: url)
        let loaded = PhotoCache.load(from: url)
        XCTAssertEqual(loaded.entries, cache.entries)
    }

    func testMissingFileGivesEmptyCache() {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("none-\(UUID().uuidString).plist")
        XCTAssertTrue(PhotoCache.load(from: url).entries.isEmpty)
    }
}

final class SimilarGrouperTests: XCTestCase {
    private let t0 = Date(timeIntervalSince1970: 1_700_000_000)

    private func c(_ id: String, _ seconds: TimeInterval, _ hash: UInt64) -> SimilarCandidate {
        SimilarCandidate(id: id, date: t0.addingTimeInterval(seconds), hash: hash)
    }

    func testGroupsCloseShotsTakenTogether() {
        let groups = SimilarGrouper.groups(
            [c("a", 0, 0b1111), c("b", 20, 0b0111), c("c", 35, 0b0011), c("far", 500, 0b1111)],
            window: 60, maxDistance: 2)
        XCTAssertEqual(groups, [["a", "b", "c"]])
    }

    func testSplitsWhenPictureChanges() {
        let groups = SimilarGrouper.groups(
            [c("a", 0, 0), c("b", 10, 0), c("other", 20, UInt64.max), c("d", 30, UInt64.max)],
            window: 60, maxDistance: 5)
        XCTAssertEqual(groups, [["a", "b"], ["other", "d"]])
    }

    func testIgnoresShotsOutsideWindow() {
        let groups = SimilarGrouper.groups([c("a", 0, 0), c("b", 61, 0)], window: 60, maxDistance: 5)
        XCTAssertTrue(groups.isEmpty)
    }

    func testSortsByDateFirst() {
        let groups = SimilarGrouper.groups([c("late", 30, 1), c("early", 0, 0)], window: 60, maxDistance: 2)
        XCTAssertEqual(groups, [["early", "late"]])
    }
}

final class FileScannerTests: XCTestCase {
    private var root: URL!

    override func setUpWithError() throws {
        root = FileManager.default.temporaryDirectory.appendingPathComponent("robinx-test-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        try? FileManager.default.removeItem(at: root)
    }

    @discardableResult
    private func write(_ path: String, bytes: Int, fill: UInt8 = 1, age: TimeInterval = 0) throws -> URL {
        let url = root.appendingPathComponent(path)
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try Data(repeating: fill, count: bytes).write(to: url)
        if age > 0 {
            try FileManager.default.setAttributes(
                [.modificationDate: Date().addingTimeInterval(-age)], ofItemAtPath: url.path)
        }
        return url
    }

    private var options: FileScanOptions {
        var o = FileScanOptions()
        o.largeBytes = 200_000
        o.oldAge = 100 * 86_400
        o.oldMinBytes = 50_000
        o.duplicateMinBytes = 10_000
        return o
    }

    func testFindsLargeOldAndDuplicates() throws {
        try write("big.bin", bytes: 300_000)
        try write("a/copy1.bin", bytes: 40_000, fill: 7, age: 10 * 86_400)
        try write("b/copy2.bin", bytes: 40_000, fill: 7)
        try write("b/same-size-other.bin", bytes: 40_000, fill: 9)
        try write("old.bin", bytes: 60_000, age: 400 * 86_400)
        try write("tiny.txt", bytes: 10)
        try write(".hidden", bytes: 300_000)

        let r = FileScanner.scan(root, options: options)

        XCTAssertEqual(r.fileCount, 6, "숨김 파일은 세지 않는다")
        XCTAssertEqual(r.large.map(\.path), ["big.bin"])
        XCTAssertEqual(r.old.map(\.path), ["old.bin"])
        XCTAssertEqual(r.duplicates.count, 1)
        XCTAssertEqual(r.duplicates[0].map(\.path), ["a/copy1.bin", "b/copy2.bin"], "오래된 것이 앞")
        XCTAssertEqual(Set(r.children.map(\.name)), ["big.bin", "a", "b", "old.bin", "tiny.txt"])
        XCTAssertEqual(r.children.first { $0.name == "b" }?.isFolder, true)
        XCTAssertEqual(r.children.first?.name, "big.bin")
    }

    func testSkipsExcludedFolders() throws {
        try write("keep/big.bin", bytes: 300_000)
        try write("skip/big.bin", bytes: 300_000)
        try write("skip/deeper/old.bin", bytes: 60_000, age: 400 * 86_400)
        try write("other/skip/big.bin", bytes: 300_000)
        var o = options
        o.excludedFolders = ["skip"]
        let r = FileScanner.scan(root, options: o)
        XCTAssertEqual(Set(r.large.map(\.path)), ["keep/big.bin", "other/skip/big.bin"], "바로 아래 폴더만 뺀다")
        XCTAssertTrue(r.old.isEmpty)
        XCTAssertEqual(r.fileCount, 2)
        XCTAssertFalse(r.children.contains { $0.name == "skip" })
    }

    func testStopsWhenCancelled() throws {
        try write("big.bin", bytes: 300_000)
        try write("a/copy1.bin", bytes: 20_000, fill: 4)
        try write("a/copy2.bin", bytes: 20_000, fill: 4)
        let r = FileScanner.scan(root, options: options, isCancelled: { true })
        XCTAssertEqual(r.fileCount, 0)
        XCTAssertTrue(r.duplicates.isEmpty)
    }

    func testSkipsSymlinks() throws {
        let target = try write("real.bin", bytes: 300_000)
        try FileManager.default.createSymbolicLink(
            at: root.appendingPathComponent("link.bin"), withDestinationURL: target)
        let r = FileScanner.scan(root, options: options)
        XCTAssertEqual(r.fileCount, 1)
    }

    func testRemoveUpdatesTotals() throws {
        try write("big.bin", bytes: 300_000)
        try write("x/1.bin", bytes: 40_000, fill: 3)
        try write("y/2.bin", bytes: 40_000, fill: 3)
        var r = FileScanner.scan(root, options: options)
        let before = r.totalBytes
        let big = try XCTUnwrap(r.large.first)
        let copy = try XCTUnwrap(r.duplicates.first?.last)
        r.remove([big.url, copy.url])
        XCTAssertTrue(r.large.isEmpty)
        XCTAssertTrue(r.duplicates.isEmpty)
        XCTAssertEqual(r.fileCount, 1)
        XCTAssertEqual(r.totalBytes, before - big.bytes - copy.bytes)
    }

    /// 휴지통으로 옮기거나, 옮기지 못하면 그대로 남겨 돌려준다 (먼저 영구 삭제하지 않는다)
    func testTrashNeverRemovesSilently() throws {
        let a = try write("trash-a.bin", bytes: 1_000)
        let outcome = FileDeleter.trash([a])
        print("휴지통 결과: 옮김 \(outcome.trashed.count), 못 옮김 \(outcome.notTrashed.count), 실패 \(outcome.failed.count)")
        if outcome.trashed.isEmpty {
            XCTAssertTrue(FileManager.default.fileExists(atPath: a.path), "옮기지 못한 파일은 남아 있어야 한다")
        } else {
            XCTAssertFalse(FileManager.default.fileExists(atPath: a.path))
        }
        XCTAssertEqual(outcome.trashed.count + outcome.notTrashed.count + outcome.failed.count, 1)
        XCTAssertTrue(outcome.removed.isEmpty)
    }

    func testRemoveForever() throws {
        let a = try write("gone.bin", bytes: 1_000)
        let outcome = FileDeleter.remove([a])
        XCTAssertEqual(outcome.removed, [a])
        XCTAssertFalse(FileManager.default.fileExists(atPath: a.path))
    }
}

final class UpdateTests: XCTestCase {
    func testVersionCompare() {
        XCTAssertTrue(AppVersion.isNewer("0.2.10", than: "0.2.9"))
        XCTAssertTrue(AppVersion.isNewer("1.0", than: "0.9.9"))
        XCTAssertTrue(AppVersion.isNewer("0.2.1", than: "0.2"))
        XCTAssertFalse(AppVersion.isNewer("0.2.0", than: "0.2"))
        XCTAssertFalse(AppVersion.isNewer("0.1.9", than: "0.2.0"))
    }

    func testPicksNewestIOSReleaseOnly() throws {
        // 데스크톱 릴리스(v0.9.0), 초안, ipa 없는 것은 빼고 가장 높은 ios- 버전을 고른다
        let json = """
            [
              {"tag_name": "v0.9.0", "body": "desktop", "html_url": "https://e.com/d", "draft": false, "prerelease": false,
               "assets": [{"name": "latest.json", "browser_download_url": "https://e.com/latest.json"}]},
              {"tag_name": "ios-v0.3.0", "body": "draft", "html_url": "https://e.com/3", "draft": true, "prerelease": false,
               "assets": [{"name": "RobinX.ipa", "browser_download_url": "https://e.com/3.ipa"}]},
              {"tag_name": "ios-v0.2.10", "body": "ten", "html_url": "https://e.com/210", "draft": false, "prerelease": false,
               "assets": [{"name": "RobinX.ipa", "browser_download_url": "https://e.com/210.ipa"}]},
              {"tag_name": "ios-v0.2.9", "body": null, "html_url": "https://e.com/29", "draft": false, "prerelease": false,
               "assets": [{"name": "RobinX.ipa", "browser_download_url": "https://e.com/29.ipa"}]},
              {"tag_name": "ios-v0.4.0", "body": "no ipa", "html_url": "https://e.com/4", "draft": false, "prerelease": false,
               "assets": []}
            ]
            """
        let releases = try JSONDecoder().decode([GitHubRelease].self, from: Data(json.utf8))
        let newest = try XCTUnwrap(UpdateChecker.newest(releases))
        XCTAssertEqual(newest.version, "0.2.10")
        XCTAssertEqual(newest.ipa.absoluteString, "https://e.com/210.ipa")
        XCTAssertEqual(newest.notes, "ten")
    }
}
