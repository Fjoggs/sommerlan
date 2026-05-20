import type { RsvpEntry } from "./types.js";

export const GAMES: Record<string, string> = {
  "2026-07-14": "Semi-finaler (21:00)",
  "2026-07-15": "Semi-finaler (21:00)",
  "2026-07-18": "Bronsefinale (23:00)",
  "2026-07-19": "Finale (21:00)",
};

export const BLOCKS = [
  {
    key: "pre-pre",
    label: "Pre-pre-LAN",
    dates: ["2026-07-14", "2026-07-15", "2026-07-16"],
  },
  {
    key: "pre",
    label: "Pre-LAN",
    dates: ["2026-07-17", "2026-07-18", "2026-07-19"],
  },
  {
    key: "main",
    label: "SommerLAN 2026",
    dates: ["2026-07-20", "2026-07-21", "2026-07-22", "2026-07-23", "2026-07-24", "2026-07-25", "2026-07-26"],
  },
] as const;

export function renderMatrix(container: HTMLElement, entries: RsvpEntry[]): void {
  container.innerHTML = "";

  if (entries.length === 0) {
    container.innerHTML = `<p class="loading-text">Ingen påmeldte ennå.</p>`;
    return;
  }

  const activeDates = new Set(entries.flatMap((e) => e.dates));
  const visibleDates = BLOCKS.flatMap((b) => b.dates.filter((d) => activeDates.has(d)));

  const table = document.createElement("table");
  table.className = "rsvp-matrix";

  const thead = table.createTHead();

  // First header row: block group labels
  const groupRow = thead.insertRow();
  const cornerTh = document.createElement("th");
  groupRow.appendChild(cornerTh);
  for (const block of BLOCKS) {
    const blockVisible = block.dates.filter((d) => activeDates.has(d));
    if (blockVisible.length === 0) continue;
    const th = document.createElement("th");
    th.colSpan = blockVisible.length;
    th.className = `matrix-block-label block-start block-${block.key}`;
    th.textContent = block.label;
    groupRow.appendChild(th);
  }

  // Second header row: individual dates
  const dateRow = thead.insertRow();
  dateRow.insertCell(); // empty corner
  for (const date of visibleDates) {
    const block = BLOCKS.find((b) => b.dates.includes(date as never))!;
    const th = document.createElement("th");
    const d = new Date(date + "T00:00:00");
    const dayName = d.toLocaleDateString("nb-NO", { weekday: "short" });
    const dayNum = d.getDate();
    const game = GAMES[date];
    th.className = `block-${block.key}`;
    th.innerHTML = `<span class="matrix-day-name">${dayName}</span><span class="matrix-day-num">${dayNum}.</span>${game ? `<span class="matrix-game-icon" title="${game}">⚽</span>` : ""}`;
    if (block.dates[0] === date) th.classList.add("block-start");
    dateRow.appendChild(th);
  }

  // Body: one row per participant
  const tbody = table.createTBody();
  for (const entry of entries) {
    const row = tbody.insertRow();
    const nameCell = row.insertCell();
    nameCell.className = "matrix-name";
    nameCell.innerHTML = `<span class="user-dot" style="background-color:${entry.color}"></span>${entry.name}`;

    for (const date of visibleDates) {
      const cell = row.insertCell();
      if (BLOCKS.some((b) => b.dates[0] === date)) cell.classList.add("block-start");
      if (entry.dates.includes(date)) {
        cell.className += " matrix-cell attending";
        cell.innerHTML = `<span class="attend-dot" style="background-color:${entry.color}"></span>`;
      } else {
        cell.className += " matrix-cell absent";
        cell.textContent = "–";
      }
    }
  }

  container.appendChild(table);
}
