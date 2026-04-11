import { fetchAll } from "./crud.js";
import { Game, LAN, User } from "./types.js";
import { createElement } from "./utils.js";

export const fetchLans = async () => {
  const lans: LAN[] | undefined = await fetchAll("lan");
  if (!lans) return;
  const preContainer = document.getElementById("pre");
  const mainContainer = document.getElementById("main");
  const sideContainer = document.getElementById("side");

  lans.forEach(async (lan) => {
    if (lan.event === "pre") {
      preContainer?.appendChild(await buildEntry(lan));
    } else if (lan.event === "main") {
      mainContainer?.appendChild(await buildEntry(lan));
    } else if (lan.event === "side") {
      sideContainer?.appendChild(await buildEntry(lan));
    }
  });
};

const fetchLanById = async (id: number) => {
  const res = await fetch(`http://localhost:8080/api/lan/${id}/`);
  const lan: LAN = await res.json();
  console.log("lan", lan);
};

const buildEntry = async (lan: LAN) => {
  const startDate = new Date(lan.startDate);
  const id = `id-${lan.lanId}`;
  const container = createElement("form", id);
  container.className = "timeline-event";
  // container.addEventListener("click", () => fetchLanById(lan.lanId));

  const hContainer = createElement("div");
  hContainer.className = "timeline-event-header";
  const header = createElement("h3");
  header.textContent = startDate.getFullYear().toString();
  hContainer.appendChild(header);
  const editButton = createElement("button", `edit-button-${lan.lanId}`);

  const fieldset = createElement("fieldset", `fieldset-${lan.lanId}`);
  fieldset.setAttribute("disabled", "true");
  const pillContainer = createElement("div") as HTMLDivElement;

  function handleEdit(event: Event) {
    event.preventDefault();
    editButton.textContent = "✔";
    container.className = "editing";
    fieldset.removeAttribute("disabled");
    editButton.removeEventListener("click", handleEdit);
    editButton.addEventListener("click", handleFinish);
    editButton.style.transform = "scale(1,1)";
    for (const element of Array.from(pillContainer.children)) {
      element.removeAttribute("style");
    }
  }

  function handleFinish(event: Event) {
    event.preventDefault();
    editButton.textContent = "✎";
    container.className = "timeline-event";
    fieldset.setAttribute("disabled", "true");
    editButton.removeEventListener("click", handleFinish);
    editButton.addEventListener("click", handleEdit);
    editButton.style.transform = "scale(-1,1)";
    for (const element of Array.from(pillContainer.children)) {
      const color = element.getAttribute("data-color");
      if (color) {
        element.setAttribute("style", `background-color: ${color}`);
      } else {
        element.setAttribute("style", "display: none");
      }
    }
  }

  editButton.textContent = "✎";
  editButton.className = "edit-button";
  editButton.addEventListener("click", handleEdit);
  hContainer.appendChild(editButton);
  container.appendChild(hContainer);

  container.appendChild(fieldset);

  const description = createElement("p");
  description.textContent = lan.description;
  fieldset.appendChild(description);

  const participants = createElement("div");
  participants.className = "pill-container";
  const pHeader = createElement("h4");
  pHeader.textContent = "Deltakere";
  participants.appendChild(pHeader);
  pillContainer.className = "pill-list";
  await renderAllUsers(pillContainer, lan.participants);
  participants.appendChild(pillContainer);
  fieldset.appendChild(participants);

  const games = createElement("div");
  games.className = "pill-container";
  const gHeader = createElement("h4");
  gHeader.textContent = "Spill";
  games.appendChild(gHeader);
  const gamePillContainer = createElement("div");
  gamePillContainer.className = "pill-list";
  if (lan.games) {
    for (const game of lan.games) {
      const checkbox = createCheckbox(game, "games");
      gamePillContainer.appendChild(checkbox);
    }
  }
  games.appendChild(gamePillContainer);
  fieldset.appendChild(games);

  return container;
};

const renderAllUsers = async (
  container: HTMLElement,
  participants?: User[],
) => {
  const users: User[] | undefined = await fetchAll("user");
  if (!users) return;

  users.forEach((user) => {
    if (user.id) {
      const participant = participants?.find(
        (participant) => participant.id === user.id,
      );
      if (participant) {
        const row = createCheckbox(user, "participants", participant.color);
        row.setAttribute("data-color", participant.color);
        container.appendChild(row);
      } else {
        const row = createCheckbox(user, "participants");
        row.setAttribute("style", "display: none");
        container.appendChild(row);
      }
    }
  });
};

const createCheckbox = (
  data: Game | User,
  name: string,
  color: string = "var(--bg-light)",
) => {
  const label = createElement("label");
  label.textContent = data.name;
  const checkbox = createElement("input", data.id.toString());
  checkbox.setAttribute("type", "checkbox");
  checkbox.setAttribute("name", name);
  checkbox.setAttribute("value", data.id.toString());
  label.setAttribute("style", `background-color: ${color}`);
  label.appendChild(checkbox);
  return label;
};

await fetchLans();
