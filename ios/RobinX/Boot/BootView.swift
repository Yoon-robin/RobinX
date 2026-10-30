import SwiftUI
import UIKit

/// 시작 화면: 워드마크가 한 줄씩(45ms) 켜지고, 터미널 로그로 지금 상태를 보여 준 뒤
/// 브라운관처럼 세로로 접혔다가 가로로 사라진다. 데스크톱 RobinX의 시작 화면과 같은 언어다.
struct BootView: View {
    let onDone: () -> Void

    @EnvironmentObject private var storage: DeviceStorage
    @EnvironmentObject private var photos: PhotoLibrary
    @EnvironmentObject private var folders: FolderStore
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var lit = 0
    @State private var lines: [BootLine] = []
    @State private var foldY = false
    @State private var foldX = false

    var body: some View {
        ZStack {
            Brand.page.ignoresSafeArea()
                .opacity(foldX ? 0 : 1)

            VStack(alignment: .leading, spacing: 18) {
                HStack(spacing: 6) {
                    Text(">").foregroundStyle(Brand.faint)
                    Text("robinx").foregroundStyle(Brand.text)
                }
                WordmarkView(lit: lit)
                    .brandGlow(big: true)
                    .padding(.vertical, 6)
                VStack(alignment: .leading, spacing: 7) {
                    ForEach(lines) { BootLineView(line: $0) }
                    BlinkCursor(size: 13)
                }
            }
            .font(Brand.mono(13))
            .padding(20)
            .frame(maxWidth: 520, alignment: .leading)
            .background(Brand.term, in: RoundedRectangle(cornerRadius: Brand.radius))
            .overlay(RoundedRectangle(cornerRadius: Brand.radius).strokeBorder(Brand.borderWindow, lineWidth: 1))
            .padding(16)
            .scaleEffect(x: foldX ? 0 : 1, y: foldY ? 0.006 : 1)
            .brightness(foldY ? 0.5 : 0)
            .opacity(foldX ? 0 : 1)

            CRTOverlay()
                .ignoresSafeArea()
                .allowsHitTesting(false)
                .opacity(foldX ? 0 : 1)
        }
        .task { await run() }
    }

    private func run() async {
        if reduceMotion {
            lit = Wordmark.rows.count
        } else {
            for i in 1...Wordmark.rows.count {
                try? await Task.sleep(nanoseconds: 45_000_000)
                lit = i
            }
        }
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "?"
        await add(BootLine(text: "RobinX \(version) · iOS \(UIDevice.current.systemVersion)", dim: true))
        await add(BootLine(
            tag: .ok, text: "저장공간 · \(Bytes.format(storage.total)) 중 \(Bytes.format(storage.available)) 남음"))
        await add(photoLine)
        await add(
            folders.folders.isEmpty
                ? BootLine(tag: .skip, text: "고른 폴더 없음")
                : BootLine(tag: .ok, text: "기억한 폴더 \(folders.folders.count)곳"))
        if Launch.bootHold { return }
        try? await Task.sleep(nanoseconds: 700_000_000)
        await close()
    }

    private var photoLine: BootLine {
        switch photos.access {
        case .full: BootLine(tag: .ok, text: "사진 보관함 · 허용됨")
        case .limited: BootLine(tag: .ok, text: "사진 보관함 · 일부만 허용됨")
        case .unknown: BootLine(tag: .skip, text: "사진 보관함 · 아직 묻지 않음")
        case .denied: BootLine(tag: .skip, text: "사진 보관함 · 허용 안 함")
        }
    }

    private func add(_ line: BootLine) async {
        try? await Task.sleep(nanoseconds: reduceMotion ? 60_000_000 : 150_000_000)
        lines.append(line)
    }

    private func close() async {
        if reduceMotion {
            withAnimation(.easeOut(duration: 0.2)) { foldX = true }
            try? await Task.sleep(nanoseconds: 200_000_000)
        } else {
            withAnimation(.easeIn(duration: 0.24)) { foldY = true }
            try? await Task.sleep(nanoseconds: 240_000_000)
            withAnimation(.timingCurve(0.22, 1, 0.36, 1, duration: 0.18)) { foldX = true }
            try? await Task.sleep(nanoseconds: 180_000_000)
        }
        onDone()
    }
}

struct BootLine: Identifiable {
    enum Tag {
        case ok, skip, fail
        var label: String {
            switch self {
            case .ok: "[ OK ]"
            case .skip: "[SKIP]"
            case .fail: "[FAIL]"
            }
        }
        var color: Color {
            switch self {
            case .ok: Brand.strong
            case .skip: Brand.faint
            case .fail: Brand.red
            }
        }
    }

    let id = UUID()
    var tag: Tag? = nil
    let text: String
    var dim = false
}

private struct BootLineView: View {
    let line: BootLine
    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            if let tag = line.tag {
                Text(tag.label).foregroundStyle(tag.color)
            }
            Text(line.text)
                .foregroundStyle(line.dim ? Brand.dim : Brand.text)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

/// 주사선(3pt마다 흰색 2.2%의 1pt 줄)과 가장자리 그늘. 시작 화면 한 장면에만 얹는다
private struct CRTOverlay: View {
    var body: some View {
        GeometryReader { geo in
            ZStack {
                Canvas { ctx, size in
                    var y: CGFloat = 0
                    while y < size.height {
                        ctx.fill(Path(CGRect(x: 0, y: y, width: size.width, height: 1)), with: .color(.white.opacity(0.022)))
                        y += 3
                    }
                }
                RadialGradient(
                    stops: [
                        .init(color: .clear, location: 0.55),
                        .init(color: .black.opacity(0.55), location: 1),
                    ],
                    center: .center, startRadius: 0,
                    endRadius: max(geo.size.width, geo.size.height) * 0.75)
            }
        }
    }
}
