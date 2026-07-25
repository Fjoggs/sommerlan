const TOKEN_KEY = "sommerlan_token";
const API_URL = "/api";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const authHeaders = (): Record<string, string> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export type AuthUser = { id: number; name: string; nickname?: string; color: string; color2?: string; role?: string; impersonating?: boolean };

// Deliberately doesn't short-circuit on a missing localStorage token before
// asking the server: with the backend's local-only DISABLE_AUTH bypass,
// /api/auth/me/ can succeed with no token at all, letting the site work
// without logging in. With a normal backend this just 401s as before.
export async function requireAuth(): Promise<AuthUser | null> {
  const res = await fetch(`${API_URL}/auth/me/`, { headers: authHeaders() });
  if (!res.ok) {
    clearToken();
    redirectToLogin();
    return null;
  }
  return res.json() as Promise<AuthUser>;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const res = await fetch(`${API_URL}/auth/me/`, { headers: authHeaders() });
  if (!res.ok) { clearToken(); return null; }
  return res.json() as Promise<AuthUser>;
}

function redirectToLogin() {
  window.location.href = "/login";
}
