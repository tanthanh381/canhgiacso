import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "../../supabase";

// Synchronous handler. `Parameters<typeof onAuthStateChange>[0]` resolves to the
// last overload (the async one), which rejects the plain callbacks used by the UI.
export type AuthChangeHandler = (event: AuthChangeEvent, session: Session | null) => void;

export function getCurrentAuthSession() {
  return supabase.auth.getSession();
}

export function subscribeToAuthChanges(callback: AuthChangeHandler) {
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

export function loginAccount(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export function updateProfileDisplayName(userId: string, displayName: string) {
  return supabase.from("profiles").update({ display_name: displayName }).eq("id", userId);
}
