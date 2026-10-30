import SwiftUI

/// 첫 탭: 남은 공간과 정리할 곳
struct SummaryView: View {
    @Binding var tab: AppTab
    @EnvironmentObject private var storage: DeviceStorage
    @EnvironmentObject private var photos: PhotoLibrary
    @EnvironmentObject private var folders: FolderStore

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                TermTitle("저장공간")

                VStack(alignment: .leading, spacing: 12) {
                    Text("남은 공간")
                        .font(.subheadline)
                        .foregroundStyle(Brand.dim)
                    // 이 화면에 하나뿐인 큰 요소라 글로우를 준다
                    Text(Bytes.format(storage.available))
                        .font(Brand.mono(46, .bold))
                        .foregroundStyle(Brand.ink)
                        .brandGlow()
                        .minimumScaleFactor(0.6)
                        .lineLimit(1)
                    UsageBar(fraction: storage.usedFraction)
                    Text("\(Bytes.format(storage.total)) 중 \(Bytes.format(storage.used)) 사용")
                        .font(Brand.mono(13))
                        .foregroundStyle(Brand.dim)
                }
                .termBox(padding: 18)

                SectionLabel("정리할 곳")
                Button { tab = .photos } label: {
                    NavRow(symbol: "photo.on.rectangle", title: "사진", detail: photoDetail, value: photoValue)
                }
                .buttonStyle(RowBoxStyle())
                Button { tab = .files } label: {
                    NavRow(symbol: "folder", title: "파일", detail: fileDetail, value: fileValue)
                }
                .buttonStyle(RowBoxStyle())

                Text("앱별 용량과 시스템 데이터는 iOS가 다른 앱에 보여 주지 않아요. 설정 > 일반 > iPhone 저장 공간에서 볼 수 있어요.")
                    .font(.footnote)
                    .foregroundStyle(Brand.dim)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(16)
        }
        .pageBackground()
        .refreshable { storage.refresh() }
        .onAppear { storage.refresh() }
    }

    private var photoDetail: String {
        switch photos.access {
        case .unknown: return "중복 사진, 큰 동영상, 스크린샷 찾기"
        case .denied: return "사진 보관함을 허용하지 않았어요"
        case .full, .limited:
            guard let r = photos.result else { return photos.scanning ? "찾는 중" : "중복 사진, 큰 동영상, 스크린샷 찾기" }
            return "중복 \(r.duplicates.count)묶음 · 큰 동영상 \(r.videos.count)개 · 스크린샷 \(r.screenshots.count)장"
        }
    }

    private var photoValue: String? {
        guard let r = photos.result else { return nil }
        return Bytes.format(r.foundBytes)
    }

    private var fileDetail: String {
        folders.folders.isEmpty ? "폴더를 골라 큰 파일과 중복 파일 찾기" : "고른 폴더 \(folders.folders.count)곳"
    }

    private var fileValue: String? {
        let sizes = folders.folders.compactMap(\.lastTotal)
        return sizes.isEmpty ? nil : Bytes.format(sizes.reduce(0, +))
    }
}

/// 쓴 만큼 채운 막대 (각진 모서리)
struct UsageBar: View {
    let fraction: Double
    var height: CGFloat = 8
    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Rectangle().fill(Brand.raised)
                Rectangle()
                    .fill(Brand.ink)
                    .frame(width: geo.size.width * min(1, max(0, fraction)))
            }
        }
        .frame(height: height)
        .clipShape(RoundedRectangle(cornerRadius: 1.5))
        .accessibilityElement()
        .accessibilityLabel("사용한 비율")
        .accessibilityValue("\(Int((fraction * 100).rounded()))%")
    }
}

/// 아이콘 · 제목과 설명 · 오른쪽 값 · 화살표가 든 상자 줄
struct NavRow: View {
    let symbol: String
    let title: String
    let detail: String
    var value: String? = nil

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: symbol)
                .font(.title3)
                .foregroundStyle(Brand.strong)
                .frame(width: 30)
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.headline)
                    .foregroundStyle(Brand.strong)
                Text(detail)
                    .font(.footnote)
                    .foregroundStyle(Brand.dim)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 8)
            if let value {
                Text(value)
                    .font(Brand.mono(15, .semibold))
                    .foregroundStyle(Brand.text)
            }
            Image(systemName: "chevron.right")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(Brand.faint)
        }
        .termBox()
    }
}
