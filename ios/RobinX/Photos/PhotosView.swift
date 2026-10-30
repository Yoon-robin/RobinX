import SwiftUI
import UIKit

/// 사진 탭: 권한 묻기 → 훑기 → 칸별 목록
struct PhotosView: View {
    @EnvironmentObject private var photos: PhotoLibrary
    @Environment(\.openURL) private var openURL
    @Environment(\.scenePhase) private var scenePhase
    @State private var path: [PhotoKind] = Launch.route == "duplicates" ? [.duplicates] : []

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
            .refreshable { await photos.scan() }
            .navigationDestination(for: PhotoKind.self) { PhotoCategoryView(kind: $0) }
        }
        .task {
            if photos.canRead && photos.result == nil { await photos.scan() }
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
                Text("사진 보관함에서 중복 사진, 큰 동영상, 스크린샷, 연속 촬영을 찾아 크기를 보여 줘요.")
                    .foregroundStyle(Brand.text)
                Text("찾기만 하고, 지우는 것은 직접 고른 사진뿐이에요.")
                    .font(.footnote)
                    .foregroundStyle(Brand.dim)
                Button("사진 보관함 허용하기") { Task { await photos.requestAccess() } }
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
            if photos.scanning {
                ScanProgress(
                    label: "사진 보관함 훑는 중",
                    detail: photos.scanTotal > 0 ? "\(photos.scanned.grouped) / \(photos.scanTotal.grouped)" : nil,
                    fraction: photos.scanTotal > 0 ? Double(photos.scanned) / Double(photos.scanTotal) : nil)
            } else if let result = photos.result {
                Text("사진·동영상 \(result.totalCount.grouped)개 · \(Bytes.format(result.totalBytes))")
                    .font(Brand.mono(13))
                    .foregroundStyle(Brand.dim)
                ForEach(PhotoKind.allCases) { kind in
                    NavigationLink(value: kind) {
                        NavRow(
                            symbol: kind.symbol, title: kind.title,
                            detail: countText(kind, result),
                            value: Bytes.format(result.bytes(kind)))
                    }
                    .buttonStyle(RowBoxStyle())
                }
                Text("아래로 당기면 다시 찾아요. 지운 사진은 사진 앱의 '최근 삭제된 항목'에 30일 동안 남아요.")
                    .font(.footnote)
                    .foregroundStyle(Brand.dim)
                    .fixedSize(horizontal: false, vertical: true)
            } else {
                Button("찾기") { Task { await photos.scan() } }
                    .buttonStyle(TermButtonStyle())
            }
        }
    }

    private func countText(_ kind: PhotoKind, _ result: PhotoScanResult) -> String {
        if kind == .duplicates {
            let photos = result.duplicates.reduce(0) { $0 + $1.count }
            return "\(result.duplicates.count.grouped)묶음 · \(photos.grouped)장 · \(kind.detail)"
        }
        return "\(result.count(kind).grouped)개 · \(kind.detail)"
    }

    private func openSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
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
