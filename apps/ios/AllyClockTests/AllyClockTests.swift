@testable import AllyClock
import SwiftUI
import XCTest

final class ClockFormatterTests: XCTestCase {
    /// 2026-05-20 14:42:38.27 UTC
    private func fixedDate() -> Date {
        Date(timeIntervalSince1970: 1_779_288_158.27)
    }

    private let pst = TimeZone(secondsFromGMT: -7 * 3600) ?? .current
    private let kst = TimeZone(secondsFromGMT: 9 * 3600) ?? .current
    private let utc = TimeZone(secondsFromGMT: 0) ?? .current
    private let enUS = Locale(identifier: "en_US")
    private let enGB = Locale(identifier: "en_GB")
    private let koKR = Locale(identifier: "ko_KR")

    // MARK: bigTime

    func test_bigTime_en_US_morning_AM() {
        let result = ClockFormatter.bigTime(fixedDate(), in: pst, locale: enUS)
        // 14:42 UTC = 07:42 PDT. en_US uses 12-hour.
        XCTAssertEqual(result.digits, "7:42")
        XCTAssertEqual(result.ampm, "AM")
    }

    func test_bigTime_en_US_evening_PM() {
        // Shift fixture: 2026-05-20 22:42 UTC = 15:42 PDT.
        let later = fixedDate().addingTimeInterval(8 * 3600)
        let result = ClockFormatter.bigTime(later, in: pst, locale: enUS)
        XCTAssertEqual(result.digits, "3:42")
        XCTAssertEqual(result.ampm, "PM")
    }

    func test_bigTime_en_US_midnight() throws {
        // Build local midnight directly.
        var comps = DateComponents()
        comps.year = 2026
        comps.month = 5
        comps.day = 20
        comps.hour = 0
        comps.minute = 0
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = pst
        let date = try XCTUnwrap(cal.date(from: comps))
        let result = ClockFormatter.bigTime(date, in: pst, locale: enUS)
        XCTAssertEqual(result.digits, "12:00")
        XCTAssertEqual(result.ampm, "AM")
    }

    func test_bigTime_en_US_noon() throws {
        var comps = DateComponents()
        comps.year = 2026
        comps.month = 5
        comps.day = 20
        comps.hour = 12
        comps.minute = 0
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = pst
        let date = try XCTUnwrap(cal.date(from: comps))
        let result = ClockFormatter.bigTime(date, in: pst, locale: enUS)
        XCTAssertEqual(result.digits, "12:00")
        XCTAssertEqual(result.ampm, "PM")
    }

    func test_bigTime_ko_KR_is24Hour() {
        // 14:42 UTC = 23:42 KST.
        let result = ClockFormatter.bigTime(fixedDate(), in: kst, locale: koKR)
        XCTAssertEqual(result.digits, "23:42")
        XCTAssertNil(result.ampm)
    }

    func test_bigTime_en_GB_is24Hour() {
        let result = ClockFormatter.bigTime(fixedDate(), in: utc, locale: enGB)
        XCTAssertEqual(result.digits, "14:42")
        XCTAssertNil(result.ampm)
    }

    // MARK: precise

    func test_precise_isAlways24Hour_withHundredths() {
        // 14:42:38.27 UTC = 07:42:38.27 PDT.
        XCTAssertEqual(ClockFormatter.precise(fixedDate(), in: pst), "07:42:38.27")
        // Same date in 24-hour locale stays identical.
        XCTAssertEqual(ClockFormatter.precise(fixedDate(), in: utc), "14:42:38.27")
    }

    // MARK: dateTZ

    func test_dateTZ_LosAngeles_enUS() {
        // Date.FormatStyle's exact glyphs (separators, spaces) can shift between OS
        // versions, so assert on the meaningful tokens rather than the whole string.
        let result = ClockFormatter.dateTZ(fixedDate(), in: pst, locale: enUS)
        XCTAssertTrue(result.contains("May"), "month missing - got: \(result)")
        XCTAssertTrue(result.contains("20"), "day missing - got: \(result)")
        XCTAssertTrue(result.contains("2026"), "year missing - got: \(result)")
        XCTAssertTrue(
            result.contains("· GMT−07:00"),
            "separator + offset wrong - got: \(result)"
        )
    }

    func test_dateTZ_Seoul_koKR() {
        let result = ClockFormatter.dateTZ(fixedDate(), in: kst, locale: koKR)
        XCTAssertTrue(result.contains("2026"), "year missing - got: \(result)")
        XCTAssertTrue(result.contains("5"), "month missing - got: \(result)")
        XCTAssertTrue(result.contains("20"), "day missing - got: \(result)")
        XCTAssertTrue(
            result.contains("· GMT+09:00"),
            "separator + offset wrong - got: \(result)"
        )
    }

    func test_dateTZ_UTC_includesZeroOffset() {
        let result = ClockFormatter.dateTZ(fixedDate(), in: utc, locale: enGB)
        XCTAssertTrue(result.contains("· GMT+00:00"), "got: \(result)")
    }
}

final class ClockSizingTests: XCTestCase {
    func test_detect_iPhoneSE_landscape_isCompactPhone() {
        // iPhone SE 3rd gen landscape: 667 x 375.
        let bucket = SizeBucket.detect(
            size: CGSize(width: 667, height: 375),
            horizontalSizeClass: .compact
        )
        XCTAssertEqual(bucket, .compactPhone)
    }

    func test_detect_iPhone16Pro_landscape_isStandardPhone() {
        // iPhone 16 Pro landscape: ~852 x 393.
        let bucket = SizeBucket.detect(
            size: CGSize(width: 852, height: 393),
            horizontalSizeClass: .compact
        )
        XCTAssertEqual(bucket, .standardPhone)
    }

    func test_detect_iPadPro_landscape_isTablet() {
        // iPad Pro 13" landscape: ~1366 x 1024.
        let bucket = SizeBucket.detect(
            size: CGSize(width: 1366, height: 1024),
            horizontalSizeClass: .regular
        )
        XCTAssertEqual(bucket, .tablet)
    }

    func test_detect_nilSizeClass_fallsBackToHeightHeuristic() {
        XCTAssertEqual(
            SizeBucket.detect(size: CGSize(width: 667, height: 375), horizontalSizeClass: nil),
            .compactPhone
        )
        XCTAssertEqual(
            SizeBucket.detect(size: CGSize(width: 852, height: 393), horizontalSizeClass: nil),
            .standardPhone
        )
    }

    func test_bigSize_tablet_usesHeightWhenItIsLargerThanWidthFloor() {
        let size = SizeBucket.tablet.bigSize(in: CGSize(width: 1366, height: 1024))
        XCTAssertEqual(size, 1024 * 0.46, accuracy: 0.01)
    }

    func test_bigSize_tablet_usesWidthFloor_whenHeightTooSmall() {
        let size = SizeBucket.tablet.bigSize(in: CGSize(width: 1200, height: 500))
        XCTAssertEqual(size, 1200 * 0.32, accuracy: 0.01)
    }
}
