import type { RsvpEntry } from "./types.js";

export const GAMES: Record<string, string> = {
  "2026-07-14": "Semi-finaler (21:00)",
  "2026-07-15": "Semi-finaler (21:00)",
  "2026-07-18": "Bronsefinale (23:00)",
  "2026-07-19": "Finale (21:00)",
};

export const RACES: Record<string, string> = {
  "2026-07-19": "Belgian Grand Prix",
  "2026-07-26": "Hungarian Grand Prix",
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

  const sorted = [...entries].sort((a, b) => b.dates.length - a.dates.length);
  const visibleDates = BLOCKS.flatMap((b) => b.dates);

  const table = document.createElement("table");
  table.className = "rsvp-matrix";

  const thead = table.createTHead();

  // First header row: block group labels
  const groupRow = thead.insertRow();
  const cornerTh = document.createElement("th");
  groupRow.appendChild(cornerTh);
  for (const block of BLOCKS) {
    const th = document.createElement("th");
    th.colSpan = block.dates.length;
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
  for (const entry of sorted) {
    const row = tbody.insertRow();
    const nameCell = row.insertCell();
    nameCell.className = "matrix-name";
    nameCell.innerHTML = `<span class="user-dot" style="background-color:${entry.color}"></span>${entry.nickname || entry.name}`;

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

const mainDatesSet = new Set<string>(BLOCKS.find(b => b.key === "main")?.dates ?? []);

const BLOCK_SATURATION: Record<string, number> = {
  "pre-pre": 0.25,
  "pre":     0.55,
  "main":    1.0,
};

export function renderCards(
  container: HTMLElement,
  entries: RsvpEntry[],
  options?: { currentUserId?: number; onEdit?: (card: HTMLElement) => void },
): void {
  container.innerHTML = "";

  if (entries.length === 0) {
    container.innerHTML = `<p class="loading-text">Ingen påmeldte ennå.</p>`;
    return;
  }

  const sorted = [...entries].sort((a, b) => {
    if (a.userId === options?.currentUserId) return -1;
    if (b.userId === options?.currentUserId) return 1;
    return b.dates.length - a.dates.length;
  });
  const list = document.createElement("div");
  list.className = "mc-card-list";

  for (const entry of sorted) {
    const card = document.createElement("div");
    card.className = "mc-card";

    const totalDays = BLOCKS.flatMap(b => b.dates).length;
    const nameRow = document.createElement("div");
    nameRow.className = "mc-card-name";
    const dot = document.createElement("span");
    dot.className = "mc-dot";
    dot.style.backgroundColor = entry.color;
    const nameSpan = document.createElement("span");
    nameSpan.textContent = entry.nickname || entry.name;
    const countSpan = document.createElement("span");
    countSpan.className = "mc-day-count";
    countSpan.textContent = entry.dates.length === totalDays ? "(Full L)" : `(${entry.dates.length} dager)`;
    nameRow.appendChild(dot);
    nameRow.appendChild(nameSpan);
    nameRow.appendChild(countSpan);
    card.appendChild(nameRow);

    const daysRow = document.createElement("div");
    daysRow.className = "mc-days";

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
        badge.className = "mc-day" + (entry.dates.includes(date) ? " mc-day-on" : " mc-day-off");
        if (entry.dates.includes(date)) {
          badge.style.backgroundColor = entry.color + "33";
          badge.style.borderColor = entry.color;
          badge.style.color = entry.color;
          badge.style.filter = `saturate(${sat})`;
        }
        badge.innerHTML = `<span class="mc-day-name">${d.toLocaleDateString("nb-NO", { weekday: "short" })}</span><span class="mc-day-num">${d.getDate()}</span>`;
        badgeRow.appendChild(badge);
      }

      blockWrap.appendChild(badgeRow);
      daysRow.appendChild(blockWrap);
    }

    card.appendChild(daysRow);

    if (options?.currentUserId === entry.userId && options?.onEdit) {
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "rsvp-endre-btn";
      editBtn.textContent = "Endre datoer";
      editBtn.addEventListener("click", () => options.onEdit!(card));
      card.appendChild(editBtn);
    }

    list.appendChild(card);
  }

  container.appendChild(list);
}

export function renderDinnerTable(container: HTMLElement, entries: RsvpEntry[]): void {
  container.innerHTML = "";

  const mainDates = BLOCKS.find(b => b.key === "main")!.dates as readonly string[];
  const eaters = entries.filter(e => (e.dinnerDates ?? []).some(d => mainDatesSet.has(d)));

  if (eaters.length === 0) return;

  const heading = document.createElement("h2");
  heading.innerHTML = `<span class="hash">#</span>Middag`;
  container.appendChild(heading);

  const table = document.createElement("table");
  table.className = "rsvp-matrix dinner-matrix";

  const thead = table.createTHead();
  const dateRow = thead.insertRow();
  dateRow.insertCell();
  for (const date of mainDates) {
    const th = document.createElement("th");
    const d = new Date(date + "T00:00:00");
    th.innerHTML = `<span class="matrix-day-name">${d.toLocaleDateString("nb-NO", { weekday: "short" })}</span><span class="matrix-day-num">${d.getDate()}.</span>`;
    dateRow.appendChild(th);
  }

  const tbody = table.createTBody();
  for (const entry of eaters) {
    const row = tbody.insertRow();
    const nameCell = row.insertCell();
    nameCell.className = "matrix-name";
    nameCell.innerHTML = `<span class="user-dot" style="background-color:${entry.color}"></span>${entry.nickname || entry.name}`;

    for (const date of mainDates) {
      const cell = row.insertCell();
      if ((entry.dinnerDates ?? []).includes(date)) {
        cell.className = "matrix-cell attending";
        cell.innerHTML = `<span class="attend-dot" style="background-color:${entry.color}"></span>`;
      } else {
        cell.className = "matrix-cell absent";
        cell.textContent = "–";
      }
    }
  }

  const tfoot = table.createTFoot();
  const sumRow = tfoot.insertRow();
  const sumLabel = sumRow.insertCell();
  sumLabel.className = "matrix-name dinner-sum-label";
  sumLabel.textContent = "Totalt";
  for (const date of mainDates) {
    const cell = sumRow.insertCell();
    cell.className = "matrix-cell dinner-sum";
    const count = eaters.filter(e => (e.dinnerDates ?? []).includes(date)).length;
    cell.textContent = count > 0 ? String(count) : "–";
  }

  container.appendChild(table);
}
