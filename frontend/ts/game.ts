import { Game } from "./types.js";
import { createElement } from "./utils.js";
import { create, deleteEntry, fetchAll } from "./crud.js";

const onSubmitGame = async (event: SubmitEvent) => {
  event.preventDefault();
  const form = event.target as HTMLFormElement;
  const game: Game = await create("game", new FormData(form));
  const row = createGame(game);
  document.getElementById("gameTable")?.appendChild(row);
  form.reset();
};

const gameForm = document.getElementById("gameForm");
gameForm?.addEventListener("submit", onSubmitGame);

const renderGames = async () => {
  const games: Game[] = await fetchAll("game");
  const tbody = document.getElementById("gameTable");
  games.forEach((game) => {
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
  await deleteEntry("game", id);
  document.getElementById(`game-row-${id}`)?.remove();
};

renderGames();
