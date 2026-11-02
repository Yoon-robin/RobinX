import SwiftUI
import UIKit

/// 사진 탭: 권한 묻기 → 훑기 → 칸별 목록
struct PhotosView: View {
    @EnvironmentObject private var photos: PhotoLibrary
    @EnvironmentObject private var settings: AppSettings
    @EnvironmentObject private var swipe: SwipeStore
    @Environment(\.openURL) private var openURL
    @Environment(\.scenePhase) private var scenePhase
    @State private var path: [PhotoRoute] = PhotoRoute.initial

    var body: some View {
        NavigationStack(path: $path) {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    TermTitle("사진")
                    content
                }
                .padding(16)
            }
            .pageBackground()
            .toolbar(.hidden, for: .navigationBar)
            .refreshable { await photos.scan(options: settings.photoOptions) }
            .navigationDestination(for: PhotoRoute.self) { route in
                switch route {
                case .kind(let kind): PhotoCategoryView(kind: kind)
                case .swipe: SwipeSortView()
                }
            }
        }
        // 탭을 열 때마다: 결과가 없으면(처음이거나 설정이 바뀌었으면) 찾는다
        .task {
            if photos.canRead && photos.result == nil { await photos.scan(options: settings.photoOptions) }
        }
        .onChange(of: scenePhase) { phase in
            if phase == .active { photos.refreshAccess() }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch photos.access {
        case .unknown:
            VStack(alignment: .leading, spacing: 14) {
                Text("사진 보관함에서 중복·비슷한 사진, 큰 동영상, 스크린샷, 연속 촬영을 찾아 크기를 보여 줘요.")
                    .foregroundStyle(Brand.text)
                Text("찾기만 하고, 지우는 것은 직접 고른 사진뿐이에요.")
                    .font(.footnote)
                    .foregroundStyle(Brand.dim)
                Button("사진 보관함 허용하기") { Task { await photos.requestAccess(options: settings.photoOptions) } }
                    .buttonStyle(TermButtonStyle())
            }
            .termBox(padding: 18)
        case .denied:
            VStack(alignment: .leading, spacing: 14) {
                Text("사진 보관함을 허용하지 않았어요. 설정에서 RobinX의 사진 접근을 '전체 접근'으로 바꾸면 찾을 수 있어요.")
                    .foregroundStyle(Brand.text)
                    .fixedSize(horizontal: false, vertical: true)
                Button("설정 열기") { openSettings() }
                    .buttonStyle(TermButtonStyle())
            }
            .termBox(padding: 18)
        case .full, .limited:
            if photos.access == .limited {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Image(systemName: "exclamationmark.circle").foregroundStyle(Brand.amber)
                    Text("고른 사진만 허용했어요. 모든 사진에서 찾으려면 설정에서 '전체 접근'으로 바꿔 주세요.")
                        .font(.footnote)
                        .foregroundStyle(Brand.text)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .termBox()
                .onTapGesture { openSettings() }
            }
            NavigationLink(value: PhotoRoute.swipe) {
                NavRow(
                    symbol: "hand.draw", title: "넘겨 보며 정리",
                    detail: swipe.marked.isEmpty
                        ? "왼쪽으로 밀면 지울 것, 오른쪽으로 밀면 남길 것"
                        : "지울 것 \(swipe.marked.count.grouped)장 표시함 · 이어서 넘기기",
                    value: swipe.marked.isEmpty ? nil : Bytes.format(swipe.markedBytes))
            }
            .buttonStyle(RowBoxStyle())
            SectionLabel("찾아낸 것")
            if let result = photos.result {
                // 결과가 있으면 그대로 보여 주고, 다시 찾는 동안은 한 줄만 띄운다
                if photos.scanning {
                    HStack(spacing: 8) {
                        ProgressView().controlSize(.small).tint(Brand.dim)
                        Text("다시 찾는 중")
                        Spacer()
                        if photos.scanTotal > 0 { Text(progressText) }
                    }
                    .font(Brand.mono(13))
                    .foregroundStyle(Brand.dim)
                } else {
                    Text("사진·동영상 \(result.totalCount.grouped)개 · \(Bytes.format(result.totalBytes))")
                        .font(Brand.mono(13))
                        .foregroundStyle(Brand.dim)
                }
                ForEach(PhotoKind.allCases) { kind in
                    NavigationLink(value: PhotoRoute.kind(kind)) {
                        NavRow(
                            symbol: kind.symbol, title: kind.title,
                            detail: countText(kind, result),
                            value: Bytes.format(result.bytes(kind)))
                    }
                    .buttonStyle(RowBoxStyle())
                }
                Text("사진 앱에서 지우거나 새로 찍으면 다시 찾아요. 지운 사진은 사진 앱의 '최근 삭제된 항목'에 30일 동안 남아요.")
                    .font(.footnote)
                    .foregroundStyle(Brand.dim)
                    .fixedSize(horizontal: false, vertical: true)
            } else if photos.scanning {
                ScanProgress(
                    label: photos.stage == .reading ? "사진 보관함 훑는 중" : "비슷한 사진 비교하는 중",
                    detail: photos.scanTotal > 0 ? progressText : nil,
                    fraction: photos.scanTotal > 0 ? Double(photos.scanned) / Double(photos.scanTotal) : nil)
            } else {
                Button("찾기") { Task { await photos.scan(options: settings.photoOptions) } }
                    .buttonStyle(TermButtonStyle())
            }
        }
    }

    private var progressText: String {
        "\(photos.scanned.grouped) / \(photos.scanTotal.grouped)"
    }

    private func countText(_ kind: PhotoKind, _ result: PhotoScanResult) -> String {
        if kind.isGrouped {
            let groups = result.groups(kind)
            let photos = groups.reduce(0) { $0 + $1.count }
            return "\(groups.count.grouped)묶음 · \(photos.grouped)장 · \(kind.detail(result))"
        }
        return "\(result.count(kind).grouped)개 · \(kind.detail(result))"
    }

    private func openSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
    }
}

/// 사진 탭 안에서 여는 화면
enum PhotoRoute: Hashable {
    case kind(PhotoKind)
    case swipe

    /// 화면 캡처용 실행 인자 (-route duplicates|similar|viewer|swipe)
    static var initial: [PhotoRoute] {
        switch Launch.route {
        case "duplicates": [.kind(.duplicates)]
        case "similar", "viewer": [.kind(.similar)]
        case "swipe": [.swipe]
        default: []
        }
    }
}

/// 훑는 동안 보이는 상자: 글자 + 진행 막대(알 수 있을 때)
struct ScanProgress: View {
    let label: String
    var detail: String? = nil
    var fraction: Double? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                ProgressView().controlSize(.small).tint(Brand.dim)
                Text(label).foregroundStyle(Brand.text)
                Spacer()
                if let detail {
                    Text(detail).font(Brand.mono(13)).foregroundStyle(Brand.dim)
                }
            }
            if let fraction {
                UsageBar(fraction: fraction)
            }
        }
        .termBox(padding: 16)
    }
}
