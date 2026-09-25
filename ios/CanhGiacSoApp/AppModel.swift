import Foundation

@MainActor
final class AppModel: ObservableObject {
    @Published private(set) var content = BundledContent.siteContent
    @Published private(set) var gameState: GameState?
    @Published private(set) var isLoading = false
    @Published var userMessage: String?
    @Published var authSession: AuthSession?

    private let client: SupabaseClient
    private let sessionStore: SessionStoring

    init(client: SupabaseClient = SupabaseClient(), sessionStore: SessionStoring = KeychainSessionStore()) {
        self.client = client
        self.sessionStore = sessionStore
    }

    var isSignedIn: Bool {
        authSession?.accessToken.isEmpty == false
    }

    func bootstrap() async {
        authSession = sessionStore.load()
        await loadContent()
        if isSignedIn {
            await loadGameState()
        }
    }

    func loadContent() async {
        isLoading = true
        defer { isLoading = false }
        do {
            content = try await client.loadPublishedSiteContent()
        } catch {
            userMessage = "Đang dùng nội dung dự phòng vì chưa tải được dữ liệu mới."
        }
    }

    func signIn(email: String, password: String) async {
        await authenticate {
            try await client.signIn(email: email, password: password)
        }
    }

    func signUp(email: String, password: String, username: String, displayName: String) async {
        await authenticate {
            try await client.signUp(email: email, password: password, username: username, displayName: displayName)
        }
    }

    func signOut() {
        authSession = nil
        gameState = nil
        sessionStore.clear()
        userMessage = "Đã đăng xuất khỏi thiết bị này."
    }

    func submitChoice(scenario: Scenario, choiceIndex: Int) async {
        guard let token = authSession?.accessToken else {
            userMessage = "Đăng nhập để lưu kết quả thử thách."
            return
        }
        guard let runId = gameState?.runId else {
            await loadGameState()
            return
        }
        do {
            gameState = try await client.submitChoice(runId: runId, scenarioId: scenario.id, choiceIndex: choiceIndex, accessToken: token)
            userMessage = "Đã ghi nhận lựa chọn."
        } catch {
            userMessage = "Chưa lưu được lựa chọn. Hãy tải lại trạng thái và thử lại."
            await loadGameState()
        }
    }

    func restartGame() async {
        guard let token = authSession?.accessToken, let runId = gameState?.runId else { return }
        do {
            gameState = try await client.restartGame(runId: runId, accessToken: token)
            userMessage = "Đã bắt đầu lại bộ thử thách."
        } catch {
            userMessage = "Chưa thể bắt đầu lại. Vui lòng thử sau."
        }
    }

    func loadGameState() async {
        guard let token = authSession?.accessToken else { return }
        do {
            gameState = try await client.loadGameState(accessToken: token)
        } catch {
            userMessage = "Phiên đăng nhập cần được làm mới. Vui lòng đăng nhập lại."
            signOut()
        }
    }

    private func authenticate(_ action: () async throws -> AuthSession) async {
        isLoading = true
        defer { isLoading = false }
        do {
            let session = try await action()
            authSession = session
            sessionStore.save(session)
            userMessage = "Đăng nhập thành công."
            await loadGameState()
        } catch {
            userMessage = "Không thể xác thực tài khoản. Kiểm tra thông tin và thử lại."
        }
    }
}
