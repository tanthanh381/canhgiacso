import Foundation

public enum Difficulty: String, Codable, CaseIterable, Sendable {
    case easy = "Dễ"
    case medium = "Trung bình"
    case hard = "Khó"
    case veryHard = "Rất khó"
}

public struct Choice: Codable, Equatable, Sendable, Identifiable {
    public var id: String { text }
    public let text: String
    public let correct: Bool?
    public let moneyDelta: Int?
    public let awarenessDelta: Int?
    public let feedback: String?

    public init(text: String, correct: Bool? = nil, moneyDelta: Int? = nil, awarenessDelta: Int? = nil, feedback: String? = nil) {
        self.text = text
        self.correct = correct
        self.moneyDelta = moneyDelta
        self.awarenessDelta = awarenessDelta
        self.feedback = feedback
    }
}

public struct Scenario: Codable, Equatable, Sendable, Identifiable {
    public let id: Int
    public let title: String
    public let category: String
    public let difficulty: Difficulty
    public let channel: String
    public let icon: String
    public let story: String
    public let redFlags: [String]
    public let tip: String
    public let evidence: String
    public let choices: [Choice]
}

public struct KnowledgeCard: Codable, Equatable, Sendable, Identifiable {
    public var id: String { title }
    public let icon: String
    public let title: String
    public let text: String
}

public struct NewsArticle: Codable, Equatable, Sendable, Identifiable {
    public let id: String
    public let title: String
    public let summary: String
    public let category: String
    public let publishedAt: String
    public let sourceName: String
    public let sourceUrl: String
    public let featured: Bool
}

public struct SiteCopy: Codable, Equatable, Sendable {
    public let productName: String
    public let departmentName: String
    public let libraryEyebrow: String
    public let libraryTitle: String
    public let coachEyebrow: String
    public let knowledgeEyebrow: String
    public let knowledgeTitle: String
    public let knowledgeIntro: String
    public let newsEyebrow: String?
    public let newsTitle: String?
    public let newsIntro: String?
    public let dashboardEyebrow: String
    public let dashboardTitle: String
    public let dashboardIntro: String
    public let footerTagline: String
    public let footerNotice: String
}

public struct SiteContent: Codable, Equatable, Sendable {
    public let version: Int
    public let copy: SiteCopy
    public let scenarios: [Scenario]
    public let knowledgeCards: [KnowledgeCard]
    public let newsArticles: [NewsArticle]
}

public struct GameResult: Codable, Equatable, Sendable, Identifiable {
    public var id: Int { scenarioId }
    public let scenarioId: Int
    public let choiceIndex: Int
    public let correct: Bool
}

public struct GameState: Codable, Equatable, Sendable {
    public let runId: UUID
    public let balance: Int
    public let awareness: Int
    public let results: [GameResult]

    enum CodingKeys: String, CodingKey {
        case runId = "run_id"
        case balance
        case awareness
        case results
    }
}

public struct AuthSession: Codable, Equatable, Sendable {
    public let accessToken: String
    public let refreshToken: String?
    public let expiresIn: Int?
    public let tokenType: String?
    public let user: SupabaseUser?

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case expiresIn = "expires_in"
        case tokenType = "token_type"
        case user
    }
}

public struct SupabaseUser: Codable, Equatable, Sendable {
    public let id: UUID
    public let email: String?
}

public struct AuthProfile: Codable, Equatable, Sendable {
    public let username: String
    public let displayName: String

    enum CodingKeys: String, CodingKey {
        case username
        case displayName = "display_name"
    }
}
