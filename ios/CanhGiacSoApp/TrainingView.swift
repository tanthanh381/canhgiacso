import SwiftUI

struct TrainingView: View {
    @EnvironmentObject private var model: AppModel
    @State private var selectedScenario: Scenario?

    private var completedScenarioIds: Set<Int> {
        Set(model.gameState?.results.map(\.scenarioId) ?? [])
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    TrainingStatusCard()
                }

                Section("Tình huống") {
                    ForEach(model.content.scenarios) { scenario in
                        Button {
                            selectedScenario = scenario
                        } label: {
                            ScenarioRow(scenario: scenario, completed: completedScenarioIds.contains(scenario.id))
                        }
                    }
                }
            }
            .navigationTitle(model.content.copy.productName)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task { await model.loadContent() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                    .disabled(model.isLoading)
                }
            }
            .sheet(item: $selectedScenario) { scenario in
                ScenarioDetailView(scenario: scenario)
                    .presentationDetents([.large])
            }
        }
    }
}

private struct TrainingStatusCard: View {
    @EnvironmentObject private var model: AppModel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label(model.isSignedIn ? "Đã đồng bộ Supabase" : "Chế độ xem trước", systemImage: model.isSignedIn ? "checkmark.seal.fill" : "eye")
                    .font(.headline)
                Spacer()
                if model.isLoading {
                    ProgressView()
                }
            }

            HStack(spacing: 16) {
                MetricView(title: "Nhận thức", value: "\(model.gameState?.awareness ?? 100)%")
                MetricView(title: "Số dư mô phỏng", value: currency(model.gameState?.balance ?? 300_000_000))
            }

            if model.isSignedIn {
                if let currentRunId = model.gameState?.runId.uuidString.lowercased(),
                   let certificate = model.certificates.first(where: { $0.runId.lowercased() == currentRunId }) {
                    CertificateSummary(certificate: certificate)
                } else if (model.gameState?.results.count ?? 0) >= model.content.scenarios.count {
                    Button {
                        Task { await model.issueCurrentCertificate() }
                    } label: {
                        Label("Nhận chứng nhận", systemImage: "doc.badge.seal")
                    }
                    .buttonStyle(.borderedProminent)
                }

                Button(role: .destructive) {
                    Task { await model.restartGame() }
                } label: {
                    Label("Bắt đầu lại", systemImage: "gobackward")
                }
                .buttonStyle(.borderless)
            } else {
                Text("Đăng nhập ở tab Tài khoản để lưu tiến độ, dùng RLS của Supabase và nhận kết quả server-authoritative.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 6)
    }
}

private struct CertificateSummary: View {
    let certificate: TrainingCertificate

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("Chứng nhận đã cấp", systemImage: "doc.badge.seal.fill")
                .font(.headline)
                .foregroundStyle(.green)
            Text(certificate.certificateCode)
                .font(.title3)
                .fontWeight(.bold)
            Text("\(certificate.correct)/\(certificate.scenarioTotal) đúng · \(certificate.accuracy)% · \(certificate.rating.rawValue)")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.green.opacity(0.08), in: RoundedRectangle(cornerRadius: 8))
    }
}

private struct MetricView: View {
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.headline)
                .contentTransition(.numericText())
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct ScenarioRow: View {
    let scenario: Scenario
    let completed: Bool

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: symbolName(for: scenario.icon))
                .frame(width: 28, height: 28)
                .foregroundStyle(completed ? .green : .red)
            VStack(alignment: .leading, spacing: 4) {
                Text(scenario.title)
                    .font(.headline)
                    .foregroundStyle(.primary)
                Text("\(scenario.category) · \(scenario.channel) · \(scenario.difficulty.rawValue)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            if completed {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(.green)
            }
        }
        .padding(.vertical, 4)
    }
}

struct ScenarioDetailView: View {
    @EnvironmentObject private var model: AppModel
    let scenario: Scenario

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Label(scenario.category, systemImage: symbolName(for: scenario.icon))
                        .font(.headline)
                        .foregroundStyle(.red)

                    Text(scenario.story)
                        .font(.body)

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Dấu hiệu rủi ro")
                            .font(.headline)
                        ForEach(scenario.redFlags, id: \.self) { flag in
                            Label(flag, systemImage: "exclamationmark.triangle")
                                .foregroundStyle(.secondary)
                        }
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        Text("Bạn sẽ làm gì?")
                            .font(.headline)
                        ForEach(Array(scenario.choices.enumerated()), id: \.offset) { index, choice in
                            Button {
                                Task { await model.submitChoice(scenario: scenario, choiceIndex: index) }
                            } label: {
                                HStack {
                                    Text(choice.text)
                                        .multilineTextAlignment(.leading)
                                    Spacer()
                                    Image(systemName: "arrow.right.circle")
                                }
                            }
                            .buttonStyle(.bordered)
                            .disabled(!model.isSignedIn || model.gameState?.results.contains(where: { $0.scenarioId == scenario.id }) == true)
                        }
                    }

                    Text(scenario.tip)
                        .font(.callout)
                        .padding()
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(.red.opacity(0.08), in: RoundedRectangle(cornerRadius: 8))
                }
                .padding()
            }
            .navigationTitle(scenario.title)
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

func currency(_ value: Int) -> String {
    let formatter = NumberFormatter()
    formatter.numberStyle = .decimal
    formatter.groupingSeparator = "."
    return "\(formatter.string(from: NSNumber(value: value)) ?? "\(value)")đ"
}

func symbolName(for rawValue: String) -> String {
    switch rawValue {
    case "☎", "phone": "phone.fill"
    case "▦", "message": "message.fill"
    case "◉": "video.fill"
    case "↗": "briefcase.fill"
    case "⌗": "qrcode"
    case "⬡": "app.badge"
    case "◒": "chart.line.uptrend.xyaxis"
    case "✦": "key.fill"
    case "⇄": "arrow.left.arrow.right"
    case "♡": "heart.fill"
    case "shield": "checkmark.shield.fill"
    case "timer": "timer"
    default: "exclamationmark.shield.fill"
    }
}
