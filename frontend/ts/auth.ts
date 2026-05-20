const TOKEN_KEY = "sommerlan_token";
const API_URL = "http://localhost:8080/api";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const authHeaders = (): Record<string, string> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export type AuthUser = { id: number; name: string; color: string };

export async function requireAuth(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) {
    redirectToLogin();
    return null;
  }
  const res = await fetch(`${API_URL}/auth/me/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    clearToken();
    redirectToLogin();
    return null;
  }
  return res.json() as Promise<AuthUser>;
}

function redirectToLogin() {
  window.location.href = "/login.html";
}
