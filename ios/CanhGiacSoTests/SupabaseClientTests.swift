import Foundation
import XCTest
@testable import CanhGiacSoCore

final class SupabaseClientTests: XCTestCase {
    func testAnonymousRequestsUsePublishableKeyOnly() throws {
        let client = SupabaseClient(configuration: .production)
        let request = try client.makeDebugRequest(path: "/rest/v1/rpc/get_public_site_content")

        XCTAssertEqual(request.value(forHTTPHeaderField: "apikey")?.hasPrefix("sb_publishable_"), true)
        XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer \(AppConfiguration.production.publishableKey)")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization")?.contains("service_role"), false)
    }

    func testAuthenticatedRequestsUseUserAccessTokenForRLS() throws {
        let client = SupabaseClient(configuration: .production)
        let request = try client.makeDebugRequest(path: "/rest/v1/rpc/get_game_state", accessToken: "user.jwt")

        XCTAssertEqual(request.value(forHTTPHeaderField: "apikey"), AppConfiguration.production.publishableKey)
        XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer user.jwt")
    }

    func testGameStateDecodesSupabaseRpcShape() throws {
        let payload = """
        {
          "run_id": "11111111-1111-1111-1111-111111111111",
          "balance": 300000000,
          "awareness": 100,
          "results": [
            { "scenarioId": 1, "choiceIndex": 0, "correct": true }
          ]
        }
        """.data(using: .utf8)!

        let state = try JSONDecoder().decode(GameState.self, from: payload)
        XCTAssertEqual(state.runId.uuidString, "11111111-1111-1111-1111-111111111111")
        XCTAssertEqual(state.results.first?.scenarioId, 1)
    }
}
