import { LAN } from "./ts/types.js";
import { createElement } from "./ts/utils.js";

const fetchLans = async () => {
  const res = await fetch("http://localhost:8080/api/lan/");
  const lans: LAN[] = await res.json();
  const preContainer = document.getElementById("pre");
  const mainContainer = document.getElementById("main");
  const sideContainer = document.getElementById("side");

  lans.forEach((lan) => {
    if (lan.event === "pre") {
      preContainer?.appendChild(buildEntry(lan));
    } else if (lan.event === "main") {
      mainContainer?.appendChild(buildEntry(lan));
    } else if (lan.event === "side") {
      sideContainer?.appendChild(buildEntry(lan));
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
  const container = createElement("div", id);
  container.className = "timeline-event";
  // container.addEventListener("click", () => fetchLanById(lan.lanId));

  const hContainer = createElement("div");
  hContainer.className = "timeline-event-header";
  const header = createElement("h3");
  header.textContent = startDate.getFullYear().toString();
  hContainer.appendChild(header);
  const editButton = createElement("button", `edit-button-${lan.lanId}`);

  // Named function so that we can remove it
  function handleEdit() {
    editButton.textContent = "✔";
    if (container) container.className = "editing";
    editButton.removeEventListener("click", handleEdit);
    editButton.addEventListener("click", handleFinish);
    editButton.style.transform = "scale(1,1)";
  }

  function handleFinish() {
    editButton.textContent = "✎";
    if (container) container.className = "timeline-event";
    editButton.removeEventListener("click", handleFinish);
    editButton.addEventListener("click", handleEdit);
    editButton.style.transform = "scale(-1,1)";
  }

  editButton.textContent = "✎";
  editButton.className = "edit-button";
  editButton.addEventListener("click", handleEdit);
  hContainer.appendChild(editButton);
  container.appendChild(hContainer);

  const description = createElement("p");
  description.textContent = lan.description;
  container.appendChild(description);

  const participants = createElement("div");
  participants.className = "pill-list";
  const pHeader = createElement("h4");
  pHeader.textContent = "Deltakere";
  participants.appendChild(pHeader);
  for (const participant of lan.participants) {
    const pill = createElement("span");
    pill.className = "pill";
    pill.textContent += `${participant} `;
    participants.appendChild(pill);
  }
  container.appendChild(participants);

  const games = createElement("div");
  games.className = "pill-list";
  const gHeader = createElement("h4");
  gHeader.textContent = "Spill";
  games.appendChild(gHeader);
  for (const game of lan.games) {
    const pill = createElement("span");
    pill.className = "pill";
    pill.textContent += `${game} `;
    games.appendChild(pill);
  }
  container.appendChild(games);

  return container;
};

await fetchLans();
