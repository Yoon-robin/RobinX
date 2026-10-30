import Foundation

/// 실행 인자로 바꾸는 동작 (시뮬레이터 화면 캡처용, ios/scripts/ci.sh).
/// `-demo YES`면 진짜 사진·파일 대신 가짜 자료를 보여 주고 아무것도 지우지 않는다.
enum Launch {
    private static let defaults = UserDefaults.standard

    static let demo = defaults.bool(forKey: "demo")
    static let skipBoot = defaults.bool(forKey: "skipBoot")
    /// 시작 화면을 닫지 않고 둔다
    static let bootHold = defaults.bool(forKey: "bootHold")
    static let initialTab = AppTab(rawValue: defaults.string(forKey: "tab") ?? "") ?? .summary
    /// 처음부터 열어 둘 하위 화면: "duplicates"(사진), "folder"(파일의 첫 폴더)
    static let route = defaults.string(forKey: "route")
}

enum AppTab: String, Hashable {
    case summary, photos, files, info
}
