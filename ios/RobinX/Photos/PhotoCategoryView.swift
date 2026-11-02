import SwiftUI
import UIKit

/// 한 칸(중복·비슷한 사진·큰 동영상·스크린샷·연속 촬영)의 사진 격자. 미리 골라 두지 않고, 사용자가 고른 것만 지운다.
struct PhotoCategoryView: View {
    let kind: PhotoKind

    @EnvironmentObject private var photos: PhotoLibrary
    @EnvironmentObject private var log: DeleteLog
    @State private var selection = Set<String>()
    @State private var confirming = false
    @State private var deleting = false
    @State private var notice: String?
    @State private var viewing: ViewerTarget?

    private let columns = [GridItem(.adaptive(minimum: 96, maximum: 160), spacing: 3)]

    var body: some View {
        let result = photos.result ?? PhotoScanResult()
        let items = result.items(kind)
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text(summary(result))
                    .font(Brand.mono(13))
                    .foregroundStyle(Brand.dim)
                if !items.isEmpty {
                    Text("누르면 고르고, 길게 누르면 크게 볼 수 있어요.")
                        .font(.footnote)
                        .foregroundStyle(Brand.dim)
                }
                if let notice {
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text("[ OK ]").font(Brand.mono(13, .semibold)).foregroundStyle(Brand.strong)
                        Text(notice).font(.footnote).foregroundStyle(Brand.text)
                    }
                }
                if items.isEmpty {
                    Text("찾은 사진이 없어요.")
                        .foregroundStyle(Brand.dim)
                        .termBox(padding: 18)
                } else if kind.isGrouped {
                    ForEach(Array(result.groups(kind).enumerated()), id: \.offset) { index, group in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(groupTitle(index, group))
                                .font(Brand.mono(12))
                                .foregroundStyle(Brand.dim)
                            grid(group, oldestFirst: true)
                        }
                    }
                } else {
                    grid(items, oldestFirst: false)
                }
            }
            .padding(16)
        }
        .pageBackground()
        .navigationTitle(kind.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Brand.term, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Menu("고르기") {
                    if kind.isGrouped {
                        // 묶음을 통째로 고르는 단추는 두지 않는다 (같은 사진이 하나도 안 남을 수 있다)
                        Button("묶음마다 '\(kind.keepBadge)' 하나만 남기고 고르기") {
                            selection = Set(result.groups(kind).flatMap { $0.dropFirst().map(\.id) })
                        }
                    } else {
                        Button("모두 고르기") { selection = Set(items.map(\.id)) }
                    }
                    Button("고른 것 풀기") { selection = [] }
                        .disabled(selection.isEmpty)
                }
                .disabled(items.isEmpty)
            }
        }
        .safeAreaInset(edge: .bottom) {
            if !selection.isEmpty {
                Button {
                    confirming = true
                } label: {
                    Text(deleting ? "지우는 중" : "고른 \(selection.count.grouped)개 지우기 · \(Bytes.format(selectedBytes(items)))")
                }
                .buttonStyle(TermButtonStyle(tone: Brand.red))
                .disabled(deleting)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(Brand.term.opacity(0.97).ignoresSafeArea())
            }
        }
        .fullScreenCover(item: $viewing) { PhotoViewer(target: $0, selection: $selection) }
        .onAppear {
            // 화면 캡처용: 첫 묶음을 크게 연다
            if Launch.route == "viewer", viewing == nil, let group = (photos.result ?? PhotoScanResult()).groups(kind).first {
                viewing = ViewerTarget(items: group, start: 1, keepBadge: kind.keepBadge)
            }
        }
        .confirmationDialog(
            "고른 \(selection.count.grouped)개를 지울까요?", isPresented: $confirming, titleVisibility: .visible
        ) {
            Button("\(selection.count.grouped)개 지우기", role: .destructive) {
                Task { await delete() }
            }
            Button("취소", role: .cancel) {}
        } message: {
            Text("지운 사진은 사진 앱의 '최근 삭제된 항목'에 30일 동안 남아요. iCloud 사진을 쓰면 다른 기기에서도 함께 지워져요.")
        }
    }

    private func grid(_ items: [PhotoItem], oldestFirst: Bool) -> some View {
        LazyVGrid(columns: columns, spacing: 3) {
            ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                PhotoTile(
                    item: item, selected: selection.contains(item.id),
                    badge: oldestFirst && index == 0 ? kind.keepBadge : nil
                )
                .onTapGesture { toggle(item.id) }
                .contextMenu {
                    Button {
                        viewing = ViewerTarget(items: items, start: index, keepBadge: oldestFirst ? kind.keepBadge : nil)
                    } label: {
                        Label(oldestFirst ? "크게 보기 · 묶음 비교" : "크게 보기", systemImage: "arrow.up.left.and.arrow.down.right")
                    }
                    Button {
                        toggle(item.id)
                    } label: {
                        selection.contains(item.id)
                            ? Label("고른 것 풀기", systemImage: "circle") : Label("고르기", systemImage: "checkmark.circle")
                    }
                }
            }
        }
    }

    private func toggle(_ id: String) {
        if selection.contains(id) { selection.remove(id) } else { selection.insert(id) }
    }

    private func summary(_ result: PhotoScanResult) -> String {
        "\(kind.detail(result)) · \(Bytes.format(result.bytes(kind)))"
    }

    private func groupTitle(_ index: Int, _ group: [PhotoItem]) -> String {
        if kind == .duplicates {
            return "묶음 \(index + 1) · \(group.count)장 · 한 장 \(Bytes.format(group.first?.bytes ?? 0))"
        }
        return "묶음 \(index + 1) · \(group.count)장 · 하나 빼고 \(Bytes.format(PhotoScanner.wasted(group)))"
    }

    /// 고른 사진 (여러 칸에 같이 든 사진은 한 번만)
    private func selectedItems(_ items: [PhotoItem]) -> [PhotoItem] {
        var seen = Set<String>()
        return items.filter { selection.contains($0.id) && seen.insert($0.id).inserted }
    }

    private func selectedBytes(_ items: [PhotoItem]) -> Int64 {
        selectedItems(items).reduce(0) { $0 + $1.bytes }
    }

    private func delete() async {
        deleting = true
        let items = selectedItems(photos.result?.items(kind) ?? [])
        let count = items.count
        let bytes = items.reduce(0) { $0 + $1.bytes }
        if await photos.delete(items) {
            log.add(.photos, source: kind.title, count: count, bytes: bytes)
            notice = "\(count.grouped)개를 지웠어요. 공간은 사진 앱의 '최근 삭제된 항목'을 비우거나 30일이 지나면 돌아와요."
            selection = []
        }
        deleting = false
    }
}

/// 격자의 한 칸: 썸네일, 크기(동영상은 길이도), 고름 표시
struct PhotoTile: View {
    let item: PhotoItem
    let selected: Bool
    var badge: String? = nil

    @State private var image: UIImage?

    var body: some View {
        Color.clear
            .aspectRatio(1, contentMode: .fit)
            .overlay {
                if let image {
                    Image(uiImage: image).resizable().scaledToFill()
                } else {
                    Brand.raised
                }
            }
            .clipped()
            .opacity(selected ? 0.72 : 1)
            .overlay(alignment: .bottomLeading) {
                Text(caption)
                    .font(Brand.mono(10, .semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 5)
                    .padding(.vertical, 3)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(LinearGradient(colors: [.clear, .black.opacity(0.75)], startPoint: .top, endPoint: .bottom))
            }
            .overlay(alignment: .topLeading) {
                if let badge {
                    Text(badge)
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(.black)
                        .padding(.horizontal, 5)
                        .padding(.vertical, 2)
                        .background(Brand.strong)
                        .padding(4)
                }
            }
            .overlay(alignment: .topTrailing) {
                if selected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.title3)
                        .symbolRenderingMode(.palette)
                        .foregroundStyle(.black, Brand.strong)
                        .padding(5)
                }
            }
            .overlay {
                if selected { Rectangle().strokeBorder(Brand.strong, lineWidth: 2) }
            }
            .contentShape(Rectangle())
            .task(id: item.id) { image = await ThumbLoader.load(item.id, side: 130) }
            .accessibilityElement()
            .accessibilityLabel(item.isVideo ? "동영상" : "사진")
            .accessibilityValue(caption)
            .accessibilityAddTraits(selected ? [.isButton, .isSelected] : .isButton)
    }

    private var caption: String {
        guard item.isVideo else { return Bytes.format(item.bytes) }
        let seconds = Int(item.duration.rounded())
        return String(format: "%d:%02d · %@", seconds / 60, seconds % 60, Bytes.format(item.bytes))
    }
}
