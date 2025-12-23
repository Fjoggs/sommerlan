import { create, fetchAll, fetchById } from "./crud.js";
import { Game, LAN, User } from "./types.js";
import { createElement } from "./utils.js";

export const fetchLans = async () => {
  const lans: LAN[] | undefined = await fetchAll("lan");
  if (!lans) return;

  const preContainer = document.getElementById("pre");
  lans.forEach((lan) => {
    if (lan.event === "pre") {
      const entry = buildEntry(lan);
      preContainer?.appendChild(entry);
    }
  });
};

const fetchLanById = async (id: number) => {
  const lan: LAN | undefined = await fetchById("lan", id);
  if (!lan) return;

  console.log("lan", lan);
};

export const buildEntry = (lan: LAN) => {
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

const buildUserInputs = async () => {
  const users: User[] | undefined = await fetchAll("user");
  if (!users) return;

  users.forEach((user) => {
    createUserCheckbox(user);
  });
};

const createUserCheckbox = (user: User) => {
  const label = createElement("label");
  label.textContent = user.name;
  const checkbox = createElement("input", user.id.toString());
  checkbox.setAttribute("type", "checkbox");
  checkbox.setAttribute("name", "participants");
  checkbox.setAttribute("value", user.id.toString());
  label.appendChild(checkbox);
  document.getElementById("user-list")?.appendChild(label);
};

const buildGameInputs = async () => {
  const games: Game[] | undefined = await fetchAll("game");
  if (!games) return;

  games.forEach((game) => {
    createGameCheckbox(game);
  });
};

const createGameCheckbox = (game: Game) => {
  const label = createElement("label");
  label.textContent = game.name;
  const checkbox = createElement("input", game.id.toString());
  checkbox.setAttribute("type", "checkbox");
  checkbox.setAttribute("name", "games");
  checkbox.setAttribute("value", game.id.toString());
  label.appendChild(checkbox);
  document.getElementById("game-list")?.appendChild(label);
};

await buildUserInputs();
await buildGameInputs();

const renderLans = async () => {
  const lans: LAN[] | undefined = await fetchAll("lan");
  if (!lans) return;

  const tbody = document.getElementById("lanTable");
  lans.forEach((lan) => {
    const row = createLAN(lan);
    tbody?.appendChild(row);
  });
};

const onSubmitLAN = async (event: SubmitEvent) => {
  event.preventDefault();

  const form = event.target as HTMLFormElement;

  const res: LAN | undefined = await create("lan", new FormData(form));
  if (!res) return;

  const lan: LAN = {
    description: res.description,
    endDate: res.endDate,
    event: res.event,
    games: res.games,
    lanId: res.lanId,
    participants: res.participants,
    startDate: res.startDate,
  };
  const row = createLAN(lan);
  document.getElementById("lanTable")?.appendChild(row);
};

const deleteLan = async (id: number) => {
  const response = await fetch(`http://localhost:8080/api/lan/${id}/`, {
    method: "DELETE",
  });
  if (response.status === 204) {
    const lanRow = document.getElementById(`lan-row-${id}`);
    if (lanRow?.parentNode) {
      lanRow.parentNode.removeChild(lanRow);
    }
  }
};

export const createLAN = (lan: LAN) => {
  const row = createElement("tr", `lan-row-${lan.lanId}`);

  const deleteCell = createElement("td");
  const deleteButton = createElement("button", `delete-lan-${lan.lanId}`);
  deleteButton.addEventListener("click", () => deleteLan(lan.lanId));
  deleteButton.textContent = "-";
  deleteCell.appendChild(deleteButton);
  row.appendChild(deleteCell);

  const startDate = createElement("td");
  startDate.textContent = lan.startDate;
  row.appendChild(startDate);

  const endDate = createElement("td");
  endDate.textContent = lan.endDate;
  row.appendChild(endDate);

  const description = createElement("td");
  description.textContent = lan.description;
  row.appendChild(description);

  const era = createElement("td");
  era.textContent = lan.event;
  row.appendChild(era);

  const participants = createElement("td");
  participants.textContent = lan.participants
    .map((participant) => participant.name)
    .join(", ");
  row.appendChild(participants);

  const games = createElement("td");
  games.textContent = lan.games.map((game) => game.name).join(", ");
  row.appendChild(games);

  return row;
};

const lanForm = document.getElementById("lanForm");
lanForm?.addEventListener("submit", onSubmitLAN);

renderLans();
