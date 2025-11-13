type LAN = {
  description: string;
  endDate: string;
  event: Event;
  games: Game[];
  lanId: number;
  participants: Participant[];
  startDate: string;
};

type Event = "pre" | "main" | "side";

type Participant =
  | "biten"
  | "dun"
  | "FN"
  | "gody"
  | "Jubb"
  | "nwbi"
  | "Nuppe"
  | "PekkyD"
  | "Sid"
  | "Taxi"
  | "Torp"
  | "ulfos";

type Game = {
  name: string;
};

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
  console.log("lan by id", lan);
};

const buildEntry = (lan: LAN) => {
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

export const createElement = (
  tagName: keyof HTMLElementTagNameMap,
  id?: string,
) => {
  const element = document.createElement(tagName);
  if (id) {
    element.setAttribute("id", id);
  }
  return element;
};
