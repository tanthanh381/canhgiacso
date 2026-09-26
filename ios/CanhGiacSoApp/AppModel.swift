import Combine
import Foundation

@MainActor
final class AppModel: ObservableObject {
    @Published private(set) var content = BundledContent.siteContent
    @Published private(set) var gameState: GameState?
    @Published private(set) var certificates: [TrainingCertificate] = []
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
            await loadCertificates(quiet: true)
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
        certificates = []
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
            if gameState?.results.count == content.scenarios.count {
                await loadCertificates(quiet: true)
            }
        } catch {
            if await refreshSessionIfNeeded(after: error) {
                await submitChoice(scenario: scenario, choiceIndex: choiceIndex)
            } else {
                userMessage = "Chưa lưu được lựa chọn. Hãy tải lại trạng thái và thử lại."
                await loadGameState()
            }
        }
    }

    func restartGame() async {
        guard let token = authSession?.accessToken, let runId = gameState?.runId else { return }
        do {
            gameState = try await client.restartGame(runId: runId, accessToken: token)
            await loadCertificates(quiet: true)
            userMessage = "Đã bắt đầu lại bộ thử thách."
        } catch {
            if await refreshSessionIfNeeded(after: error) {
                await restartGame()
            } else {
                userMessage = "Chưa thể bắt đầu lại. Vui lòng thử sau."
            }
        }
    }

    func loadGameState() async {
        guard let token = authSession?.accessToken else { return }
        do {
            gameState = try await client.loadGameState(accessToken: token)
        } catch {
            if await refreshSessionIfNeeded(after: error) {
                await loadGameState()
            } else {
                userMessage = "Phiên đăng nhập cần được làm mới. Vui lòng đăng nhập lại."
                signOut()
            }
        }
    }

    func loadCertificates(quiet: Bool = false) async {
        guard let token = authSession?.accessToken else { return }
        do {
            certificates = try await client.loadTrainingCertificates(accessToken: token)
            if !quiet {
                userMessage = "Đã cập nhật thông tin chứng nhận."
            }
        } catch {
            if await refreshSessionIfNeeded(after: error) {
                await loadCertificates(quiet: quiet)
            } else if !quiet {
                userMessage = "Chưa tải được chứng nhận. Vui lòng thử lại."
            }
        }
    }

    func issueCurrentCertificate() async {
        guard let token = authSession?.accessToken, let runId = gameState?.runId else {
            userMessage = "Đăng nhập để nhận chứng nhận."
            return
        }
        do {
            let issued = try await client.issueTrainingCertificate(runId: runId, accessToken: token)
            certificates = [issued] + certificates.filter { $0.runId != issued.runId }
            userMessage = "Đã cấp chứng nhận \(issued.certificateCode)."
        } catch {
            if await refreshSessionIfNeeded(after: error) {
                await issueCurrentCertificate()
            } else {
                userMessage = "Bạn cần hoàn thành toàn bộ tình huống trước khi nhận chứng nhận."
            }
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
            await loadCertificates(quiet: true)
        } catch {
            userMessage = "Không thể xác thực tài khoản. Kiểm tra thông tin và thử lại."
        }
    }

    private func refreshSessionIfNeeded(after error: Error) async -> Bool {
        guard let clientError = error as? SupabaseClientError,
              case SupabaseClientError.httpStatus(let status, _) = clientError,
              [401, 403].contains(status),
              let refreshToken = authSession?.refreshToken,
              !refreshToken.isEmpty
        else {
            return false
        }

        do {
            let refreshed = try await client.refreshSession(refreshToken: refreshToken)
            authSession = refreshed
            sessionStore.save(refreshed)
            return true
        } catch {
            signOut()
            return false
        }
    }
}
