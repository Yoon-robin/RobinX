import SwiftUI
import UIKit

/// 정보 탭: 지우는 원칙, 볼 수 있는 범위, 권한, 링크
struct InfoView: View {
    @EnvironmentObject private var photos: PhotoLibrary
    @Environment(\.openURL) private var openURL

    private var version: String {
        let info = Bundle.main.infoDictionary
        let short = info?["CFBundleShortVersionString"] as? String ?? "?"
        let build = info?["CFBundleVersion"] as? String ?? "?"
        return "\(short) (\(build))"
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                TermTitle("정보")

                VStack(alignment: .leading, spacing: 8) {
                    Text("RobinX for iPhone")
                        .font(Brand.mono(17, .bold))
                        .foregroundStyle(Brand.strong)
                    Text("Windows용 RobinX와 같은 원칙으로 만든 iPhone 정리 앱이에요.")
                        .foregroundStyle(Brand.text)
                        .fixedSize(horizontal: false, vertical: true)
                    Text("버전 \(version)")
                        .font(Brand.mono(13))
                        .foregroundStyle(Brand.dim)
                }
                .termBox(padding: 18)

                SectionLabel("지우는 원칙")
                VStack(alignment: .leading, spacing: 10) {
                    bullet("직접 고른 것만 지워요. 미리 골라 두지 않아요.")
                    bullet("사진은 사진 앱의 '최근 삭제된 항목'에 30일 동안 남아요.")
                    bullet("파일은 휴지통으로 먼저 옮겨 보고, 옮기지 못한 파일은 한 번 더 물어본 뒤 영구 삭제해요.")
                }
                .termBox()

                SectionLabel("볼 수 있는 범위")
                VStack(alignment: .leading, spacing: 10) {
                    bullet("사진 보관함(허용한 경우)과 직접 고른 폴더뿐이에요.")
                    bullet("다른 앱의 캐시, 앱별 용량, 시스템 데이터는 iOS가 다른 앱에 열어 주지 않아요.")
                }
                .termBox()

                SectionLabel("권한")
                HStack {
                    Text("사진 보관함")
                        .foregroundStyle(Brand.text)
                    Spacer()
                    Text(photoAccess)
                        .font(Brand.mono(13))
                        .foregroundStyle(Brand.dim)
                }
                .termBox()
                Button("설정 열기") {
                    if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
                }
                .buttonStyle(TermButtonStyle())

                SectionLabel("링크")
                Link(destination: URL(string: "https://yoon-robin.github.io/RobinX/")!) {
                    NavRow(symbol: "desktopcomputer", title: "Windows용 RobinX", detail: "yoon-robin.github.io/RobinX")
                }
                Link(destination: URL(string: "https://github.com/Yoon-robin/RobinX")!) {
                    NavRow(symbol: "chevron.left.forwardslash.chevron.right", title: "GitHub", detail: "Yoon-robin/RobinX")
                }
            }
            .padding(16)
        }
        .pageBackground()
    }

    private var photoAccess: String {
        switch photos.access {
        case .full: "전체 접근"
        case .limited: "고른 사진만"
        case .unknown: "아직 묻지 않음"
        case .denied: "허용 안 함"
        }
    }

    private func bullet(_ text: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text("-").font(Brand.mono(14)).foregroundStyle(Brand.faint)
            Text(text)
                .foregroundStyle(Brand.text)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}
