import { showError } from "./errorHandler.js";
import { BLOCKS, GAMES, RACES, renderMatrix, renderCards, renderDinnerTable, buildPickerContent } from "./matrix.js";
import { requireAuth, authHeaders } from "./auth.js";
import type { RsvpEntry, LAN } from "./types.js";

const API_URL = "/api";
let lanId: number | null = null;

let me: { id: number; name: string; nickname?: string; color: string } | null = null;
let cachedEntries: RsvpEntry[] | null = null;

const selectedDates = new Set<string>();
const dinnerDates = new Set<string>();
const mainDates = new Set<string>(BLOCKS.find(b => b.key === "main")?.dates ?? []);
let onDateToggle: (() => void) | null = null;


function buildDayPicker() {
  const container = document.getElementById("day-picker")!;
  container.innerHTML = "";
  container.appendChild(buildPickerContent(selectedDates, dinnerDates, me, updateSubmitButton, () => onDateToggle));
}

function getSelectedDates(): string[] {
  return Array.from(selectedDates);
}

function applyUserColor(btn: HTMLButtonElement) {
  if (!me?.color) return;
  btn.style.backgroundColor = me.color;
  if (!btn.dataset.colorized) {
    btn.dataset.colorized = "1";
    btn.addEventListener("mouseenter", () => { btn.style.filter = "brightness(1.2)"; });
    btn.addEventListener("mouseleave", () => { btn.style.filter = ""; });
  }
}

function applyUserColorOutline(btn: HTMLButtonElement) {
  if (!me?.color) return;
  btn.style.borderColor = me.color;
  btn.style.color = me.color;
  if (!btn.dataset.colorized) {
    btn.dataset.colorized = "1";
    btn.addEventListener("mouseenter", () => {
      btn.style.backgroundColor = me!.color + "1a";
      btn.style.borderStyle = "solid";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.backgroundColor = "";
      btn.style.borderStyle = "";
    });
  }
}

function updateSubmitButton() {
  const btn = document.getElementById("rsvp-submit") as HTMLButtonElement | null;
  if (!btn || btn.closest("#rsvp-confirmation")) return;
  const canSubmit = selectedDates.size > 0;
  btn.disabled = !canSubmit;
  btn.classList.toggle("inactive", !canSubmit);
  btn.textContent = "Snakkes på LAN";
  if (canSubmit) applyUserColor(btn);
  else btn.style.backgroundColor = "";
}

async function postRsvp(dates: string[]): Promise<RsvpEntry[] | null> {
  if (dates.length === 0) {
    const res = await fetch(`${API_URL}/lan/${lanId}/rsvp/`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok && res.status !== 204) throw new Error(`${res.status}`);
    return apiFetch<RsvpEntry[]>(`lan/${lanId}/rsvp`);
  }
  const res = await fetch(`${API_URL}/lan/${lanId}/rsvp/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ dates, dinner_dates: dates.filter(d => dinnerDates.has(d)) }),
  });
  if (!res.ok && res.status !== 204) throw new Error(`${res.status}`);
  return apiFetch<RsvpEntry[]>(`lan/${lanId}/rsvp`);
}

async function handleSubmit() {
  const dates = getSelectedDates();
  if (dates.length === 0) return;
  const btn = document.getElementById("rsvp-submit") as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = "Sender…";
  try {
    const entries = await postRsvp(dates);
    btn.textContent = "Snakkes på LAN";
    showConfirmation(entries ?? undefined);
  } catch (err) {
    console.error(err);
    showError("Kunne ikke sende påmelding");
    btn.disabled = false;
    btn.textContent = "Snakkes på LAN";
    updateSubmitButton();
  }
}

async function transformCardToForm(card: HTMLElement) {
  const originalDates = new Set(selectedDates);

  card.querySelector(".mc-days")?.remove();
  card.querySelector(".rsvp-endre-btn")?.remove();

  card.appendChild(buildPickerContent(selectedDates, dinnerDates, me, updateSubmitButton, () => onDateToggle));

  const actions = document.createElement("div");
  actions.className = "mc-card-actions";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "rsvp-endre-btn";
  cancelBtn.textContent = "Avbryt";
  applyUserColorOutline(cancelBtn);
  cancelBtn.addEventListener("click", () => {
    selectedDates.clear();
    originalDates.forEach((d) => selectedDates.add(d));
    buildDayPicker();
    onDateToggle = null;
    showConfirmation(cachedEntries ?? undefined);
  });

  const submitBtn = document.createElement("button");
  submitBtn.type = "button";

  const syncSubmitBtn = () => {
    const empty = selectedDates.size === 0;
    submitBtn.textContent = empty ? "Avmeld" : "Lagre";
    submitBtn.classList.toggle("inactive", false);
    submitBtn.disabled = false;
    applyUserColor(submitBtn);
  };
  syncSubmitBtn();

  onDateToggle = syncSubmitBtn;

  submitBtn.addEventListener("click", async () => {
    const dates = getSelectedDates();
    submitBtn.disabled = true;
    submitBtn.textContent = "Sender…";
    try {
      const entries = await postRsvp(dates);
      onDateToggle = null;
      selectedDates.clear();
      for (const d of dates) selectedDates.add(d);
      buildDayPicker();
      if (dates.length === 0) {
        showForm();
      } else {
        showConfirmation(entries ?? undefined);
      }
    } catch {
      submitBtn.textContent = "Feil – prøv igjen";
      submitBtn.disabled = false;
    }
  });

  actions.appendChild(cancelBtn);
  actions.appendChild(submitBtn);
  card.appendChild(actions);
}

function showConfirmation(entries?: RsvpEntry[]) {
  if (entries) cachedEntries = entries;

  document.getElementById("step-days")!.style.display = "none";
  document.querySelector<HTMLElement>(".rsvp-footer")!.style.display = "none";
  document.getElementById("rsvp-confirmation")!.style.display = "";
  applyUserColorOutline(document.getElementById("rsvp-endre") as HTMLButtonElement);

  const matrixEl = document.getElementById("participant-matrix")!;
  matrixEl.innerHTML = "";
  const tableWrap = document.createElement("div");
  tableWrap.className = "matrix-table-wrap";
  const cardWrap = document.createElement("div");
  cardWrap.className = "matrix-card-wrap";
  renderMatrix(tableWrap, cachedEntries ?? []);
  renderCards(cardWrap, cachedEntries ?? [], { currentUserId: me?.id, onEdit: transformCardToForm });
  cardWrap.querySelectorAll<HTMLButtonElement>(".rsvp-endre-btn").forEach(applyUserColorOutline);
  const dinnerWrap = document.createElement("div");
  dinnerWrap.className = "dinner-table-wrap";
  renderDinnerTable(dinnerWrap, cachedEntries ?? []);
  matrixEl.appendChild(tableWrap);
  matrixEl.appendChild(cardWrap);
  matrixEl.appendChild(dinnerWrap);
}

function showForm() {
  onDateToggle = null;
  document.getElementById("step-days")!.style.display = "";
  document.querySelector<HTMLElement>(".rsvp-footer")!.style.display = "";
  document.getElementById("rsvp-confirmation")!.style.display = "none";
  updateSubmitButton();
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

async function init() {
  me = await requireAuth();
  if (!me) return;

  const lans = await apiFetch<LAN[]>(`lan`);
  if (!lans) return;
  const now = new Date();
  const upcoming = lans
    .filter(l => new Date(l.endDate) >= now)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];
  if (!upcoming) { showError("Ingen kommende LAN funnet"); return; }
  lanId = upcoming.lanId;

  const entries = await apiFetch<RsvpEntry[]>(`lan/${lanId}/rsvp`);
  const myEntry = entries?.find((e) => e.userId === me!.id);
  if (myEntry) {
    for (const date of myEntry.dates) selectedDates.add(date);
    for (const date of (myEntry.dinnerDates ?? [])) dinnerDates.add(date);
  } else {
    for (const date of mainDates) dinnerDates.add(date);
  }

  buildDayPicker();

  if (myEntry && myEntry.dates.length > 0) {
    showConfirmation(entries ?? undefined);
  } else {
    showForm();
  }
}

document.getElementById("rsvp-submit")!.addEventListener("click", handleSubmit);
document.getElementById("rsvp-endre")!.addEventListener("click", showForm);

document.addEventListener("click", (e) => {
  const h2 = (e.target as HTMLElement).closest("h2");
  if (!h2) return;
  const parent = h2.parentElement;
  if (parent?.classList.contains("dinner-table-wrap")) {
    parent.classList.toggle("collapsed");
  }
});

window.addEventListener("pageshow", (e) => {
  if (!e.persisted) return;
  showForm();
});

init();
