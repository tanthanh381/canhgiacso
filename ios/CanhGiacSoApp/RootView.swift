import SwiftUI

struct RootView: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        TabView {
            TrainingView()
                .tabItem {
                    Label("Thử thách", systemImage: "shield.lefthalf.filled")
                }

            KnowledgeView()
                .tabItem {
                    Label("Cẩm nang", systemImage: "book.closed")
                }

            NewsView()
                .tabItem {
                    Label("Tin tức", systemImage: "newspaper")
                }

            AccountView()
                .tabItem {
                    Label("Tài khoản", systemImage: "person.crop.circle")
                }
        }
        .tint(.red)
        .alert("Cảnh Giác Số", isPresented: Binding(
            get: { model.userMessage != nil },
            set: { if !$0 { model.userMessage = nil } }
        )) {
            Button("OK", role: .cancel) { model.userMessage = nil }
        } message: {
            Text(model.userMessage ?? "")
        }
    }
}
