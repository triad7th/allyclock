import AllyClockCore
import AlloyTime
import AlloyUI
import SwiftUI
import UIKit

/// Country flag for an IANA zone, rendered from the SAME flag-icons artwork
/// the web serves (square 1x1 SVGs rasterized into `Assets.xcassets/Flags`
/// by `assets/flags/render_ios_flags.py`), or a globe when the zone has no
/// country (UTC, Etc/*, unknown). Mirrors the web `FlagComponent`: square,
/// cover-fit, 2pt corner radius.
enum FlagResolution {
    /// Asset-catalog name ("Flags/us") for a zone's country; nil when the
    /// zone has no country or the artwork is missing from the bundle.
    static func assetName(forZone zone: String) -> String? {
        guard let code = ZoneCountry.country(for: zone) else { return nil }
        let name = "Flags/\(code)"
        return UIImage(named: name) != nil ? name : nil
    }
}

struct FlagView: View {
    let zone: String

    var body: some View {
        if let asset = FlagResolution.assetName(forZone: zone) {
            Image(asset)
                .resizable()
                .scaledToFill()
                .clipShape(RoundedRectangle(cornerRadius: 2))
        } else {
            SFIcon("globe")
        }
    }
}
