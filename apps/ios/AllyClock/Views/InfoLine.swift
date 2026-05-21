import SwiftUI

struct InfoLine: View {
    let precise: String
    let dateTZ: String
    let bucket: SizeBucket
    let containerSize: CGSize

    var body: some View {
        let infoSize = bucket.infoSize(in: containerSize)

        HStack(alignment: .firstTextBaseline, spacing: infoSize * 0.6) {
            Text(precise)
                .font(.system(size: infoSize, weight: .regular, design: .monospaced))

            Text("·")
                .font(.system(size: infoSize, weight: .regular))
                .opacity(0.4)

            Text(dateTZ)
                .font(.system(size: infoSize, weight: .regular))
        }
        .foregroundColor(.primary.opacity(0.55))
        .lineLimit(1)
        .minimumScaleFactor(0.6)
        .environment(\.layoutDirection, .leftToRight)
    }
}

#Preview("InfoLine - standard phone") {
    InfoLine(
        precise: "10:42:38.27",
        dateTZ: "May 20, 2026 · GMT−07:00",
        bucket: .standardPhone,
        containerSize: CGSize(width: 852, height: 393)
    )
    .padding()
    .frame(width: 852)
    .background(Color(.systemBackground))
    .preferredColorScheme(.dark)
}

#Preview("InfoLine - tablet ko_KR") {
    InfoLine(
        precise: "23:42:38.27",
        dateTZ: "2026년 5월 20일 · GMT+09:00",
        bucket: .tablet,
        containerSize: CGSize(width: 1366, height: 1024)
    )
    .padding()
    .frame(width: 1366)
    .background(Color(.systemBackground))
    .preferredColorScheme(.dark)
}
