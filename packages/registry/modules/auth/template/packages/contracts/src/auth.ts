export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthSession {
  user: AuthUser;
  session: {
    id: string;
    token: string;
    expiresAt: number;
  };
}
