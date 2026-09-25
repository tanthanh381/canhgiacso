import Foundation

public enum SiteContentNormalizer {
    public static func normalized(_ content: SiteContent) -> SiteContent? {
        guard content.version == 1,
              isText(content.copy.productName, maxLength: 180),
              isText(content.copy.departmentName, maxLength: 180),
              isText(content.copy.libraryTitle, maxLength: 180),
              isText(content.copy.knowledgeTitle, maxLength: 180),
              isText(content.copy.footerNotice, maxLength: 1_000),
              !content.scenarios.isEmpty,
              content.scenarios.count <= 100,
              !content.knowledgeCards.isEmpty,
              content.knowledgeCards.count <= 24,
              content.newsArticles.count <= 60
        else {
            return nil
        }

        var scenarioIds = Set<Int>()
        for scenario in content.scenarios {
            guard scenarioIds.insert(scenario.id).inserted,
                  scenario.id >= 1,
                  scenario.id <= 100,
                  isText(scenario.title, maxLength: 160),
                  isText(scenario.category, maxLength: 80),
                  isText(scenario.channel, maxLength: 80),
                  isText(scenario.icon, maxLength: 12),
                  isText(scenario.story, maxLength: 3_000),
                  !scenario.redFlags.isEmpty,
                  scenario.redFlags.count <= 8,
                  scenario.redFlags.allSatisfy({ isText($0, maxLength: 220) }),
                  isText(scenario.tip, maxLength: 1_000),
                  isText(scenario.evidence, maxLength: 300),
                  scenario.choices.count == 3,
                  scenario.choices.allSatisfy({ isText($0.text, maxLength: 500) })
            else {
                return nil
            }
        }

        for card in content.knowledgeCards {
            guard isText(card.icon, maxLength: 12),
                  isText(card.title, maxLength: 160),
                  isText(card.text, maxLength: 1_200)
            else {
                return nil
            }
        }

        var newsIds = Set<String>()
        for article in content.newsArticles {
            guard newsIds.insert(article.id).inserted,
                  article.id.range(of: "^[a-z0-9-]+$", options: .regularExpression) != nil,
                  isText(article.title, maxLength: 220),
                  isText(article.summary, maxLength: 1_200),
                  isText(article.category, maxLength: 100),
                  isText(article.sourceName, maxLength: 120),
                  URL(string: article.sourceUrl) != nil
            else {
                return nil
            }
        }

        return content
    }

    private static func isText(_ value: String, maxLength: Int) -> Bool {
        !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && value.count <= maxLength
    }
}
