import Foundation

/// 크기 표시. iOS 설정 앱처럼 1000 단위로 센다: "23.4 GB", "512 MB", "0 B"
enum Bytes {
    private static let units = ["B", "KB", "MB", "GB", "TB"]

    static func format(_ n: Int64) -> String {
        var value = Double(max(0, n))
        var i = 0
        while value >= 1000 && i < units.count - 1 {
            value /= 1000
            i += 1
        }
        if i == 0 { return "\(Int(value)) B" }
        // 반올림해서 1000이 되면 다음 단위로 (999.97 MB → 1.0 GB)
        if value.rounded() >= 1000 && i < units.count - 1 {
            value /= 1000
            i += 1
        }
        if value >= 99.95 { return "\(Int(value.rounded())) \(units[i])" }
        return String(format: "%.1f %@", value, units[i])
    }
}

extension Int {
    /// "1,234"
    var grouped: String { formatted(.number.grouping(.automatic)) }
}
