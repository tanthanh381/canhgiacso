import Foundation
import CanhGiacSoCore

func check(_ condition: @autoclosure () -> Bool, _ message: String) {
    if !condition() {
        fputs("Check failed: \(message)\n", stderr)
        Foundation.exit(1)
    }
}

let content = SiteContentNormalizer.normalized(BundledContent.siteContent)
check(content != nil, "bundled content must match the mobile content contract")
check(content?.scenarios.allSatisfy { $0.choices.count == 3 } == true, "each scenario must expose exactly three choices")

let request = try SupabaseClient(configuration: .production)
    .makeDebugRequest(path: "/rest/v1/rpc/get_public_site_content")
check(request.value(forHTTPHeaderField: "apikey")?.hasPrefix("sb_publishable_") == true, "only publishable key is allowed in the app")
check(request.value(forHTTPHeaderField: "Authorization") == "Bearer \(AppConfiguration.production.publishableKey)", "anonymous RPCs should use the publishable bearer")
check(request.value(forHTTPHeaderField: "Authorization")?.contains("service_role") == false, "service role keys must never ship to iOS")

print("CanhGiacSoCoreChecks passed")
