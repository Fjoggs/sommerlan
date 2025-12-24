import { create, deleteEntry, fetchAll } from "./crud.js";
import { User } from "./types.js";
import { createElement } from "./utils.js";

const onSubmitUser = async (event: SubmitEvent) => {
  event.preventDefault();
  const form = event.target as HTMLFormElement;
  const user: User | undefined = await create("user", new FormData(form));
  if (!user) return;

  const userTable = document.getElementById("userTable");
  const row = createUser(user);
  userTable?.appendChild(row);
  form.reset();
};

const userForm = document.getElementById("userForm");
userForm?.addEventListener("submit", onSubmitUser);

const renderUsers = async () => {
  const users: User[] | undefined = await fetchAll("user");
  if (!users) return;

  const tbody = document.getElementById("userTable") as HTMLTableSectionElement;
  users.forEach((user) => {
    if (user.id) {
      const row = createUser(user);
      tbody.appendChild(row);
    }
  });
};

export const createUser = (user: User) => {
  const row = createElement("tr", `user-row-${user.id}`);
  const deleteCell = createElement("td");
  const deleteButton = createElement("button", `delete-user-${user.id}`);
  deleteButton.addEventListener("click", () => deleteUser(user.id));
  deleteButton.textContent = "-";
  deleteCell.appendChild(deleteButton);
  row.appendChild(deleteCell);

  const name = createElement("td", `user-name-${user.id}`);
  name.textContent = user.name;
  row.appendChild(name);

  const color = createElement("td", `user-color-${user.id}`);
  color.textContent = user.color;
  row.appendChild(color);
  return row;
};

const deleteUser = async (id: number) => {
  await deleteEntry("user", id);
  document.getElementById(`user-row-${id}`)?.remove();
};

await renderUsers();
