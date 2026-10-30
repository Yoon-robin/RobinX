import XCTest

/// 진짜 사진 보관함으로 한 번: 사용자처럼 허용을 누르고, ci.sh가 넣은 시험 그림(같은 그림 두 장)을
/// 중복 1묶음으로 찾는지 본다. 지우지는 않는다.
final class PhotoLibraryUITests: XCTestCase {
    override func setUp() {
        continueAfterFailure = false
    }

    func testFindsDuplicateInRealLibrary() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-skipBoot", "YES", "-tab", "photos"]
        app.launch()

        let allow = app.buttons["사진 보관함 허용하기"]
        if allow.waitForExistence(timeout: 8) {
            allow.tap()
            // iOS 권한 창은 앱이 아니라 SpringBoard에 뜬다
            let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
            let full = springboard.buttons.matching(
                NSPredicate(format: "label CONTAINS 'Full Access' OR label CONTAINS '전체 접근'")
            ).firstMatch
            XCTAssertTrue(full.waitForExistence(timeout: 10), "권한 창의 전체 접근 단추가 보이지 않음")
            full.tap()
        }

        let found = app.descendants(matching: .any)
            .matching(NSPredicate(format: "label CONTAINS '1묶음'")).firstMatch
        let ok = found.waitForExistence(timeout: 30)
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.lifetime = .keepAlways
        add(shot)
        XCTAssertTrue(ok, "시험 그림의 중복 1묶음을 찾지 못함")
    }
}
