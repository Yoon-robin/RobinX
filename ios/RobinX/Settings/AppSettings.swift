import Foundation

/// 사용자 설정. 기준값과 찾지 않을 앨범. 가짜 자료(-demo)일 때는 저장하지 않는다.
@MainActor
final class AppSettings: ObservableObject {
    static let videoChoices = [20, 50, 100, 200]  // MB
    static let fileChoices = [20, 50, 100, 500]  // MB
    static let oldChoices = [180, 365, 730]  // 일

    /// 비슷한 사진으로 묶는 기준 (dHash 64비트 중 다른 비트 수)
    enum Similarity: Int, CaseIterable, Identifiable {
        case close = 5, normal = 8, loose = 12
        var id: Int { rawValue }
        var title: String {
            switch self {
            case .close: "좁게"
            case .normal: "보통"
            case .loose: "넓게"
            }
        }
    }

    @Published var largeVideoMB: Int { didSet { store("largeVideoMB", largeVideoMB) } }
    @Published var largeFileMB: Int { didSet { store("largeFileMB", largeFileMB) } }
    @Published var oldFileDays: Int { didSet { store("oldFileDays", oldFileDays) } }
    @Published var similarity: Similarity { didSet { store("similarity", similarity.rawValue) } }
    @Published var skipFavorites: Bool { didSet { store("skipFavorites", skipFavorites) } }
    @Published var excludedAlbums: [String] { didSet { store("excludedAlbums", excludedAlbums) } }

    init() {
        let d = UserDefaults.standard
        largeVideoMB = d.object(forKey: "settings.largeVideoMB") as? Int ?? 50
        largeFileMB = d.object(forKey: "settings.largeFileMB") as? Int ?? 50
        oldFileDays = d.object(forKey: "settings.oldFileDays") as? Int ?? 365
        similarity = Similarity(rawValue: d.object(forKey: "settings.similarity") as? Int ?? 8) ?? .normal
        skipFavorites = d.object(forKey: "settings.skipFavorites") as? Bool ?? true
        excludedAlbums = d.stringArray(forKey: "settings.excludedAlbums") ?? []
    }

    private func store(_ key: String, _ value: Any) {
        guard !Launch.demo else { return }
        UserDefaults.standard.set(value, forKey: "settings." + key)
    }

    var photoOptions: PhotoScanOptions {
        PhotoScanOptions(
            largeVideoBytes: Int64(largeVideoMB) * 1_000_000, similarDistance: similarity.rawValue,
            skipFavorites: skipFavorites, excludedAlbums: Set(excludedAlbums))
    }

    /// 사진 기준이 바뀌었는지 알아보는 값 (바뀌면 찾은 결과를 버린다)
    var photoSignature: String {
        "\(largeVideoMB)|\(similarity.rawValue)|\(skipFavorites)|\(excludedAlbums.sorted().joined(separator: ","))"
    }

    func fileOptions(excluding folders: [String]) -> FileScanOptions {
        var options = FileScanOptions()
        options.largeBytes = Int64(largeFileMB) * 1_000_000
        options.oldAge = Double(oldFileDays) * 86_400
        options.excludedFolders = Set(folders)
        return options
    }

    static func ageText(_ days: Int) -> String {
        days % 365 == 0 ? "\(days / 365)년" : "\(days / 30)개월"
    }
}

/// 앱 데이터 파일 (Application Support)
enum AppFiles {
    static func url(_ name: String) -> URL {
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent(name)
    }
}
