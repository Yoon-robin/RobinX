import Foundation

/// 찾기를 멈추라는 표시. 화면(메인 스레드)에서 세우고, 뒤에서 도는 찾기가 읽는다
final class ScanFlag: @unchecked Sendable {
    private let lock = NSLock()
    private var value = false

    var cancelled: Bool {
        lock.lock()
        defer { lock.unlock() }
        return value
    }

    func cancel() {
        lock.lock()
        value = true
        lock.unlock()
    }
}
