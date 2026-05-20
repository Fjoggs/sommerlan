import { setToken } from "./auth.js";

const params = new URLSearchParams(window.location.search);
const token = params.get("token");

if (token) {
  setToken(token);
  window.location.href = "/";
} else {
  const btn = document.getElementById("discord-login")!;
  btn.hidden = false;
}
