import SwiftUI

/// 기록 탭: RobinX로 지운 것. 사진은 언제까지 되살릴 수 있는지 함께 보여 준다
struct HistoryView: View {
    @EnvironmentObject private var log: DeleteLog
    @Environment(\.openURL) private var openURL
    @State private var confirmingClear = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                TermTitle("기록")

                VStack(alignment: .leading, spacing: 10) {
                    totalLine("사진", log.total(.photos))
                    totalLine("파일 (휴지통)", log.total(.filesTrashed))
                    totalLine("파일 (영구 삭제)", log.total(.filesRemoved))
                    Text("사진은 사진 앱의 '최근 삭제된 항목'을 비우거나 30일이 지나야 공간이 돌아와요.")
                        .font(.footnote)
                        .foregroundStyle(Brand.dim)
                        .fixedSize(horizontal: false, vertical: true)
                    Button("사진 앱 열기") {
                        if let url = URL(string: "photos-redirect://") { openURL(url) }
                    }
                    .buttonStyle(TermButtonStyle())
                }
                .termBox(padding: 18)

                if log.records.isEmpty {
                    Text("아직 지운 것이 없어요.")
                        .foregroundStyle(Brand.dim)
                        .termBox(padding: 18)
                } else {
                    SectionLabel("지운 것 (최근 것부터)")
                    ForEach(log.records) { RecordRow(record: $0) }
                    Button("기록 비우기") { confirmingClear = true }
                        .buttonStyle(TermButtonStyle(tone: Brand.dim))
                }
            }
            .padding(16)
        }
        .pageBackground()
        .confirmationDialog("기록을 비울까요?", isPresented: $confirmingClear, titleVisibility: .visible) {
            Button("기록 비우기", role: .destructive) { log.clear() }
            Button("취소", role: .cancel) {}
        } message: {
            Text("이 목록만 지워요. 지운 사진·파일에는 영향이 없어요.")
        }
    }

    private func totalLine(_ label: String, _ bytes: Int64) -> some View {
        HStack {
            Text(label).foregroundStyle(Brand.text)
            Spacer()
            Text(Bytes.format(bytes)).font(Brand.mono(15, .semibold)).foregroundStyle(Brand.strong)
        }
    }
}

private struct RecordRow: View {
    let record: DeleteRecord

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text("[ OK ]").font(Brand.mono(13, .semibold)).foregroundStyle(Brand.strong)
                Text(headline).foregroundStyle(Brand.strong)
                Spacer(minLength: 6)
                Text(Bytes.format(record.bytes)).font(Brand.mono(13, .semibold)).foregroundStyle(Brand.text)
            }
            Text("\(record.source) · \(record.date.formatted(date: .abbreviated, time: .shortened))")
                .font(.caption)
                .foregroundStyle(Brand.dim)
            if !record.names.isEmpty {
                Text(names)
                    .font(.caption)
                    .foregroundStyle(Brand.dim)
                    .lineLimit(2)
            }
            Text(status)
                .font(.footnote)
                .foregroundStyle(record.kind == .filesRemoved ? Brand.red : Brand.text)
                .fixedSize(horizontal: false, vertical: true)
        }
        .termBox()
        .accessibilityElement(children: .combine)
    }

    private var headline: String {
        switch record.kind {
        case .photos: "사진 \(record.count.grouped)개"
        case .filesTrashed, .filesRemoved: "파일 \(record.count.grouped)개"
        }
    }

    private var names: String {
        let rest = record.count - record.names.count
        return record.names.joined(separator: ", ") + (rest > 0 ? " 외 \(rest.grouped)개" : "")
    }

    private var status: String {
        switch record.kind {
        case .photos:
            let until = record.restoreUntil.formatted(.dateTime.month().day())
            return record.restoreUntil > Date()
                ? "\(until)까지 사진 앱의 '최근 삭제된 항목'에서 되살릴 수 있어요."
                : "되살릴 수 있는 기간(30일)이 지났어요."
        case .filesTrashed: return "휴지통으로 옮겼어요."
        case .filesRemoved: return "영구 삭제했어요. 되돌릴 수 없어요."
        }
    }
}
