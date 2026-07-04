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
            Text(flag)
        } else {
            SFIcon("globe")
        }
    }
}
