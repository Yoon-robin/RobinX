import SwiftUI

/// 브랜드 값 (docs/BRAND.md, docs/brand/tokens.css와 같은 값).
/// 색은 검정·흰색·회색뿐이고, 상태색은 호박색(확인)과 빨강(지우기)만 상태를 알릴 때 쓴다.
enum Brand {
    static let page = Color(hex: 0x070707)
    static let term = Color(hex: 0x0b0b0b)
    static let card = Color(hex: 0x0e0e0e)
    static let raised = Color(hex: 0x1b1b1b)
    static let text = Color(hex: 0xe8e8e8)
    static let strong = Color(hex: 0xf2f2f2)
    static let dim = Color(hex: 0x9e9e9e)
    static let faint = Color(hex: 0x6f6f6f)
    static let inkBottom = Color(hex: 0x9a9a9a)
    static let cursor = Color(hex: 0xe6e6e6)
    static let border = Color.white.opacity(0.14)
    static let borderWindow = Color.white.opacity(0.16)
    static let amber = Color(hex: 0xfbbf24)
    static let red = Color(hex: 0xf87171)
    /// 거의 각지게 (0.2rem)
    static let radius: CGFloat = 3.2
    /// 로고·큰 숫자의 글자색: 위 흰색 → 아래 회색 한 번만
    static let ink = LinearGradient(colors: [.white, inkBottom], startPoint: .top, endPoint: .bottom)

    /// 터미널 글꼴 (Cascadia 대신 iOS의 SF Mono. 한글은 시스템 글꼴로 그려진다)
    static func mono(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .monospaced)
    }
}

extension Color {
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xff) / 255,
            green: Double((hex >> 8) & 0xff) / 255,
            blue: Double(hex & 0xff) / 255,
            opacity: 1)
    }
}

extension View {
    /// 흰 글로우. 화면에 하나뿐인 큰 요소에만 쓴다 (단추·카드·본문에는 쓰지 않는다)
    func brandGlow(big: Bool = false) -> some View {
        shadow(color: .white.opacity(0.22), radius: 5)
            .shadow(color: .white.opacity(big ? 0.10 : 0), radius: 14)
    }

    /// 터미널 창 모양: 가는 흰 테두리, 안쪽은 #0b0b0b
    func termBox(padding: CGFloat = 14) -> some View {
        self.padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Brand.term, in: RoundedRectangle(cornerRadius: Brand.radius))
            .overlay(RoundedRectangle(cornerRadius: Brand.radius).strokeBorder(Brand.borderWindow, lineWidth: 1))
    }

    /// 탭 첫 화면의 공통 바탕
    func pageBackground() -> some View {
        background(Brand.page.ignoresSafeArea())
    }
}

/// 네모 커서: 1초 박자로 켜졌다 꺼진다 (부드럽게 흐려지지 않는다). 움직임 줄이기를 켜면 켜 둔 채로
struct BlinkCursor: View {
    var size: CGFloat
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        TimelineView(.periodic(from: .now, by: 0.5)) { ctx in
            let on = reduceMotion || Int(ctx.date.timeIntervalSinceReferenceDate * 2) % 2 == 0
            Rectangle()
                .fill(Brand.cursor)
                .frame(width: size * 0.6, height: size * 1.1)
                .opacity(on ? 1 : 0)
        }
        .accessibilityHidden(true)
    }
}

/// 화면 제목: "> 사진█"
struct TermTitle: View {
    let text: String
    var size: CGFloat = 26

    init(_ text: String, size: CGFloat = 26) {
        self.text = text
        self.size = size
    }

    var body: some View {
        HStack(alignment: .center, spacing: size * 0.3) {
            Text(">").foregroundStyle(Brand.faint)
            Text(text).foregroundStyle(Brand.strong)
            BlinkCursor(size: size)
        }
        .font(Brand.mono(size, .bold))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(text)
        .accessibilityAddTraits(.isHeader)
    }
}

/// 작은 회색 머리말 (목록 위)
struct SectionLabel: View {
    let text: String
    init(_ text: String) { self.text = text }
    var body: some View {
        Text(text)
            .font(Brand.mono(13, .semibold))
            .foregroundStyle(Brand.dim)
            .padding(.top, 6)
    }
}

/// 테두리 단추. 눌리면 바탕이 한 단계 밝아진다
struct TermButtonStyle: ButtonStyle {
    var tone: Color = Brand.strong
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body.weight(.semibold))
            .foregroundStyle(tone)
            .padding(.vertical, 13)
            .padding(.horizontal, 16)
            .frame(maxWidth: .infinity)
            .background(configuration.isPressed ? Brand.raised : Brand.term, in: RoundedRectangle(cornerRadius: Brand.radius))
            .overlay(RoundedRectangle(cornerRadius: Brand.radius).strokeBorder(tone.opacity(0.35), lineWidth: 1))
    }
}

/// 눌러서 다른 곳으로 가는 줄 (상자 모양)
struct RowBoxStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .contentShape(Rectangle())
            .opacity(configuration.isPressed ? 0.7 : 1)
    }
}
