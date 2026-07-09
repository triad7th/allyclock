import AllyClockCore
import AlloyTime
import AlloyUI
import SwiftUI

struct WorldCardView: View {
    let zone: String
    let timeScale: Double
    let dateScale: Double
    private let fg = Color.white

    var body: some View {
        let tz = TimeZone(identifier: zone) ?? .current
        TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { ctx in
            let now = ctx.date
            let big = TimeFormatting.bigTime(now, locale: .current, timeZone: tz)
            HStack(spacing: 12) {
                FlagView(zone: zone)
                    .frame(width: 92 * timeScale, height: 92 * timeScale)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                VStack(alignment: .trailing, spacing: 3 * timeScale) {
                    HStack(alignment: .center, spacing: 4 * timeScale) {
                        // Tie the flank to the digits' cap band (~0.72 of the font),
                        // not the Text line box, so AM/PM hugs the cap top and
                        // seconds sits on the baseline. Matches the web card.
                        let band = 72 * timeScale * 0.72
                        Text(big.digits)
                            .font(.system(size: 72 * timeScale, weight: AllyClock.fontWeight(250)))
                            .monospacedDigit()
                            .lineLimit(1)
                            .fixedSize()
                            .frame(height: band, alignment: .center)
                        VStack(alignment: .leading, spacing: 0) {
                            if let ampm = big.ampm {
                                Text(ampm).font(.system(size: 17 * timeScale, weight: .light))
                                    .opacity(0.85)
                            }
                            Spacer(minLength: 0)
                            Text(big.seconds).font(.system(size: 17 * timeScale, weight: .light))
                                .opacity(0.32)
                        }
                        .frame(height: band, alignment: .top)
                    }
                    dateLine(now, tz)
                }
            }
            .padding(.vertical, 16)
            .overlay(alignment: .bottom) { Rectangle().fill(fg).frame(height: 1) }
            .foregroundStyle(fg)
        }
    }

    private func dateLine(_ now: Date, _ tz: TimeZone) -> some View {
        let df = DateFormatter()
        df.locale = .current
        df.timeZone = tz
        df.setLocalizedDateFormatFromTemplate("MMMdyyyy")
        let cal = df.string(from: now)
        let city = ZoneFormat.zoneCity(zone, abbreviate: true)
        let offset = ZoneFormat.compactOffset(now, timeZone: tz)
        return HStack(alignment: .firstTextBaseline, spacing: 6 * dateScale) {
            Text(cal.uppercased())
            if !city.isEmpty { Text("·").opacity(0.5)
                Text(city)
            }
            Text("·").opacity(0.5)
            HStack(spacing: 3 * dateScale) {
                SFIcon("globe").frame(width: 15 * dateScale, height: 15 * dateScale)
                Text(offset)
            }
        }
        .font(.system(size: 14 * dateScale, weight: .regular))
        .textCase(.uppercase)
        .tracking(2)
        .opacity(0.7)
        .lineLimit(1)
    }
}
