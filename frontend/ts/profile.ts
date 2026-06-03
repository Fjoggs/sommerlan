import { requireAuth, authHeaders, setToken, clearToken, getToken } from "./auth.js";

const API_URL = "/api";

const PRESET_COLORS = [
  "#5865F2", "#EB459E", "#ED4245", "#FF6D00", "#FEE75C",
  "#57F287", "#1ABC9C", "#00B0F4", "#B660CD", "#FF9800",
];

async function init() {
  const me = await requireAuth();
  if (!me) return;

  const nameInput = document.getElementById("profile-name") as HTMLInputElement;
  const colorInput = document.getElementById("profile-color") as HTMLInputElement;
  const preview = document.getElementById("profile-preview") as HTMLElement;

  nameInput.value = me.nickname || "";
  nameInput.placeholder = me.name;
  colorInput.value = me.color || "#5865F2";
  updatePreview(me.nickname || me.name, colorInput.value, preview, me.color2);

  renderSwatches(colorInput, preview, nameInput);

  colorInput.addEventListener("input", () => updatePreview(nameInput.value, colorInput.value, preview));
  nameInput.addEventListener("input", () => updatePreview(nameInput.value, colorInput.value, preview));

  document.getElementById("profile-form")!.addEventListener("submit", async (e) => {
    e.preventDefault();
    await save(nameInput.value.trim(), colorInput.value, me.name, preview);
  });

  document.getElementById("logout-btn")!.addEventListener("click", async () => {
    await fetch(`${API_URL}/auth/logout/`, { method: "POST", headers: authHeaders() });
    clearToken();
    window.location.href = "/login";
  });
}

function renderSwatches(colorInput: HTMLInputElement, preview: HTMLElement, nameInput: HTMLInputElement) {
  const container = document.getElementById("color-swatches")!;
  for (const color of PRESET_COLORS) {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "color-swatch";
    swatch.style.backgroundColor = color;
    swatch.title = color;
    swatch.addEventListener("click", () => {
      colorInput.value = color;
      updatePreview(nameInput.value, color, preview);
    });
    container.appendChild(swatch);
  }
}

function updatePreview(name: string, color: string, preview: HTMLElement, color2?: string) {
  preview.style.background = color2
    ? `linear-gradient(135deg, ${color}, ${color2})`
    : color;
  preview.textContent = name.charAt(0).toUpperCase() || "?";
}

async function save(nickname: string, color: string, discordName: string, preview: HTMLElement) {
  const btn = document.getElementById("save-btn") as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = "Lagrer…";

  try {
    const res = await fetch(`${API_URL}/auth/me/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ nickname, color }),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    updatePreview(nickname || discordName, color, preview);
    btn.textContent = "Lagret ✓";
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = "Lagre";
    }, 1500);
  } catch {
    btn.disabled = false;
    btn.textContent = "Feil – prøv igjen";
    setTimeout(() => { btn.textContent = "Lagre"; }, 2000);
  }
}

init();
