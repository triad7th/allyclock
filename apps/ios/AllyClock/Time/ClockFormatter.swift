import Foundation

enum ClockFormatter {
    typealias BigTime = (digits: String, ampm: String?)

    static func bigTime(_ date: Date, in timeZone: TimeZone, locale: Locale) -> BigTime {
        let isTwelveHour = usesTwelveHourClock(locale)

        let formatter = DateFormatter()
        formatter.locale = locale
        formatter.timeZone = timeZone
        formatter.setLocalizedDateFormatFromTemplate(isTwelveHour ? "hmm" : "Hmm")

        var rendered = formatter.string(from: date)
        if isTwelveHour {
            for symbol in [formatter.amSymbol, formatter.pmSymbol, "AM", "PM"].compactMap({ $0 }) {
                rendered = rendered.replacingOccurrences(of: symbol, with: "")
            }
            rendered = rendered.trimmingCharacters(in: .whitespaces)
        }

        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        let hour24 = calendar.component(.hour, from: date)
        let amSymbol = nonEmpty(formatter.amSymbol, fallback: "AM")
        let pmSymbol = nonEmpty(formatter.pmSymbol, fallback: "PM")
        let ampm: String? = isTwelveHour ? (hour24 < 12 ? amSymbol : pmSymbol) : nil

        return (rendered, ampm)
    }

    static func precise(_ date: Date, in timeZone: TimeZone) -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        let comps = calendar.dateComponents([.hour, .minute, .second, .nanosecond], from: date)
        let hundredths = min(99, Int((Double(comps.nanosecond ?? 0) / 10_000_000).rounded()))
        return String(
            format: "%02d:%02d:%02d.%02d",
            comps.hour ?? 0,
            comps.minute ?? 0,
            comps.second ?? 0,
            hundredths
        )
    }

    static func dateTZ(_ date: Date, in timeZone: TimeZone, locale: Locale) -> String {
        let formatter = DateFormatter()
        formatter.locale = locale
        formatter.timeZone = timeZone
        formatter.dateStyle = .long
        formatter.timeStyle = .none
        let datePart = formatter.string(from: date)
        return "\(datePart) · \(gmtOffset(timeZone, for: date))"
    }

    static func gmtOffset(_ timeZone: TimeZone, for date: Date) -> String {
        let totalSeconds = timeZone.secondsFromGMT(for: date)
        let sign = totalSeconds >= 0 ? "+" : "\u{2212}"
        let magnitude = abs(totalSeconds)
        let hours = magnitude / 3600
        let minutes = (magnitude % 3600) / 60
        return String(format: "GMT%@%02d:%02d", sign, hours, minutes)
    }

    private static func nonEmpty(_ value: String?, fallback: String) -> String {
        guard let value, !value.isEmpty else {
            return fallback
        }
        return value
    }

    private static func usesTwelveHourClock(_ locale: Locale) -> Bool {
        let normalized = locale.identifier.replacingOccurrences(of: "-", with: "_")
        return normalized.split(separator: "_").contains("US")
    }
}
