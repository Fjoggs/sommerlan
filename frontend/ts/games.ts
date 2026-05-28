import { requireAuth, authHeaders } from "./auth.js";
import { createElement } from "./utils.js";

const API_URL = "/api";

const me = await requireAuth();
if (!me) throw new Error();

type GameStat = { id: number; name: string; lanCount: number };

const res = await fetch(`${API_URL}/game/stats/`, { headers: authHeaders() });
const content = document.getElementById("content")!;
content.style.width = "100%";;

if (!res.ok) {
  const p = createElement("p") as HTMLParagraphElement;
  p.textContent = "Kunne ikke laste spillstatistikk.";
  content.appendChild(p);
} else {
  const stats: GameStat[] = await res.json();
  renderStats(stats);
}

function renderStats(stats: GameStat[]) {
  const section = createElement("section");
  section.className = "event-section";

  const h2 = createElement("h2") as HTMLHeadingElement;
  h2.innerHTML = `<span class="hash">#</span>Spill`;
  section.appendChild(h2);

  const maxCount = stats[0]?.lanCount ?? 1;

  const list = createElement("div") as HTMLDivElement;
  list.className = "game-stat-list";

  for (const game of stats) {
    const row = createElement("a") as HTMLAnchorElement;
    row.className = "game-stat-row";
    row.href = `game.html?id=${game.id}`;

    const nameSpan = createElement("span") as HTMLSpanElement;
    nameSpan.className = "game-stat-name";
    nameSpan.textContent = game.name;

    const barOuter = createElement("div") as HTMLDivElement;
    barOuter.className = "game-stat-bar-outer";
    barOuter.style.setProperty("--bar-pct", `${(game.lanCount / maxCount) * 100}%`);

    const count = createElement("span") as HTMLSpanElement;
    count.className = "game-stat-count";
    count.textContent = String(game.lanCount);

    row.appendChild(nameSpan);
    row.appendChild(barOuter);
    row.appendChild(count);
    list.appendChild(row);
  }

  section.appendChild(list);
  content.appendChild(section);
}
