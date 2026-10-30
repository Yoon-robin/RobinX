import Foundation

/// iPhone 전체 용량과 남은 공간. 앱별 용량과 시스템 데이터는 iOS가 다른 앱에 알려 주지 않는다.
@MainActor
final class DeviceStorage: ObservableObject {
    @Published private(set) var total: Int64 = 0
    @Published private(set) var available: Int64 = 0

    init() {
        refresh()
    }

    var used: Int64 { max(0, total - available) }
    var usedFraction: Double { total > 0 ? Double(used) / Double(total) : 0 }

    func refresh() {
        if Launch.demo {
            total = 128_000_000_000
            available = 23_400_000_000
            return
        }
        let home = URL(fileURLWithPath: NSHomeDirectory())
        guard
            let values = try? home.resourceValues(forKeys: [
                .volumeTotalCapacityKey, .volumeAvailableCapacityForImportantUsageKey,
            ])
        else { return }
        total = Int64(values.volumeTotalCapacity ?? 0)
        available = values.volumeAvailableCapacityForImportantUsage ?? 0
    }
}
