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

  // row.appendChild(colorPicker());
  return row;
};

const deleteUser = async (id: number) => {
  await deleteEntry("user", id);
  document.getElementById(`user-row-${id}`)?.remove();
};

const colorPicker = () => {
  // const container = createElement("div", "color-picker");
  const container = createElement("select", "color-picker");
  container.className = "color-picker";

  type Color = {
    name: string;
    value: string;
  };

  const colors: Color[] = [
    { name: "Warm Peach", value: "oklch(72% 0.12 20)" }, // soft warm
    { name: "Golden Amber", value: "oklch(64% 0.20 45)" }, // yellow-orange
    { name: "Lemon Zest", value: "oklch(56% 0.28 90)" }, // bright yellow
    { name: "Spring Green", value: "oklch(48% 0.32 140)" }, // fresh green
    { name: "Sky Mist", value: "oklch(68% 0.16 200)" }, // desaturated sky blue
    { name: "Cornflower", value: "oklch(60% 0.24 250)" }, // blue
    { name: "Violet Ink", value: "oklch(52% 0.30 290)" }, // purple
    { name: "Blush Rose", value: "oklch(74% 0.10 330)" }, // pale pink
    { name: "Brick Red", value: "oklch(40% 0.38 10)" }, // deep warm red
    { name: "Mint Whisper", value: "oklch(82% 0.08 160)" }, // very pale mint
    { name: "Deep Ocean", value: "oklch(36% 0.34 215)" }, // dark blue
    { name: "Indigo Night", value: "oklch(28% 0.40 275)" }, // very deep indigo
  ];
  colors.forEach((color) => {
    // const colorContainer = createElement("div", color.name);
    const colorContainer = createElement("option", color.name);
    colorContainer.className = "color-container";
    // colorContainer.style = `background-color: ${color.value}`;
    colorContainer.setAttribute("value", color.value);
    colorContainer.textContent = color.name;
    container.appendChild(colorContainer);
  });

  return container;
};

await renderUsers();
