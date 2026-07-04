import Foundation

/// Timezone- and locale-aware formatting. Port of `clock-formatter.ts`
/// (`Intl.DateTimeFormat` → `DateFormatter`/`Calendar`). Native
/// `TimeZone.secondsFromGMT(for:)` replaces the web's zone-offset catalog.
public enum TimeFormatting {
    public struct BigTime: Equatable {
        public let digits: String     // "1:05"
        public let seconds: String    // "07"
        public let ampm: String?      // "AM"/"PM", nil for 24h locales
    }

    public struct DateParts: Equatable {
        public let weekday: String    // "Thu"
        public let month: String      // "Jan"
        public let day: String        // "15"
        public let gmt: String        // "+9", "\u{2212}8", "+5:30"
    }

    private static func formatter(_ locale: Locale, _ tz: TimeZone) -> DateFormatter {
        let f = DateFormatter()
        f.locale = locale
        f.timeZone = tz
        return f
    }

    public static func bigTime(_ date: Date, locale: Locale, timeZone: TimeZone) -> BigTime {
        let f = formatter(locale, timeZone)
        // Hour + minute in the locale's convention (12h or 24h) with no seconds.
        f.setLocalizedDateFormatFromTemplate("jmm")
        let hm = f.string(from: date)

        let uses24h = (DateFormatter.dateFormat(fromTemplate: "j", options: 0, locale: locale) ?? "")
            .contains("H")

        // Split trailing AM/PM (if any) from the digits.
        var digits = hm
        var ampm: String? = nil
        if !uses24h {
            let symbols = [f.amSymbol ?? "AM", f.pmSymbol ?? "PM"]
            for s in symbols where hm.contains(s) {
                ampm = s
                digits = hm.replacingOccurrences(of: s, with: "")
            }
            digits = digits.trimmingCharacters(in: .whitespaces)
        }

        let sf = formatter(Locale(identifier: "en_US_POSIX"), timeZone)
        sf.dateFormat = "ss"
        return BigTime(digits: digits, seconds: sf.string(from: date), ampm: ampm)
    }

    public static func dateParts(_ date: Date, locale: Locale, timeZone: TimeZone) -> DateParts {
        let wf = formatter(locale, timeZone); wf.setLocalizedDateFormatFromTemplate("EEE")
        let mf = formatter(locale, timeZone); mf.setLocalizedDateFormatFromTemplate("MMM")
        let df = formatter(locale, timeZone); df.setLocalizedDateFormatFromTemplate("d")
        return DateParts(weekday: wf.string(from: date),
                         month: mf.string(from: date),
                         day: df.string(from: date),
                         gmt: compactOffset(date, timeZone: timeZone))
    }

    /// Sign + hours, with ":mm" only when the zone is off a whole hour.
    /// Uses U+2212 MINUS for negatives, matching the app.
    public static func compactOffset(_ date: Date, timeZone: TimeZone) -> String {
        let minutes = timeZone.secondsFromGMT(for: date) / 60
        let sign = minutes < 0 ? "\u{2212}" : "+"
        let abs = Swift.abs(minutes)
        let h = abs / 60, m = abs % 60
        return m == 0 ? "\(sign)\(h)" : "\(sign)\(h):\(String(format: "%02d", m))"
    }

    /// City label from an IANA id: last path segment, underscores spaced,
    /// uppercased. `abbreviate` collapses multi-word to initials, single word to
    /// first three letters. Fixed-offset ids ("+05:30") have no city.
    public static func zoneCity(_ ianaId: String, abbreviate: Bool) -> String {
        if ianaId.range(of: "^[+\u{2212}-]\\d", options: .regularExpression) != nil { return "" }
        let city = (ianaId.split(separator: "/").last.map(String.init) ?? ianaId)
            .replacingOccurrences(of: "_", with: " ")
        if !abbreviate { return city.uppercased() }
        let words = city.split(whereSeparator: { $0 == " " || $0 == "-" }).map(String.init)
        let label = words.count > 1 ? words.map { String($0.prefix(1)) }.joined()
                                    : String(city.prefix(3))
        return label.uppercased()
    }
}
