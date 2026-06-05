import SwiftUI

struct ClockView: View {
    @Environment(\.locale) private var locale

    var body: some View {
        GeometryReader { geometry in
            let bucket = SizeBucket.detect(size: geometry.size)

            TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { context in
                content(at: context.date, size: geometry.size, bucket: bucket)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .padding(bucket.edgePadding(in: geometry.size))
        }
        .background(Color(.systemBackground))
        .ignoresSafeArea()
        .statusBar(hidden: true)
        .persistentSystemOverlays(.hidden)
        .dynamicTypeSize(.medium)
    }

    @ViewBuilder
    private func content(at date: Date, size: CGSize, bucket: SizeBucket) -> some View {
        let timeZone = TimeZone.current
        let bigTime = ClockFormatter.bigTime(date, in: timeZone, locale: locale)
        let precise = ClockFormatter.precise(date, in: timeZone)
        let dateTZ = ClockFormatter.dateTZ(date, in: timeZone, locale: locale)

        VStack(spacing: bucket.stackGap(in: size)) {
            BigTime(
                digits: bigTime.digits,
                ampm: bigTime.ampm,
                bucket: bucket,
                containerSize: size
            )
            InfoLine(precise: precise, dateTZ: dateTZ, bucket: bucket, containerSize: size)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview("iPhone SE landscape dark") {
    previewClock(width: 667, height: 375, colorScheme: .dark)
}

#Preview("iPhone SE landscape light") {
    previewClock(width: 667, height: 375, colorScheme: .light)
}

#Preview("iPhone 13 mini landscape dark") {
    previewClock(width: 812, height: 375, colorScheme: .dark)
}

#Preview("iPhone 14 landscape dark") {
    previewClock(width: 844, height: 390, colorScheme: .dark)
}

#Preview("iPhone 16 Pro landscape dark") {
    previewClock(width: 852, height: 393, colorScheme: .dark)
}

#Preview("iPhone 16 Pro Max landscape dark") {
    previewClock(width: 956, height: 440, colorScheme: .dark)
}

#Preview("iPad mini landscape dark") {
    previewClock(width: 1133, height: 744, colorScheme: .dark)
}

#Preview("iPad Air 11\" landscape dark") {
    previewClock(width: 1180, height: 820, colorScheme: .dark)
}

#Preview("iPad Pro 11\" landscape dark") {
    previewClock(width: 1210, height: 834, colorScheme: .dark)
}

#Preview("iPad Pro 13\" landscape dark") {
    previewClock(width: 1366, height: 1024, colorScheme: .dark)
}

#Preview("iPhone 16 Pro ko_KR") {
    previewClock(
        width: 852,
        height: 393,
        colorScheme: .dark,
        locale: Locale(identifier: "ko_KR")
    )
}

#Preview("iPhone 16 Pro ja_JP") {
    previewClock(
        width: 852,
        height: 393,
        colorScheme: .dark,
        locale: Locale(identifier: "ja_JP")
    )
}

#Preview("iPhone 16 Pro ar_SA RTL") {
    previewClock(
        width: 852,
        height: 393,
        colorScheme: .dark,
        locale: Locale(identifier: "ar_SA"),
        layoutDirection: .rightToLeft
    )
}

private func previewClock(
    width: CGFloat,
    height: CGFloat,
    colorScheme: ColorScheme,
    locale: Locale = Locale(identifier: "en_US"),
    layoutDirection: LayoutDirection = .leftToRight
) -> some View {
    ClockView()
        .frame(width: width, height: height)
        .preferredColorScheme(colorScheme)
        .environment(\.locale, locale)
        .environment(\.layoutDirection, layoutDirection)
}
