// swift-tools-version: 6.0
import PackageDescription

let package = Package(
  name: "AllyClockCore",
  platforms: [.iOS(.v17), .tvOS(.v17), .watchOS(.v10), .macOS(.v14)],
  products: [
    .library(name: "AllyClockCore", targets: ["AllyClockCore"]),
  ],
  dependencies: [
    .package(url: "https://github.com/triad7th/Alloy.git", from: "0.1.0"),
  ],
  targets: [
    .target(name: "AllyClockCore",
            dependencies: [.product(name: "AlloyTime", package: "Alloy")]),
    .testTarget(name: "AllyClockCoreTests", dependencies: ["AllyClockCore"]),
  ]
)
