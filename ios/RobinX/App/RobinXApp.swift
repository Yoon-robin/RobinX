import SwiftUI

@main
struct RobinXApp: App {
    @StateObject private var storage = DeviceStorage()
    @StateObject private var photos = PhotoLibrary()
    @StateObject private var folders = FolderStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(storage)
                .environmentObject(photos)
                .environmentObject(folders)
        }
    }
}

struct RootView: View {
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
                InfoView()
                    .tabItem { Label("정보", systemImage: "info.circle") }
                    .tag(AppTab.info)
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
    }
}
