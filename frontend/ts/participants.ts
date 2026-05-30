import { requireAuth, authHeaders } from "./auth.js";
import { createElement } from "./utils.js";

const API_URL = "/api";

const me = await requireAuth();
if (!me) throw new Error();

type UserStat = { id: number; name: string; nickname?: string; color: string; color2?: string; lanCount: number };

const res = await fetch(`${API_URL}/user/stats/`, { headers: authHeaders() });
const content = document.getElementById("content")!;
content.style.width = "100%";

if (!res.ok) {
  const p = createElement("p") as HTMLParagraphElement;
  p.textContent = "Kunne ikke laste deltakerstatistikk.";
  content.appendChild(p);
} else {
  const stats: UserStat[] = await res.json();
  renderStats(stats);
}

function renderStats(stats: UserStat[]) {
  const section = createElement("section");
  section.className = "event-section";

  const h2 = createElement("h2") as HTMLHeadingElement;
  h2.innerHTML = `<span class="hash">#</span>Deltakere`;
  section.appendChild(h2);

  const maxCount = stats[0]?.lanCount ?? 1;

  const list = createElement("div") as HTMLDivElement;
  list.className = "game-stat-list";

  for (const user of stats) {
    const displayName = user.nickname || user.name;

    const row = createElement("a") as HTMLAnchorElement;
    row.className = "game-stat-row participant-stat-row";
    row.href = `participant?id=${user.id}`;

    const avatar = createElement("div") as HTMLDivElement;
    avatar.className = "participant-stat-avatar";
    avatar.textContent = displayName.charAt(0).toUpperCase();
    avatar.style.background = user.color2
      ? `linear-gradient(135deg, ${user.color}, ${user.color2})`
      : user.color;

    const nameSpan = createElement("span") as HTMLSpanElement;
    nameSpan.className = "game-stat-name participant-stat-name";
    nameSpan.textContent = displayName;

    const barOuter = createElement("div") as HTMLDivElement;
    barOuter.className = "game-stat-bar-outer";
    barOuter.style.setProperty("--bar-pct", `${(user.lanCount / maxCount) * 100}%`);
    barOuter.style.setProperty("--bar-color", user.color);

    const count = createElement("span") as HTMLSpanElement;
    count.className = "game-stat-count";
    count.textContent = String(user.lanCount);

    row.appendChild(avatar);
    row.appendChild(nameSpan);
    row.appendChild(barOuter);
    row.appendChild(count);
    list.appendChild(row);
  }

  section.appendChild(list);
  content.appendChild(section);
}
