import { Game } from "./types.js";
import { createElement } from "./utils.js";

const onSubmitGame = async (event: SubmitEvent) => {
  const gameForm = document.getElementById("gameForm") as HTMLFormElement;
  event.preventDefault();

  const formData = new FormData(gameForm);
  console.log("formDAta", formData);

  const res = await fetch("http://localhost:8080/api/game/", {
    method: "POST",
    body: formData,
  });

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

const gameForm = document.getElementById("gameForm");
gameForm?.addEventListener("submit", onSubmitGame);

const renderGames = async () => {
  const response = await fetch("http://localhost:8080/api/game/");
  const games = await response.json();

  const tbody = document.getElementById("gameTable");
  games.forEach((game: Game) => {
    if (game.id) {
      const row = createGame(game);
      tbody?.appendChild(row);
    }
  });
};

export const createGame = (game: Game) => {
  const row = createElement("tr", `game-row-${game.id}`);
  const entry = createElement("span", `game-entry-${game.id}`);
  entry.textContent = game.name;
  const deleteButton = createElement("button", `delete-game-${game.id}`);
  deleteButton.addEventListener("click", () => deleteGame(game.id));
  deleteButton.textContent = "-";
  row.appendChild(entry);
  row.appendChild(deleteButton);
  return row;
};

const deleteGame = async (id: number) => {
  const response = await fetch(`http://localhost:8080/api/game/${id}/`, {
    method: "DELETE",
  });
  if (response.status === 204) {
    const gameRow = document.getElementById(`game-row-${id}`);
    console.log("gameRow", gameRow);

    if (gameRow?.parentNode) {
      gameRow.parentNode.removeChild(gameRow);
    }
  }
};

renderGames();
