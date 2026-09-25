import SwiftUI

struct NewsView: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        NavigationStack {
            List(model.content.newsArticles) { article in
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text(article.category)
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundStyle(.red)
                        Spacer()
                        Text(article.publishedAt)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Text(article.title)
                        .font(.headline)
                    Text(article.summary)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    if let url = URL(string: article.sourceUrl) {
                        Link(destination: url) {
                            Label(article.sourceName, systemImage: "safari")
                                .font(.footnote)
                        }
                    }
                }
                .padding(.vertical, 6)
            }
            .navigationTitle(model.content.copy.newsTitle ?? "Tin tức")
        }
    }
}
