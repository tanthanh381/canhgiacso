export type AuthErrorLike = {
  code?: string;
  message?: string;
  status?: number;
};

// Một thông điệp chung cho "email đã có tài khoản" và "tên đăng nhập đã dùng" để không cho
// phép dò xem email/tên đăng nhập nào đã tồn tại, nhưng vẫn chỉ đường cho người dùng thật.
export const REGISTRATION_UNAVAILABLE =
  "Chưa thể đăng ký với thông tin này. Nếu bạn đã có tài khoản, hãy chuyển sang Đăng nhập; nếu chưa, hãy thử email hoặc tên đăng nhập khác.";

export function authErrorMessage(error: AuthErrorLike, mode: "login" | "register") {
  switch (error.code) {
    case "over_email_send_rate_limit":
      return "Hệ thống đã đạt giới hạn gửi email xác nhận trong giờ hiện tại. Vui lòng thử lại sau; nếu đã nhận email xác nhận, hãy chuyển sang Đăng nhập.";
    case "over_request_rate_limit":
      return "Bạn đã gửi quá nhiều yêu cầu. Vui lòng chờ vài phút rồi thử lại.";
    case "email_address_not_authorized":
      return "Dịch vụ email hiện chưa thể gửi xác nhận tới địa chỉ này. Vui lòng liên hệ quản trị viên.";
    case "email_exists":
    case "user_already_exists":
      return REGISTRATION_UNAVAILABLE;
    case "email_not_confirmed":
      return "Email chưa được xác nhận. Hãy mở thư xác nhận rồi đăng nhập lại.";
    case "invalid_credentials":
      return "Email hoặc mật khẩu không đúng.";
    case "weak_password":
      return "Mật khẩu chưa đáp ứng yêu cầu bảo mật.";
    default:
      if ((error.message ?? "").toLowerCase().includes("database")) {
        return REGISTRATION_UNAVAILABLE;
      }
      if (error.status === 429) {
        return "Hệ thống đang tạm giới hạn yêu cầu. Vui lòng chờ vài phút rồi thử lại.";
      }
      return mode === "register"
        ? "Chưa thể tạo tài khoản. Vui lòng thử lại sau hoặc tiếp tục với tư cách khách."
        : "Chưa thể đăng nhập. Vui lòng kiểm tra thông tin và thử lại.";
  }
}

// Lỗi khi đặt mật khẩu mới (updateUser) sau liên kết khôi phục hoặc khi đổi mật khẩu.
export function passwordUpdateErrorMessage(error: AuthErrorLike) {
  switch (error.code) {
    case "same_password":
      return "Mật khẩu mới phải khác mật khẩu hiện tại.";
    case "weak_password":
      return "Mật khẩu chưa đáp ứng yêu cầu bảo mật. Hãy dùng 10–72 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.";
    case "over_request_rate_limit":
      return "Bạn đã gửi quá nhiều yêu cầu. Vui lòng chờ vài phút rồi thử lại.";
    case "session_not_found":
    case "session_expired":
    case "bad_jwt":
    case "no_authorization":
    case "user_not_found":
      return "Liên kết khôi phục đã hết hạn hoặc không còn hiệu lực. Hãy chọn “Quên mật khẩu” để nhận liên kết mới.";
    case "reauthentication_needed":
    case "reauthentication_not_valid":
      return "Để đổi mật khẩu, hãy yêu cầu liên kết khôi phục mới từ mục “Quên mật khẩu”.";
    default:
      if (error.status === 429) return "Hệ thống đang tạm giới hạn yêu cầu. Vui lòng chờ vài phút rồi thử lại.";
      if (error.status === 401 || error.status === 403) {
        return "Liên kết khôi phục đã hết hạn hoặc không còn hiệu lực. Hãy chọn “Quên mật khẩu” để nhận liên kết mới.";
      }
      return "Chưa đổi được mật khẩu. Vui lòng thử lại sau ít phút.";
  }
}
