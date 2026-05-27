import { BLOCKS, renderMatrix } from "./matrix.js";
import type { RsvpEntry } from "./types.js";

const SAMPLE: RsvpEntry[] = [
  { userId: 1, name: "Fjoggs", nickname: "PekkyD", color: "#FF70ED", dates: ["2026-07-20","2026-07-21","2026-07-22","2026-07-23","2026-07-24","2026-07-25","2026-07-26"] },
  { userId: 2, name: "Kristian", color: "#70BFFF", dates: ["2026-07-17","2026-07-18","2026-07-19","2026-07-20","2026-07-21","2026-07-22","2026-07-23"] },
  { userId: 3, name: "Torbjørn", nickname: "Torby", color: "#FFB347", dates: ["2026-07-14","2026-07-15","2026-07-20","2026-07-21","2026-07-22","2026-07-23","2026-07-24","2026-07-25","2026-07-26"] },
  { userId: 4, name: "Magnus", color: "#7FFF6E", dates: ["2026-07-20","2026-07-21","2026-07-22"] },
  { userId: 5, name: "Sindre", color: "#FF6E6E", dates: ["2026-07-18","2026-07-19","2026-07-20","2026-07-21","2026-07-22","2026-07-23","2026-07-24"] },
  { userId: 6, name: "Aleksander", nickname: "Sander", color: "#C8A2FF", dates: ["2026-07-14","2026-07-15","2026-07-16","2026-07-20","2026-07-21","2026-07-22","2026-07-23","2026-07-24","2026-07-25","2026-07-26"] },
];

const allDates = BLOCKS.flatMap(b => b.dates as readonly string[]);

const BLOCK_SATURATION: Record<string, number> = {
  "pre-pre": 0.25,
  "pre":     0.55,
  "main":    1.0,
};

function renderCards(container: HTMLElement, entries: RsvpEntry[]) {
  container.innerHTML = "";
  const list = document.createElement("div");
  list.className = "mc-card-list";

  for (const entry of entries) {
    const card = document.createElement("div");
    card.className = "mc-card";

    const nameRow = document.createElement("div");
    nameRow.className = "mc-card-name";
    const dot = document.createElement("span");
    dot.className = "mc-dot";
    dot.style.backgroundColor = entry.color;
    nameRow.appendChild(dot);
    const nameSpan = document.createElement("span");
    nameSpan.textContent = entry.nickname || entry.name;
    nameRow.appendChild(nameSpan);
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
        const dayNum = d.getDate();
        const dayName = d.toLocaleDateString("nb-NO", { weekday: "short" });
        const attending = entry.dates.includes(date);
        const badge = document.createElement("span");
        badge.className = "mc-day" + (attending ? " mc-day-on" : " mc-day-off");
        if (attending) {
          badge.style.backgroundColor = entry.color + "33";
          badge.style.borderColor = entry.color;
          badge.style.color = entry.color;
          badge.style.filter = `saturate(${sat})`;
        }
        badge.innerHTML = `<span class="mc-day-name">${dayName}</span><span class="mc-day-num">${dayNum}</span>`;
        badgeRow.appendChild(badge);
      }
      blockWrap.appendChild(badgeRow);
      daysRow.appendChild(blockWrap);
    }

    card.appendChild(daysRow);
    list.appendChild(card);
  }

  container.appendChild(list);
}

renderMatrix(document.getElementById("table-view")!, SAMPLE);
renderCards(document.getElementById("card-view")!, SAMPLE);
