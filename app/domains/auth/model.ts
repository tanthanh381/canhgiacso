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
