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
