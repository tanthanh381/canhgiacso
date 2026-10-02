import { supabase } from "../../supabase";

export function getCurrentAuthSession() {
  return supabase.auth.getSession();
}

export function subscribeToAuthChanges(
  callback: Parameters<typeof supabase.auth.onAuthStateChange>[0],
) {
  return supabase.auth.onAuthStateChange(callback);
}

export function signOutLocal() {
  return supabase.auth.signOut({ scope: "local" });
}

export function registerAccount({
  email,
  password,
  username,
  displayName,
}: {
  email: string;
  password: string;
  username: string;
  displayName: string;
}) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { username, display_name: displayName } },
  });
}

// Gửi lại email xác nhận đăng ký (Supabase giới hạn ~1 lần/60 giây cho mỗi địa chỉ).
export function resendSignupConfirmation(email: string) {
  return supabase.auth.resend({ type: "signup", email });
}

export function loginAccount(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export function updateProfileDisplayName(userId: string, displayName: string) {
  return supabase.from("profiles").update({ display_name: displayName }).eq("id", userId);
}
