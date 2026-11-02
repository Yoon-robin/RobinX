import Foundation
import SwiftUI

/// GitHub Release에 올린 iPhone 버전 하나 (태그 `ios-v0.2.0`, 파일 `RobinX.ipa`)
struct AppRelease: Equatable {
    let version: String
    let notes: String
    let ipa: URL
    let page: URL
}

/// 새 버전 알림. iOS는 앱이 스스로 바꿔 설치하게 두지 않으므로, 알려 주고 ipa를 받게 하는 데까지만 한다.
/// 설치는 LiveContainer 같은 설치 앱에서 사용자가 한다
@MainActor
final class UpdateChecker: ObservableObject {
    enum State: Equatable {
        case idle, checking, latest
        case available(AppRelease)
        case failed
    }

    @Published private(set) var state: State = .idle

    static let current = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0"
    private static let api = URL(string: "https://api.github.com/repos/Yoon-robin/RobinX/releases?per_page=100")!

    var available: AppRelease? {
        if case .available(let release) = state { return release }
        return nil
    }

    init() {
        if Launch.demo {
            state = Launch.demoUpdate ? .available(Demo.release) : .latest
        }
    }

    /// 앱을 켤 때와 설정에서 "새 버전 확인"을 누를 때. GitHub에만 접속하고, 보내는 것은 없다
    func check() async {
        guard !Launch.demo, state != .checking else { return }
        state = .checking
        var request = URLRequest(url: Self.api, timeoutInterval: 15)
        request.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
        request.setValue("RobinX-iOS/\(Self.current)", forHTTPHeaderField: "User-Agent")
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard (response as? HTTPURLResponse)?.statusCode == 200 else {
                state = .failed
                return
            }
            let releases = try JSONDecoder().decode([GitHubRelease].self, from: data)
            if let newest = Self.newest(releases), AppVersion.isNewer(newest.version, than: Self.current) {
                state = .available(newest)
            } else {
                state = .latest
            }
        } catch {
            state = .failed
        }
    }

    /// iPhone용 릴리스(`ios-v`로 시작하고 ipa가 붙은 것) 중 가장 높은 버전
    nonisolated static func newest(_ releases: [GitHubRelease]) -> AppRelease? {
        releases.compactMap { release -> AppRelease? in
            guard !release.draft, !release.prerelease, release.tagName.hasPrefix("ios-v"),
                let ipa = release.assets.first(where: { $0.name.hasSuffix(".ipa") })
            else { return nil }
            return AppRelease(
                version: String(release.tagName.dropFirst("ios-v".count)), notes: release.body ?? "",
                ipa: ipa.url, page: release.page)
        }
        .max { AppVersion.isNewer($1.version, than: $0.version) }
    }
}

/// GitHub API가 주는 릴리스 (필요한 칸만)
struct GitHubRelease: Decodable {
    struct Asset: Decodable {
        let name: String
        let url: URL
        enum CodingKeys: String, CodingKey {
            case name
            case url = "browser_download_url"
        }
    }

    let tagName: String
    let body: String?
    let page: URL
    let draft: Bool
    let prerelease: Bool
    let assets: [Asset]

    enum CodingKeys: String, CodingKey {
        case body, draft, prerelease, assets
        case tagName = "tag_name"
        case page = "html_url"
    }
}

/// "0.2.10" > "0.2.9"처럼 점으로 나눈 숫자로 비교한다. 숫자가 아닌 칸은 0으로 본다
enum AppVersion {
    static func isNewer(_ a: String, than b: String) -> Bool {
        let x = parts(a), y = parts(b)
        for i in 0..<max(x.count, y.count) {
            let l = i < x.count ? x[i] : 0
            let r = i < y.count ? y[i] : 0
            if l != r { return l > r }
        }
        return false
    }

    private static func parts(_ version: String) -> [Int] {
        version.split(separator: ".").map { Int($0.prefix { $0.isNumber }) ?? 0 }
    }
}

/// 새 버전 상자: 바뀐 점, ipa 받기, 설치 방법
struct UpdateBox: View {
    let release: AppRelease
    @Environment(\.openURL) private var openURL

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text("[NEW ]").font(Brand.mono(13, .semibold)).foregroundStyle(Brand.amber)
                Text("새 버전 \(release.version)")
                    .font(Brand.mono(15, .bold))
                    .foregroundStyle(Brand.strong)
                Spacer()
                Text("지금 \(UpdateChecker.current)").font(Brand.mono(12)).foregroundStyle(Brand.dim)
            }
            if !release.notes.isEmpty {
                Text(release.notes)
                    .font(.footnote)
                    .foregroundStyle(Brand.text)
                    .lineLimit(8)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Button {
                openURL(release.ipa)
            } label: {
                Label("ipa 받기", systemImage: "arrow.down.circle")
            }
            .buttonStyle(TermButtonStyle())
            Text("받은 ipa는 파일 앱의 다운로드 폴더에 있어요. LiveContainer에서 + 단추로 그 파일을 골라 설치해 주세요.")
                .font(.footnote)
                .foregroundStyle(Brand.dim)
                .fixedSize(horizontal: false, vertical: true)
        }
        .termBox(padding: 16)
    }
}
