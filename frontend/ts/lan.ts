import { LAN, User } from "./types.js";
import { createElement } from "./utils.js";

export const fetchLans = async () => {
  const res = await fetch("http://localhost:8080/api/lan/");
  const lans: LAN[] = await res.json();
  const preContainer = document.getElementById("pre");

  lans.forEach((lan) => {
    if (lan.event === "pre") {
      const entry = buildEntry(lan);
      preContainer?.appendChild(entry);
    }
  });
};

const fetchLanById = async (id: number) => {
  const res = await fetch(`http://localhost:8080/api/lan/${id}`);
  const lan: LAN = await res.json();
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
  const response = await fetch("http://localhost:8080/api/user/");
  const users = await response.json();
  const buttonRow = document.getElementById("addUserButtons") as HTMLDivElement;

  users.forEach((user: User) => {
    buttonRow.appendChild(createAddUserButton(user));
  });
};

const createAddUserButton = (user: User) => {
  const button = createElement("button", `add-user-${user.id}`);
  button.setAttribute("value", user.name);
  button.setAttribute("type", "button");
  button.textContent = `${user.name} +`;
  button.addEventListener("click", () => onClickAddUserButton(user));
  return button;
};

await buildUserInputs();

const onClickAddUserButton = (user: User) => {
  const addedUsers = document.getElementById(
    "removeUserButtons",
  ) as HTMLDivElement;
  const userListInput = document.getElementById(
    "userListInput",
  ) as HTMLInputElement;
  const currentUsers = userListInput?.textContent;

  const removeButton = createElement("button", `remove-user-${user.id}`);
  removeButton.textContent = `${user.name} -`;
  removeButton.setAttribute("type", "button");
  removeButton.addEventListener("click", () => onClickRemoveUserButton(user));
  userListInput.value = `${currentUsers} ${user.name}`;
  addedUsers.appendChild(removeButton);

  const addButton = document.getElementById(
    `add-user-${user.id}`,
  ) as HTMLButtonElement;
  const addUserList = document.getElementById(
    "addUserButtons",
  ) as HTMLDivElement;
  addUserList.removeChild(addButton);
};

const onClickRemoveUserButton = (user: User) => {
  const addedUsers = document.getElementById(
    "removeUserButtons",
  ) as HTMLDivElement;
  const userListInput = document.getElementById(
    "userListInput",
  ) as HTMLInputElement;
  const currentUsers = userListInput?.textContent;
  const removeButton = document.getElementById(
    `remove-user-${user.id}`,
  ) as HTMLButtonElement;
  addedUsers.removeChild(removeButton);
  userListInput.value = `${currentUsers}`;

  const addButton = createAddUserButton(user);
  const addUserList = document.getElementById(
    "addUserButtons",
  ) as HTMLDivElement;
  addUserList.appendChild(addButton);
};

const renderLans = async () => {
  const response = await fetch("http://localhost:8080/api/lan/");
  const lans = await response.json();

  const tbody = document.getElementById("lanTable");
  lans.forEach((lan: LAN) => {
    if (lan) {
      const row = createLAN(lan);
      tbody?.appendChild(row);
    }
  });
};

const onSubmitLAN = async (event: SubmitEvent) => {
  const lanForm = document.getElementById("lanForm") as HTMLFormElement;
  event.preventDefault();

  const formData = new FormData(lanForm);
  console.log("formDAta", formData);

  const res = await fetch("http://localhost:8080/api/lan/", {
    method: "POST",
    body: formData,
  });
  console.log("res.status", res.status);
  if (res.status === 200) {
    const body: LAN = await res.json();
    const lanTable = document.getElementById("lanTable");
    const lan: LAN = {
      description: body.description,
      endDate: body.endDate,
      event: body.event,
      games: [],
      lanId: body.lanId,
      participants: [],
      startDate: body.startDate,
    };
    const row = createLAN(lan);
    lanTable?.appendChild(row);
  }
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

  const deleteButton = createElement("button", `delete-lan-${lan.lanId}`);
  deleteButton.addEventListener("click", () => deleteLan(lan.lanId));
  deleteButton.textContent = "-";
  row.appendChild(deleteButton);

  return row;
};

const lanForm = document.getElementById("lanForm");
lanForm?.addEventListener("submit", onSubmitLAN);

renderLans();
