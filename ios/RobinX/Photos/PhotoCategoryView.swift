import SwiftUI
import UIKit

/// 한 칸(중복·큰 동영상·스크린샷·연속 촬영)의 사진 격자. 미리 골라 두지 않고, 사용자가 고른 것만 지운다.
struct PhotoCategoryView: View {
    let kind: PhotoKind

    @EnvironmentObject private var photos: PhotoLibrary
    @State private var selection = Set<String>()
    @State private var confirming = false
    @State private var deleting = false
    @State private var notice: String?

    private let columns = [GridItem(.adaptive(minimum: 96, maximum: 160), spacing: 3)]

    var body: some View {
        let result = photos.result ?? PhotoScanResult()
        let items = result.items(kind)
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                Text(summary(result))
                    .font(Brand.mono(13))
                    .foregroundStyle(Brand.dim)
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
                } else if kind == .duplicates {
                    ForEach(Array(result.duplicates.enumerated()), id: \.offset) { index, group in
                        VStack(alignment: .leading, spacing: 6) {
                            Text("묶음 \(index + 1) · \(group.count)장 · 한 장 \(Bytes.format(group.first?.bytes ?? 0))")
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
                    if kind == .duplicates {
                        // 묶음을 통째로 고르는 단추는 두지 않는다 (같은 사진이 하나도 안 남을 수 있다)
                        Button("묶음마다 가장 오래된 것만 남기고 고르기") {
                            selection = Set(result.duplicates.flatMap { $0.dropFirst().map(\.id) })
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
                    badge: oldestFirst && index == 0 ? "가장 오래됨" : nil
                )
                .onTapGesture { toggle(item.id) }
            }
        }
    }

    private func toggle(_ id: String) {
        if selection.contains(id) { selection.remove(id) } else { selection.insert(id) }
    }

    private func summary(_ result: PhotoScanResult) -> String {
        "\(kind.detail) · \(Bytes.format(result.bytes(kind)))"
    }

    private func selectedBytes(_ items: [PhotoItem]) -> Int64 {
        var seen = Set<String>()
        return items.reduce(0) { sum, item in
            selection.contains(item.id) && seen.insert(item.id).inserted ? sum + item.bytes : sum
        }
    }

    private func delete() async {
        deleting = true
        let count = selection.count
        if await photos.delete(selection) {
            notice = "\(count.grouped)개를 지웠어요. 사진 앱의 '최근 삭제된 항목'에서 되살릴 수 있어요."
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
