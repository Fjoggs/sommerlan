import { User } from "./types.js";
import { createElement } from "./utils.js";

const onSubmitUser = async (event: SubmitEvent) => {
  const userForm = document.getElementById("userForm") as HTMLFormElement;
  event.preventDefault();

  const formData = new FormData(userForm);
  console.log("formDAta", formData);

  const res = await fetch("http://localhost:8080/api/user/", {
    method: "POST",
    body: formData,
  });

  console.log("res.status", res.status);
  if (res.status === 200) {
    const body: User = await res.json();
    const userTable = document.getElementById("userTable");
    const user: User = {
      id: body.id,
      name: body.name,
    };
    const row = createUser(user);
    userTable?.appendChild(row);
  }
};

const userForm = document.getElementById("userForm");
userForm?.addEventListener("submit", onSubmitUser);

const renderUsers = async () => {
  const response = await fetch("http://localhost:8080/api/user/");

  const users = await response.json();

  const tbody = document.getElementById("userTable") as HTMLTableSectionElement;
  users.forEach((user: User) => {
    if (user.id) {
      const row = createUser(user);
      tbody.appendChild(row);
    }
  });
};

export const createUser = (user: User) => {
  const row = createElement("tr", `user-row-${user.id}`);
  const entry = createElement("span", `user-entry-${user.id}`);
  entry.textContent = user.name;
  const deleteButton = createElement("button", `delete-user-${user.id}`);
  deleteButton.addEventListener("click", () => deleteUser(user.id));
  deleteButton.textContent = "-";
  row.appendChild(entry);
  row.appendChild(deleteButton);
  return row;
};

const deleteUser = async (id: number) => {
  const response = await fetch(`http://localhost:8080/api/user/${id}/`, {
    method: "DELETE",
  });
  if (response.status === 204) {
    const userRow = document.getElementById(`user-row-${id}`);
    console.log("userRow", userRow);

    if (userRow?.parentNode) {
      userRow.parentNode.removeChild(userRow);
    }
  }
};

await renderUsers();
