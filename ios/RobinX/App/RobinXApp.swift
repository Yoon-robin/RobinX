import SwiftUI

@main
struct RobinXApp: App {
    @StateObject private var storage = DeviceStorage()
    @StateObject private var photos = PhotoLibrary()
    @StateObject private var folders = FolderStore()
    @StateObject private var settings = AppSettings()
    @StateObject private var log = DeleteLog()
    @StateObject private var swipe = SwipeStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(storage)
                .environmentObject(photos)
                .environmentObject(folders)
                .environmentObject(settings)
                .environmentObject(log)
                .environmentObject(swipe)
        }
    }
}

struct RootView: View {
    @EnvironmentObject private var photos: PhotoLibrary
    @EnvironmentObject private var settings: AppSettings
    @EnvironmentObject private var swipe: SwipeStore
    @State private var booted = Launch.skipBoot
    @State private var tab = Launch.initialTab

    var body: some View {
        ZStack {
            TabView(selection: $tab) {
                SummaryView(tab: $tab)
                    .tabItem { Label("저장공간", systemImage: "internaldrive") }
                    .tag(AppTab.summary)
                PhotosView()
                    .tabItem { Label("사진", systemImage: "photo.on.rectangle") }
                    .tag(AppTab.photos)
                FilesView()
                    .tabItem { Label("파일", systemImage: "folder") }
                    .tag(AppTab.files)
                HistoryView()
                    .tabItem { Label("기록", systemImage: "clock.arrow.circlepath") }
                    .tag(AppTab.history)
                SettingsView()
                    .tabItem { Label("설정", systemImage: "gearshape") }
                    .tag(AppTab.settings)
            }
            .toolbarBackground(Brand.term, for: .tabBar)
            .toolbarBackground(.visible, for: .tabBar)

            if !booted {
                BootView { booted = true }
                    .transition(.opacity)
                    .zIndex(1)
            }
        }
        .tint(Brand.strong)
        .preferredColorScheme(.dark)
        // 앱을 켜면 바로 찾기 시작한다 (저장공간 탭에서도 결과가 보이게). 전에 잰 것은 다시 재지 않아 빠르다
        .task {
            guard photos.canRead else { return }
            pruneSwipe()
            if photos.result == nil { await photos.scan(options: settings.photoOptions) }
        }
        // 사진 기준을 바꾸면 새 기준으로 다시 찾는다
        .onChange(of: settings.photoSignature) { _ in photos.settingsChanged(settings.photoOptions) }
        // 사진 앱에서 지운 사진은 넘겨 보며 표시한 목록에서도 뺀다
        .onChange(of: photos.changes) { _ in pruneSwipe() }
    }

    /// 고른 사진만 허용했을 때는 보이지 않는 사진이 지워진 것처럼 보이므로 전체 접근일 때만 정리한다
    private func pruneSwipe() {
        if photos.access == .full { swipe.prune() }
    }
}
