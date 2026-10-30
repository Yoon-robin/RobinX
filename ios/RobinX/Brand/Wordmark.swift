import SwiftUI

/// 픽셀 워드마크. 데스크톱 시작 화면(src/components/startup-splash.tsx의 LOGO)과 같은 글자다.
/// 한 칸 = "██". 두 곳이 어긋나면 WordmarkTests가 실패한다.
enum Wordmark {
    static let rows = [
        "████████              ██        ██            ██      ██",
        "██      ██    ████    ██████        ██████      ██  ██",
        "████████    ██    ██  ██    ██  ██  ██    ██      ██",
        "██    ██    ██    ██  ██    ██  ██  ██    ██    ██  ██",
        "██      ██    ████    ██████    ██  ██    ██  ██      ██",
    ]

    /// 줄마다 칸이 켜졌는지 (가장 긴 줄에 맞춰 오른쪽을 비운다)
    static let grid: [[Bool]] = {
        let cols = (rows.map(\.count).max() ?? 0) / 2
        return rows.map { row in
            let chars = Array(row) + Array(repeating: " ", count: cols * 2 - row.count)
            return (0..<cols).map { chars[$0 * 2] == "█" }
        }
    }()

    static var columns: Int { grid.first?.count ?? 0 }
}

/// 워드마크를 그린다. `lit`줄까지만 켠다 (시작 화면에서 한 줄씩 켜지는 데 쓴다)
struct WordmarkView: View {
    var lit: Int = Wordmark.rows.count

    var body: some View {
        // 칸 하나는 가로 20 : 세로 18, 칸 사이에 가는 틈 (브랜드 파일과 같은 비율)
        let cols = CGFloat(Wordmark.columns)
        let rowCount = CGFloat(Wordmark.rows.count)
        Canvas { ctx, size in
            let cw = size.width / cols
            let ch = cw * 18 / 20
            let gap = cw * 0.1
            var path = Path()
            for (r, row) in Wordmark.grid.enumerated() where r < lit {
                for (c, on) in row.enumerated() where on {
                    path.addRect(CGRect(
                        x: CGFloat(c) * cw + gap / 2, y: CGFloat(r) * ch + gap / 2,
                        width: cw - gap, height: ch - gap))
                }
            }
            ctx.fill(
                path,
                with: .linearGradient(
                    Gradient(colors: [.white, Brand.inkBottom]),
                    startPoint: .zero, endPoint: CGPoint(x: 0, y: ch * rowCount)))
        }
        .aspectRatio((cols * 20) / (rowCount * 18), contentMode: .fit)
        .accessibilityLabel("RobinX")
    }
}
