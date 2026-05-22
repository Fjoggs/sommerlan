import { fetchById } from "./crud.js";
import { requireAuth, authHeaders } from "./auth.js";
import { LAN } from "./types.js";
import { createElement } from "./utils.js";

type LanImage = {
  id: number;
  lanId: number;
  filename: string;
  uploadedBy?: number;
  uploadedAt: string;
};

type TweetEntry = { date: string; text: string; images?: string[] };

const params = new URLSearchParams(window.location.search);
const idParam = params.get("id");

if (!idParam) {
  window.location.href = "/";
}

const me = await requireAuth();
if (!me) throw new Error();

const id = parseInt(idParam!, 10);
const lan = await fetchById<LAN>("lan", id);

const content = document.getElementById("content")!;

if (!lan) {
  const p = createElement("p");
  p.textContent = "LAN ikke funnet.";
  content.appendChild(p);
} else {
  const year = lan.startDate.substring(0, 4);

  const [tweetRes, imageRes] = await Promise.all([
    fetch(`/data/tweets/${year}.json`),
    fetch(`http://localhost:8080/api/lan/${lan.lanId}/images/`, { headers: authHeaders() }),
  ]);

  const tweets: TweetEntry[] = tweetRes.ok ? await tweetRes.json() : [];
  const lanImages: LanImage[] = imageRes.ok ? await imageRes.json() : [];

  // filename → tweet (for image cards to look up their tweet)
  const imageToTweet = new Map<string, TweetEntry>();
  for (const t of tweets) {
    for (const img of t.images ?? []) {
      imageToTweet.set(img, t);
    }
  }

  // set of filenames currently on this LAN (for tweet cards to check)
  const lanImageFilenames = new Set(lanImages.map((i) => i.filename));

  renderLan(lan, tweets, lanImages, imageToTweet, lanImageFilenames);
}

function renderLan(
  lan: LAN,
  tweets: TweetEntry[],
  lanImages: LanImage[],
  imageToTweet: Map<string, TweetEntry>,
  lanImageFilenames: Set<string>,
) {
  const year = lan.startDate.substring(0, 4);
  const eventLabels: Record<string, string> = {
    pre: "Classical Era",
    main: "SommerLAN",
    side: "Side-event",
  };

  const title = createElement("h1") as HTMLHeadingElement;
  const hash = createElement("span");
  hash.className = "hash";
  hash.textContent = "#";
  title.appendChild(hash);
  title.append(`${eventLabels[lan.event] ?? lan.event} ${year}`);
  content.appendChild(title);

  if (lan.fromDisplay || lan.toDisplay) {
    const dates = createElement("p") as HTMLParagraphElement;
    dates.className = "event-dates";
    const from = lan.fromDisplay ?? "";
    const to = lan.toDisplay ?? "";
    if (from && to && from === to) dates.textContent = from;
    else if (from && to) dates.textContent = `${from} – ${to}`;
    else dates.textContent = from || to;
    content.appendChild(dates);
  }

  if (lan.description) {
    const desc = createElement("p") as HTMLParagraphElement;
    desc.className = "event-description";
    desc.textContent = lan.description;
    content.appendChild(desc);
  }

  if (lan.participants && lan.participants.length > 0) {
    const section = createElement("section");
    section.className = "event-section";
    const h2 = createElement("h2");
    h2.innerHTML = `<span class="hash">#</span>Deltakere`;
    section.appendChild(h2);
    const pillList = createElement("div");
    pillList.className = "pill-list event-pills";
    for (const p of lan.participants) {
      const pill = createElement("span");
      pill.className = "event-pill";
      pill.textContent = p.nickname || p.name;
      (pill as HTMLSpanElement).style.backgroundColor = p.color;
      pillList.appendChild(pill);
    }
    section.appendChild(pillList);
    content.appendChild(section);
  }

  if (lan.games && lan.games.length > 0) {
    const section = createElement("section");
    section.className = "event-section";
    const h2 = createElement("h2");
    h2.innerHTML = `<span class="hash">#</span>Spill`;
    section.appendChild(h2);
    const pillList = createElement("div");
    pillList.className = "pill-list event-pills";
    for (const game of lan.games) {
      const pill = createElement("span");
      pill.className = "event-pill game-pill";
      pill.textContent = game.name;
      pillList.appendChild(pill);
    }
    section.appendChild(pillList);
    content.appendChild(section);
  }

  renderImageSection(lan.lanId, lanImages, imageToTweet, lanImageFilenames);

  if (tweets.length) {
    renderTweetFeed(tweets, lanImageFilenames);
  }
}

function renderImageSection(
  lanId: number,
  lanImages: LanImage[],
  imageToTweet: Map<string, TweetEntry>,
  lanImageFilenames: Set<string>,
) {
  const section = createElement("section");
  section.className = "event-section";

  const header = createElement("div");
  header.className = "event-section-header";
  const h2 = createElement("h2");
  h2.innerHTML = `<span class="hash">#</span>Bilder`;
  header.appendChild(h2);

  const fileInput = createElement("input") as HTMLInputElement;
  fileInput.type = "file";
  fileInput.accept = "image/jpeg,image/png,image/gif,image/webp";
  fileInput.style.display = "none";

  const uploadBtn = createElement("button") as HTMLButtonElement;
  uploadBtn.type = "button";
  uploadBtn.className = "upload-btn";
  uploadBtn.textContent = "+ Last opp";
  uploadBtn.addEventListener("click", () => fileInput.click());
  header.appendChild(uploadBtn);
  section.appendChild(header);

  const grid = createElement("div");
  grid.className = "image-grid";

  for (const img of lanImages) {
    grid.appendChild(buildImageCard(img, lanId, grid, imageToTweet));
  }
  section.appendChild(grid);

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    uploadBtn.textContent = "Laster...";
    uploadBtn.disabled = true;
    const fd = new FormData();
    fd.append("image", file);
    const uploadRes = await fetch(`http://localhost:8080/api/lan/${lanId}/images/`, {
      method: "POST",
      headers: authHeaders(),
      body: fd,
    });
    uploadBtn.textContent = "+ Last opp";
    uploadBtn.disabled = false;
    fileInput.value = "";
    if (uploadRes.ok) {
      const img: LanImage = await uploadRes.json();
      lanImageFilenames.add(img.filename);
      grid.appendChild(buildImageCard(img, lanId, grid, imageToTweet));
    }
  });

  section.appendChild(fileInput);
  content.appendChild(section);
}

function openLightbox(src: string, tweet: TweetEntry | undefined) {
  const overlay = createElement("div");
  overlay.className = "lightbox-overlay";

  const inner = createElement("div");
  inner.className = "lightbox-inner";

  const imgAnchor = createElement("a") as HTMLAnchorElement;
  imgAnchor.href = src;
  imgAnchor.target = "_blank";
  imgAnchor.rel = "noopener";
  imgAnchor.style.display = "contents";

  const imgEl = createElement("img") as HTMLImageElement;
  imgEl.src = src;
  imgEl.className = "lightbox-img";
  imgAnchor.appendChild(imgEl);
  inner.appendChild(imgAnchor);

  if (tweet) {
    const tweetBox = createElement("div");
    tweetBox.className = "lightbox-tweet";

    const meta = createElement("div");
    meta.className = "lightbox-tweet-meta";
    const handle = createElement("span");
    handle.className = "tweet-handle";
    handle.textContent = "@SommerLANassss";
    const date = createElement("span");
    date.className = "tweet-date";
    date.textContent = formatTweetDate(tweet.date);
    meta.appendChild(handle);
    meta.appendChild(date);

    const body = createElement("p");
    body.className = "tweet-text";
    body.innerHTML = formatTweetText(tweet.text);

    tweetBox.appendChild(meta);
    tweetBox.appendChild(body);
    inner.appendChild(tweetBox);
  }

  overlay.appendChild(inner);

  document.body.style.overflow = "hidden";
  const close = () => { document.body.removeChild(overlay); document.body.style.overflow = ""; };
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", function onKey(e) {
    if (e.key === "Escape") { close(); document.removeEventListener("keydown", onKey); }
  }, { once: false });

  const closeBtn = createElement("button") as HTMLButtonElement;
  closeBtn.type = "button";
  closeBtn.className = "lightbox-close";
  closeBtn.textContent = "✕";
  closeBtn.addEventListener("click", close);
  overlay.appendChild(closeBtn);

  document.body.appendChild(overlay);
}

function buildImageCard(
  img: LanImage,
  lanId: number,
  grid: HTMLElement,
  imageToTweet: Map<string, TweetEntry>,
): HTMLElement {
  const card = createElement("div");
  card.className = "image-card";
  card.id = `img-${img.id}`;

  const imgEl = createElement("img") as HTMLImageElement;
  imgEl.src = `/uploads/lan/${lanId}/${img.filename}`;
  imgEl.alt = "";
  imgEl.loading = "lazy";
  card.appendChild(imgEl);

  const tweet = imageToTweet.get(img.filename);
  card.style.cursor = "pointer";
  card.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest(".image-delete-btn")) return;
    openLightbox(`/uploads/lan/${lanId}/${img.filename}`, tweet);
  });

  if (tweet) {
    const badge = createElement("span");
    badge.className = "image-tweet-badge";
    badge.textContent = "💬";
    card.appendChild(badge);
  }

  if (me!.role === "admin") {
    const deleteBtn = createElement("button") as HTMLButtonElement;
    deleteBtn.type = "button";
    deleteBtn.className = "image-delete-btn";
    deleteBtn.textContent = "✕";
    deleteBtn.addEventListener("click", async () => {
      const delRes = await fetch(`http://localhost:8080/api/lan/${lanId}/images/${img.id}/`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (delRes.ok) grid.removeChild(card);
    });
    card.appendChild(deleteBtn);
  }

  return card;
}

function renderTweetFeed(tweets: TweetEntry[], lanImageFilenames: Set<string>) {
  const section = createElement("section");
  section.className = "event-section";
  const h2 = createElement("h2");
  h2.innerHTML = `<span class="hash">#</span>Twitter`;
  section.appendChild(h2);

  const feed = createElement("div");
  feed.className = "tweet-feed";
  for (const t of tweets) {
    feed.appendChild(buildTweetCard(t, lanImageFilenames));
  }
  section.appendChild(feed);
  content.appendChild(section);
}

function buildTweetCard(t: TweetEntry, lanImageFilenames: Set<string>): HTMLElement {
  const card = createElement("div");
  card.className = "tweet-card";

  const meta = createElement("div");
  meta.className = "tweet-meta";

  const handle = createElement("span");
  handle.className = "tweet-handle";
  handle.textContent = "@SommerLANassss";

  const right = createElement("div");
  right.className = "tweet-meta-right";

  const hasLinkedImage = t.images?.some((img) => lanImageFilenames.has(img)) ?? false;
  if (hasLinkedImage) {
    const icon = createElement("span");
    icon.className = "tweet-image-badge";
    icon.textContent = "🖼";
    right.appendChild(icon);
  }

  const date = createElement("span");
  date.className = "tweet-date";
  date.textContent = formatTweetDate(t.date);
  right.appendChild(date);

  meta.appendChild(handle);
  meta.appendChild(right);
  card.appendChild(meta);

  const body = createElement("p");
  body.className = "tweet-text";
  body.innerHTML = formatTweetText(t.text);
  card.appendChild(body);

  return card;
}

function formatTweetDate(raw: string): string {
  const parts = raw.split(" ");
  const day = parseInt(parts[2]);
  const mon = parts[1];
  const year = parts[5];
  const [hh, mm, ss] = parts[3].split(":");
  const months: Record<string, string> = {
    Jan: "jan", Feb: "feb", Mar: "mar", Apr: "apr",
    May: "mai", Jun: "jun", Jul: "jul", Aug: "aug",
    Sep: "sep", Oct: "okt", Nov: "nov", Dec: "des",
  };
  return `${day}. ${months[mon] ?? mon.toLowerCase()} ${year} ${hh}:${mm}:${ss}`;
}

function formatTweetText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>")
    .replace(/(#\S+)/g, `<span class="tweet-hashtag">$1</span>`);
}
