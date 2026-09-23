export type SessionAccount = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  createdAt: string;
};

export type AuthMode = "login" | "register";

export const USERNAME_PATTERN = /^[a-z0-9._-]{3,24}$/;
export const PASSWORD_PATTERN = /^(?=.{8,72}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])\S+$/;

export type AuthSubmission = {
  mode: AuthMode;
  email: string;
  username: string;
  displayName: string;
  password: string;
  confirmPassword: string;
};

export type ValidatedAuthSubmission =
  | { ok: true; email: string; username: string; displayName: string }
  | { ok: false; error: string };

export function validateAuthSubmission(input: AuthSubmission): ValidatedAuthSubmission {
  const email = input.email.trim().toLowerCase();
  const username = input.username.trim().toLowerCase();
  const displayName = input.displayName.trim();

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return { ok: false, error: "Vui lòng nhập địa chỉ email hợp lệ." };
  }
  if (input.mode === "register" && !USERNAME_PATTERN.test(username)) {
    return { ok: false, error: "Tên đăng nhập cần 3–24 ký tự: chữ thường, số, dấu chấm, gạch ngang hoặc gạch dưới." };
  }
  if (input.mode === "register" && !PASSWORD_PATTERN.test(input.password)) {
    return { ok: false, error: "Mật khẩu cần 8–72 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt; không chứa khoảng trắng." };
  }
  if (input.mode === "login" && input.password.length < 8) {
    return { ok: false, error: "Mật khẩu cần ít nhất 8 ký tự." };
  }
  if (input.mode === "register" && (displayName.length < 2 || displayName.length > 32)) {
    return { ok: false, error: "Tên hiển thị cần từ 2 đến 32 ký tự." };
  }
  if (input.mode === "register" && input.password !== input.confirmPassword) {
    return { ok: false, error: "Mật khẩu xác nhận chưa khớp." };
  }

  return { ok: true, email, username, displayName };
}
