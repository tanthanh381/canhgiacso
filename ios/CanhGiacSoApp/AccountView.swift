import SwiftUI

struct AccountView: View {
    @EnvironmentObject private var model: AppModel
    @State private var mode: AuthMode = .signIn
    @State private var email = ""
    @State private var password = ""
    @State private var username = ""
    @State private var displayName = ""

    var body: some View {
        NavigationStack {
            Form {
                if model.isSignedIn {
                    Section("Phiên đăng nhập") {
                        Label(model.authSession?.user?.email ?? "Đã đăng nhập", systemImage: "checkmark.seal.fill")
                        Button {
                            Task { await model.loadCertificates() }
                        } label: {
                            Label("Làm mới chứng nhận", systemImage: "arrow.clockwise")
                        }
                        Button("Đăng xuất", role: .destructive) {
                            model.signOut()
                        }
                    }

                    Section("Chứng nhận") {
                        if model.certificates.isEmpty {
                            Text("Hoàn thành toàn bộ thử thách để nhận chứng nhận server-issued.")
                                .foregroundStyle(.secondary)
                        } else {
                            ForEach(model.certificates) { certificate in
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(certificate.certificateCode)
                                        .font(.headline)
                                    Text(certificate.displayName)
                                    Text("\(certificate.correct)/\(certificate.scenarioTotal) đúng · \(certificate.accuracy)% · \(certificate.rating.rawValue)")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                    Text("Cấp ngày \(certificate.issuedAt)")
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                                .padding(.vertical, 4)
                            }
                        }
                    }
                } else {
                    Section {
                        Picker("Chế độ", selection: $mode) {
                            Text("Đăng nhập").tag(AuthMode.signIn)
                            Text("Tạo tài khoản").tag(AuthMode.signUp)
                        }
                        .pickerStyle(.segmented)

                        TextField("Email", text: $email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                        SecureField("Mật khẩu", text: $password)
                            .textContentType(mode == .signIn ? .password : .newPassword)

                        if mode == .signUp {
                            TextField("Tên đăng nhập", text: $username)
                                .textInputAutocapitalization(.never)
                            TextField("Tên hiển thị", text: $displayName)
                        }

                        Button {
                            Task { await submit() }
                        } label: {
                            Label(mode == .signIn ? "Đăng nhập" : "Tạo tài khoản", systemImage: "person.badge.key")
                        }
                        .disabled(model.isLoading || email.isEmpty || password.isEmpty || (mode == .signUp && (username.isEmpty || displayName.isEmpty)))
                    }

                    Section("Bảo mật") {
                        Label("Ứng dụng chỉ dùng Supabase publishable key. Quyền truy cập dữ liệu do RLS và RPC server-authoritative kiểm soát.", systemImage: "lock.shield")
                    }
                }
            }
            .navigationTitle("Tài khoản")
        }
    }

    private func submit() async {
        switch mode {
        case .signIn:
            await model.signIn(email: email, password: password)
        case .signUp:
            await model.signUp(email: email, password: password, username: username, displayName: displayName)
        }
    }
}

private enum AuthMode {
    case signIn
    case signUp
}
