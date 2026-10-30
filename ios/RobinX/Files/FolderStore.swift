import Foundation

/// 사용자가 고른 폴더. iOS는 고른 폴더만 열어 주므로 북마크로 기억해 두고 다음에도 연다.
struct SavedFolder: Codable, Identifiable, Hashable {
    let id: UUID
    var name: String
    var bookmark: Data
    var lastTotal: Int64? = nil
    var lastCount: Int? = nil
    var lastScanned: Date? = nil
}

@MainActor
final class FolderStore: ObservableObject {
    @Published private(set) var folders: [SavedFolder] = []
    @Published var problem: String?

    private let key = "robinx.folders"

    init() {
        if Launch.demo {
            folders = Demo.folders
        } else if let data = UserDefaults.standard.data(forKey: key),
            let saved = try? JSONDecoder().decode([SavedFolder].self, from: data)
        {
            folders = saved
        }
    }

    /// 폴더 고르기 창에서 받은 주소를 기억한다
    func add(_ url: URL) {
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        do {
            let bookmark = try url.bookmarkData(options: [], includingResourceValuesForKeys: nil, relativeTo: nil)
            let standard = url.standardizedFileURL
            if folders.contains(where: { resolve($0)?.standardizedFileURL == standard }) { return }
            folders.append(SavedFolder(id: UUID(), name: url.lastPathComponent, bookmark: bookmark))
            save()
        } catch {
            problem = "폴더를 기억하지 못했어요. (\(error.localizedDescription))"
        }
    }

    /// 목록에서만 뺀다. 폴더와 파일은 그대로다
    func forget(_ folder: SavedFolder) {
        folders.removeAll { $0.id == folder.id }
        save()
    }

    func resolve(_ folder: SavedFolder) -> URL? {
        guard !Launch.demo else { return nil }
        var stale = false
        guard
            let url = try? URL(
                resolvingBookmarkData: folder.bookmark, options: [], relativeTo: nil, bookmarkDataIsStale: &stale)
        else { return nil }
        if stale, let index = folders.firstIndex(where: { $0.id == folder.id }) {
            // 폴더가 옮겨졌으면 새 북마크로 바꿔 둔다
            let scoped = url.startAccessingSecurityScopedResource()
            defer { if scoped { url.stopAccessingSecurityScopedResource() } }
            if let fresh = try? url.bookmarkData(options: [], includingResourceValuesForKeys: nil, relativeTo: nil) {
                folders[index].bookmark = fresh
                save()
            }
        }
        return url
    }

    func record(_ folder: SavedFolder, total: Int64, count: Int) {
        guard let index = folders.firstIndex(where: { $0.id == folder.id }) else { return }
        folders[index].lastTotal = total
        folders[index].lastCount = count
        folders[index].lastScanned = Date()
        save()
    }

    private func save() {
        guard !Launch.demo, let data = try? JSONEncoder().encode(folders) else { return }
        UserDefaults.standard.set(data, forKey: key)
    }
}

/// 폴더 하나를 훑고 지우는 일. 폴더 화면이 열려 있는 동안만 산다
@MainActor
final class FolderScan: ObservableObject {
    let folder: SavedFolder
    @Published private(set) var result: FileScanResult?
    @Published private(set) var scanning = false
    @Published private(set) var scanned = 0
    @Published var problem: String?

    init(folder: SavedFolder) {
        self.folder = folder
    }

    func scan(store: FolderStore) async {
        if Launch.demo {
            result = Demo.files
            return
        }
        guard !scanning else { return }
        guard let root = store.resolve(folder) else {
            problem = "폴더를 다시 열지 못했어요. 지워졌거나 옮겨졌을 수 있어요. 목록에서 빼고 다시 골라 주세요."
            return
        }
        scanning = true
        scanned = 0
        let found = await Task.detached(priority: .userInitiated) { () -> FileScanResult in
            let scoped = root.startAccessingSecurityScopedResource()
            defer { if scoped { root.stopAccessingSecurityScopedResource() } }
            return FileScanner.scan(root, progress: { count in
                Task { @MainActor in self.scanned = count }
            })
        }.value
        result = found
        scanning = false
        store.record(folder, total: found.totalBytes, count: found.fileCount)
    }

    /// 휴지통으로 옮긴다. 옮기지 못한 파일은 결과의 notTrashed에 남는다
    func trash(_ urls: Set<URL>, store: FolderStore) async -> FileDeleter.Outcome {
        await run(urls, store: store) { FileDeleter.trash($0) }
    }

    /// 영구 삭제. 사용자가 두 번째 확인 창에서 고른 뒤에만 부른다
    func removeForever(_ urls: Set<URL>, store: FolderStore) async -> FileDeleter.Outcome {
        await run(urls, store: store) { FileDeleter.remove($0) }
    }

    private func run(
        _ urls: Set<URL>, store: FolderStore, _ action: @escaping ([URL]) -> FileDeleter.Outcome
    ) async -> FileDeleter.Outcome {
        if Launch.demo {
            result?.remove(urls)
            return FileDeleter.Outcome(trashed: Array(urls))
        }
        guard let root = store.resolve(folder) else {
            problem = "폴더를 다시 열지 못했어요."
            return FileDeleter.Outcome()
        }
        let list = Array(urls)
        let outcome = await Task.detached(priority: .userInitiated) { () -> FileDeleter.Outcome in
            let scoped = root.startAccessingSecurityScopedResource()
            defer { if scoped { root.stopAccessingSecurityScopedResource() } }
            return action(list)
        }.value
        result?.remove(Set(outcome.trashed + outcome.removed))
        if let total = result?.totalBytes, let count = result?.fileCount {
            store.record(folder, total: total, count: count)
        }
        return outcome
    }
}
