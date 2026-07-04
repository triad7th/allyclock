// swift-tools-version: 6.0
import PackageDescription

let package = Package(
  name: "AllyClockCore",
  platforms: [.iOS(.v16), .tvOS(.v16), .watchOS(.v9)],
  products: [
    .library(name: "AllyClockCore", targets: ["AllyClockCore"]),
  ],
  targets: [
    .target(name: "AllyClockCore"),
    .testTarget(name: "AllyClockCoreTests", dependencies: ["AllyClockCore"]),
  ]
)
