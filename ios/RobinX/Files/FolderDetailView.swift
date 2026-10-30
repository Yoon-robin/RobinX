import SwiftUI

/// 폴더 하나: 큰 파일 · 중복 · 오래된 파일 · 폴더별 크기.
/// 미리 골라 두지 않는다. 지울 때는 휴지통으로 먼저 옮겨 보고, 옮기지 못한 파일만 한 번 더 물어 영구 삭제한다.
struct FolderDetailView: View {
    let folder: SavedFolder

    @EnvironmentObject private var store: FolderStore
    @StateObject private var scan: FolderScan
    @Environment(\.openURL) private var openURL
    @Environment(\.dismiss) private var dismiss

    @State private var section: Part = .large
    @State private var selection = Set<URL>()
    @State private var confirming = false
    @State private var leftovers: [URL] = []
    @State private var askForever = false
    @State private var working = false
    @State private var notices: [String] = []
    @State private var failures: [String] = []

    enum Part: String, CaseIterable, Identifiable {
        case large, duplicates, old, children
        var id: String { rawValue }
        var title: String {
            switch self {
            case .large: "큰 파일"
            case .duplicates: "중복"
            case .old: "오래됨"
            case .children: "폴더별"
            }
        }
        var note: String {
            switch self {
            case .large: "50 MB 이상, 큰 것부터"
            case .duplicates: "내용이 똑같은 파일 (100 KB 이상)"
            case .old: "1년 넘게 바뀌지 않은 10 MB 이상 파일"
            case .children: "고른 폴더 바로 아래 항목의 크기"
            }
        }
    }

    init(folder: SavedFolder) {
        self.folder = folder
        _scan = StateObject(wrappedValue: FolderScan(folder: folder))
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                if let problem = scan.problem { FailLine(text: problem) }
                if scan.scanning && scan.result == nil {
                    ScanProgress(label: "파일 훑는 중", detail: "\(scan.scanned.grouped)개")
                }
                if let result = scan.result {
                    Text("\(Bytes.format(result.totalBytes)) · 파일 \(result.fileCount.grouped)개")
                        .font(Brand.mono(13))
                        .foregroundStyle(Brand.dim)
                    Picker("보기", selection: $section) {
                        ForEach(Part.allCases) { Text($0.title).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    Text(section.note)
                        .font(.footnote)
                        .foregroundStyle(Brand.dim)
                    ForEach(notices, id: \.self) { OkLine(text: $0) }
                    ForEach(failures, id: \.self) { FailLine(text: $0) }
                    list(result)
                }
            }
            .padding(16)
        }
        .pageBackground()
        .navigationTitle(folder.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Brand.term, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Menu {
                    if section == .duplicates, let result = scan.result, !result.duplicates.isEmpty {
                        Button("묶음마다 가장 오래된 것만 남기고 고르기") {
                            selection = Set(result.duplicates.flatMap { $0.dropFirst().map(\.url) })
                        }
                    }
                    Button("고른 것 풀기") { selection = [] }
                        .disabled(selection.isEmpty)
                    Button("다시 찾기") { Task { await scan.scan(store: store) } }
                    Button("목록에서 빼기", role: .destructive) {
                        store.forget(folder)
                        dismiss()
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
                .accessibilityLabel("더 보기")
            }
        }
        .refreshable { await scan.scan(store: store) }
        .task { if scan.result == nil { await scan.scan(store: store) } }
        .onChange(of: section) { _ in selection = [] }
        .safeAreaInset(edge: .bottom) {
            if !selection.isEmpty {
                Button {
                    confirming = true
                } label: {
                    Text(working ? "지우는 중" : "고른 \(selection.count.grouped)개 지우기 · \(Bytes.format(selectedBytes))")
                }
                .buttonStyle(TermButtonStyle(tone: Brand.red))
                .disabled(working)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(Brand.term.opacity(0.97).ignoresSafeArea())
            }
        }
        .confirmationDialog(
            "고른 파일 \(selection.count.grouped)개(\(Bytes.format(selectedBytes)))를 지울까요?",
            isPresented: $confirming, titleVisibility: .visible
        ) {
            Button("지우기", role: .destructive) { Task { await trashSelected() } }
            Button("취소", role: .cancel) {}
        } message: {
            Text("휴지통으로 옮길 수 있는 파일은 옮기고, 옮기지 못한 파일은 한 번 더 물어봐요.")
        }
        .alert("\(leftovers.count.grouped)개는 휴지통으로 옮기지 못했어요", isPresented: $askForever) {
            Button("영구 삭제", role: .destructive) { Task { await removeLeftovers() } }
            Button("그대로 두기", role: .cancel) { leftovers = [] }
        } message: {
            Text("영구 삭제하면 되돌릴 수 없어요. 그대로 두고 파일 앱에서 직접 지울 수도 있어요.")
        }
    }

    // MARK: - 목록

    @ViewBuilder
    private func list(_ result: FileScanResult) -> some View {
        switch section {
        case .large: fileBox(result.large)
        case .old: fileBox(result.old)
        case .duplicates:
            if result.duplicates.isEmpty {
                empty
            } else {
                ForEach(Array(result.duplicates.enumerated()), id: \.offset) { index, group in
                    VStack(alignment: .leading, spacing: 6) {
                        Text("묶음 \(index + 1) · \(group.count)개 · 하나 지우면 \(Bytes.format(group.first?.bytes ?? 0))")
                            .font(Brand.mono(12))
                            .foregroundStyle(Brand.dim)
                        fileBox(group, oldestFirst: true)
                    }
                }
            }
        case .children:
            if result.children.isEmpty {
                empty
            } else {
                let largest = max(result.children.first?.bytes ?? 1, 1)
                VStack(spacing: 0) {
                    ForEach(result.children) { child in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Image(systemName: child.isFolder ? "folder" : "doc")
                                    .foregroundStyle(Brand.dim)
                                    .frame(width: 22)
                                Text(child.name).lineLimit(1).truncationMode(.middle)
                                Spacer()
                                Text(Bytes.format(child.bytes)).font(Brand.mono(13, .semibold))
                            }
                            UsageBar(fraction: Double(child.bytes) / Double(largest), height: 4)
                        }
                        .padding(.vertical, 10)
                        .padding(.horizontal, 12)
                        .overlay(alignment: .bottom) { Rectangle().fill(Brand.border).frame(height: 1) }
                    }
                }
                .background(Brand.term, in: RoundedRectangle(cornerRadius: Brand.radius))
                .overlay(RoundedRectangle(cornerRadius: Brand.radius).strokeBorder(Brand.borderWindow, lineWidth: 1))
            }
        }
    }

    @ViewBuilder
    private func fileBox(_ items: [FileItem], oldestFirst: Bool = false) -> some View {
        if items.isEmpty {
            empty
        } else {
            VStack(spacing: 0) {
                ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                    FileRow(
                        item: item, selected: selection.contains(item.url),
                        badge: oldestFirst && index == 0 ? "가장 오래됨" : nil
                    )
                    .onTapGesture { toggle(item.url) }
                    .contextMenu {
                        Button {
                            showInFiles(item.url)
                        } label: {
                            Label("파일 앱에서 보기", systemImage: "folder")
                        }
                    }
                    if index < items.count - 1 {
                        Rectangle().fill(Brand.border).frame(height: 1)
                    }
                }
            }
            .background(Brand.term, in: RoundedRectangle(cornerRadius: Brand.radius))
            .overlay(RoundedRectangle(cornerRadius: Brand.radius).strokeBorder(Brand.borderWindow, lineWidth: 1))
        }
    }

    private var empty: some View {
        Text("찾은 파일이 없어요.")
            .foregroundStyle(Brand.dim)
            .termBox(padding: 18)
    }

    // MARK: - 고르기와 지우기

    private var selectedBytes: Int64 {
        guard let result = scan.result else { return 0 }
        var sizes = [URL: Int64]()
        for item in result.large + Array(result.duplicates.joined()) + result.old where selection.contains(item.url) {
            sizes[item.url] = item.bytes
        }
        return sizes.values.reduce(0, +)
    }

    private func toggle(_ url: URL) {
        if selection.contains(url) { selection.remove(url) } else { selection.insert(url) }
    }

    private func trashSelected() async {
        working = true
        notices = []
        failures = []
        let outcome = await scan.trash(selection, store: store)
        selection = []
        report(outcome)
        if !outcome.notTrashed.isEmpty {
            leftovers = outcome.notTrashed
            askForever = true
        }
        working = false
    }

    private func removeLeftovers() async {
        working = true
        let outcome = await scan.removeForever(Set(leftovers), store: store)
        leftovers = []
        report(outcome)
        working = false
    }

    private func report(_ outcome: FileDeleter.Outcome) {
        if !outcome.trashed.isEmpty { notices.append("\(outcome.trashed.count.grouped)개를 휴지통으로 옮겼어요.") }
        if !outcome.removed.isEmpty { notices.append("\(outcome.removed.count.grouped)개를 영구 삭제했어요.") }
        for failure in outcome.failed.prefix(5) {
            failures.append("\(failure.url.lastPathComponent): \(failure.reason)")
        }
        if outcome.failed.count > 5 { failures.append("그 밖에 \(outcome.failed.count - 5)개도 지우지 못했어요.") }
    }

    /// 파일 앱을 그 파일이 든 폴더에서 연다
    private func showInFiles(_ url: URL) {
        let folder = url.deletingLastPathComponent().path
        guard
            let encoded = folder.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed),
            let link = URL(string: "shareddocuments://" + encoded)
        else { return }
        openURL(link)
    }
}

/// 파일 한 줄: 고름 상자, 이름, 위치·날짜, 크기
struct FileRow: View {
    let item: FileItem
    let selected: Bool
    var badge: String? = nil

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: selected ? "checkmark.square.fill" : "square")
                .font(.title3)
                .foregroundStyle(selected ? Brand.strong : Brand.faint)
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(item.name)
                        .foregroundStyle(Brand.text)
                        .lineLimit(1)
                        .truncationMode(.middle)
                    if let badge {
                        Text(badge)
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(.black)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 1)
                            .background(Brand.strong)
                    }
                }
                Text(where_)
                    .font(.caption)
                    .foregroundStyle(Brand.dim)
                    .lineLimit(1)
                    .truncationMode(.middle)
            }
            Spacer(minLength: 8)
            Text(Bytes.format(item.bytes))
                .font(Brand.mono(13, .semibold))
                .foregroundStyle(Brand.text)
        }
        .padding(.vertical, 10)
        .padding(.horizontal, 12)
        .background(selected ? Brand.raised : Color.clear)
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(selected ? [.isButton, .isSelected] : .isButton)
    }

    private var where_: String {
        let folder = (item.path as NSString).deletingLastPathComponent
        let date = item.modified?.formatted(date: .numeric, time: .omitted) ?? ""
        return [folder.isEmpty ? "맨 위" : folder, date].filter { !$0.isEmpty }.joined(separator: " · ")
    }
}
