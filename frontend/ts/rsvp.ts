import { showError } from "./errorHandler.js";
import { BLOCKS, GAMES, renderMatrix, renderCards } from "./matrix.js";
import { requireAuth, authHeaders } from "./auth.js";
import type { RsvpEntry } from "./types.js";

const API_URL = "http://localhost:8080/api";
const lanId = new URLSearchParams(location.search).get("lan");

let me: { id: number; name: string; nickname?: string; color: string } | null = null;
let cachedEntries: RsvpEntry[] | null = null;

const selectedDates = new Set<string>();
let onDateToggle: (() => void) | null = null;

const BLOCK_SATURATION: Record<string, number> = {
  "pre-pre": 0.25,
  "pre":     0.55,
  "main":    1.0,
};

function buildPickerContent(): HTMLElement {
  const daysWrap = document.createElement("div");
  daysWrap.className = "mc-days";

  for (const block of BLOCKS) {
    const blockWrap = document.createElement("div");
    blockWrap.className = "mc-block";

    const blockLabel = document.createElement("span");
    blockLabel.className = "mc-block-label";
    blockLabel.textContent = block.label;
    blockWrap.appendChild(blockLabel);

    const badgeRow = document.createElement("div");
    badgeRow.className = "mc-block-days";
    const sat = BLOCK_SATURATION[block.key] ?? 1;

    for (const date of block.dates) {
      const d = new Date(date + "T00:00:00");
      const badge = document.createElement("span");
      badge.className = "mc-day day-picker-badge";

      const applyState = () => {
        const on = selectedDates.has(date);
        badge.classList.toggle("mc-day-on", on);
        badge.classList.toggle("mc-day-off", !on);
        if (on) {
          badge.style.backgroundColor = me!.color + "33";
          badge.style.borderColor = me!.color;
          badge.style.color = me!.color;
          badge.style.filter = `saturate(${sat})`;
        } else {
          badge.style.cssText = "";
          badge.classList.add("mc-day-off");
        }
      };

      const game = GAMES[date as keyof typeof GAMES];
      badge.innerHTML = `<span class="mc-day-name">${d.toLocaleDateString("nb-NO", { weekday: "short" })}</span><span class="mc-day-num">${d.getDate()}${game ? `<span class="mc-day-game" title="${game}">⚽</span>` : ""}</span>`;

      badge.addEventListener("click", () => {
        if (selectedDates.has(date)) selectedDates.delete(date);
        else selectedDates.add(date);
        applyState();
        updateSubmitButton();
        onDateToggle?.();
      });

      applyState();
      badgeRow.appendChild(badge);
    }

    blockWrap.appendChild(badgeRow);
    daysWrap.appendChild(blockWrap);
  }

  return daysWrap;
}

function buildDayPicker() {
  const container = document.getElementById("day-picker")!;
  container.innerHTML = "";
  container.appendChild(buildPickerContent());
}

function getSelectedDates(): string[] {
  return Array.from(selectedDates);
}

function updateSubmitButton() {
  const btn = document.getElementById("rsvp-submit") as HTMLButtonElement | null;
  if (!btn || btn.closest("#rsvp-confirmation")) return;
  const canSubmit = selectedDates.size > 0;
  btn.disabled = !canSubmit;
  btn.classList.toggle("inactive", !canSubmit);
  btn.textContent = "Snakkes på LAN";
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
    body: JSON.stringify({ dates }),
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

  card.appendChild(buildPickerContent());

  const actions = document.createElement("div");
  actions.className = "mc-card-actions";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "rsvp-endre-btn";
  cancelBtn.textContent = "Avbryt";
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

  const matrixEl = document.getElementById("participant-matrix")!;
  matrixEl.innerHTML = "";
  const tableWrap = document.createElement("div");
  tableWrap.className = "matrix-table-wrap";
  const cardWrap = document.createElement("div");
  cardWrap.className = "matrix-card-wrap";
  renderMatrix(tableWrap, cachedEntries ?? []);
  renderCards(cardWrap, cachedEntries ?? [], { currentUserId: me?.id, onEdit: transformCardToForm });
  matrixEl.appendChild(tableWrap);
  matrixEl.appendChild(cardWrap);
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
  if (!lanId) { showError("Mangler LAN-ID i URL (?lan=ID)"); return; }

  const entries = await apiFetch<RsvpEntry[]>(`lan/${lanId}/rsvp`);
  const myEntry = entries?.find((e) => e.userId === me!.id);
  if (myEntry) for (const date of myEntry.dates) selectedDates.add(date);

  buildDayPicker();

  if (myEntry && myEntry.dates.length > 0) {
    showConfirmation(entries ?? undefined);
  } else {
    updateSubmitButton();
  }
}

document.getElementById("rsvp-submit")!.addEventListener("click", handleSubmit);
document.getElementById("rsvp-endre")!.addEventListener("click", showForm);

window.addEventListener("pageshow", (e) => {
  if (!e.persisted) return;
  showForm();
});

init();
