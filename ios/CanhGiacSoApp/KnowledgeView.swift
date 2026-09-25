import SwiftUI

struct KnowledgeView: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        NavigationStack {
            List(model.content.knowledgeCards) { card in
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: symbolName(for: card.icon))
                        .foregroundStyle(.red)
                        .frame(width: 28)
                    VStack(alignment: .leading, spacing: 6) {
                        Text(card.title)
                            .font(.headline)
                        Text(card.text)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.vertical, 4)
            }
            .navigationTitle(model.content.copy.knowledgeTitle)
        }
    }
}
