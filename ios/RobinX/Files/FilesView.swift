import SwiftUI
import UniformTypeIdentifiers

/// 파일 탭: 고른 폴더 목록과 폴더 고르기
struct FilesView: View {
    @EnvironmentObject private var store: FolderStore
    @State private var picking = false
    @State private var path: [SavedFolder] =
        Launch.demo && Launch.route == "folder" ? Array(Demo.folders.prefix(1)) : []

    var body: some View {
        NavigationStack(path: $path) {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    TermTitle("파일")
                    Text("고른 폴더 안에서 큰 파일, 내용이 같은 파일, 오래된 파일을 찾아요.")
                        .foregroundStyle(Brand.text)
                        .fixedSize(horizontal: false, vertical: true)
                    if let problem = store.problem {
                        FailLine(text: problem)
                    }
                    ForEach(store.folders) { folder in
                        NavigationLink(value: folder) {
                            NavRow(
                                symbol: "folder", title: folder.name, detail: detail(folder),
                                value: folder.lastTotal.map(Bytes.format))
                        }
                        .buttonStyle(RowBoxStyle())
                        .contextMenu {
                            Button("목록에서 빼기", role: .destructive) { store.forget(folder) }
                        }
                    }
                    Button {
                        store.problem = nil
                        picking = true
                    } label: {
                        Label("폴더 고르기", systemImage: "folder.badge.plus")
                    }
                    .buttonStyle(TermButtonStyle())
                    Text("나의 iPhone, iCloud Drive, 그리고 파일 앱에 보이는 다른 앱의 폴더를 고를 수 있어요. 다른 앱 안쪽의 캐시와 시스템 데이터는 iOS가 열어 주지 않아요.\n폴더를 길게 누르면 목록에서 뺄 수 있어요. 목록에서 빼도 폴더와 파일은 그대로예요.")
                        .font(.footnote)
                        .foregroundStyle(Brand.dim)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(16)
            }
            .pageBackground()
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(for: SavedFolder.self) { FolderDetailView(folder: $0) }
            .fileImporter(isPresented: $picking, allowedContentTypes: [.folder]) { result in
                switch result {
                case .success(let url): store.add(url)
                case .failure(let error): store.problem = "폴더를 열지 못했어요. (\(error.localizedDescription))"
                }
            }
        }
    }

    private func detail(_ folder: SavedFolder) -> String {
        guard let count = folder.lastCount, let date = folder.lastScanned else { return "아직 찾지 않음" }
        return "파일 \(count.grouped)개 · \(date.formatted(.relative(presentation: .named))) 찾음"
    }
}

/// 빨간 [FAIL] 줄
struct FailLine: View {
    let text: String
    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text("[FAIL]").font(Brand.mono(13, .semibold)).foregroundStyle(Brand.red)
            Text(text)
                .font(.footnote)
                .foregroundStyle(Brand.text)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

/// [ OK ] 줄
struct OkLine: View {
    let text: String
    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text("[ OK ]").font(Brand.mono(13, .semibold)).foregroundStyle(Brand.strong)
            Text(text)
                .font(.footnote)
                .foregroundStyle(Brand.text)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}
