import AllyClockCore
import SwiftUI

struct FullscreenFaceView: View {
    let store: FullscreenConfigStore
    /// Frozen render instant for snapshot tests and previews; nil = live
    /// clock via TimelineView.
    var now: Date?
    private let bg = Color(red: 0x05 / 255, green: 0x05 / 255, blue: 0x05 / 255)
    private let fg = Color(red: 0xFA / 255, green: 0xFA / 255, blue: 0xFA / 255)

    var body: some View {
        GeometryReader { geo in
            let size = geo.size
            let ratio = size.width / max(size.height, 1)
            let f = store.fieldsFor(ratio)
            Group {
                if let frozen = now {
                    content(f, size, frozen)
                } else {
                    TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { ctx in
                        content(f, size, ctx.date)
                    }
                }
            }
            .debugFrame("host", .white)
            .debugNumbers(["ratio": String(format: "%.3f", ratio),
                           "size": "\(Int(size.width))×\(Int(size.height))"])
        }
        .background(bg).ignoresSafeArea()
        .foregroundStyle(fg)
        .dynamicTypeSize(.medium)
        .statusBarHidden()
    }

    @ViewBuilder
    private func content(_ f: FullscreenFields, _ size: CGSize, _ now: Date) -> some View {
        // ZoneCatalog.resolve also accepts fixed-offset ids ("+05:30") that
        // TimeZone(identifier:) rejects; unknown ids fall back to the device.
        let zone = f.timeZone.isEmpty ? TimeZone.current
            : (ZoneCatalog.resolve(f.timeZone) ?? .current)
        let big = TimeFormatting.bigTime(now, locale: .current, timeZone: zone)
        let parts = TimeFormatting.dateParts(now, locale: .current, timeZone: zone)
        // Web-exact overflow: the clock renders at its configured size and the
        // host clips the excess (web overflow: hidden) — a large user zoom is
        // honored, never auto-shrunk to fit. The frame must be FIXED to the
        // host size: a flexible (.infinity) frame grows to an oversized child,
        // which GeometryReader then anchors top-leading — the fixed frame
        // keeps the overflow centered and makes .clipped() cut at the host.
        clock(f, size, now, big, parts, zone)
            .frame(width: size.width, height: size.height)
            .clipped()
    }

    private func clock(_ f: FullscreenFields, _ size: CGSize, _ now: Date,
                       _ big: TimeFormatting.BigTime, _ parts: TimeFormatting.DateParts,
                       _ zone: TimeZone) -> some View
    {
        let timeSize = fullscreenFontSize(f.bases.time, sizeScale: f.sections.time.sizeScale,
                                          width: size.width, height: size.height)
        let gapUnit = min(size.width * 0.02, size.height * 0.03)
        // Web-exact gaps: timeToBar/barToDate × gapUnit, nothing extra. The
        // breathing room below the digits comes from the 0.9t time row itself
        // (web line-height 0.9), not from padding.
        let padTimeBar = f.gaps.timeToBar * gapUnit
        let padBarDate = f.gaps.barToDate * gapUnit
        return VStack(spacing: 0) {
            timeRow(big, f, timeSize)
                .debugFrame("timeRow", .red)
            bar(f, timeSize, now)
                .debugFrame("bar", .green)
                .padding(.top, padTimeBar)
                .padding(.bottom, padBarDate)
            dateRow(parts, f, f.bases.date, size, now, zone)
                .debugFrame("dateRow", .blue)
        }
        .debugFrame("clock", .yellow)
        .debugNumbers(["timeSize": String(format: "%.1f", timeSize),
                       "row(0.9t)": String(format: "%.1f", timeSize * 0.9),
                       "capBand(0.72t)": String(format: "%.1f", timeSize * 0.72),
                       "gapUnit": String(format: "%.1f", gapUnit),
                       "padTimeBar": String(format: "%.1f", padTimeBar),
                       "padBarDate": String(format: "%.1f", padBarDate)])
    }

    private func timeRow(_ big: TimeFormatting.BigTime, _ f: FullscreenFields,
                         _ timeSize: CGFloat) -> some View
    {
        // Web-exact time row: line-height 0.9 → a 0.9t row with the glyphs
        // centered in it (NOT the SwiftUI Text line box, whose tall ascent gap
        // floats AM/PM away at large sizes). The flank is the digit cap band
        // (~0.72t) centered on the row, so AM/PM hugs the cap top and seconds
        // sits near the baseline — matching the web's align-self: stretch flank.
        let row = timeSize * 0.9
        let band = timeSize * 0.72
        return HStack(alignment: .center, spacing: timeSize * 0.04) {
            Text(big.digits)
                .font(.system(size: timeSize, weight: AllyClock.fontWeight(f.sections.time.weight)))
                .monospacedDigit()
                .fixedSize()
                .frame(height: row, alignment: .center)
                .opacity(f.sections.time.opacity)
                .debugFrame("digits", .orange)
            // .fixedSize keeps AM/PM and seconds on one line when the digits
            // overflow the host and squeeze the flank — web parity: the flank
            // overflows and clips, it never wraps.
            VStack(alignment: .leading, spacing: 0) {
                if let ampm = big.ampm {
                    Text(ampm).font(.system(size: timeSize * 0.15, weight: .light)).opacity(0.85)
                        .fixedSize()
                }
                Spacer(minLength: 0)
                if f.secondsVisible {
                    Text(big.seconds).font(.system(size: timeSize * 0.1, weight: .light))
                        .opacity(0.28)
                        .fixedSize()
                }
            }
            .frame(height: band, alignment: .top)
            .debugFrame("flank", .purple)
        }
    }

    @ViewBuilder
    private func bar(_ f: FullscreenFields, _ timeSize: CGFloat, _ now: Date) -> some View {
        let w = timeSize * 56 / 68
        switch f.bar.mode {
        case .off:
            EmptyView()
        case .divider:
            Rectangle().fill(fg).opacity(f.bar.opacity).frame(width: w, height: 1.5)
        case .progress:
            let d = Calendar.current.dateComponents([.second, .nanosecond], from: now)
            let progress = (Double(d.second ?? 0) + Double(d.nanosecond ?? 0) / 1e9) / 60
            ZStack(alignment: .leading) {
                Rectangle().fill(fg.opacity(0.16))
                Rectangle().fill(fg).opacity(0.85).frame(width: w * progress)
            }
            .frame(width: w, height: 2).clipShape(RoundedRectangle(cornerRadius: 2))
        }
    }

    private func dateRow(_ parts: TimeFormatting.DateParts, _ f: FullscreenFields,
                         _ base: SectionBase, _ size: CGSize, _: Date, _ zone: TimeZone)
        -> some View
    {
        func partSize(_ scale: Double) -> CGFloat {
            fullscreenFontSize(base, sizeScale: scale, width: size.width, height: size.height)
        }
        let gap = f.gaps.betweenDateParts * partSize(1) * 0.5
        return HStack(alignment: .firstTextBaseline, spacing: gap) {
            if f.sections.weekday.visible {
                Text(parts.weekday.uppercased())
                    .font(.system(
                        size: partSize(f.sections.weekday.sizeScale),
                        weight: AllyClock.fontWeight(f.sections.weekday.weight)
                    ))
                    .opacity(f.sections.weekday.opacity)
                Text("·").opacity(0.4)
            }
            Text(parts.month.uppercased())
                .font(.system(
                    size: partSize(f.sections.month.sizeScale),
                    weight: AllyClock.fontWeight(f.sections.month.weight)
                ))
                .opacity(f.sections.month.opacity)
            Text(parts.day)
                .font(.system(
                    size: partSize(f.sections.day.sizeScale),
                    weight: AllyClock.fontWeight(f.sections.day.weight)
                ))
                .opacity(f.sections.day.opacity)
            if f.zoneVisible {
                Text("·").opacity(0.4)
                // Follows the Date knob via the month scale, like the web's
                // .zone (the knob broadcasts one value to every date part).
                Text(TimeFormatting.zoneCity(zone.identifier, abbreviate: f.flagVisible))
                    .font(.system(size: partSize(f.sections.month.sizeScale), weight: .light))
                    .opacity(0.6)
            }
            if f.sections.gmt.visible {
                Text("·").opacity(0.4)
                // Globe + spacing ride the gmt scale, like the web's em-sized
                // .gmt-globe (em is relative to the scaled .gmt font).
                HStack(spacing: partSize(f.sections.gmt.sizeScale) * 0.12) {
                    SFIcon("globe")
                        .frame(width: partSize(f.sections.gmt.sizeScale) * 0.82,
                               height: partSize(f.sections.gmt.sizeScale) * 0.82)
                    Text(parts.gmt)
                        .font(.system(
                            size: partSize(f.sections.gmt.sizeScale),
                            weight: AllyClock.fontWeight(f.sections.gmt.weight)
                        ))
                }
                .opacity(f.sections.gmt.opacity)
            }
            if f.flagVisible, ZoneCountry.country(for: zone.identifier) != nil {
                // Follows the Date knob via the month scale, like the web's
                // .date-flag.
                FlagView(zone: zone.identifier)
                    .frame(width: partSize(f.sections.month.sizeScale) * 0.9,
                           height: partSize(f.sections.month.sizeScale) * 0.9)
                    // Web's `.date-flag { align-self: center }`: the square sits
                    // centered on the row, not baseline-aligned. In a
                    // firstTextBaseline HStack an image pins its bottom to the
                    // baseline, so the taller square rides up above the caps —
                    // override the guide so the flag's CENTER lands on the
                    // uppercase cap band (~0.35em above the baseline).
                    .alignmentGuide(.firstTextBaseline) { d in
                        d.height / 2 + partSize(f.sections.month.sizeScale) * 0.35
                    }
            }
        }
        .textCase(.uppercase)
        .tracking(partSize(1) * 0.32)
    }
}

#Preview("Fullscreen") {
    FullscreenFaceView(store: FullscreenConfigStore(registry: DimensionRegistry())).frame(
        width: 852,
        height: 393
    )
}
