import { createGame } from "./game.js";
import { createElement, Game, LAN } from "./lan.js";

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

const onSubmitGame = async (event: SubmitEvent) => {
  const gameForm = document.getElementById("gameForm") as HTMLFormElement;
  event.preventDefault();

  const formData = new FormData(gameForm);
  console.log("formDAta", formData);

  const res = await fetch("http://localhost:8080/api/game/", {
    method: "POST",
    body: formData,
  });
  console.log("res.status", res.status);
  if (res.status === 200) {
    const body: Game = await res.json();
    const gameTable = document.getElementById("gameTable");
    const game: Game = {
      id: body.id,
      name: body.name,
    };
    const row = createGame(game);
    gameTable?.appendChild(row);
  }
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

const gameForm = document.getElementById("gameForm");
gameForm?.addEventListener("submit", onSubmitGame);

const lanForm = document.getElementById("lanForm");
lanForm?.addEventListener("submit", onSubmitLAN);

renderLans();
