// auth.js
import api from "./api";

/**
 * login(username, password)
 * - Örnek: backend /auth/login route'u { username, password } bekleyip { access_token: "..."} döndürüyor.
 * - Eğer senin sistemde OAuth2 varsa bu kısmı kendi auth flow'una göre değiştir.
 */
export async function login(username, password) {
  const res = await api.post("/auth/login", { username, password });
  // backend'in döndürdüğü alana göre al:
  const token = res.data?.access_token || res.data?.token || null;
  if (!token) throw new Error("Token alınamadı. Backend login endpoint'ini kontrol et.");
  localStorage.setItem("access_token", token);
  return token;
}

export function logout() {
  localStorage.removeItem("access_token");
}

export function getToken() {
  return localStorage.getItem("access_token");
}
