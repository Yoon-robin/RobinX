import CryptoKit
import Foundation

struct FileItem: Identifiable, Hashable {
    var id: URL { url }
    let url: URL
    /// 고른 폴더 기준 경로 ("Downloads/a.zip")
    let path: String
    /// 실제로 차지하는 크기 (iCloud에만 있고 내려받지 않은 파일은 거의 0)
    let bytes: Int64
    let modified: Date?

    var name: String { url.lastPathComponent }
}

/// 고른 폴더 바로 아래 항목 하나의 크기
struct ChildSize: Identifiable, Hashable {
    var id: String { name }
    let name: String
    let bytes: Int64
    let isFolder: Bool
}

struct FileScanResult {
    var totalBytes: Int64 = 0
    var fileCount = 0
    var large: [FileItem] = []
    /// 묶음마다 가장 오래된(먼저 바뀐) 파일이 맨 앞
    var duplicates: [[FileItem]] = []
    var old: [FileItem] = []
    var children: [ChildSize] = []

    /// 지운 파일을 목록에서 뺀다 (폴더별 크기는 다시 훑을 때 고친다)
    mutating func remove(_ urls: Set<URL>) {
        var gone = [URL: Int64]()
        let listed: [FileItem] = large + Array(duplicates.joined()) + old
        for item in listed where urls.contains(item.url) {
            gone[item.url] = item.bytes
        }
        totalBytes -= gone.values.reduce(0, +)
        fileCount -= gone.count
        large.removeAll { urls.contains($0.url) }
        old.removeAll { urls.contains($0.url) }
        duplicates = duplicates.map { $0.filter { !urls.contains($0.url) } }.filter { $0.count > 1 }
    }
}

struct FileScanOptions {
    var largeBytes: Int64 = 50_000_000
    /// 이만큼 바뀌지 않았고
    var oldAge: TimeInterval = 365 * 24 * 3600
    /// 이보다 큰 파일만 "오래된 파일"에 넣는다
    var oldMinBytes: Int64 = 10_000_000
    /// 이보다 작은 파일은 중복을 찾지 않는다
    var duplicateMinBytes: Int64 = 100_000
    var listLimit = 300
    var now = Date()
}

/// 고른 폴더를 훑는다 (읽기만 한다). 숨김 파일과 바로가기(심볼릭 링크)는 건너뛴다.
enum FileScanner {
    static func scan(
        _ root: URL, options: FileScanOptions = FileScanOptions(),
        isCancelled: () -> Bool = { false }, progress: (Int) -> Void = { _ in }
    ) -> FileScanResult {
        let keys: [URLResourceKey] = [
            .isRegularFileKey, .isSymbolicLinkKey, .fileSizeKey, .totalFileAllocatedSizeKey,
            .contentModificationDateKey,
        ]
        var result = FileScanResult()
        var bySize: [Int64: [FileItem]] = [:]
        var children: [String: (bytes: Int64, isFolder: Bool)] = [:]

        guard
            let walker = FileManager.default.enumerator(
                at: root, includingPropertiesForKeys: keys, options: [.skipsHiddenFiles])
        else { return result }

        for case let url as URL in walker {
            if isCancelled() { break }
            guard let values = try? url.resourceValues(forKeys: Set(keys)) else { continue }
            if values.isSymbolicLink == true { continue }
            guard values.isRegularFile == true else { continue }

            // 고른 폴더 기준 경로. /var와 /private/var가 섞여도 깊이로 자르면 맞는다
            let parts = Array(url.pathComponents.suffix(walker.level))
            let bytes = Int64(values.totalFileAllocatedSize ?? values.fileSize ?? 0)
            let item = FileItem(
                url: url, path: parts.joined(separator: "/"), bytes: bytes, modified: values.contentModificationDate)

            result.fileCount += 1
            result.totalBytes += bytes
            if let top = parts.first {
                children[top, default: (bytes: 0, isFolder: parts.count > 1)].bytes += bytes
            }
            if bytes >= options.largeBytes { result.large.append(item) }
            if let modified = item.modified, options.now.timeIntervalSince(modified) >= options.oldAge,
                bytes >= options.oldMinBytes
            {
                result.old.append(item)
            }
            if let size = values.fileSize, Int64(size) >= options.duplicateMinBytes {
                bySize[Int64(size), default: []].append(item)
            }
            if result.fileCount % 200 == 0 { progress(result.fileCount) }
        }

        // 크기가 같은 파일만 앞부분(64KB)을, 그것도 같으면 전체를 비교한다
        for same in bySize.values where same.count > 1 {
            if isCancelled() { break }
            let byHead = Dictionary(grouping: same) { digest($0.url, limit: 65_536) }
            for (head, group) in byHead where head != nil && group.count > 1 {
                let byBody = Dictionary(grouping: group) { digest($0.url, limit: nil) }
                for (body, copies) in byBody where body != nil && copies.count > 1 {
                    result.duplicates.append(
                        copies.sorted { ($0.modified ?? .distantFuture) < ($1.modified ?? .distantFuture) })
                }
            }
        }

        result.large = Array(result.large.sorted { $0.bytes > $1.bytes }.prefix(options.listLimit))
        result.old = Array(result.old.sorted { $0.bytes > $1.bytes }.prefix(options.listLimit))
        result.duplicates.sort { wasted($0) > wasted($1) }
        result.children = children.map { ChildSize(name: $0.key, bytes: $0.value.bytes, isFolder: $0.value.isFolder) }
            .sorted { $0.bytes > $1.bytes }
        progress(result.fileCount)
        return result
    }

    /// 묶음에서 하나를 남기고 지우면 늘어나는 공간
    static func wasted(_ group: [FileItem]) -> Int64 {
        group.dropFirst().reduce(0) { $0 + $1.bytes }
    }

    /// SHA-256. limit이 있으면 앞부분만 읽는다
    static func digest(_ url: URL, limit: Int?) -> String? {
        guard let handle = try? FileHandle(forReadingFrom: url) else { return nil }
        defer { try? handle.close() }
        var hasher = SHA256()
        var read = 0
        let chunk = 1 << 20
        while true {
            let want = limit.map { min(chunk, $0 - read) } ?? chunk
            if want <= 0 { break }
            let data: Data? = autoreleasepool { try? handle.read(upToCount: want) }
            guard let data, !data.isEmpty else { break }
            hasher.update(data: data)
            read += data.count
        }
        return hasher.finalize().map { String(format: "%02x", $0) }.joined()
    }
}

/// 지우기. 먼저 휴지통("최근 삭제된 항목")으로 옮겨 보고, 옮기지 못한 파일은 돌려준다.
/// 영구 삭제(remove)는 사용자가 한 번 더 확인한 뒤에만 부른다.
enum FileDeleter {
    struct Outcome {
        var trashed: [URL] = []
        var removed: [URL] = []
        /// 휴지통으로 옮기지 못한 파일
        var notTrashed: [URL] = []
        var failed: [(url: URL, reason: String)] = []
    }

    static func trash(_ urls: [URL]) -> Outcome {
        var outcome = Outcome()
        for url in urls {
            var coordinationError: NSError?
            var moved = false
            NSFileCoordinator().coordinate(writingItemAt: url, options: .forDeleting, error: &coordinationError) {
                moved = (try? FileManager.default.trashItem(at: $0, resultingItemURL: nil)) != nil
            }
            if moved {
                outcome.trashed.append(url)
            } else if let coordinationError {
                outcome.failed.append((url, coordinationError.localizedDescription))
            } else {
                outcome.notTrashed.append(url)
            }
        }
        return outcome
    }

    static func remove(_ urls: [URL]) -> Outcome {
        var outcome = Outcome()
        for url in urls {
            var coordinationError: NSError?
            var failure: Error?
            NSFileCoordinator().coordinate(writingItemAt: url, options: .forDeleting, error: &coordinationError) {
                do { try FileManager.default.removeItem(at: $0) } catch { failure = error }
            }
            if let reason = coordinationError?.localizedDescription ?? failure?.localizedDescription {
                outcome.failed.append((url, reason))
            } else {
                outcome.removed.append(url)
            }
        }
        return outcome
    }
}
