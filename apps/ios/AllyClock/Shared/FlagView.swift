import SwiftUI
import AllyClockCore

/// Country flag for an IANA zone as a regional-indicator emoji, or a globe when
/// the zone has no country (UTC, Etc/*, unknown).
enum FlagResolution {
    static func emoji(forZone zone: String) -> String? { ZoneCountry.flagEmoji(for: zone) }
}

struct FlagView: View {
    let zone: String
    var body: some View {
        if let flag = FlagResolution.emoji(forZone: zone) {
            // A `Text` emoji renders at its font size, not the frame — size the
            // font to the host box so the flag fills it the way the globe does.
            GeometryReader { g in
                Text(flag)
                    .font(.system(size: min(g.size.width, g.size.height)))
                    .frame(width: g.size.width, height: g.size.height)
            }
        } else {
            SFIcon("globe")
        }
    }
}
