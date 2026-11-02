import SwiftUI
import UIKit

/// 크게 볼 사진들과 처음 볼 위치
struct ViewerTarget: Identifiable {
    let id = UUID()
    let items: [PhotoItem]
    let start: Int
    /// 맨 앞 사진에 붙는 표시 ("가장 큼"·"가장 오래됨")
    var keepBadge: String? = nil
}

/// 사진을 크게 보며 고르기. 옆으로 넘겨 묶음 안의 사진을 비교하고, 두 손가락이나 두 번 눌러 확대한다.
/// 고른 것(selection)은 격자와 같다: 고른 사진이 지울 사진이다
struct PhotoViewer: View {
    let target: ViewerTarget
    @Binding var selection: Set<String>

    @Environment(\.dismiss) private var dismiss
    @State private var index: Int

    init(target: ViewerTarget, selection: Binding<Set<String>>) {
        self.target = target
        _selection = selection
        _index = State(initialValue: min(max(0, target.start), max(0, target.items.count - 1)))
    }

    private var items: [PhotoItem] { target.items }
    private var current: PhotoItem? { items.indices.contains(index) ? items[index] : nil }

    var body: some View {
        VStack(spacing: 0) {
            header
            TabView(selection: $index) {
                ForEach(Array(items.enumerated()), id: \.element.id) { i, item in
                    BigPhoto(item: item).tag(i)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            footer
        }
        .background(Color.black.ignoresSafeArea())
        .preferredColorScheme(.dark)
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark")
                        .font(.body.weight(.semibold))
                        .frame(width: 44, height: 44)
                }
                .foregroundStyle(Brand.strong)
                .accessibilityLabel("닫기")
                Spacer()
                Text("\((index + 1).grouped) / \(items.count.grouped)")
                    .font(Brand.mono(14))
                    .foregroundStyle(Brand.dim)
                Spacer()
                Color.clear.frame(width: 44, height: 44)
            }
            if let current {
                HStack(spacing: 8) {
                    if index == 0, let badge = target.keepBadge {
                        Text(badge)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(.black)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(Brand.strong)
                    }
                    Text(caption(current))
                        .font(Brand.mono(12))
                        .foregroundStyle(Brand.dim)
                        .lineLimit(1)
                }
                .padding(.horizontal, 16)
            }
        }
        .padding(.bottom, 8)
    }

    private var footer: some View {
        VStack(spacing: 12) {
            if items.count > 1 { strip }
            if let current {
                let picked = selection.contains(current.id)
                Button {
                    if picked { selection.remove(current.id) } else { selection.insert(current.id) }
                } label: {
                    Label(
                        picked ? "지울 사진으로 골랐어요" : "이 사진 고르기",
                        systemImage: picked ? "checkmark.circle.fill" : "circle")
                }
                .buttonStyle(TermButtonStyle(tone: picked ? Brand.red : Brand.strong))
                .padding(.horizontal, 16)
            }
        }
        .padding(.top, 10)
        .padding(.bottom, 8)
    }

    /// 아래 줄: 작은 그림을 눌러 바로 옮겨 간다. 고른 사진은 빨간 테두리
    private var strip: some View {
        ScrollViewReader { reader in
            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: 4) {
                    ForEach(Array(items.enumerated()), id: \.element.id) { i, item in
                        StripThumb(item: item, current: i == index, picked: selection.contains(item.id))
                            .id(i)
                            .onTapGesture { index = i }
                    }
                }
                .padding(.horizontal, 16)
            }
            .frame(height: 56)
            .onChange(of: index) { i in
                withAnimation(.easeOut(duration: 0.2)) { reader.scrollTo(i, anchor: .center) }
            }
            .onAppear { reader.scrollTo(index, anchor: .center) }
        }
    }

    private func caption(_ item: PhotoItem) -> String {
        var parts: [String] = []
        if let created = item.created { parts.append(created.formatted(date: .abbreviated, time: .standard)) }
        if item.isVideo {
            let seconds = Int(item.duration.rounded())
            parts.append(String(format: "동영상 %d:%02d", seconds / 60, seconds % 60))
        }
        if item.bytes > 0 { parts.append(Bytes.format(item.bytes)) }
        return parts.joined(separator: " · ")
    }
}

/// 한 장 크게. iCloud에만 있는 사진도 받아 온다
private struct BigPhoto: View {
    let item: PhotoItem
    @State private var image: UIImage?

    var body: some View {
        ZStack {
            if let image {
                ZoomImage(image: image)
            } else {
                ProgressView().tint(Brand.dim)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .task(id: item.id) { image = await ThumbLoader.load(item.id, side: 900, network: true, fit: true) }
        .accessibilityElement()
        .accessibilityLabel(item.isVideo ? "동영상" : "사진")
    }
}

private struct StripThumb: View {
    let item: PhotoItem
    let current: Bool
    let picked: Bool
    @State private var image: UIImage?

    var body: some View {
        ZStack {
            Brand.raised
            if let image { Image(uiImage: image).resizable().scaledToFill() }
        }
        .frame(width: current ? 52 : 44, height: current ? 52 : 44)
        .clipped()
        .opacity(current ? 1 : 0.6)
        .overlay {
            if picked { Rectangle().strokeBorder(Brand.red, lineWidth: 2) }
        }
        .overlay {
            if current && !picked { Rectangle().strokeBorder(Brand.strong, lineWidth: 2) }
        }
        .frame(height: 56)
        .task(id: item.id) { image = await ThumbLoader.load(item.id, side: 52) }
        .accessibilityElement()
        .accessibilityLabel(picked ? "고른 사진" : "사진")
        .accessibilityAddTraits(.isButton)
    }
}

/// 확대·이동은 UIScrollView에 맡긴다 (옆으로 넘기기와 잘 어울린다). 두 번 누르면 확대/원래대로
private struct ZoomImage: UIViewRepresentable {
    let image: UIImage

    func makeUIView(context: Context) -> UIScrollView {
        let scroll = UIScrollView()
        scroll.delegate = context.coordinator
        scroll.minimumZoomScale = 1
        scroll.maximumZoomScale = 5
        scroll.showsHorizontalScrollIndicator = false
        scroll.showsVerticalScrollIndicator = false
        scroll.contentInsetAdjustmentBehavior = .never
        scroll.backgroundColor = .clear
        let view = UIImageView(image: image)
        view.contentMode = .scaleAspectFit
        view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        scroll.addSubview(view)
        context.coordinator.imageView = view
        let tap = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.doubleTap(_:)))
        tap.numberOfTapsRequired = 2
        scroll.addGestureRecognizer(tap)
        return scroll
    }

    func updateUIView(_ scroll: UIScrollView, context: Context) {
        context.coordinator.imageView?.image = image
        // 확대하지 않았을 때는 그림이 화면을 꼭 채우게 한다
        if scroll.zoomScale == 1, let view = context.coordinator.imageView, view.frame.size != scroll.bounds.size {
            view.frame = scroll.bounds
        }
    }

    func makeCoordinator() -> Coordinator { Coordinator() }

    final class Coordinator: NSObject, UIScrollViewDelegate {
        weak var imageView: UIImageView?

        func viewForZooming(in scrollView: UIScrollView) -> UIView? { imageView }

        @objc func doubleTap(_ tap: UITapGestureRecognizer) {
            guard let scroll = tap.view as? UIScrollView, let imageView else { return }
            if scroll.zoomScale > 1 {
                scroll.setZoomScale(1, animated: true)
            } else {
                let point = tap.location(in: imageView)
                let size = CGSize(width: scroll.bounds.width / 2.5, height: scroll.bounds.height / 2.5)
                scroll.zoom(
                    to: CGRect(x: point.x - size.width / 2, y: point.y - size.height / 2, width: size.width, height: size.height),
                    animated: true)
            }
        }
    }
}
