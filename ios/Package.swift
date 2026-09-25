// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "CanhGiacSoIOS",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "CanhGiacSoCore", targets: ["CanhGiacSoCore"]),
        .executable(name: "CanhGiacSoCoreChecks", targets: ["CanhGiacSoCoreChecks"])
    ],
    targets: [
        .target(
            name: "CanhGiacSoCore",
            path: "CanhGiacSoCore"
        ),
        .testTarget(
            name: "CanhGiacSoTests",
            dependencies: ["CanhGiacSoCore"],
            path: "CanhGiacSoTests"
        ),
        .executableTarget(
            name: "CanhGiacSoCoreChecks",
            dependencies: ["CanhGiacSoCore"],
            path: "CanhGiacSoCoreChecks"
        )
    ]
)
