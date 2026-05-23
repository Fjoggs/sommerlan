import { fetchAll } from "./crud.js";
import { requireAuth, authHeaders } from "./auth.js";
import { Award, Game, LAN, User } from "./types.js";
import { createElement, createStarIcon, buildSommerlanLogo } from "./utils.js";

let viewAsUser: User | null = null; // re-enable "view as" feature when needed

export const fetchLans = async () => {
  const lans: LAN[] | undefined = await fetchAll("lan");
  if (!lans) return;

  const firstTimerMap = buildFirstTimerMap(lans);

  const preContainer = document.getElementById("pre");
  const mainContainer = document.getElementById("main");
  const sideContainer = document.getElementById("side");

  for (const lan of lans) {
    const firstTimers = firstTimerMap.get(lan.lanId) ?? new Set<number>();
    if (lan.event === "pre") {
      preContainer?.appendChild(await buildEntry(lan, firstTimers));
    } else if (lan.event === "main") {
      mainContainer?.appendChild(await buildEntry(lan, firstTimers));
    } else if (lan.event === "side") {
      sideContainer?.appendChild(await buildEntry(lan, firstTimers));
    }
  }
};

function buildFirstTimerMap(lans: LAN[]): Map<number, Set<number>> {
  const sorted = [...lans].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const seen = new Set<number>();
  const map = new Map<number, Set<number>>();
  for (const lan of sorted) {
    const firsts = new Set<number>();
    for (const p of lan.participants ?? []) {
      if (!seen.has(p.id)) {
        firsts.add(p.id);
        seen.add(p.id);
      }
    }
    map.set(lan.lanId, firsts);
  }
  return map;
}

const fetchLanById = async (id: number) => {
  const res = await fetch(`http://localhost:8080/api/lan/${id}/`);
  const lan: LAN = await res.json();
  console.log("lan", lan);
};

const buildEntry = async (lan: LAN, firstTimers: Set<number> = new Set()) => {
  const id = `id-${lan.lanId}`;
  const container = createElement("form", id);
  container.className = lan.lanId === 30 ? "timeline-event lan-30-bg" : "timeline-event";
  if (lan.lanId === 30 && me) {
    const c1 = (viewAsUser as User | null)?.color ?? me.color;
    const c2 = (viewAsUser as User | null)?.color2 ?? (viewAsUser as User | null)?.color ?? me.color2 ?? me.color;
    container.style.setProperty("--event-c1", c1);
    container.style.setProperty("--event-c2", c2);
    const cornerLogo = buildSommerlanLogo(c1, c2);
    cornerLogo.className = "sommerlan-logo sommerlan-logo--corner";
    // point logo vars at the container's event vars so live updates cascade
    cornerLogo.style.setProperty("--logo-c1", "var(--event-c1)");
    cornerLogo.style.setProperty("--logo-c2", "var(--event-c2)");
    container.appendChild(cornerLogo);
  }

  const hContainer = createElement("div");
  hContainer.className = "timeline-event-header";

  const headerLeft = createElement("div") as HTMLDivElement;
  headerLeft.className = "header-left";

  const header = createElement("h3");
  const headerLink = document.createElement("a") as HTMLAnchorElement;
  headerLink.href = `lan-event.html?id=${lan.lanId}`;
  headerLink.textContent = lan.startDate.substring(0, 4);
  headerLink.className = "lan-event-link";
  header.appendChild(headerLink);
  headerLeft.appendChild(header);

  const yearInput = createElement("input") as HTMLInputElement;
  yearInput.type = "number";
  yearInput.className = "lan-year-input";
  yearInput.style.display = "none";
  yearInput.value = lan.startDate.substring(0, 4);
  headerLeft.appendChild(yearInput);

  const fromToRow = createElement("div") as HTMLDivElement;
  fromToRow.className = "from-to-row";
  fromToRow.style.display = "none";
  const fromInput = createElement("input") as HTMLInputElement;
  fromInput.type = "text";
  fromInput.className = "lan-text-input";
  fromInput.placeholder = "Fra (valgfri)";
  fromInput.value = lan.fromDisplay ?? "";
  const separator = createElement("span");
  separator.textContent = "–";
  separator.className = "date-separator";
  const toInput = createElement("input") as HTMLInputElement;
  toInput.type = "text";
  toInput.className = "lan-text-input";
  toInput.placeholder = "Til (valgfri)";
  toInput.value = lan.toDisplay ?? "";
  fromToRow.appendChild(fromInput);
  fromToRow.appendChild(separator);
  fromToRow.appendChild(toInput);

  const buildDatesText = (from: string, to: string) => {
    if (from && to && from === to) return `( ${from} )`;
    if (from && to) return `${from} – ${to}`;
    if (from) return from;
    if (to) return to;
    return "";
  };
  const datesDisplay = createElement("p") as HTMLParagraphElement;
  datesDisplay.className = "dates-display";
  datesDisplay.textContent = buildDatesText(lan.fromDisplay ?? "", lan.toDisplay ?? "");
  if (!datesDisplay.textContent) datesDisplay.style.display = "none";
  headerLeft.appendChild(datesDisplay);

  hContainer.appendChild(headerLeft);

  const editButton = createElement("button", `edit-button-${lan.lanId}`) as HTMLButtonElement;
  const editActionsRow = createElement("div") as HTMLDivElement;
  editActionsRow.className = "edit-actions";
  editActionsRow.style.display = "none";

  const deleteButton = createElement("button") as HTMLButtonElement;
  deleteButton.type = "button";
  deleteButton.className = "delete-btn";
  deleteButton.textContent = "Slett";

  const saveButton = createElement("button") as HTMLButtonElement;
  saveButton.type = "button";
  saveButton.className = "save-btn";
  saveButton.textContent = "Lagre";

  const fieldset = createElement("fieldset", `fieldset-${lan.lanId}`) as HTMLFieldSetElement;
  fieldset.setAttribute("disabled", "true");
  const pillContainer = createElement("div") as HTMLDivElement;
  const gamePillContainer = createElement("div") as HTMLDivElement;
  const awardPillContainer = createElement("div") as HTMLDivElement;

  const descriptionDisplay = createElement("p");
  descriptionDisplay.textContent = lan.description;

  const descriptionInput = createElement("input") as HTMLInputElement;
  descriptionInput.className = "lan-text-input";
  descriptionInput.style.display = "none";
  descriptionInput.type = "text";
  descriptionInput.name = "description";
  descriptionInput.value = lan.description;
  descriptionInput.placeholder = "Beskrivelse";

  const eventTypeGroup = createElement("div") as HTMLDivElement;
  eventTypeGroup.className = "radio-group";
  eventTypeGroup.style.display = "none";
  const eventTypes = [
    { value: "pre", label: "Classical era" },
    { value: "main", label: "SommerLAN" },
    { value: "side", label: "Side-event" },
  ] as const;
  for (const type of eventTypes) {
    const label = createElement("label") as HTMLLabelElement;
    const radio = createElement("input") as HTMLInputElement;
    radio.type = "radio";
    radio.name = `event-${lan.lanId}`;
    radio.value = type.value;
    radio.checked = lan.event === type.value;
    label.appendChild(radio);
    label.append(type.label);
    eventTypeGroup.appendChild(label);
  }

  function closeEdit() {
    document.removeEventListener("mousedown", outsideClickHandler);
    document.removeEventListener("keydown", escHandler);
    container.className = "timeline-event";
    fieldset.setAttribute("disabled", "true");
    editActionsRow.style.display = "none";
    editButton.style.display = "";
    editButton.addEventListener("click", handleEdit);
    header.style.display = "";
    yearInput.style.display = "none";
    fromToRow.style.display = "none";
    descriptionDisplay.style.display = "";
    descriptionInput.style.display = "none";
    eventTypeGroup.style.display = "none";
    attendBtn.style.display = "";
    if (!datesDisplay.textContent) datesDisplay.style.display = "none";
    for (const element of Array.from(pillContainer.children)) {
      const color = element.getAttribute("data-color");
      if (color) {
        element.setAttribute("style", `background-color: color-mix(in srgb, ${color} 20%, var(--bg)); color: ${color}; font-weight: 700; cursor: pointer`);
      } else {
        element.setAttribute("style", "display: none");
      }
    }
    for (const input of Array.from(pillContainer.querySelectorAll<HTMLInputElement>("input"))) {
      input.disabled = true;
    }
    const anyGameChecked = Array.from(gamePillContainer.querySelectorAll<HTMLInputElement>("input")).some(i => i.checked);
    gHeader.style.display = anyGameChecked ? "" : "none";
    for (const element of Array.from(gamePillContainer.children)) {
      const input = element.querySelector<HTMLInputElement>("input");
      if (input?.checked) {
        element.removeAttribute("style");
      } else {
        element.setAttribute("style", "display: none");
      }
    }
    newGameInput.style.display = "none";
    newGameInput.value = "";
    const anyAwardChecked = Array.from(awardPillContainer.querySelectorAll<HTMLInputElement>("input")).some(i => i.checked);
    awardHeader.style.display = anyAwardChecked ? "" : "none";
    for (const element of Array.from(awardPillContainer.children)) {
      const input = element.querySelector<HTMLInputElement>("input");
      if (input?.checked) {
        element.removeAttribute("style");
      } else {
        element.setAttribute("style", "display: none");
      }
    }
    newAwardInput.style.display = "none";
    newAwardInput.value = "";
  }

  function outsideClickHandler(e: MouseEvent) {
    if (!container.contains(e.target as Node)) {
      closeEdit();
    }
  }

  function escHandler(e: KeyboardEvent) {
    if (e.key === "Escape") closeEdit();
  }

  function handleEdit(event: Event) {
    event.preventDefault();
    container.className = "editing";
    fieldset.removeAttribute("disabled");
    editButton.removeEventListener("click", handleEdit);
    editButton.style.display = "none";
    editActionsRow.style.display = "";
    header.style.display = "none";
    yearInput.style.display = "block";
    datesDisplay.style.display = "none";
    fromToRow.style.display = "flex";
    descriptionDisplay.style.display = "none";
    descriptionInput.style.display = "block";
    eventTypeGroup.style.display = "flex";
    attendBtn.style.display = "none";
    for (const element of Array.from(pillContainer.children)) {
      element.removeAttribute("style");
    }
    for (const input of Array.from(pillContainer.querySelectorAll<HTMLInputElement>("input"))) {
      input.disabled = false;
    }
    gHeader.style.display = "";
    for (const element of Array.from(gamePillContainer.children)) {
      element.removeAttribute("style");
    }
    newGameInput.style.display = "";
    awardHeader.style.display = "";
    for (const element of Array.from(awardPillContainer.children)) {
      element.removeAttribute("style");
    }
    newAwardInput.style.display = "";
    document.addEventListener("mousedown", outsideClickHandler);
    document.addEventListener("keydown", escHandler);
    container.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function handleFinish(event: Event) {
    event.preventDefault();

    const formData = new FormData();
    formData.append("lanId", lan.lanId.toString());
    formData.append("description", descriptionInput.value);
    formData.append("startDate", `${yearInput.value}-01-01`);
    formData.append("endDate", `${yearInput.value}-12-31`);
    formData.append("fromDisplay", fromInput.value);
    formData.append("toDisplay", toInput.value);
    const checkedRadio = eventTypeGroup.querySelector<HTMLInputElement>("input:checked");
    formData.append("event", checkedRadio?.value ?? lan.event);
    for (const input of Array.from(gamePillContainer.querySelectorAll<HTMLInputElement>("input:checked"))) {
      formData.append("games", input.value);
    }
    for (const input of Array.from(pillContainer.querySelectorAll<HTMLInputElement>("input:checked"))) {
      formData.append("participants", input.value);
    }
    for (const input of Array.from(awardPillContainer.querySelectorAll<HTMLInputElement>("input:checked"))) {
      formData.append("awards", input.value);
    }

    const res = await fetch("http://localhost:8080/api/lan/", {
      method: "PATCH",
      headers: authHeaders(),
      body: formData,
    });

    if (res.ok) {
      const updated: LAN = await res.json();
      headerLink.textContent = yearInput.value;
      descriptionDisplay.textContent = descriptionInput.value;
      const newDatesText = buildDatesText(fromInput.value, toInput.value);
      datesDisplay.textContent = newDatesText;
      datesDisplay.style.display = newDatesText ? "" : "none";
      for (const element of Array.from(pillContainer.children)) {
        const input = element.querySelector<HTMLInputElement>("input");
        if (!input) continue;
        const userId = parseInt(input.value);
        const participant = updated.participants?.find((p) => p.id === userId);
        if (participant) {
          element.setAttribute("data-color", participant.color);
        } else {
          element.removeAttribute("data-color");
        }
      }
    }

    closeEdit();
  }

  editButton.textContent = "✎";
  editButton.className = "edit-button";
  editButton.setAttribute("type", "button");
  if (me?.role === "admin") {
    editButton.addEventListener("click", handleEdit);
  } else {
    editButton.style.display = "none";
  }
  hContainer.appendChild(editButton);
  container.appendChild(hContainer);

  container.appendChild(fromToRow);
  container.appendChild(descriptionDisplay);
  container.appendChild(descriptionInput);
  container.appendChild(eventTypeGroup);

  const participants = createElement("div");
  participants.className = "pill-container";
  const pHeader = createElement("h4");
  pHeader.className = "deltakere-header";
  pHeader.textContent = "Deltakere";
  participants.appendChild(pHeader);
  pillContainer.className = "pill-list";
  await renderAllUsers(pillContainer, lan.participants);
  for (const userId of firstTimers) {
    const input = pillContainer.querySelector<HTMLInputElement>(`input[value="${userId}"]`);
    const label = input?.closest<HTMLLabelElement>("label");
    if (label) {
      const badge = createElement("span") as HTMLSpanElement;
      badge.className = "first-event-badge";
      badge.appendChild(createStarIcon());
      badge.title = "Første LAN!";
      const checkboxEl = label.querySelector("input");
      label.insertBefore(badge, checkboxEl);
    }
  }
  for (const input of Array.from(pillContainer.querySelectorAll<HTMLInputElement>("input"))) {
    input.disabled = true;
  }

  for (const label of Array.from(pillContainer.querySelectorAll<HTMLLabelElement>("label[data-user-id]"))) {
    label.addEventListener("click", (e: Event) => {
      if (container.classList.contains("editing")) return;
      e.preventDefault();
      window.location.href = `participant.html?id=${label.dataset.userId}`;
    });
  }

  const pillRow = createElement("div");
  pillRow.className = "pill-row";
  pillRow.appendChild(pillContainer);

  const isAttending = me != null && lan.participants?.some((p) => p.id === me.id);
  const attendBtn = createElement("button") as HTMLButtonElement;
  attendBtn.setAttribute("type", "button");
  attendBtn.className = isAttending ? "attend-btn attending" : "attend-btn";
  attendBtn.textContent = isAttending ? `- ${me!.nickname || me!.name}` : `+ ${me!.nickname || me!.name}`;
  attendBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const attending = attendBtn.classList.contains("attending");
    const method = attending ? "DELETE" : "POST";
    const res = await fetch(`http://localhost:8080/api/lan/${lan.lanId}/attend/`, {
      method,
      headers: authHeaders(),
    });
    if (res.ok) {
      const pill = pillContainer.querySelector<HTMLElement>(`[id="${me!.id}"]`)?.parentElement;
      if (attending) {
        attendBtn.classList.remove("attending");
        attendBtn.textContent = `+ ${me!.nickname || me!.name}`;
        if (pill) {
          pill.removeAttribute("data-color");
          pill.setAttribute("style", "display: none");
        }
      } else {
        attendBtn.classList.add("attending");
        attendBtn.textContent = `- ${me!.nickname || me!.name}`;
        if (pill) {
          pill.setAttribute("data-color", me!.color);
          pill.setAttribute("style", `background-color: color-mix(in srgb, ${me!.color} 20%, var(--bg)); color: ${me!.color}; font-weight: 700`);
        }
      }
    }
  });
  pillRow.appendChild(attendBtn);
  participants.appendChild(pillRow);
  container.appendChild(participants);

  container.appendChild(fieldset);

  const games = createElement("div");
  games.className = "pill-container";
  const gHeader = createElement("h4");
  gHeader.textContent = "Spill";
  if (!lan.games || lan.games.length === 0) gHeader.style.display = "none";
  games.appendChild(gHeader);
  gamePillContainer.className = "pill-list";
  await renderAllGames(gamePillContainer, lan.games);
  games.appendChild(gamePillContainer);

  const newGameInput = createElement("input") as HTMLInputElement;
  newGameInput.type = "text";
  newGameInput.className = "lan-text-input";
  newGameInput.placeholder = "Nytt spill...";
  newGameInput.style.display = "none";
  newGameInput.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const name = newGameInput.value.trim();
    if (!name) return;
    const fd = new FormData();
    fd.append("gameName", name);
    const res = await fetch("http://localhost:8080/api/game/", {
      method: "POST",
      headers: authHeaders(),
      body: fd,
    });
    if (!res.ok) return;
    const game: Game = await res.json();
    const row = createCheckbox(game, "games", "var(--bg-dark)", true);
    gamePillContainer.appendChild(row);
    gHeader.style.display = "";
    newGameInput.value = "";
  });
  games.appendChild(newGameInput);

  fieldset.appendChild(games);

  const awardsSection = createElement("div");
  awardsSection.className = "pill-container";
  const awardHeader = createElement("h4");
  awardHeader.textContent = "Kåringer";
  if (!lan.awards || lan.awards.length === 0) awardHeader.style.display = "none";
  awardsSection.appendChild(awardHeader);
  awardPillContainer.className = "pill-list";
  await renderAllAwards(awardPillContainer, lan.awards);
  awardsSection.appendChild(awardPillContainer);

  const newAwardInput = createElement("input") as HTMLInputElement;
  newAwardInput.type = "text";
  newAwardInput.className = "lan-text-input";
  newAwardInput.placeholder = "Ny kåring...";
  newAwardInput.style.display = "none";
  newAwardInput.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const name = newAwardInput.value.trim();
    if (!name) return;
    const fd = new FormData();
    fd.append("awardName", name);
    const res = await fetch("http://localhost:8080/api/award/", {
      method: "POST",
      headers: authHeaders(),
      body: fd,
    });
    if (!res.ok) return;
    const award: Award = await res.json();
    const row = createCheckbox(award, "awards", "var(--bg-dark)", true);
    awardPillContainer.appendChild(row);
    awardHeader.style.display = "";
    newAwardInput.value = "";
  });
  awardsSection.appendChild(newAwardInput);
  fieldset.appendChild(awardsSection);

  saveButton.addEventListener("click", handleFinish);

  deleteButton.addEventListener("click", async () => {
    const confirmed = window.confirm(`Slett LAN ${lan.startDate.substring(0, 4)}? Dette kan ikke angres.`);
    if (!confirmed) return;
    const res = await fetch(`http://localhost:8080/api/lan/${lan.lanId}/`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (res.ok) {
      container.remove();
    }
  });

  editActionsRow.appendChild(deleteButton);
  editActionsRow.appendChild(saveButton);
  container.appendChild(editActionsRow);

  container.addEventListener("click", (e) => {
    if (container.classList.contains("editing")) return;
    if ((e.target as HTMLElement).closest("a, button, input, label")) return;
    window.location.href = `lan-event.html?id=${lan.lanId}`;
  });

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
        const row = createCheckbox(user, "participants", "var(--bg-light)", true);
        row.setAttribute("data-color", participant.color);
        row.dataset.userId = String(user.id);
        row.style.backgroundColor = `color-mix(in srgb, ${participant.color} 20%, var(--bg))`;
        row.style.color = participant.color;
        row.style.fontWeight = "700";
        row.style.cursor = "pointer";
        container.appendChild(row);
      } else {
        const row = createCheckbox(user, "participants");
        row.setAttribute("style", "display: none");
        container.appendChild(row);
      }
    }
  });
};

const renderAllGames = async (
  container: HTMLElement,
  lanGames?: Game[],
) => {
  const games: Game[] | undefined = await fetchAll("game");
  if (!games) return;

  games.forEach((game) => {
    const isOnLan = lanGames?.some((g) => g.id === game.id) ?? false;
    const row = createCheckbox(game, "games", "var(--bg-dark)", isOnLan);
    if (!isOnLan) row.setAttribute("style", "display: none");
    container.appendChild(row);
  });
};

const renderAllAwards = async (
  container: HTMLElement,
  lanAwards?: Award[],
) => {
  const awards: Award[] | undefined = await fetchAll("award");
  if (!awards) return;

  awards.forEach((award) => {
    const isOnLan = lanAwards?.some((a) => a.id === award.id) ?? false;
    const row = createCheckbox(award, "awards", "var(--bg-dark)", isOnLan);
    if (!isOnLan) row.setAttribute("style", "display: none");
    container.appendChild(row);
  });
};

const createCheckbox = (
  data: Game | Award | User,
  name: string,
  color: string = "var(--bg-light)",
  checked: boolean = false,
) => {
  const label = createElement("label");
  label.textContent = ('nickname' in data && data.nickname) ? data.nickname : data.name;
  const checkbox = createElement("input", data.id.toString()) as HTMLInputElement;
  checkbox.setAttribute("type", "checkbox");
  checkbox.setAttribute("name", name);
  checkbox.setAttribute("value", data.id.toString());
  checkbox.checked = checked;
  label.setAttribute("style", `background-color: ${color}`);
  label.appendChild(checkbox);
  return label;
};

const buildNewEntry = async (): Promise<void> => {
  const overlay = createElement("div");
  overlay.className = "new-lan-overlay";

  const modal = createElement("div");
  modal.className = "new-lan-modal";
  overlay.appendChild(modal);

  const close = () => {
    overlay.remove();
    document.body.style.overflow = "";
  };
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  document.body.style.overflow = "hidden";
  document.body.appendChild(overlay);

  const container = createElement("form");
  container.className = "editing";
  modal.appendChild(container);

  const hContainer = createElement("div");
  hContainer.className = "timeline-event-header";

  const headerLeft = createElement("div") as HTMLDivElement;
  headerLeft.className = "header-left";

  const yearInput = createElement("input") as HTMLInputElement;
  yearInput.type = "number";
  yearInput.className = "lan-year-input";
  yearInput.value = new Date().getFullYear().toString();
  headerLeft.appendChild(yearInput);

  const fromToRow = createElement("div") as HTMLDivElement;
  fromToRow.className = "from-to-row";
  fromToRow.style.display = "flex";
  const fromInput = createElement("input") as HTMLInputElement;
  fromInput.type = "text";
  fromInput.className = "lan-text-input";
  fromInput.placeholder = "Fra (valgfri)";
  const separator = createElement("span");
  separator.textContent = "–";
  separator.className = "date-separator";
  const toInput = createElement("input") as HTMLInputElement;
  toInput.type = "text";
  toInput.className = "lan-text-input";
  toInput.placeholder = "Til (valgfri)";
  fromToRow.appendChild(fromInput);
  fromToRow.appendChild(separator);
  fromToRow.appendChild(toInput);

  hContainer.appendChild(headerLeft);

  container.appendChild(hContainer);

  container.appendChild(fromToRow);

  const descriptionInput = createElement("input") as HTMLInputElement;
  descriptionInput.className = "lan-text-input";
  descriptionInput.type = "text";
  descriptionInput.name = "description";
  descriptionInput.placeholder = "Beskrivelse";
  container.appendChild(descriptionInput);

  const eventTypeGroup = createElement("div") as HTMLDivElement;
  eventTypeGroup.className = "radio-group";
  eventTypeGroup.style.display = "flex";
  const eventTypes = [
    { value: "pre", label: "Classical era" },
    { value: "main", label: "SommerLAN" },
    { value: "side", label: "Side-event" },
  ] as const;
  for (const type of eventTypes) {
    const label = createElement("label") as HTMLLabelElement;
    const radio = createElement("input") as HTMLInputElement;
    radio.type = "radio";
    radio.name = "new-event-type";
    radio.value = type.value;
    radio.checked = type.value === "main";
    label.appendChild(radio);
    label.append(type.label);
    eventTypeGroup.appendChild(label);
  }
  container.appendChild(eventTypeGroup);

  const participants = createElement("div");
  participants.className = "pill-container";
  const pHeader = createElement("h4");
  pHeader.textContent = "Deltakere";
  participants.appendChild(pHeader);
  const pillContainer = createElement("div") as HTMLDivElement;
  pillContainer.className = "pill-list";
  await renderAllUsers(pillContainer, []);
  for (const el of Array.from(pillContainer.children)) el.removeAttribute("style");
  const pillRow = createElement("div");
  pillRow.className = "pill-row";
  pillRow.appendChild(pillContainer);
  participants.appendChild(pillRow);
  container.appendChild(participants);

  const fieldset = createElement("fieldset") as HTMLFieldSetElement;
  const gamePillContainer = createElement("div") as HTMLDivElement;
  gamePillContainer.className = "pill-list";
  await renderAllGames(gamePillContainer, []);
  for (const el of Array.from(gamePillContainer.children)) el.removeAttribute("style");

  const gHeader = createElement("h4");
  gHeader.textContent = "Spill";
  const games = createElement("div");
  games.className = "pill-container";
  games.appendChild(gHeader);
  games.appendChild(gamePillContainer);

  const newGameInput = createElement("input") as HTMLInputElement;
  newGameInput.type = "text";
  newGameInput.className = "lan-text-input";
  newGameInput.placeholder = "Nytt spill...";
  newGameInput.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const name = newGameInput.value.trim();
    if (!name) return;
    const fd = new FormData();
    fd.append("gameName", name);
    const res = await fetch("http://localhost:8080/api/game/", {
      method: "POST",
      headers: authHeaders(),
      body: fd,
    });
    if (!res.ok) return;
    const game: Game = await res.json();
    const row = createCheckbox(game, "games", "var(--bg-dark)", true);
    gamePillContainer.appendChild(row);
    newGameInput.value = "";
  });
  games.appendChild(newGameInput);
  fieldset.appendChild(games);

  const awardPillContainer = createElement("div") as HTMLDivElement;
  awardPillContainer.className = "pill-list";
  await renderAllAwards(awardPillContainer, []);
  for (const el of Array.from(awardPillContainer.children)) el.removeAttribute("style");

  const awardHeaderNew = createElement("h4");
  awardHeaderNew.textContent = "Kåringer";
  const awardsNew = createElement("div");
  awardsNew.className = "pill-container";
  awardsNew.appendChild(awardHeaderNew);
  awardsNew.appendChild(awardPillContainer);

  const newAwardInputNew = createElement("input") as HTMLInputElement;
  newAwardInputNew.type = "text";
  newAwardInputNew.className = "lan-text-input";
  newAwardInputNew.placeholder = "Ny kåring...";
  newAwardInputNew.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const name = newAwardInputNew.value.trim();
    if (!name) return;
    const fd = new FormData();
    fd.append("awardName", name);
    const res = await fetch("http://localhost:8080/api/award/", {
      method: "POST",
      headers: authHeaders(),
      body: fd,
    });
    if (!res.ok) return;
    const award: Award = await res.json();
    const row = createCheckbox(award, "awards", "var(--bg-dark)", true);
    awardPillContainer.appendChild(row);
    newAwardInputNew.value = "";
  });
  awardsNew.appendChild(newAwardInputNew);
  fieldset.appendChild(awardsNew);

  container.appendChild(fieldset);

  const cancelButton = createElement("button") as HTMLButtonElement;
  cancelButton.type = "button";
  cancelButton.className = "delete-btn";
  cancelButton.textContent = "Avbryt";

  const saveButton = createElement("button") as HTMLButtonElement;
  saveButton.type = "button";
  saveButton.className = "save-btn";
  saveButton.textContent = "Lagre";

  const actionsRow = createElement("div") as HTMLDivElement;
  actionsRow.className = "edit-actions";
  actionsRow.appendChild(cancelButton);
  actionsRow.appendChild(saveButton);
  container.appendChild(actionsRow);

  cancelButton.addEventListener("click", (e) => {
    e.preventDefault();
    close();
  });

  saveButton.addEventListener("click", async (e) => {
    e.preventDefault();
    const checkedRadio = eventTypeGroup.querySelector<HTMLInputElement>("input:checked");
    const eventType = checkedRadio?.value ?? "main";

    const formData = new FormData();
    formData.append("description", descriptionInput.value);
    formData.append("startDate", `${yearInput.value}-01-01`);
    formData.append("endDate", `${yearInput.value}-12-31`);
    formData.append("fromDisplay", fromInput.value);
    formData.append("toDisplay", toInput.value);
    formData.append("event", eventType);
    for (const input of Array.from(gamePillContainer.querySelectorAll<HTMLInputElement>("input:checked"))) {
      formData.append("games", input.value);
    }
    for (const input of Array.from(pillContainer.querySelectorAll<HTMLInputElement>("input:checked"))) {
      formData.append("participants", input.value);
    }
    for (const input of Array.from(awardPillContainer.querySelectorAll<HTMLInputElement>("input:checked"))) {
      formData.append("awards", input.value);
    }

    const res = await fetch("http://localhost:8080/api/lan/", {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    });
    if (!res.ok) return;
    const newLan: LAN = await res.json();
    close();

    const targetId = newLan.event === "pre" ? "pre" : newLan.event === "main" ? "main" : "side";
    const targetContainer = document.getElementById(targetId);
    if (targetContainer) {
      const entry = await buildEntry(newLan);
      const newYear = newLan.startDate.substring(0, 4);
      const after = Array.from(targetContainer.children).find((el) => {
        const year = el.querySelector<HTMLAnchorElement>(".lan-event-link")?.textContent ?? "";
        return year > newYear;
      });
      targetContainer.insertBefore(entry, after ?? null);
    }
  });
};

const me = await requireAuth();
if (me) {
  await fetchLans();

  const addBtn = document.querySelector<HTMLButtonElement>(".add-lan");
  if (addBtn) {
    if (me.role !== "admin") {
      addBtn.style.display = "none";
    } else {
      addBtn.addEventListener("click", async () => {
        if (document.querySelector(".new-lan-overlay")) return;
        await buildNewEntry();
      });
    }
  }

}
