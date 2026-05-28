import { requireAuth, authHeaders } from "./auth.js";
import { createElement } from "./utils.js";

const API_URL = "/api";

const params = new URLSearchParams(window.location.search);
const idParam = params.get("id");

if (!idParam) {
  window.location.href = "/";
}

const me = await requireAuth();
if (!me) throw new Error();

const id = parseInt(idParam!, 10);

type GameLanEntry = {
  lanId: number;
  startDate: string;
  event: string;
};

type GameProfile = {
  id: number;
  name: string;
  lans: GameLanEntry[];
};

const res = await fetch(`${API_URL}/game/${id}/`, { headers: authHeaders() });
const content = document.getElementById("content")!;

if (!res.ok) {
  const p = createElement("p") as HTMLParagraphElement;
  p.textContent = "Spill ikke funnet.";
  content.appendChild(p);
} else {
  const profile: GameProfile = await res.json();
  document.title = `SommerLAN — ${profile.name}`;
  renderProfile(profile);
}

function renderProfile(profile: GameProfile) {
  const eventLabels: Record<string, string> = {
    pre: "Classical Era",
    main: "SommerLAN",
    side: "Side-event",
  };

  const header = createElement("div") as HTMLDivElement;
  header.className = "participant-header";

  const displayName = createElement("h1") as HTMLHeadingElement;
  displayName.className = "participant-display-name";
  displayName.textContent = profile.name;
  header.appendChild(displayName);
  content.appendChild(header);

  const stats = createElement("div") as HTMLDivElement;
  stats.className = "participant-stats";

  const lanStat = createElement("div") as HTMLDivElement;
  lanStat.className = "participant-stat";
  lanStat.innerHTML = `<span class="stat-value">${profile.lans.length}</span><span class="stat-label">LAN</span>`;
  stats.appendChild(lanStat);

  const sommerCount = profile.lans.filter(l => l.event === "main").length;
  const sommerStat = createElement("div") as HTMLDivElement;
  sommerStat.className = "participant-stat";
  sommerStat.innerHTML = `<span class="stat-value">${sommerCount}</span><span class="stat-label">SommerLAN</span>`;
  stats.appendChild(sommerStat);

  content.appendChild(stats);

  if (profile.lans.length === 0) {
    const empty = createElement("p") as HTMLParagraphElement;
    empty.className = "loading-text";
    empty.textContent = "Ingen LAN registrert ennå.";
    content.appendChild(empty);
    return;
  }

  const section = createElement("section");
  section.className = "event-section";

  const h2 = createElement("h2") as HTMLHeadingElement;
  h2.innerHTML = `<span class="hash">#</span>LAN-historikk`;
  section.appendChild(h2);

  const list = createElement("div") as HTMLDivElement;
  list.className = "participant-lan-list";

  for (const lan of profile.lans) {
    const card = createElement("a") as HTMLAnchorElement;
    card.href = `lan-event.html?id=${lan.lanId}`;
    card.className = "participant-lan-card";

    const year = createElement("span") as HTMLSpanElement;
    year.className = "plan-card-year";
    year.textContent = lan.startDate.substring(0, 4);
    card.appendChild(year);

    const label = createElement("span") as HTMLSpanElement;
    label.className = "plan-card-type";
    label.textContent = eventLabels[lan.event] ?? lan.event;
    card.appendChild(label);

    list.appendChild(card);
  }

  section.appendChild(list);
  content.appendChild(section);
}
