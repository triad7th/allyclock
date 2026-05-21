import SwiftUI

struct BigTime: View {
    let digits: String
    let ampm: String?
    let bucket: SizeBucket
    let containerSize: CGSize

    var body: some View {
        let big = bucket.bigSize(in: containerSize)
        let ampmSize = bucket.ampmSize(in: containerSize)

        HStack(alignment: .firstTextBaseline, spacing: ampmSize * 0.4) {
            Text(digits)
                .font(.system(size: big, weight: bucket.bigWeight))
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.6)

            if let ampm {
                Text(ampm)
                    .font(.system(size: ampmSize, weight: .regular))
                    .tracking(ampmSize * 0.08)
                    .baselineOffset(big * 0.55)
                    .lineLimit(1)
            }
        }
        .foregroundColor(.primary)
    }
}

#Preview("BigTime - standard phone 12h") {
    BigTime(
        digits: "10:42",
        ampm: "PM",
        bucket: .standardPhone,
        containerSize: CGSize(width: 852, height: 393)
    )
    .frame(width: 852, height: 393)
    .background(Color(.systemBackground))
    .preferredColorScheme(.dark)
}

#Preview("BigTime - compact phone 12h") {
    BigTime(
        digits: "7:42",
        ampm: "AM",
        bucket: .compactPhone,
        containerSize: CGSize(width: 667, height: 375)
    )
    .frame(width: 667, height: 375)
    .background(Color(.systemBackground))
    .preferredColorScheme(.dark)
}

#Preview("BigTime - tablet 24h") {
    BigTime(
        digits: "23:42",
        ampm: nil,
        bucket: .tablet,
        containerSize: CGSize(width: 1366, height: 1024)
    )
    .frame(width: 1366, height: 1024)
    .background(Color(.systemBackground))
    .preferredColorScheme(.dark)
}
