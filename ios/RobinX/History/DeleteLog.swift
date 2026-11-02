import Foundation

/// 지운 기록 한 줄 (데스크톱 RobinX의 복구 기록에 해당)
struct DeleteRecord: Codable, Identifiable, Hashable {
    enum Kind: String, Codable {
        /// 사진 앱의 "최근 삭제된 항목"으로 감 (30일 동안 되살릴 수 있다)
        case photos
        /// 파일 휴지통으로 옮김
        case filesTrashed
        /// 영구 삭제 (되돌릴 수 없다)
        case filesRemoved
    }

    var id = UUID()
    let date: Date
    let kind: Kind
    /// 어디서 지웠는지 ("중복 사진", "넘겨 보며 정리", 폴더 이름)
    let source: String
    let count: Int
    let bytes: Int64
    var names: [String] = []

    /// 사진을 되살릴 수 있는 마지막 날
    var restoreUntil: Date { date.addingTimeInterval(30 * 86_400) }
}

@MainActor
final class DeleteLog: ObservableObject {
    @Published private(set) var records: [DeleteRecord] = []
    private let file = AppFiles.url("history.json")
    private let limit = 500

    init() {
        if Launch.demo {
            records = Demo.history
        } else if let data = try? Data(contentsOf: file),
            let saved = try? JSONDecoder().decode([DeleteRecord].self, from: data)
        {
            records = saved
        }
    }

    func add(_ kind: DeleteRecord.Kind, source: String, count: Int, bytes: Int64, names: [String] = []) {
        guard count > 0 else { return }
        records.insert(
            DeleteRecord(date: Date(), kind: kind, source: source, count: count, bytes: bytes, names: Array(names.prefix(3))),
            at: 0)
        if records.count > limit { records.removeLast(records.count - limit) }
        save()
    }

    /// 기록만 지운다. 지운 사진·파일에는 영향이 없다
    func clear() {
        records = []
        save()
    }

    func total(_ kind: DeleteRecord.Kind) -> Int64 {
        records.filter { $0.kind == kind }.reduce(0) { $0 + $1.bytes }
    }

    private func save() {
        guard !Launch.demo, let data = try? JSONEncoder().encode(records) else { return }
        try? data.write(to: file, options: .atomic)
    }
}
