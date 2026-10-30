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
        r.remove(["a2", "b3"])
        XCTAssertEqual(r.duplicates.count, 1)
        XCTAssertEqual(r.duplicates[0].map(\.id), ["b1", "b2"])
        XCTAssertTrue(r.screenshots.isEmpty)
        XCTAssertEqual(r.totalCount, 3)
        XCTAssertEqual(r.totalBytes, 18)
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
