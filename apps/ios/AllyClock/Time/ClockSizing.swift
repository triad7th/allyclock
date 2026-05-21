import SwiftUI

enum SizeBucket: Equatable {
    case compactPhone
    case standardPhone
    case tablet

    static func detect(size: CGSize, horizontalSizeClass: UserInterfaceSizeClass?) -> SizeBucket {
        if horizontalSizeClass == .regular {
            return .tablet
        }
        return size.height < 390 ? .compactPhone : .standardPhone
    }

    func bigSize(in size: CGSize) -> CGFloat {
        switch self {
        case .compactPhone:
            return size.height * 0.58
        case .standardPhone:
            return size.height * 0.55
        case .tablet:
            return max(size.height * 0.46, size.width * 0.32)
        }
    }

    func ampmSize(in size: CGSize) -> CGFloat {
        let big = bigSize(in: size)
        switch self {
        case .compactPhone:
            return big * 0.22
        case .standardPhone:
            return big * 0.20
        case .tablet:
            return big * 0.18
        }
    }

    func infoSize(in size: CGSize) -> CGFloat {
        switch self {
        case .compactPhone:
            return size.height * 0.040
        case .standardPhone:
            return size.height * 0.035
        case .tablet:
            return size.height * 0.030
        }
    }

    func stackGap(in size: CGSize) -> CGFloat {
        switch self {
        case .compactPhone:
            return size.height * 0.030
        case .standardPhone:
            return size.height * 0.040
        case .tablet:
            return size.height * 0.055
        }
    }

    func edgePadding(in size: CGSize) -> CGFloat {
        let unit = min(size.width, size.height)
        switch self {
        case .compactPhone:
            return unit * 0.035
        case .standardPhone:
            return unit * 0.040
        case .tablet:
            return unit * 0.050
        }
    }

    var bigWeight: Font.Weight {
        switch self {
        case .compactPhone, .standardPhone:
            return .ultraLight
        case .tablet:
            return .thin
        }
    }
}
