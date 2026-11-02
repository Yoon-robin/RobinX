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
        // 사진 기준을 바꾸면 찾은 결과를 버린다 (사진 탭을 열 때 새 기준으로 다시 찾는다)
        .onChange(of: settings.photoSignature) { _ in photos.invalidate() }
    }
}
