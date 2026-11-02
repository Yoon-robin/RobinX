import Photos
import SwiftUI
import UIKit

/// 넘겨 보며 정리: 사진을 한 장씩 보며 왼쪽으로 밀면 "지울 것", 오른쪽으로 밀면 "남길 것".
/// 미는 순간에는 아무것도 지우지 않는다. 지울 것을 모아 한 번 더 보고 확인해야 지운다.
/// 남긴 사진과 지울 것 표시는 앱을 닫아도 기억해서, 다음에 이어서 넘긴다.
@MainActor
final class SwipeStore: ObservableObject {
    @Published private(set) var kept: Set<String> = []
    @Published private(set) var marked: [PhotoItem] = []

    private struct Saved: Codable {
        var kept: [String]
        var marked: [PhotoItem]
    }

    private let file = AppFiles.url("swipe.json")

    init() {
        guard !Launch.demo else { return }
        if let data = try? Data(contentsOf: file), let saved = try? JSONDecoder().decode(Saved.self, from: data) {
            kept = Set(saved.kept)
            marked = saved.marked
        }
    }

    var markedBytes: Int64 { marked.reduce(0) { $0 + $1.bytes } }

    func keep(_ id: String) {
        kept.insert(id)
        save()
    }

    func mark(_ item: PhotoItem) {
        guard !marked.contains(where: { $0.id == item.id }) else { return }
        marked.append(item)
        save()
    }

    /// 방금 한 결정을 되돌린다
    func undo(_ id: String) {
        kept.remove(id)
        marked.removeAll { $0.id == id }
        save()
    }

    /// 지운 사진은 표시에서 빼고, 지우지 않기로 한 사진은 남긴 것으로 옮긴다
    func finish(deleted: Set<String>, spared: Set<String>) {
        marked.removeAll { deleted.contains($0.id) || spared.contains($0.id) }
        kept.formUnion(spared)
        save()
    }

    /// 사진 앱에서 먼저 지운 사진은 지울 것 표시에서 뺀다
    func prune() {
        guard !Launch.demo, !marked.isEmpty else { return }
        var alive = Set<String>()
        PHAsset.fetchAssets(withLocalIdentifiers: marked.map(\.id), options: nil).enumerateObjects { asset, _, _ in
            alive.insert(asset.localIdentifier)
        }
        guard alive.count < marked.count else { return }
        marked.removeAll { !alive.contains($0.id) }
        save()
    }

    /// 남긴 사진을 다시 보이게 한다 (설정)
    func forgetKept() {
        kept = []
        save()
    }

    private func save() {
        guard !Launch.demo, let data = try? JSONEncoder().encode(Saved(kept: Array(kept), marked: marked)) else { return }
        try? data.write(to: file, options: .atomic)
    }
}

enum SwipeSource: String, CaseIterable, Identifiable {
    case recent, oldest, screenshots
    var id: String { rawValue }
    var title: String {
        switch self {
        case .recent: "최근부터"
        case .oldest: "오래된 것부터"
        case .screenshots: "스크린샷"
        }
    }
}

enum SwipeQueue {
    /// 넘겨 볼 사진 목록. 이미 남겼거나 표시한 것, 즐겨찾기(설정), 찾지 않을 앨범은 뺀다.
    /// 크기는 지울 것으로 표시할 때 잰다 (전부 재면 느리다)
    static func load(_ source: SwipeSource, options: PhotoScanOptions, skip: Set<String>) -> [PhotoItem] {
        if Launch.demo { return Demo.swipeQueue.filter { !skip.contains($0.id) } }
        let skipped = PhotoScanner.assetIDs(inAlbums: options.excludedAlbums)
        let fetchOptions = PHFetchOptions()
        fetchOptions.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: source == .oldest)]
        if source == .screenshots {
            fetchOptions.predicate = NSPredicate(
                format: "(mediaSubtypes & %d) != 0", PHAssetMediaSubtype.photoScreenshot.rawValue)
        }
        var list: [PhotoItem] = []
        PHAsset.fetchAssets(with: fetchOptions).enumerateObjects { asset, _, _ in
            guard asset.mediaType == .image || asset.mediaType == .video else { return }
            let id = asset.localIdentifier
            if skip.contains(id) || skipped.contains(id) || (options.skipFavorites && asset.isFavorite) { return }
            list.append(PhotoItem(
                id: id, bytes: 0, isVideo: asset.mediaType == .video, duration: asset.duration,
                created: asset.creationDate))
        }
        return list
    }

    static func sized(_ item: PhotoItem) -> PhotoItem {
        guard !Launch.demo, item.bytes == 0,
            let asset = PHAsset.fetchAssets(withLocalIdentifiers: [item.id], options: nil).firstObject
        else { return item }
        var sized = item
        sized.bytes = PhotoScanner.size(of: asset)
        return sized
    }
}

struct SwipeSortView: View {
    @EnvironmentObject private var settings: AppSettings
    @EnvironmentObject private var swipe: SwipeStore
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var source: SwipeSource = .recent
    @State private var queue: [PhotoItem] = []
    @State private var index = 0
    @State private var loading = true
    @State private var drag: CGSize = .zero
    @State private var moving = false
    /// 이번에 넘긴 것 (되돌리기용). true = 남김
    @State private var history: [(id: String, kept: Bool)] = []

    private let threshold: CGFloat = 110

    var body: some View {
        VStack(spacing: 14) {
            Picker("순서", selection: $source) {
                ForEach(SwipeSource.allCases) { Text($0.title).tag($0) }
            }
            .pickerStyle(.segmented)

            HStack {
                Text(loading ? "불러오는 중" : "\(min(index, queue.count).grouped) / \(queue.count.grouped)")
                Spacer()
                Text("지울 것 \(swipe.marked.count.grouped)장 · \(Bytes.format(swipe.markedBytes))")
            }
            .font(Brand.mono(13))
            .foregroundStyle(Brand.dim)

            ZStack {
                if loading {
                    ProgressView().tint(Brand.dim)
                } else if index < queue.count {
                    if index + 1 < queue.count {
                        SwipeCard(item: queue[index + 1])
                            .scaleEffect(0.96)
                            .opacity(0.5)
                            .allowsHitTesting(false)
                            .id(queue[index + 1].id)
                    }
                    SwipeCard(item: queue[index])
                        .overlay(alignment: .topLeading) { stamp("남기기", Brand.strong, visible: drag.width > 24) }
                        .overlay(alignment: .topTrailing) { stamp("지우기", Brand.red, visible: drag.width < -24) }
                        .offset(x: drag.width, y: drag.height * 0.15)
                        .rotationEffect(.degrees(reduceMotion ? 0 : Double(drag.width / 22)))
                        .gesture(dragGesture)
                        .id(queue[index].id)
                        .accessibilityAction(named: "지울 것으로 표시") { decide(keep: false) }
                        .accessibilityAction(named: "남기기") { decide(keep: true) }
                } else {
                    VStack(spacing: 10) {
                        Text("다 봤어요.").font(.headline).foregroundStyle(Brand.strong)
                        Text(queue.isEmpty ? "넘겨 볼 사진이 없어요." : "다른 순서를 고르거나, 지울 것을 확인해 주세요.")
                            .font(.footnote)
                            .foregroundStyle(Brand.dim)
                    }
                    .termBox(padding: 24)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            HStack(spacing: 12) {
                Button { decide(keep: false) } label: { Label("지우기", systemImage: "xmark") }
                    .buttonStyle(TermButtonStyle(tone: Brand.red))
                Button { undo() } label: { Image(systemName: "arrow.uturn.backward") }
                    .buttonStyle(TermButtonStyle(tone: Brand.dim))
                    .frame(width: 64)
                    .disabled(history.isEmpty || moving)
                    .accessibilityLabel("되돌리기")
                Button { decide(keep: true) } label: { Label("남기기", systemImage: "checkmark") }
                    .buttonStyle(TermButtonStyle())
            }
            .disabled(loading || index >= queue.count || moving)

            if !swipe.marked.isEmpty {
                NavigationLink {
                    SwipeReviewView()
                } label: {
                    Text("지울 것 \(swipe.marked.count.grouped)장 확인하고 지우기")
                }
                .buttonStyle(TermButtonStyle(tone: Brand.red))
            }
        }
        .padding(16)
        .pageBackground()
        .navigationTitle("넘겨 보며 정리")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Brand.term, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .task(id: source) { await load() }
    }

    private var dragGesture: some Gesture {
        DragGesture()
            .onChanged { if !moving { drag = $0.translation } }
            .onEnded { value in
                let reach = value.predictedEndTranslation.width
                if value.translation.width > threshold || reach > threshold * 2.5 {
                    decide(keep: true)
                } else if value.translation.width < -threshold || reach < -threshold * 2.5 {
                    decide(keep: false)
                } else {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) { drag = .zero }
                }
            }
    }

    private func stamp(_ text: String, _ tone: Color, visible: Bool) -> some View {
        Text(text)
            .font(Brand.mono(18, .bold))
            .foregroundStyle(tone)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(Brand.term.opacity(0.85))
            .overlay(Rectangle().strokeBorder(tone, lineWidth: 2))
            .padding(14)
            .opacity(visible ? min(1, Double(abs(drag.width) - 24) / 60) : 0)
    }

    private func load() async {
        loading = true
        let skip = swipe.kept.union(swipe.marked.map(\.id))
        let options = settings.photoOptions
        let source = source
        queue = await Task.detached(priority: .userInitiated) {
            SwipeQueue.load(source, options: options, skip: skip)
        }.value
        index = 0
        history = []
        drag = .zero
        loading = false
    }

    private func decide(keep: Bool) {
        guard !moving, index < queue.count else { return }
        let item = queue[index]
        moving = true
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        Task {
            if !reduceMotion {
                withAnimation(.easeIn(duration: 0.18)) {
                    drag = CGSize(width: keep ? 700 : -700, height: drag.height)
                }
                try? await Task.sleep(nanoseconds: 180_000_000)
            }
            if keep {
                swipe.keep(item.id)
            } else {
                let sized = await Task.detached { SwipeQueue.sized(item) }.value
                swipe.mark(sized)
            }
            history.append((item.id, keep))
            index += 1
            drag = .zero
            moving = false
        }
    }

    private func undo() {
        guard let last = history.popLast(), index > 0 else { return }
        swipe.undo(last.id)
        index -= 1
    }
}

/// 한 장 크게. iCloud에만 있는 사진도 받아 온다
private struct SwipeCard: View {
    let item: PhotoItem
    @State private var image: UIImage?

    var body: some View {
        ZStack {
            Brand.term
            if let image {
                Image(uiImage: image).resizable().scaledToFit()
            } else {
                ProgressView().tint(Brand.dim)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .clipShape(RoundedRectangle(cornerRadius: Brand.radius))
        .overlay(RoundedRectangle(cornerRadius: Brand.radius).strokeBorder(Brand.borderWindow, lineWidth: 1))
        .overlay(alignment: .bottomLeading) {
            Text(caption)
                .font(Brand.mono(12, .semibold))
                .foregroundStyle(.white)
                .padding(.horizontal, 8)
                .padding(.vertical, 5)
                .background(Color.black.opacity(0.6))
                .padding(10)
        }
        .task(id: item.id) { image = await ThumbLoader.load(item.id, side: 520, network: true) }
        .accessibilityElement()
        .accessibilityLabel(item.isVideo ? "동영상" : "사진")
        .accessibilityValue(caption)
    }

    private var caption: String {
        var parts: [String] = []
        if let created = item.created { parts.append(created.formatted(date: .abbreviated, time: .omitted)) }
        if item.isVideo {
            let seconds = Int(item.duration.rounded())
            parts.append(String(format: "동영상 %d:%02d", seconds / 60, seconds % 60))
        }
        return parts.joined(separator: " · ")
    }
}

/// 지울 것으로 표시한 사진을 모아 보고 지운다. 눌러서 빼면 남긴 것으로 옮긴다
struct SwipeReviewView: View {
    @EnvironmentObject private var swipe: SwipeStore
    @EnvironmentObject private var photos: PhotoLibrary
    @EnvironmentObject private var log: DeleteLog
    @State private var spared = Set<String>()
    @State private var confirming = false
    @State private var working = false
    @State private var notice: String?
    @State private var viewing: ViewerTarget?

    private let columns = [GridItem(.adaptive(minimum: 96, maximum: 160), spacing: 3)]

    /// 크게 보기에서 고른 것 = 지울 것 (뺀 것을 뺀 나머지)
    private var picked: Binding<Set<String>> {
        Binding(
            get: { Set(swipe.marked.map(\.id)).subtracting(spared) },
            set: { spared = Set(swipe.marked.map(\.id)).subtracting($0) })
    }

    private var targets: [PhotoItem] { swipe.marked.filter { !spared.contains($0.id) } }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text("왼쪽으로 민 사진이에요. 지우지 않을 사진은 눌러서 빼 주세요. 길게 누르면 크게 볼 수 있어요.")
                    .font(.footnote)
                    .foregroundStyle(Brand.dim)
                if let notice { OkLine(text: notice) }
                if swipe.marked.isEmpty {
                    Text("지울 것으로 표시한 사진이 없어요.")
                        .foregroundStyle(Brand.dim)
                        .termBox(padding: 18)
                } else {
                    LazyVGrid(columns: columns, spacing: 3) {
                        ForEach(Array(swipe.marked.enumerated()), id: \.element.id) { index, item in
                            PhotoTile(item: item, selected: !spared.contains(item.id))
                                .onTapGesture {
                                    if spared.contains(item.id) { spared.remove(item.id) } else { spared.insert(item.id) }
                                }
                                .contextMenu {
                                    Button {
                                        viewing = ViewerTarget(items: swipe.marked, start: index)
                                    } label: {
                                        Label("크게 보기", systemImage: "arrow.up.left.and.arrow.down.right")
                                    }
                                }
                        }
                    }
                }
            }
            .padding(16)
        }
        .pageBackground()
        .navigationTitle("지울 것 확인")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Brand.term, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .safeAreaInset(edge: .bottom) {
            if !swipe.marked.isEmpty {
                Button {
                    confirming = true
                } label: {
                    Text(working ? "지우는 중" : "\(targets.count.grouped)장 지우기 · \(Bytes.format(targets.reduce(0) { $0 + $1.bytes }))")
                }
                .buttonStyle(TermButtonStyle(tone: Brand.red))
                .disabled(working || targets.isEmpty)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(Brand.term.opacity(0.97).ignoresSafeArea())
            }
        }
        .fullScreenCover(item: $viewing) { PhotoViewer(target: $0, selection: picked) }
        .confirmationDialog(
            "\(targets.count.grouped)장을 지울까요?", isPresented: $confirming, titleVisibility: .visible
        ) {
            Button("\(targets.count.grouped)장 지우기", role: .destructive) { Task { await delete() } }
            Button("취소", role: .cancel) {}
        } message: {
            Text("지운 사진은 사진 앱의 '최근 삭제된 항목'에 30일 동안 남아요. iCloud 사진을 쓰면 다른 기기에서도 함께 지워져요.")
        }
    }

    private func delete() async {
        working = true
        let items = targets
        let ids = Set(items.map(\.id))
        if await photos.delete(items) {
            log.add(.photos, source: "넘겨 보며 정리", count: items.count, bytes: items.reduce(0) { $0 + $1.bytes })
            swipe.finish(deleted: ids, spared: spared)
            spared = []
            notice = "\(items.count.grouped)장을 지웠어요. 공간은 '최근 삭제된 항목'을 비우거나 30일이 지나면 돌아와요."
        }
        working = false
    }
}
