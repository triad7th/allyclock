import SwiftUI
import AllyClockCore

struct FullscreenFaceView: View {
    let store: FullscreenConfigStore
    private let bg = Color(red: 0x05/255, green: 0x05/255, blue: 0x05/255)
    private let fg = Color(red: 0xfa/255, green: 0xfa/255, blue: 0xfa/255)

    var body: some View {
        GeometryReader { geo in
            let size = geo.size
            let ratio = size.width / max(size.height, 1)
            let f = store.fieldsFor(ratio)
            TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { ctx in
                content(f, size, ctx.date)
            }
        }
        .background(bg).ignoresSafeArea()
        .foregroundStyle(fg)
        .dynamicTypeSize(.medium)
        .statusBarHidden()
    }

    @ViewBuilder
    private func content(_ f: FullscreenFields, _ size: CGSize, _ now: Date) -> some View {
        let zone = f.timeZone.isEmpty ? TimeZone.current : (TimeZone(identifier: f.timeZone) ?? .current)
        let big = TimeFormatting.bigTime(now, locale: .current, timeZone: zone)
        let parts = TimeFormatting.dateParts(now, locale: .current, timeZone: zone)
        let timeSize = fullscreenFontSize(f.bases.time, sizeScale: f.sections.time.sizeScale,
                                          width: size.width, height: size.height)
        let dateBase = f.bases.date
        let gapUnit = min(size.width * 0.02, size.height * 0.03)

        VStack(spacing: 0) {
            timeRow(big, f, timeSize)
            bar(f, timeSize, now)
                .padding(.top, f.gaps.timeToBar * gapUnit)
                .padding(.bottom, f.gaps.barToDate * gapUnit)
            dateRow(parts, f, dateBase, size, now, zone)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func timeRow(_ big: TimeFormatting.BigTime, _ f: FullscreenFields, _ timeSize: CGFloat) -> some View {
        // The digits' numeral cap band (~0.72 of the font). The web ties the AM/PM
        // + seconds flank to this band (line-height 0.9 + flank align-self:stretch),
        // NOT the SwiftUI Text line box — whose tall ascent gap would float AM/PM
        // far above the glyphs at large sizes. Constrain both to `band` so the
        // flank hugs the digits: AM/PM at the cap top, seconds on the baseline.
        let band = timeSize * 0.72
        return HStack(alignment: .center, spacing: timeSize * 0.04) {
            Text(big.digits)
                .font(.system(size: timeSize, weight: AllyClock.fontWeight(f.sections.time.weight)))
                .monospacedDigit()
                .fixedSize()
                .frame(height: band, alignment: .center)
                .opacity(f.sections.time.opacity)
            VStack(alignment: .leading, spacing: 0) {
                if let ampm = big.ampm {
                    Text(ampm).font(.system(size: timeSize * 0.15, weight: .light)).opacity(0.85)
                }
                Spacer(minLength: 0)
                if f.secondsVisible {
                    Text(big.seconds).font(.system(size: timeSize * 0.1, weight: .light)).opacity(0.28)
                }
            }
            .frame(height: band, alignment: .top)
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
                         _ base: SectionBase, _ size: CGSize, _ now: Date, _ zone: TimeZone) -> some View {
        func partSize(_ scale: Double) -> CGFloat {
            fullscreenFontSize(base, sizeScale: scale, width: size.width, height: size.height)
        }
        let gap = f.gaps.betweenDateParts * partSize(1) * 0.5
        return HStack(alignment: .firstTextBaseline, spacing: gap) {
            if f.sections.weekday.visible {
                Text(parts.weekday.uppercased())
                    .font(.system(size: partSize(f.sections.weekday.sizeScale), weight: AllyClock.fontWeight(f.sections.weekday.weight)))
                    .opacity(f.sections.weekday.opacity)
                Text("·").opacity(0.4)
            }
            Text(parts.month.uppercased())
                .font(.system(size: partSize(f.sections.month.sizeScale), weight: AllyClock.fontWeight(f.sections.month.weight)))
                .opacity(f.sections.month.opacity)
            Text(parts.day)
                .font(.system(size: partSize(f.sections.day.sizeScale), weight: AllyClock.fontWeight(f.sections.day.weight)))
                .opacity(f.sections.day.opacity)
            if f.zoneVisible {
                Text("·").opacity(0.4)
                Text(TimeFormatting.zoneCity(zone.identifier, abbreviate: f.flagVisible))
                    .font(.system(size: partSize(1), weight: .light)).opacity(0.6)
            }
            if f.sections.gmt.visible {
                Text("·").opacity(0.4)
                HStack(spacing: partSize(1) * 0.12) {
                    SFIcon("globe").frame(width: partSize(1) * 0.82, height: partSize(1) * 0.82)
                    Text(parts.gmt)
                        .font(.system(size: partSize(f.sections.gmt.sizeScale), weight: AllyClock.fontWeight(f.sections.gmt.weight)))
                }
                .opacity(f.sections.gmt.opacity)
            }
            if f.flagVisible, ZoneCountry.country(for: zone.identifier) != nil {
                FlagView(zone: zone.identifier)
                    .frame(width: partSize(1) * 0.9, height: partSize(1) * 0.9)
            }
        }
        .textCase(.uppercase)
        .tracking(partSize(1) * 0.32)
    }
}

#Preview("Fullscreen") {
    FullscreenFaceView(store: FullscreenConfigStore(registry: DimensionRegistry())).frame(width: 852, height: 393)
}
