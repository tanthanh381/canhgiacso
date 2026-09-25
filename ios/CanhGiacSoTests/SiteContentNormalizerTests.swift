import XCTest
@testable import CanhGiacSoCore

final class SiteContentNormalizerTests: XCTestCase {
    func testBundledContentMatchesMobileContract() throws {
        let content = try XCTUnwrap(SiteContentNormalizer.normalized(BundledContent.siteContent))
        XCTAssertGreaterThanOrEqual(content.scenarios.count, 2)
        XCTAssertTrue(content.scenarios.allSatisfy { $0.choices.count == 3 })
        XCTAssertGreaterThanOrEqual(content.knowledgeCards.count, 3)
    }

    func testDuplicateScenarioIdentifiersAreRejected() {
        let first = BundledContent.siteContent.scenarios[0]
        let invalid = SiteContent(
            version: 1,
            copy: BundledContent.siteContent.copy,
            scenarios: [first, first],
            knowledgeCards: BundledContent.siteContent.knowledgeCards,
            newsArticles: BundledContent.siteContent.newsArticles
        )
        XCTAssertNil(SiteContentNormalizer.normalized(invalid))
    }

    func testScenarioChoicesMustStayBounded() {
        let base = BundledContent.siteContent.scenarios[0]
        let invalidScenario = Scenario(
            id: base.id,
            title: base.title,
            category: base.category,
            difficulty: base.difficulty,
            channel: base.channel,
            icon: base.icon,
            story: base.story,
            redFlags: base.redFlags,
            tip: base.tip,
            evidence: base.evidence,
            choices: [Choice(text: "Một lựa chọn")]
        )
        let invalid = SiteContent(
            version: 1,
            copy: BundledContent.siteContent.copy,
            scenarios: [invalidScenario],
            knowledgeCards: BundledContent.siteContent.knowledgeCards,
            newsArticles: BundledContent.siteContent.newsArticles
        )
        XCTAssertNil(SiteContentNormalizer.normalized(invalid))
    }
}
