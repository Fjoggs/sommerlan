import { requireAuth, authHeaders } from "./auth.js";
import { createElement, createStarIcon } from "./utils.js";
import type { UserProfile, UserLanEntry } from "./types.js";

const API_URL = "http://localhost:8080/api";

const params = new URLSearchParams(window.location.search);
const idParam = params.get("id");

if (!idParam) {
  window.location.href = "/";
}

const me = await requireAuth();
if (!me) throw new Error();

const id = parseInt(idParam!, 10);

const [profileRes, allLansRes] = await Promise.all([
  fetch(`${API_URL}/user/${id}/`, { headers: authHeaders() }),
  fetch(`${API_URL}/lan/`, { headers: authHeaders() }),
]);

const content = document.getElementById("content")!;

if (!profileRes.ok) {
  const p = createElement("p") as HTMLParagraphElement;
  p.textContent = "Deltaker ikke funnet.";
  content.appendChild(p);
} else {
  const profile: UserProfile = await profileRes.json();
  const allLans = allLansRes.ok ? await allLansRes.json() : [];

  document.title = `SommerLAN — ${profile.nickname || profile.name}`;

  renderProfile(profile, allLans);
}

function buildFirstEventId(allLans: { lanId: number; startDate: string; participants?: { id: number }[] }[], userId: number): number | null {
  const sorted = [...allLans].sort((a, b) => a.startDate.localeCompare(b.startDate));
  for (const lan of sorted) {
    if (lan.participants?.some((p) => p.id === userId)) return lan.lanId;
  }
  return null;
}

function renderProfile(profile: UserProfile, allLans: { lanId: number; startDate: string; participants?: { id: number }[] }[]) {
  const firstLanId = buildFirstEventId(allLans, profile.id);

  const eventLabels: Record<string, string> = {
    pre: "Classical Era",
    main: "SommerLAN",
    side: "Side-event",
  };

  // Header with avatar + name
  const header = createElement("div") as HTMLDivElement;
  header.className = "participant-header";

  const avatar = createElement("div") as HTMLDivElement;
  avatar.className = "participant-avatar";
  avatar.style.backgroundColor = profile.color;
  avatar.textContent = (profile.nickname || profile.name).charAt(0).toUpperCase();

  const nameBlock = createElement("div") as HTMLDivElement;
  nameBlock.className = "participant-name-block";

  const displayName = createElement("h1") as HTMLHeadingElement;
  displayName.className = "participant-display-name";
  displayName.textContent = profile.nickname || profile.name;

  nameBlock.appendChild(displayName);
  if (profile.nickname) {
    const realName = createElement("p") as HTMLParagraphElement;
    realName.className = "participant-real-name";
    realName.textContent = profile.name;
    nameBlock.appendChild(realName);
  }

  header.appendChild(avatar);
  header.appendChild(nameBlock);
  content.appendChild(header);

  // Stats row
  const stats = createElement("div") as HTMLDivElement;
  stats.className = "participant-stats";

  const lanCount = createElement("div") as HTMLDivElement;
  lanCount.className = "participant-stat";
  lanCount.innerHTML = `<span class="stat-value">${profile.lans.length}</span><span class="stat-label">LAN</span>`;
  stats.appendChild(lanCount);

  const sommerCount = profile.lans.filter(l => l.event === "main").length;
  const sommerStat = createElement("div") as HTMLDivElement;
  sommerStat.className = "participant-stat";
  sommerStat.innerHTML = `<span class="stat-value">${sommerCount}</span><span class="stat-label">SommerLAN</span>`;
  stats.appendChild(sommerStat);

  content.appendChild(stats);

  // Events list
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
    list.appendChild(buildLanCard(lan, firstLanId, eventLabels));
  }

  section.appendChild(list);
  content.appendChild(section);
}

function buildLanCard(lan: UserLanEntry, firstLanId: number | null, eventLabels: Record<string, string>): HTMLElement {
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

  if (lan.lanId === firstLanId) {
    const badge = createElement("span") as HTMLSpanElement;
    badge.className = "plan-card-first-badge";
    badge.appendChild(createStarIcon());
    badge.title = "Første LAN!";
    card.appendChild(badge);
  }

  return card;
}
