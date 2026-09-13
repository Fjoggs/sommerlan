import { requireAuth, authHeaders } from "./auth.js";
import { createElement } from "./utils.js";
import { showError } from "./errorHandler.js";
import { fetchAll } from "./crud.js";
import type { LAN, ShoppingItem, ShoppingListDetail, ShoppingListSummary } from "./types.js";

const API_URL = "/api";

const me = await requireAuth();
if (!me) throw new Error();

const content = document.getElementById("content")!;
content.style.width = "100%";

const detailCache = new Map<number, ShoppingListDetail>();
const expanded = new Set<number>();
const collapsedSections = new Set<string>(["Historikk"]);

const lans = ((await fetchAll<LAN>("lan")) ?? []).sort((a, b) => b.startDate.localeCompare(a.startDate));
const lanById = new Map(lans.map((l) => [l.lanId, l]));

function lanLabel(lan: LAN): string {
  return `${lan.isRomjulsLAN ? "RomjulsLAN" : "SommerLAN"} ${lan.startDate.substring(0, 4)}`;
}

// Mirrors frontpage.ts's isHappening/isUpcoming logic, so "current" here means the same
// thing it does everywhere else on the site.
function currentOrUpcomingLan(): LAN | undefined {
  const now = new Date();
  const happening = lans.find((l) => new Date(l.startDate) <= now && new Date(l.endDate) >= now);
  if (happening) return happening;

  const upcoming = lans
    .filter((l) => new Date(l.startDate) > now)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  if (upcoming.length > 0) return upcoming[0];

  const past = lans
    .filter((l) => new Date(l.endDate) < now)
    .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
  return past[0];
}

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
  const lists = await loadLists();

  const fragment = document.createDocumentFragment();
  fragment.appendChild(buildCreateForm());

  const active = lists.filter((l) => l.status === "active");
  const history = lists.filter((l) => l.status === "completed");

  fragment.appendChild(await buildListSection("Handlelister", active));
  fragment.appendChild(await buildHistorySection(history));

  content.replaceChildren(fragment);
}

function buildCreateForm(): HTMLElement {
  const section = createElement("section") as HTMLElement;
  section.className = "event-section shopping-create";

  const h2 = createElement("h2") as HTMLHeadingElement;
  h2.innerHTML = `<span class="hash">#</span>Ny liste`;
  section.appendChild(h2);

  const row = createElement("div") as HTMLDivElement;
  row.className = "quote-add-form shopping-new-list-row";

  const input = createElement("input") as HTMLInputElement;
  input.type = "text";
  input.className = "lan-text-input";
  input.placeholder = "Navn på liste, f.eks. \"Sommerlan 2027\"";

  const button = createElement("button") as HTMLButtonElement;
  button.type = "button";
  button.className = "quote-submit-btn";
  button.textContent = "Ny liste";

  const submit = async () => {
    const name = input.value.trim();
    if (!name) return;
    button.disabled = true;
    const lanId = currentOrUpcomingLan()?.lanId ?? null;
    const created = await apiFetch<ShoppingListDetail>("shopping/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, lanId }),
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
): Promise<HTMLElement> {
  const section = createElement("section") as HTMLElement;
  section.className = "event-section shopping-section";
  if (collapsedSections.has(title)) section.classList.add("collapsed");

  const h2 = createElement("h2") as HTMLHeadingElement;
  h2.innerHTML = `<span class="hash">#</span>${title} <span class="section-count">${lists.length}</span>`;
  h2.addEventListener("click", () => {
    if (collapsedSections.has(title)) collapsedSections.delete(title);
    else collapsedSections.add(title);
    section.classList.toggle("collapsed");
  });
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
    container.appendChild(await buildListCard(list, false));
  }
  section.appendChild(container);
  return section;
}

async function buildHistorySection(lists: ShoppingListSummary[]): Promise<HTMLElement> {
  const title = "Historikk";
  const section = createElement("section") as HTMLElement;
  section.className = "event-section shopping-section";
  if (collapsedSections.has(title)) section.classList.add("collapsed");

  const h2 = createElement("h2") as HTMLHeadingElement;
  h2.innerHTML = `<span class="hash">#</span>${title} <span class="section-count">${lists.length}</span>`;
  h2.addEventListener("click", () => {
    if (collapsedSections.has(title)) collapsedSections.delete(title);
    else collapsedSections.add(title);
    section.classList.toggle("collapsed");
  });
  section.appendChild(h2);

  if (lists.length === 0) {
    const empty = createElement("p") as HTMLParagraphElement;
    empty.className = "shopping-empty";
    empty.textContent = "Ingen fullførte lister enda.";
    section.appendChild(empty);
    return section;
  }

  const groups = new Map<number | null, ShoppingListSummary[]>();
  for (const list of lists) {
    const key = list.lanId ?? null;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(list);
  }

  const sortedKeys = [...groups.keys()].sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return (lanById.get(b)?.startDate ?? "").localeCompare(lanById.get(a)?.startDate ?? "");
  });

  for (const key of sortedKeys) {
    const group = createElement("div") as HTMLDivElement;
    group.className = "shopping-history-group";

    const groupTitle = createElement("h3") as HTMLHeadingElement;
    groupTitle.className = "shopping-history-group-title";
    const lan = key !== null ? lanById.get(key) : undefined;
    groupTitle.textContent = lan ? lanLabel(lan) : "Uten LAN";
    group.appendChild(groupTitle);

    const container = createElement("div") as HTMLDivElement;
    container.className = "shopping-list-container";
    for (const list of groups.get(key)!) {
      container.appendChild(await buildListCard(list, true));
    }
    group.appendChild(container);
    section.appendChild(group);
  }

  return section;
}

async function buildListCard(summary: ShoppingListSummary, showLan: boolean): Promise<HTMLElement> {
  const card = createElement("div") as HTMLDivElement;
  card.className = "shopping-list-card";
  if (summary.status === "completed") card.classList.add("completed");

  const header = createElement("div") as HTMLDivElement;
  header.className = "shopping-list-header";

  const name = createElement("span") as HTMLSpanElement;
  name.className = "shopping-list-name";
  name.textContent = summary.name;
  name.addEventListener("click", () => toggleExpanded(summary.id));

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

  const qtyToggleBtn = createElement("button") as HTMLButtonElement;
  qtyToggleBtn.type = "button";
  qtyToggleBtn.className = "shopping-toggle-btn";
  qtyToggleBtn.textContent = summary.hideQuantity ? "Vis antall" : "Skjul antall";
  qtyToggleBtn.title = "Mange varenavn inneholder allerede mengden, f.eks. \"24 stk cola\"";
  qtyToggleBtn.addEventListener("click", async () => {
    qtyToggleBtn.disabled = true;
    const updated = await apiFetch<ShoppingListDetail>(`shopping/${summary.id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hideQuantity: !summary.hideQuantity }),
    });
    if (updated) {
      detailCache.set(updated.id, updated);
      await render();
    } else {
      qtyToggleBtn.disabled = false;
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
  actions.appendChild(qtyToggleBtn);
  actions.appendChild(deleteBtn);

  header.appendChild(name);
  if (showLan) {
    const lan = summary.lanId ? lanById.get(summary.lanId) : undefined;
    const lanBadge = createElement("span") as HTMLSpanElement;
    lanBadge.className = "shopping-list-lan";
    lanBadge.textContent = lan ? lanLabel(lan) : "Uten LAN";
    header.appendChild(lanBadge);
  }
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

  const checkboxLabel = createElement("label") as HTMLLabelElement;
  checkboxLabel.className = "shopping-item-check";

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
  checkboxLabel.appendChild(checkbox);

  const name = createElement("span") as HTMLSpanElement;
  name.className = "shopping-item-name";
  name.textContent = item.name;

  if (list.hideQuantity) {
    const deleteBtn = createElement("button") as HTMLButtonElement;
    deleteBtn.type = "button";
    deleteBtn.className = "shopping-delete-list-btn shopping-item-delete-btn";
    deleteBtn.textContent = "×";
    deleteBtn.title = "Fjern vare";
    deleteBtn.disabled = list.status !== "active";
    deleteBtn.addEventListener("click", async () => {
      await apiFetch(`shopping/${list.id}/items/${item.id}/`, { method: "DELETE" });
      detailCache.delete(list.id);
      await render();
    });

    row.appendChild(deleteBtn);
    row.appendChild(name);
    row.appendChild(checkboxLabel);
    return row;
  }

  const stepper = createElement("div") as HTMLDivElement;
  stepper.className = "shopping-qty-stepper";

  const decBtn = createElement("button") as HTMLButtonElement;
  decBtn.type = "button";
  decBtn.className = "shopping-qty-btn";
  decBtn.textContent = "−";
  decBtn.disabled = list.status !== "active";

  const qtyInput = createElement("input") as HTMLInputElement;
  qtyInput.type = "text";
  qtyInput.inputMode = "numeric";
  qtyInput.className = "shopping-qty-input";
  qtyInput.value = String(item.quantity);
  qtyInput.disabled = list.status !== "active";

  const incBtn = createElement("button") as HTMLButtonElement;
  incBtn.type = "button";
  incBtn.className = "shopping-qty-btn";
  incBtn.textContent = "+";
  incBtn.disabled = list.status !== "active";

  const commitQuantity = async (quantity: number) => {
    if (quantity < 1) {
      await apiFetch(`shopping/${list.id}/items/${item.id}/`, { method: "DELETE" });
      detailCache.delete(list.id);
      await render();
      return;
    }
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
  qtyInput.addEventListener("change", () => {
    const parsed = parseInt(qtyInput.value, 10);
    commitQuantity(Number.isNaN(parsed) ? item.quantity : parsed);
  });

  stepper.appendChild(decBtn);
  stepper.appendChild(qtyInput);
  stepper.appendChild(incBtn);

  row.appendChild(stepper);
  row.appendChild(name);
  row.appendChild(checkboxLabel);
  return row;
}

function buildAddItemRow(list: ShoppingListDetail): HTMLElement {
  const row = createElement("div") as HTMLDivElement;
  row.className = "shopping-add-item-row";

  const nameInput = createElement("input") as HTMLInputElement;
  nameInput.type = "text";
  nameInput.placeholder = "Vare...";
  nameInput.className = "lan-text-input shopping-add-item-name";

  const qtyInput = list.hideQuantity ? null : (createElement("input") as HTMLInputElement);
  if (qtyInput) {
    qtyInput.type = "text";
    qtyInput.inputMode = "numeric";
    qtyInput.value = "1";
    qtyInput.className = "shopping-qty-input";
  }

  const addBtn = createElement("button") as HTMLButtonElement;
  addBtn.type = "button";
  addBtn.className = "quote-submit-btn";
  addBtn.textContent = "Legg til";

  const submit = async () => {
    const name = nameInput.value.trim();
    if (!name) return;
    addBtn.disabled = true;
    const quantity = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;
    const added = await apiFetch<ShoppingItem>(`shopping/${list.id}/items/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, quantity }),
    });
    addBtn.disabled = false;
    if (added) {
      detailCache.delete(list.id);
      nameInput.value = "";
      if (qtyInput) qtyInput.value = "1";
      await render();
    }
  };

  addBtn.addEventListener("click", submit);
  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submit();
  });

  if (qtyInput) row.appendChild(qtyInput);
  row.appendChild(nameInput);
  row.appendChild(addBtn);
  return row;
}

render();
