// swift-tools-version: 6.0
import PackageDescription

let package = Package(
  name: "AllyClockCore",
  platforms: [.iOS(.v17), .tvOS(.v17), .watchOS(.v10), .macOS(.v14)],
  products: [
    .library(name: "AllyClockCore", targets: ["AllyClockCore"]),
  ],
  targets: [
    .target(name: "AllyClockCore"),
    .testTarget(name: "AllyClockCoreTests", dependencies: ["AllyClockCore"]),
  ]
)
