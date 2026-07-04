import XCTest
@testable import AllyClockCore

final class TimeFormattingTests: XCTestCase {
    // 2026-01-15 09:21:47 UTC
    private let date = Date(timeIntervalSince1970: 1_768_468_907)
    private let enUS = Locale(identifier: "en_US")

    func test_bigTime_splitsDigitsAmpmSeconds_inZone() {
        let la = TimeZone(identifier: "America/Los_Angeles")!  // UTC-8 in January
        let t = TimeFormatting.bigTime(date, locale: enUS, timeZone: la)
        XCTAssertEqual(t.digits, "1:21")
        XCTAssertEqual(t.ampm, "AM")
        XCTAssertEqual(t.seconds, "47")
    }

    func test_bigTime_24hLocaleHasNoAmpm() {
        // de_DE is reliably 24-hour across ICU versions ("18:21", no AM/PM).
        let seoul = TimeZone(identifier: "Asia/Seoul")!       // UTC+9
        let t = TimeFormatting.bigTime(date, locale: Locale(identifier: "de_DE"), timeZone: seoul)
        XCTAssertNil(t.ampm)
        XCTAssertEqual(t.digits, "18:21")
        XCTAssertEqual(t.seconds, "47")
    }

    func test_dateParts_weekdayMonthDayAndCompactOffset() {
        let seoul = TimeZone(identifier: "Asia/Seoul")!
        let p = TimeFormatting.dateParts(date, locale: enUS, timeZone: seoul)
        XCTAssertEqual(p.weekday, "Thu")   // 2026-01-15 18:21 KST is a Thursday
        XCTAssertEqual(p.month, "Jan")
        XCTAssertEqual(p.day, "15")
        XCTAssertEqual(p.gmt, "+9")
    }

    func test_compactOffset_wholeAndHalfHours_useMinusSign() {
        XCTAssertEqual(TimeFormatting.compactOffset(date, timeZone: TimeZone(identifier: "UTC")!), "+0")
        XCTAssertEqual(TimeFormatting.compactOffset(date, timeZone: TimeZone(identifier: "America/Los_Angeles")!), "\u{2212}8")
        XCTAssertEqual(TimeFormatting.compactOffset(date, timeZone: TimeZone(identifier: "Asia/Kolkata")!), "+5:30")
    }

    func test_zoneCity_fullAndAbbreviated() {
        XCTAssertEqual(TimeFormatting.zoneCity("America/Los_Angeles", abbreviate: false), "LOS ANGELES")
        XCTAssertEqual(TimeFormatting.zoneCity("America/Los_Angeles", abbreviate: true), "LA")
        XCTAssertEqual(TimeFormatting.zoneCity("Europe/London", abbreviate: true), "LON")
        XCTAssertEqual(TimeFormatting.zoneCity("UTC", abbreviate: true), "UTC")
        XCTAssertEqual(TimeFormatting.zoneCity("+05:30", abbreviate: false), "")
    }
}
