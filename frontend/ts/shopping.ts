import { requireAuth, authHeaders } from "./auth.js";
import { createElement } from "./utils.js";
import { showError } from "./errorHandler.js";
import type { ShoppingItem, ShoppingListDetail, ShoppingListSummary } from "./types.js";

const API_URL = "/api";

const me = await requireAuth();
if (!me) throw new Error();

const content = document.getElementById("content")!;
content.style.width = "100%";

const detailCache = new Map<number, ShoppingListDetail>();
const expanded = new Set<number>();

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T | null> {
  try {
    const headers = { ...authHeaders(), ...(options.headers as Record<string, string> ?? {}) };
    const res = await fetch(`${API_URL}/${path}`, { ...options, headers });
    if (!res.ok) {
      showError(`Noe gikk galt (${res.status})`);
      return null;
    }
    if (res.status === 204) return null;
    return res.json();
  } catch {
    showError("Nettverksfeil");
    return null;
  }
}

async function loadLists(): Promise<ShoppingListSummary[]> {
  return (await apiFetch<ShoppingListSummary[]>("shopping/")) ?? [];
}

async function loadListDetail(id: number, force = false): Promise<ShoppingListDetail | null> {
  if (!force && detailCache.has(id)) return detailCache.get(id)!;
  const detail = await apiFetch<ShoppingListDetail>(`shopping/${id}/`);
  if (detail) detailCache.set(id, detail);
  return detail;
}

async function render() {
  content.innerHTML = "";
  const lists = await loadLists();

  content.appendChild(buildCreateForm());

  const active = lists.filter((l) => l.status === "active");
  const history = lists.filter((l) => l.status === "completed");

  content.appendChild(await buildListSection("Handlelister", active, false));
  content.appendChild(await buildListSection("Historikk", history, true));
}

function buildCreateForm(): HTMLElement {
  const section = createElement("section") as HTMLElement;
  section.className = "event-section shopping-create";

  const h2 = createElement("h2") as HTMLHeadingElement;
  h2.innerHTML = `<span class="hash">#</span>Ny liste`;
  section.appendChild(h2);

  const row = createElement("div") as HTMLDivElement;
  row.className = "shopping-new-list-row";

  const input = createElement("input") as HTMLInputElement;
  input.type = "text";
  input.placeholder = "Navn på liste, f.eks. \"Sommerlan 2027\"";

  const button = createElement("button") as HTMLButtonElement;
  button.type = "button";
  button.textContent = "Ny liste";

  const submit = async () => {
    const name = input.value.trim();
    if (!name) return;
    button.disabled = true;
    const created = await apiFetch<ShoppingListDetail>("shopping/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    button.disabled = false;
    if (created) {
      detailCache.set(created.id, created);
      expanded.add(created.id);
      input.value = "";
      await render();
    }
  };

  button.addEventListener("click", submit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submit();
  });

  row.appendChild(input);
  row.appendChild(button);
  section.appendChild(row);
  return section;
}

async function buildListSection(
  title: string,
  lists: ShoppingListSummary[],
  collapsedByDefault: boolean,
): Promise<HTMLElement> {
  const section = createElement("section") as HTMLElement;
  section.className = "event-section shopping-section";
  if (collapsedByDefault) section.classList.add("collapsed");

  const h2 = createElement("h2") as HTMLHeadingElement;
  h2.innerHTML = `<span class="hash">#</span>${title} <span class="section-count">${lists.length}</span>`;
  h2.addEventListener("click", () => section.classList.toggle("collapsed"));
  section.appendChild(h2);

  if (lists.length === 0) {
    const empty = createElement("p") as HTMLParagraphElement;
    empty.className = "shopping-empty";
    empty.textContent = title === "Historikk" ? "Ingen fullførte lister enda." : "Ingen aktive lister.";
    section.appendChild(empty);
    return section;
  }

  const container = createElement("div") as HTMLDivElement;
  container.className = "shopping-list-container";
  for (const list of lists) {
    container.appendChild(await buildListCard(list));
  }
  section.appendChild(container);
  return section;
}

async function buildListCard(summary: ShoppingListSummary): Promise<HTMLElement> {
  const card = createElement("div") as HTMLDivElement;
  card.className = "shopping-list-card";
  if (summary.status === "completed") card.classList.add("completed");

  const header = createElement("div") as HTMLDivElement;
  header.className = "shopping-list-header";

  const name = createElement("span") as HTMLSpanElement;
  name.className = "shopping-list-name";
  name.textContent = summary.name;
  name.addEventListener("click", () => toggleExpanded(summary.id));

  const count = createElement("span") as HTMLSpanElement;
  count.className = "shopping-list-count";
  count.textContent = `${summary.itemCount} ${summary.itemCount === 1 ? "vare" : "varer"}`;

  const actions = createElement("div") as HTMLDivElement;
  actions.className = "shopping-list-actions";

  const toggleBtn = createElement("button") as HTMLButtonElement;
  toggleBtn.type = "button";
  toggleBtn.className = "shopping-toggle-btn";
  toggleBtn.textContent = summary.status === "completed" ? "Åpne igjen" : "Fullfør";
  toggleBtn.addEventListener("click", async () => {
    toggleBtn.disabled = true;
    const newStatus = summary.status === "completed" ? "active" : "completed";
    const updated = await apiFetch<ShoppingListDetail>(`shopping/${summary.id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (updated) {
      detailCache.set(updated.id, updated);
      await render();
    } else {
      toggleBtn.disabled = false;
    }
  });

  const deleteBtn = createElement("button") as HTMLButtonElement;
  deleteBtn.type = "button";
  deleteBtn.className = "shopping-delete-list-btn";
  deleteBtn.id = `delete-shopping-list-${summary.id}`;
  deleteBtn.textContent = "×";
  deleteBtn.title = "Slett liste";
  deleteBtn.addEventListener("click", async () => {
    if (!confirm(`Slette listen "${summary.name}"?`)) return;
    await apiFetch(`shopping/${summary.id}/`, { method: "DELETE" });
    detailCache.delete(summary.id);
    await render();
  });

  actions.appendChild(toggleBtn);
  actions.appendChild(deleteBtn);

  header.appendChild(name);
  header.appendChild(count);
  header.appendChild(actions);
  card.appendChild(header);

  if (expanded.has(summary.id)) {
    const detail = await loadListDetail(summary.id);
    if (detail) card.appendChild(buildListBody(detail));
  }

  return card;
}

function toggleExpanded(id: number) {
  if (expanded.has(id)) expanded.delete(id);
  else expanded.add(id);
  render();
}

function buildListBody(detail: ShoppingListDetail): HTMLElement {
  const body = createElement("div") as HTMLDivElement;
  body.className = "shopping-list-body";

  const items = createElement("div") as HTMLDivElement;
  items.className = "shopping-item-list";
  for (const item of detail.items) {
    items.appendChild(buildItemRow(detail, item));
  }
  body.appendChild(items);

  if (detail.status === "active") {
    body.appendChild(buildAddItemRow(detail));
  }

  return body;
}

function buildItemRow(list: ShoppingListDetail, item: ShoppingItem): HTMLElement {
  const row = createElement("div") as HTMLDivElement;
  row.className = "shopping-item-row";
  if (item.checked) row.classList.add("checked");

  const checkbox = createElement("input") as HTMLInputElement;
  checkbox.type = "checkbox";
  checkbox.checked = item.checked;
  checkbox.disabled = list.status !== "active";
  checkbox.addEventListener("change", async () => {
    checkbox.disabled = true;
    const updated = await apiFetch<ShoppingItem>(`shopping/${list.id}/items/${item.id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checked: checkbox.checked }),
    });
    if (updated) {
      item.checked = updated.checked;
      row.classList.toggle("checked", updated.checked);
    }
    checkbox.disabled = list.status !== "active";
  });

  const name = createElement("span") as HTMLSpanElement;
  name.className = "shopping-item-name";
  name.textContent = item.name;

  const stepper = createElement("div") as HTMLDivElement;
  stepper.className = "shopping-qty-stepper";

  const decBtn = createElement("button") as HTMLButtonElement;
  decBtn.type = "button";
  decBtn.className = "shopping-qty-btn";
  decBtn.textContent = "−";
  decBtn.disabled = list.status !== "active";

  const qtyInput = createElement("input") as HTMLInputElement;
  qtyInput.type = "number";
  qtyInput.min = "1";
  qtyInput.className = "shopping-qty-input";
  qtyInput.value = String(item.quantity);
  qtyInput.disabled = list.status !== "active";

  const incBtn = createElement("button") as HTMLButtonElement;
  incBtn.type = "button";
  incBtn.className = "shopping-qty-btn";
  incBtn.textContent = "+";
  incBtn.disabled = list.status !== "active";

  const commitQuantity = async (quantity: number) => {
    if (quantity < 1) quantity = 1;
    qtyInput.value = String(quantity);
    const updated = await apiFetch<ShoppingItem>(`shopping/${list.id}/items/${item.id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    if (updated) item.quantity = updated.quantity;
  };

  decBtn.addEventListener("click", () => commitQuantity(item.quantity - 1));
  incBtn.addEventListener("click", () => commitQuantity(item.quantity + 1));
  qtyInput.addEventListener("change", () => commitQuantity(parseInt(qtyInput.value, 10) || 1));

  stepper.appendChild(decBtn);
  stepper.appendChild(qtyInput);
  stepper.appendChild(incBtn);

  const deleteBtn = createElement("button") as HTMLButtonElement;
  deleteBtn.type = "button";
  deleteBtn.className = "shopping-item-delete";
  deleteBtn.id = `delete-shopping-item-${item.id}`;
  deleteBtn.textContent = "×";
  deleteBtn.title = "Fjern vare";
  deleteBtn.hidden = list.status !== "active";
  deleteBtn.addEventListener("click", async () => {
    await apiFetch(`shopping/${list.id}/items/${item.id}/`, { method: "DELETE" });
    detailCache.delete(list.id);
    await render();
  });

  row.appendChild(checkbox);
  row.appendChild(name);
  row.appendChild(stepper);
  row.appendChild(deleteBtn);
  return row;
}

function buildAddItemRow(list: ShoppingListDetail): HTMLElement {
  const row = createElement("div") as HTMLDivElement;
  row.className = "shopping-add-item-row";

  const nameInput = createElement("input") as HTMLInputElement;
  nameInput.type = "text";
  nameInput.placeholder = "Vare...";
  nameInput.className = "shopping-add-item-name";

  const qtyInput = createElement("input") as HTMLInputElement;
  qtyInput.type = "number";
  qtyInput.min = "1";
  qtyInput.value = "1";
  qtyInput.className = "shopping-qty-input";

  const addBtn = createElement("button") as HTMLButtonElement;
  addBtn.type = "button";
  addBtn.textContent = "Legg til";

  const submit = async () => {
    const name = nameInput.value.trim();
    if (!name) return;
    addBtn.disabled = true;
    const quantity = parseInt(qtyInput.value, 10) || 1;
    const added = await apiFetch<ShoppingItem>(`shopping/${list.id}/items/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, quantity }),
    });
    addBtn.disabled = false;
    if (added) {
      detailCache.delete(list.id);
      nameInput.value = "";
      qtyInput.value = "1";
      await render();
    }
  };

  addBtn.addEventListener("click", submit);
  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submit();
  });

  row.appendChild(nameInput);
  row.appendChild(qtyInput);
  row.appendChild(addBtn);
  return row;
}

render();
