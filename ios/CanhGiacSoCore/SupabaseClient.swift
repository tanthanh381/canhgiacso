import Foundation

public enum SupabaseClientError: Error, Equatable, Sendable {
    case invalidResponse
    case httpStatus(Int, String)
    case invalidContent
}

public protocol HTTPSession: Sendable {
    func data(for request: URLRequest) async throws -> (Data, URLResponse)
}

extension URLSession: HTTPSession {}

public struct SupabaseClient: Sendable {
    private let configuration: AppConfiguration
    private let session: HTTPSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    public init(configuration: AppConfiguration = .production, session: HTTPSession = URLSession.shared) {
        self.configuration = configuration
        self.session = session
        self.decoder = JSONDecoder()
        self.encoder = JSONEncoder()
    }

    public func loadPublishedSiteContent() async throws -> SiteContent {
        let content: SiteContent = try await rpc("get_public_site_content", body: EmptyBody(), accessToken: nil)
        guard let normalized = SiteContentNormalizer.normalized(content) else {
            throw SupabaseClientError.invalidContent
        }
        return normalized
    }

    public func signIn(email: String, password: String) async throws -> AuthSession {
        let request = try request(
            path: "/auth/v1/token",
            queryItems: [URLQueryItem(name: "grant_type", value: "password")],
            method: "POST",
            body: AuthPasswordPayload(email: email, password: password),
            accessToken: nil
        )
        return try await send(request)
    }

    public func signUp(email: String, password: String, username: String, displayName: String) async throws -> AuthSession {
        let request = try request(
            path: "/auth/v1/signup",
            method: "POST",
            body: SignUpPayload(
                email: email,
                password: password,
                data: ["username": username, "display_name": displayName]
            ),
            accessToken: nil
        )
        return try await send(request)
    }

    public func loadGameState(accessToken: String) async throws -> GameState {
        try await rpc("get_game_state", body: EmptyBody(), accessToken: accessToken)
    }

    public func submitChoice(runId: UUID, scenarioId: Int, choiceIndex: Int, accessToken: String) async throws -> GameState {
        try await rpc(
            "submit_game_choice",
            body: SubmitChoicePayload(expectedRun: runId, scenarioId: scenarioId, choiceIndex: choiceIndex),
            accessToken: accessToken
        )
    }

    public func restartGame(runId: UUID, accessToken: String) async throws -> GameState {
        try await rpc("restart_game", body: RestartPayload(expectedRun: runId), accessToken: accessToken)
    }

    public func makeDebugRequest(path: String, method: String = "POST", accessToken: String? = nil) throws -> URLRequest {
        try request(path: path, method: method, body: EmptyBody(), accessToken: accessToken)
    }

    private func rpc<Response: Decodable, Body: Encodable>(_ name: String, body: Body, accessToken: String?) async throws -> Response {
        let request = try request(path: "/rest/v1/rpc/\(name)", method: "POST", body: body, accessToken: accessToken)
        return try await send(request)
    }

    private func request<Body: Encodable>(
        path: String,
        queryItems: [URLQueryItem] = [],
        method: String,
        body: Body,
        accessToken: String?
    ) throws -> URLRequest {
        var components = URLComponents(url: configuration.supabaseURL.appendingPathComponent(path), resolvingAgainstBaseURL: false)
        components?.queryItems = queryItems.isEmpty ? nil : queryItems
        guard let url = components?.url else { throw SupabaseClientError.invalidResponse }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue(configuration.publishableKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("Bearer \(accessToken ?? configuration.publishableKey)", forHTTPHeaderField: "Authorization")
        request.httpBody = try encoder.encode(body)
        return request
    }

    private func send<Response: Decodable>(_ request: URLRequest) async throws -> Response {
        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw SupabaseClientError.invalidResponse
        }
        guard (200..<300).contains(httpResponse.statusCode) else {
            throw SupabaseClientError.httpStatus(httpResponse.statusCode, String(data: data, encoding: .utf8) ?? "")
        }
        return try decoder.decode(Response.self, from: data)
    }
}

private struct EmptyBody: Encodable {}

private struct AuthPasswordPayload: Encodable {
    let email: String
    let password: String
}

private struct SignUpPayload: Encodable {
    let email: String
    let password: String
    let data: [String: String]
}

private struct SubmitChoicePayload: Encodable {
    let expectedRun: UUID
    let scenarioId: Int
    let choiceIndex: Int

    enum CodingKeys: String, CodingKey {
        case expectedRun = "expected_run"
        case scenarioId = "scenario_id"
        case choiceIndex = "choice_index"
    }
}

private struct RestartPayload: Encodable {
    let expectedRun: UUID

    enum CodingKeys: String, CodingKey {
        case expectedRun = "expected_run"
    }
}
