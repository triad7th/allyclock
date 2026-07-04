import Foundation

enum FullscreenPresets {
    private static func timeStyle() -> SectionStyle { .init(visible: true, sizeScale: 1, weight: 200, opacity: 1) }
    private static func dateStyle() -> SectionStyle { .init(visible: true, sizeScale: 1, weight: 300, opacity: 0.6) }

    private static let landscape = FullscreenBases(
        time: .init(cqw: 120, cqh: 68),
        date: .init(cqw: 8, cqh: 5),
        bar: .init(cqw: 120, cqh: 56))
    private static let nearSquare = FullscreenBases(
        time: .init(cqw: 38, cqh: 64),
        date: .init(cqw: 3.4, cqh: 4),
        bar: .init(cqw: 58, cqh: 62))
    private static let phone = FullscreenBases(
        time: .init(cqw: 24, cqh: 200, minCqh: 7.44),
        date: .init(cqw: 3.4, cqh: 200, minCqh: 1.054),
        bar: .init(cqw: 60, cqh: 200, minCqh: 18.6))

    private static func fields(_ bases: FullscreenBases) -> FullscreenFields {
        FullscreenFields(
            bar: .init(mode: .progress, sizeScale: 1, opacity: 0.34),
            secondsVisible: true, zoneVisible: false, flagVisible: false, timeZone: "",
            sections: .init(time: timeStyle(), weekday: dateStyle(), month: dateStyle(),
                            day: dateStyle(), gmt: dateStyle()),
            bases: bases,
            gaps: .init(timeToBar: 1, barToDate: 1, betweenDateParts: 1))
    }

    static func buildDefaults() -> [String: FullscreenFields] {
        ["phone": fields(phone), "tall": fields(nearSquare), "pad": fields(nearSquare),
         "lap": fields(landscape), "wide": fields(landscape), "mini": fields(landscape),
         "ultra": fields(landscape), "super": fields(landscape)]
    }
}
