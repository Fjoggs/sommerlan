import { fetchAll } from "./crud.js";
import { LAN } from "./types.js";
import { createElement } from "./utils.js";

export const fetchLans = async () => {
  const lans: LAN[] | undefined = await fetchAll("lan");
  if (!lans) return;
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
  participants.className = "pill-container";
  const pHeader = createElement("h4");
  pHeader.textContent = "Deltakere";
  participants.appendChild(pHeader);
  const pillContainer = createElement("div");
  pillContainer.className = "pill-list";
  if (lan.participants) {
    for (const participant of lan.participants) {
      const label = createElement("label");
      label.textContent = participant.name;
      const checkbox = createElement("input", participant.id.toString());
      checkbox.setAttribute("type", "checkbox");
      checkbox.setAttribute("name", "participants");
      checkbox.setAttribute("value", participant.id.toString());
      checkbox.setAttribute("disabled", "true");
      label.style.backgroundColor = participant.color || "var(--bg-light)";
      label.appendChild(checkbox);
      pillContainer.appendChild(label);
    }
  }
  participants.appendChild(pillContainer);
  container.appendChild(participants);

  const games = createElement("div");
  games.className = "pill-container";
  const gHeader = createElement("h4");
  gHeader.textContent = "Spill";
  games.appendChild(gHeader);
  const gamePillContainer = createElement("div");
  gamePillContainer.className = "pill-list";
  if (lan.games) {
    for (const game of lan.games) {
      const label = createElement("label");
      label.textContent = game.name;
      const checkbox = createElement("input", game.id.toString());
      checkbox.setAttribute("type", "checkbox");
      checkbox.setAttribute("name", "games");
      checkbox.setAttribute("value", game.id.toString());
      checkbox.setAttribute("disabled", "true");
      label.style.backgroundColor = "var(--bg-light)";
      label.appendChild(checkbox);
      gamePillContainer.appendChild(label);
    }
  }
  games.appendChild(gamePillContainer);
  container.appendChild(games);

  return container;
};

await fetchLans();
