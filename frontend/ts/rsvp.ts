import { showError } from "./errorHandler.js";
import { GAMES, renderMatrix } from "./matrix.js";
import { requireAuth, authHeaders } from "./auth.js";
import type { RsvpEntry } from "./types.js";

const API_URL = "http://localhost:8080/api";
const lanId = new URLSearchParams(location.search).get("lan");

let me: { id: number; name: string; nickname?: string; color: string } | null = null;

async function init() {
  me = await requireAuth();
  if (!me) return;
  if (!lanId) { showError("Mangler LAN-ID i URL (?lan=ID)"); return; }

  setupDayCheckboxes();
  await loadExistingRsvp();
  updateSubmitButton();
}

async function loadExistingRsvp() {
  const entries = await apiFetch<RsvpEntry[]>(`lan/${lanId}/rsvp`);
  if (!entries) return;
  const myEntry = entries.find((e) => e.userId === me!.id);
  if (!myEntry) return;
  for (const date of myEntry.dates) {
    const day = String(parseInt(date.split("-")[2], 10));
    const cb = document.querySelector<HTMLInputElement>(`input[name="day"][value="${day}"]`);
    if (cb) cb.checked = true;
  }
}

function setupDayCheckboxes() {
  document.querySelectorAll<HTMLInputElement>('input[name="day"]').forEach((cb) => {
    cb.addEventListener("change", updateSubmitButton);
    const date = `2026-07-${cb.value.padStart(2, "0")}`;
    const game = GAMES[date];
    if (game) {
      const label = cb.closest<HTMLElement>(".day-card")!;
      const dateEl = label.querySelector(".day-date")!;
      const icon = document.createElement("span");
      icon.className = "day-card-game";
      icon.textContent = " ⚽";
      icon.title = game;
      dateEl.appendChild(icon);
    }
  });
}

function getSelectedDates(): string[] {
  return Array.from(
    document.querySelectorAll<HTMLInputElement>('input[name="day"]:checked'),
  ).map((cb) => `2026-07-${cb.value.padStart(2, "0")}`);
}

function updateSubmitButton() {
  const btn = document.getElementById("rsvp-submit") as HTMLButtonElement;
  const dates = getSelectedDates();
  const canSubmit = dates.length > 0;
  btn.disabled = !canSubmit;
  btn.classList.toggle("inactive", !canSubmit);
  btn.textContent = "Meld på";
}

async function handleSubmit() {
  const dates = getSelectedDates();
  if (dates.length === 0) return;

  const btn = document.getElementById("rsvp-submit") as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = "Sender…";

  try {
    const res = await fetch(`${API_URL}/lan/${lanId}/rsvp/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ dates }),
    });
    if (!res.ok && res.status !== 204) throw new Error(`${res.status}`);

    await new Promise((r) => setTimeout(r, 600));
    updateSubmitButton();
    await showConfirmation(dates);
  } catch (err) {
    console.error(err);
    showError("Kunne ikke sende påmelding");
    btn.disabled = false;
    btn.textContent = "Meld på";
    updateSubmitButton();
  }
}

async function showConfirmation(myDates: string[]) {
  document.getElementById("confirmation-title")!.textContent =
    `${me!.name} er påmeldt!`;
  document.getElementById("confirmation-subtitle")!.textContent =
    `${myDates.length} dag${myDates.length > 1 ? "er" : ""}`;

  document.getElementById("step-days")!.hidden = true;
  document.querySelector<HTMLElement>(".rsvp-footer")!.hidden = true;
  document.querySelector<HTMLElement>(".rsvp-header")!.hidden = true;
  document.getElementById("rsvp-confirmation")!.hidden = false;

  const entries = await apiFetch<RsvpEntry[]>(`lan/${lanId}/rsvp`);
  if (entries) renderMatrix(document.getElementById("participant-matrix")!, entries);
}

async function apiFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}/${path}/`, { headers: authHeaders() });
    if (!res.ok) {
      showError(`Failed to fetch ${path}`);
      return null;
    }
    return res.json();
  } catch {
    showError("A network error occurred");
    return null;
  }
}

document.getElementById("rsvp-submit")!.addEventListener("click", handleSubmit);

// Full form reset when page is restored from bfcache
window.addEventListener("pageshow", (e) => {
  if (!e.persisted) return;
  document.getElementById("step-days")!.hidden = false;
  document.querySelector<HTMLElement>(".rsvp-footer")!.hidden = false;
  document.querySelector<HTMLElement>(".rsvp-header")!.hidden = false;
  document.getElementById("rsvp-confirmation")!.hidden = true;
  updateSubmitButton();
});

init();
