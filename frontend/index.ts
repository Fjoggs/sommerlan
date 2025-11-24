import { LAN } from "./ts/types.js";
import { createElement } from "./ts/utils.js";

const fetchLans = async () => {
  const res = await fetch("http://localhost:8080/api/lan/");
  const lans: LAN[] = await res.json();
  const preContainer = document.getElementById("pre");

  lans.forEach((lan) => {
    if (lan.event === "pre") {
      preContainer?.appendChild(buildEntry(lan));
    }
  });
};

const fetchLanById = async (id: number) => {
  const res = await fetch(`http://localhost:8080/api/lan/${id}/`);
  const lan: LAN = await res.json();
  console.log("lan", lan);
};

const buildEntry = (lan: LAN) => {
  const startDate = new Date(lan.startDate);
  const id = `id-${lan.lanId}`;
  const container = createElement("button", id);
  container.className = "timeline-event";
  container.addEventListener("click", () => fetchLanById(lan.lanId));

  const header = createElement("h3");
  header.textContent = startDate.getFullYear().toString();

  const list = createElement("ul");

  const participants = createElement("li");
  participants.textContent = "Deltakere: ";
  for (const participant of lan.participants) {
    participants.textContent += `${participant} `;
  }
  list.appendChild(participants);

  const description = createElement("li");
  description.textContent = `Highlights: ${lan.description}`;
  list.appendChild(description);

  const games = createElement("li");
  games.textContent = "Spill: ";
  for (const game of lan.games) {
    games.textContent += `${game} `;
  }
  list.appendChild(games);

  container.appendChild(header);
  container.appendChild(list);
  return container;
};

await fetchLans();
