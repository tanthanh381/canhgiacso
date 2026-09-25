import Foundation

public struct AppConfiguration: Equatable, Sendable {
    public let supabaseURL: URL
    public let publishableKey: String

    public init(supabaseURL: URL, publishableKey: String) {
        self.supabaseURL = supabaseURL
        self.publishableKey = publishableKey
    }

    public static let production = AppConfiguration(
        supabaseURL: URL(string: "https://goietwyapiywrtibpkwo.supabase.co")!,
        publishableKey: "sb_publishable_ghj-H14bq2n1tSsH4u-adA_LoBtWKO4"
    )
}
