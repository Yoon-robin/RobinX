import SwiftUI
import UIKit

/// 설정 탭: 찾는 기준, 찾지 않을 앨범·폴더, 그리고 앱 정보(지우는 원칙, 범위, 권한, 링크)
struct SettingsView: View {
    @EnvironmentObject private var settings: AppSettings
    @EnvironmentObject private var photos: PhotoLibrary
    @EnvironmentObject private var folders: FolderStore
    @EnvironmentObject private var swipe: SwipeStore
    @Environment(\.openURL) private var openURL
    @State private var path: [SettingsRoute] = Launch.route == "albums" ? [.albums] : []

    private var version: String {
        let info = Bundle.main.infoDictionary
        let short = info?["CFBundleShortVersionString"] as? String ?? "?"
        let build = info?["CFBundleVersion"] as? String ?? "?"
        return "\(short) (\(build))"
    }

    var body: some View {
        NavigationStack(path: $path) {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    TermTitle("설정")
                    photoSection
                    fileSection
                    infoSection
                }
                .padding(16)
            }
            .pageBackground()
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(for: SettingsRoute.self) { route in
                switch route {
                case .albums: AlbumPickerView()
                }
            }
        }
    }

    // MARK: - 사진

    private var photoSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionLabel("사진")
            VStack(spacing: 0) {
                pickerRow("큰 동영상", value: "\(settings.largeVideoMB) MB 이상") {
                    Picker("큰 동영상", selection: $settings.largeVideoMB) {
                        ForEach(AppSettings.videoChoices, id: \.self) { Text("\($0) MB 이상").tag($0) }
                    }
                }
                divider
                pickerRow("비슷한 사진 기준", value: settings.similarity.title) {
                    Picker("비슷한 사진 기준", selection: $settings.similarity) {
                        ForEach(AppSettings.Similarity.allCases) { Text($0.title).tag($0) }
                    }
                }
                divider
                Toggle(isOn: $settings.skipFavorites) {
                    Text("즐겨찾기한 사진은 찾지 않기").foregroundStyle(Brand.text)
                }
                .tint(Brand.dim)
                .padding(.vertical, 10)
                .padding(.horizontal, 12)
                divider
                NavigationLink(value: SettingsRoute.albums) {
                    HStack {
                        Text("찾지 않을 앨범").foregroundStyle(Brand.text)
                        Spacer()
                        Text("\(settings.excludedAlbums.count)개")
                            .font(Brand.mono(13))
                            .foregroundStyle(Brand.dim)
                        Image(systemName: "chevron.right").font(.footnote).foregroundStyle(Brand.faint)
                    }
                    .padding(.vertical, 12)
                    .padding(.horizontal, 12)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
            .listBox()
            Text("비슷한 사진은 1분 안에 찍은 사진끼리 비교해요. '넓게'는 더 많이 묶지만 다른 사진이 섞일 수 있어요.")
                .font(.footnote)
                .foregroundStyle(Brand.dim)
                .fixedSize(horizontal: false, vertical: true)

            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text("넘겨 보며 남긴 사진").foregroundStyle(Brand.text)
                    Text("\(swipe.kept.count.grouped)장은 다시 보여 주지 않아요")
                        .font(.caption)
                        .foregroundStyle(Brand.dim)
                }
                Spacer()
                Button("다시 보기") { swipe.forgetKept() }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Brand.strong)
                    .disabled(swipe.kept.isEmpty)
            }
            .termBox()
        }
    }

    // MARK: - 파일

    private var fileSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionLabel("파일")
            VStack(spacing: 0) {
                pickerRow("큰 파일", value: "\(settings.largeFileMB) MB 이상") {
                    Picker("큰 파일", selection: $settings.largeFileMB) {
                        ForEach(AppSettings.fileChoices, id: \.self) { Text("\($0) MB 이상").tag($0) }
                    }
                }
                divider
                pickerRow("오래된 파일", value: "\(AppSettings.ageText(settings.oldFileDays)) 넘게 그대로") {
                    Picker("오래된 파일", selection: $settings.oldFileDays) {
                        ForEach(AppSettings.oldChoices, id: \.self) { Text("\(AppSettings.ageText($0)) 넘게 그대로").tag($0) }
                    }
                }
            }
            .listBox()

            let excluded = folders.folders.filter { !$0.excludedNames.isEmpty }
            if excluded.isEmpty {
                Text("폴더 화면의 '폴더별'에서 폴더를 길게 누르면 그 폴더를 찾지 않게 할 수 있어요.")
                    .font(.footnote)
                    .foregroundStyle(Brand.dim)
                    .fixedSize(horizontal: false, vertical: true)
            } else {
                VStack(spacing: 0) {
                    ForEach(excluded) { folder in
                        ForEach(folder.excludedNames, id: \.self) { name in
                            HStack {
                                Image(systemName: "eye.slash").foregroundStyle(Brand.dim).frame(width: 22)
                                Text("\(folder.name)/\(name)")
                                    .foregroundStyle(Brand.text)
                                    .lineLimit(1)
                                    .truncationMode(.middle)
                                Spacer()
                                Button("다시 찾기") { folders.include(folder, name: name) }
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(Brand.strong)
                            }
                            .padding(.vertical, 10)
                            .padding(.horizontal, 12)
                            .overlay(alignment: .bottom) { Rectangle().fill(Brand.border).frame(height: 1) }
                        }
                    }
                }
                .listBox()
            }
        }
    }

    // MARK: - 정보

    private var infoSection: some View {
        VStack(alignment: .leading, spacing: 10) {
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
                Text("사진 보관함").foregroundStyle(Brand.text)
                Spacer()
                Text(photoAccess).font(Brand.mono(13)).foregroundStyle(Brand.dim)
            }
            .termBox()
            Button("iPhone 설정 열기") {
                if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
            }
            .buttonStyle(TermButtonStyle())

            SectionLabel("RobinX")
            VStack(alignment: .leading, spacing: 6) {
                Text("RobinX for iPhone")
                    .font(Brand.mono(15, .bold))
                    .foregroundStyle(Brand.strong)
                Text("Windows용 RobinX와 같은 원칙으로 만든 iPhone 정리 앱이에요.")
                    .foregroundStyle(Brand.text)
                    .fixedSize(horizontal: false, vertical: true)
                Text("버전 \(version)").font(Brand.mono(13)).foregroundStyle(Brand.dim)
            }
            .termBox()
            Link(destination: URL(string: "https://yoon-robin.github.io/RobinX/")!) {
                NavRow(symbol: "desktopcomputer", title: "Windows용 RobinX", detail: "yoon-robin.github.io/RobinX")
            }
            Link(destination: URL(string: "https://github.com/Yoon-robin/RobinX")!) {
                NavRow(symbol: "chevron.left.forwardslash.chevron.right", title: "GitHub", detail: "Yoon-robin/RobinX")
            }
        }
    }

    // MARK: - 조각

    private func pickerRow<P: View>(_ title: String, value: String, @ViewBuilder picker: () -> P) -> some View {
        Menu {
            picker()
        } label: {
            HStack {
                Text(title).foregroundStyle(Brand.text)
                Spacer()
                Text(value).font(Brand.mono(13)).foregroundStyle(Brand.dim)
                Image(systemName: "chevron.up.chevron.down").font(.footnote).foregroundStyle(Brand.faint)
            }
            .padding(.vertical, 12)
            .padding(.horizontal, 12)
            .contentShape(Rectangle())
        }
        .accessibilityLabel(title)
        .accessibilityValue(value)
    }

    private var divider: some View {
        Rectangle().fill(Brand.border).frame(height: 1)
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

enum SettingsRoute: Hashable {
    case albums
}

/// 찾지 않을 앨범 고르기. 고른 앨범의 사진은 중복·비슷한 사진·넘겨 보기에서 빠진다
struct AlbumPickerView: View {
    @EnvironmentObject private var settings: AppSettings
    @EnvironmentObject private var photos: PhotoLibrary
    @State private var albums: [AlbumInfo] = []

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text("고른 앨범에 든 사진은 찾지도, 넘겨 보기에 보여 주지도 않아요.")
                    .font(.footnote)
                    .foregroundStyle(Brand.dim)
                    .fixedSize(horizontal: false, vertical: true)
                if !photos.canRead {
                    Text("사진 탭에서 사진 보관함을 먼저 허용해 주세요.")
                        .foregroundStyle(Brand.dim)
                        .termBox(padding: 18)
                } else if albums.isEmpty {
                    Text("앨범이 없어요.")
                        .foregroundStyle(Brand.dim)
                        .termBox(padding: 18)
                } else {
                    VStack(spacing: 0) {
                        ForEach(albums) { album in
                            let on = settings.excludedAlbums.contains(album.id)
                            Button {
                                if on {
                                    settings.excludedAlbums.removeAll { $0 == album.id }
                                } else {
                                    settings.excludedAlbums.append(album.id)
                                }
                            } label: {
                                HStack(spacing: 12) {
                                    Image(systemName: on ? "checkmark.square.fill" : "square")
                                        .font(.title3)
                                        .foregroundStyle(on ? Brand.strong : Brand.faint)
                                    Text(album.title).foregroundStyle(Brand.text).lineLimit(1)
                                    Spacer()
                                    Text("\(album.count.grouped)").font(Brand.mono(13)).foregroundStyle(Brand.dim)
                                }
                                .padding(.vertical, 10)
                                .padding(.horizontal, 12)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                            .accessibilityAddTraits(on ? .isSelected : [])
                            .overlay(alignment: .bottom) { Rectangle().fill(Brand.border).frame(height: 1) }
                        }
                    }
                    .listBox()
                }
            }
            .padding(16)
        }
        .pageBackground()
        .navigationTitle("찾지 않을 앨범")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Brand.term, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .task { albums = PhotoLibrary.albums() }
    }
}

private extension View {
    /// 줄로 나뉜 목록 상자
    func listBox() -> some View {
        background(Brand.term, in: RoundedRectangle(cornerRadius: Brand.radius))
            .clipShape(RoundedRectangle(cornerRadius: Brand.radius))
            .overlay(RoundedRectangle(cornerRadius: Brand.radius).strokeBorder(Brand.borderWindow, lineWidth: 1))
    }
}
