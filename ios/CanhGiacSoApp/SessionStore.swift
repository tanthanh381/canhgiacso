import Foundation
import Security

protocol SessionStoring {
    func load() -> AuthSession?
    func save(_ session: AuthSession)
    func clear()
}

struct KeychainSessionStore: SessionStoring {
    private let service = "com.canhgiacso.ios.auth"
    private let account = "supabase-session"

    func load() -> AuthSession? {
        var query = baseQuery()
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data
        else {
            return nil
        }
        return try? JSONDecoder().decode(AuthSession.self, from: data)
    }

    func save(_ session: AuthSession) {
        guard let data = try? JSONEncoder().encode(session) else { return }
        clear()

        var query = baseQuery()
        query[kSecValueData as String] = data
        query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(query as CFDictionary, nil)
    }

    func clear() {
        SecItemDelete(baseQuery() as CFDictionary)
    }

    private func baseQuery() -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
    }
}

struct InMemorySessionStore: SessionStoring {
    private final class Box {
        var session: AuthSession?
    }

    private let box = Box()

    func load() -> AuthSession? {
        box.session
    }

    func save(_ session: AuthSession) {
        box.session = session
    }

    func clear() {
        box.session = nil
    }
}
