import { fetchById, fetchAll } from "./crud.js";
import { requireAuth, authHeaders } from "./auth.js";
import { LAN } from "./types.js";
import { createElement } from "./utils.js";

type Tag = { id: number; name: string };

type LanImage = {
  id: number;
  lanId: number;
  filename: string;
  uploadedBy?: number;
  uploadedAt: string;
  tags: Tag[];
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
const [lan, allLans] = await Promise.all([
  fetchById<LAN>("lan", id),
  fetchAll<LAN>("lan"),
]);

function buildFirstTimers(lans: LAN[], lanId: number): Set<number> {
  const sorted = [...lans].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const seen = new Set<number>();
  const firsts = new Set<number>();
  for (const l of sorted) {
    for (const p of l.participants ?? []) {
      if (!seen.has(p.id)) {
        if (l.lanId === lanId) firsts.add(p.id);
        seen.add(p.id);
      }
    }
  }
  return firsts;
}

const firstTimers = allLans ? buildFirstTimers(allLans, id) : new Set<number>();

const content = document.getElementById("content")!;

if (!lan) {
  const p = createElement("p");
  p.textContent = "LAN ikke funnet.";
  content.appendChild(p);
} else {
  const year = lan.startDate.substring(0, 4);

  const [tweetRes, imageRes, tagsRes] = await Promise.all([
    fetch(`/data/tweets/${year}.json`),
    fetch(`http://localhost:8080/api/lan/${lan.lanId}/images/`, { headers: authHeaders() }),
    fetch(`http://localhost:8080/api/tags/`, { headers: authHeaders() }),
  ]);

  const tweets: TweetEntry[] = tweetRes.ok ? await tweetRes.json() : [];
  const lanImages: LanImage[] = imageRes.ok ? await imageRes.json() : [];
  const allTags: Tag[] = tagsRes.ok ? await tagsRes.json() : [];
  const datalist = document.getElementById("tag-suggestions")!;
  for (const tag of allTags) {
    const opt = document.createElement("option");
    opt.value = tag.name;
    datalist.appendChild(opt);
  }

  // filename → tweet (for image cards to look up their tweet)
  const imageToTweet = new Map<string, TweetEntry>();
  for (const t of tweets) {
    for (const img of t.images ?? []) {
      imageToTweet.set(img, t);
    }
  }

  // set of filenames currently on this LAN (for tweet cards to check)
  const lanImageFilenames = new Set(lanImages.map((i) => i.filename));

  renderLan(lan, tweets, lanImages, imageToTweet, lanImageFilenames, allTags);
}

function buildSommerlanLogo(): HTMLElement {
  const wrap = createElement("div") as HTMLDivElement;
  wrap.className = "sommerlan-logo";

  const sommer = createElement("span") as HTMLSpanElement;
  sommer.className = "logo-sommer";
  sommer.textContent = "Sommer";

  const right = createElement("span") as HTMLSpanElement;
  right.className = "logo-right";

  const lan = createElement("span") as HTMLSpanElement;
  lan.className = "logo-lan";
  lan.textContent = "LAN";

  const ten = createElement("span") as HTMLSpanElement;
  ten.className = "logo-ten";
  ten.textContent = "10";

  right.appendChild(lan);
  right.appendChild(ten);
  wrap.appendChild(sommer);
  wrap.appendChild(right);
  return wrap;
}

function renderLan(
  lan: LAN,
  tweets: TweetEntry[],
  lanImages: LanImage[],
  imageToTweet: Map<string, TweetEntry>,
  lanImageFilenames: Set<string>,
  allTags: Tag[],
) {
  const year = lan.startDate.substring(0, 4);
  const eventLabels: Record<string, string> = {
    pre: "Classical Era",
    main: "SommerLAN",
    side: "Side-event",
  };

  const sorted = [...(allLans ?? [])].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const idx = sorted.findIndex((l) => l.lanId === lan.lanId);
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const next = idx < sorted.length - 1 ? sorted[idx + 1] : null;

  const titleRow = createElement("div") as HTMLDivElement;
  titleRow.className = "event-title-row";

  const prevLink = createElement("a") as HTMLAnchorElement;
  prevLink.className = "event-nav-arrow";
  if (prev) {
    prevLink.href = `lan-event.html?id=${prev.lanId}`;
    prevLink.innerHTML = `&#8592; <span>${prev.startDate.substring(0, 4)}</span>`;
  } else {
    prevLink.setAttribute("aria-hidden", "true");
  }

  const title = createElement("h1") as HTMLHeadingElement;
  const hash = createElement("span");
  hash.className = "hash";
  hash.textContent = "#";
  title.appendChild(hash);
  title.append(`${eventLabels[lan.event] ?? lan.event} ${year}`);

  const nextLink = createElement("a") as HTMLAnchorElement;
  nextLink.className = "event-nav-arrow";
  if (next) {
    nextLink.href = `lan-event.html?id=${next.lanId}`;
    nextLink.innerHTML = `<span>${next.startDate.substring(0, 4)}</span> &#8594;`;
  } else {
    nextLink.setAttribute("aria-hidden", "true");
  }

  titleRow.appendChild(prevLink);
  titleRow.appendChild(title);
  titleRow.appendChild(nextLink);
  content.appendChild(titleRow);

  if (lan.lanId === 30) {
    content.appendChild(buildSommerlanLogo());
  }

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

  document.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (document.querySelector(".lightbox-overlay")) return;
    if (document.activeElement && ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;
    if (e.key === "ArrowLeft" && prev) window.location.href = `lan-event.html?id=${prev.lanId}`;
    if (e.key === "ArrowRight" && next) window.location.href = `lan-event.html?id=${next.lanId}`;
  });

  if (lan.participants && lan.participants.length > 0) {
    const section = createElement("section");
    section.className = "event-section";
    const h2 = createElement("h2");
    h2.innerHTML = `<span class="hash">#</span>Deltakere`;
    section.appendChild(h2);
    const pillList = createElement("div");
    pillList.className = "pill-list event-pills";
    for (const p of lan.participants) {
      const pill = createElement("span") as HTMLSpanElement;
      pill.className = "event-pill";
      pill.style.backgroundColor = `color-mix(in srgb, ${p.color} 20%, var(--bg))`;
      pill.style.color = p.color;
      pill.style.fontWeight = "bold";
      pill.append(p.nickname || p.name);
      if (firstTimers.has(p.id)) {
        const badge = createElement("span") as HTMLSpanElement;
        badge.className = "first-event-badge";
        badge.textContent = "★";
        badge.title = "Første LAN!";
        pill.appendChild(badge);
      }
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

  if (lan.awards && lan.awards.length > 0) {
    const section = createElement("section");
    section.className = "event-section";
    const h2 = createElement("h2");
    h2.innerHTML = `<span class="hash">#</span>Kåringer`;
    section.appendChild(h2);
    const pillList = createElement("div");
    pillList.className = "pill-list event-pills";
    for (const award of lan.awards) {
      const pill = createElement("span");
      pill.className = "event-pill game-pill";
      pill.textContent = award.name;
      pillList.appendChild(pill);
    }
    section.appendChild(pillList);
    content.appendChild(section);
  }

  renderImageSection(lan.lanId, lanImages, imageToTweet, lanImageFilenames, allTags);

  if (tweets.length) {
    renderTweetFeed(tweets, lanImageFilenames);
  }
}

type CarouselEntry = { src: string; tweet: TweetEntry | undefined };

function renderImageSection(
  lanId: number,
  lanImages: LanImage[],
  imageToTweet: Map<string, TweetEntry>,
  lanImageFilenames: Set<string>,
  allTags: Tag[],
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
  fileInput.multiple = true;
  fileInput.style.display = "none";

  const uploadBtn = createElement("button") as HTMLButtonElement;
  uploadBtn.type = "button";
  uploadBtn.className = "upload-btn";
  uploadBtn.textContent = "+ Last opp";
  uploadBtn.addEventListener("click", () => fileInput.click());
  header.appendChild(uploadBtn);
  section.appendChild(header);

  // collect tags used in this LAN's images for the filter bar
  const usedTagIds = new Set(lanImages.flatMap((img) => (img.tags ?? []).map((t) => t.id)));
  const usedTags = allTags.filter((t) => usedTagIds.has(t.id));
  const activeFilters = new Set<number>();

  const filterBar = createElement("div") as HTMLDivElement;
  filterBar.className = "image-filter-bar";
  filterBar.style.display = usedTags.length ? "" : "none";

  const filterLabel = createElement("span");
  filterLabel.className = "image-filter-label";
  filterLabel.textContent = "Filter:";
  filterBar.appendChild(filterLabel);

  function applyFilters() {
    for (const card of Array.from(grid.querySelectorAll<HTMLElement>(".image-card"))) {
      const cardTagIds = JSON.parse(card.dataset.tagIds ?? "[]") as number[];
      const visible = activeFilters.size === 0 || cardTagIds.some((id) => activeFilters.has(id));
      card.style.display = visible ? "" : "none";
    }
  }

  for (const tag of usedTags) {
    const pill = createElement("button") as HTMLButtonElement;
    pill.type = "button";
    pill.className = "image-filter-pill";
    pill.textContent = tag.name;
    pill.dataset.tagId = String(tag.id);
    pill.addEventListener("click", () => {
      if (activeFilters.has(tag.id)) {
        activeFilters.delete(tag.id);
        pill.classList.remove("active");
      } else {
        activeFilters.add(tag.id);
        pill.classList.add("active");
      }
      applyFilters();
    });
    filterBar.appendChild(pill);
  }
  section.appendChild(filterBar);

  const grid = createElement("div");
  grid.className = "image-grid";

  const carousel: CarouselEntry[] = [];

  const selected = new Set<HTMLElement>();

  for (const img of lanImages) {
    const src = `/uploads/lan/${lanId}/${img.filename}`;
    const thumbSrc = `/uploads/lan/${lanId}/thumbs/${img.filename}`;
    const tweet = imageToTweet.get(img.filename);
    carousel.push({ src, tweet });
    const card = buildImageCard(img, lanId, thumbSrc, grid, carousel, carousel.length - 1, selected, allTags, filterBar);
    grid.appendChild(card);
  }
  section.appendChild(grid);

  if (me!.role === "admin") {
    let dragSrc: HTMLElement | null = null;

    grid.addEventListener("dragstart", (e) => {
      dragSrc = (e.target as HTMLElement).closest(".image-card");
      if (!dragSrc) return;
      if (!selected.has(dragSrc)) {
        selected.forEach((c) => c.classList.remove("selected"));
        selected.clear();
      }
      const dragging = selected.size > 0 ? Array.from(selected) : [dragSrc];
      dragging.forEach((c) => c.classList.add("dragging"));
      e.dataTransfer!.effectAllowed = "move";
    });

    grid.addEventListener("dragend", () => {
      grid.querySelectorAll(".image-card").forEach((c) => {
        c.classList.remove("dragging", "drag-over");
      });
      dragSrc = null;
    });

    grid.addEventListener("dragover", (e) => {
      e.preventDefault();
      const target = (e.target as HTMLElement).closest<HTMLElement>(".image-card");
      if (!target || selected.has(target)) return;
      grid.querySelectorAll(".image-card").forEach((c) => c.classList.remove("drag-over"));
      target.classList.add("drag-over");
    });

    grid.addEventListener("drop", async (e) => {
      e.preventDefault();
      const target = (e.target as HTMLElement).closest<HTMLElement>(".image-card");
      if (!target || !dragSrc || selected.has(target)) return;

      const allCards = Array.from(grid.querySelectorAll<HTMLElement>(".image-card"));
      const moving = selected.size > 0
        ? allCards.filter((c) => selected.has(c))
        : [dragSrc];

      const tgtIdx = allCards.indexOf(target);
      const srcIdxFirst = allCards.indexOf(moving[0]);

      moving.forEach((c) => c.remove());
      const updatedCards = Array.from(grid.querySelectorAll<HTMLElement>(".image-card"));
      const newTgtIdx = updatedCards.indexOf(target);

      if (srcIdxFirst < tgtIdx) {
        moving.reverse().forEach((c) => target.after(c));
        moving.reverse();
      } else {
        moving.forEach((c) => target.before(c));
      }

      selected.forEach((c) => c.classList.remove("selected"));
      selected.clear();

      const ids = Array.from(grid.querySelectorAll<HTMLElement>(".image-card")).map((c) =>
        parseInt(c.id.replace("img-", ""), 10)
      );
      await fetch(`http://localhost:8080/api/lan/${lanId}/images/order/`, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
    });
  }

  fileInput.addEventListener("change", async () => {
    const files = Array.from(fileInput.files ?? []);
    if (!files.length) return;
    uploadBtn.disabled = true;
    for (let i = 0; i < files.length; i++) {
      uploadBtn.textContent = files.length > 1 ? `Laster... (${i + 1}/${files.length})` : "Laster...";
      const fd = new FormData();
      fd.append("image", files[i]);
      const uploadRes = await fetch(`http://localhost:8080/api/lan/${lanId}/images/`, {
        method: "POST",
        headers: authHeaders(),
        body: fd,
      });
      if (uploadRes.ok) {
        const img: LanImage = await uploadRes.json();
        lanImageFilenames.add(img.filename);
        const src = `/uploads/lan/${lanId}/${img.filename}`;
        const thumbSrc = `/uploads/lan/${lanId}/thumbs/${img.filename}`;
        const tweet = imageToTweet.get(img.filename);
        carousel.push({ src, tweet });
        grid.appendChild(buildImageCard(img, lanId, thumbSrc, grid, carousel, carousel.length - 1, selected, allTags, filterBar));
      }
    }
    uploadBtn.textContent = "+ Last opp";
    uploadBtn.disabled = false;
    fileInput.value = "";
  });

  section.appendChild(fileInput);
  content.appendChild(section);
}

function openLightbox(images: CarouselEntry[], startIndex: number) {
  let current = startIndex;

  const overlay = createElement("div");
  overlay.className = "lightbox-overlay";

  const inner = createElement("div");
  inner.className = "lightbox-inner";

  const imgAnchor = createElement("a") as HTMLAnchorElement;
  imgAnchor.target = "_blank";
  imgAnchor.rel = "noopener";
  imgAnchor.style.display = "contents";

  const imgEl = createElement("img") as HTMLImageElement;
  imgEl.className = "lightbox-img";
  imgAnchor.appendChild(imgEl);
  inner.appendChild(imgAnchor);

  const tweetBox = createElement("div");
  tweetBox.className = "lightbox-tweet";
  inner.appendChild(tweetBox);

  overlay.appendChild(inner);

  const prevBtn = createElement("button") as HTMLButtonElement;
  prevBtn.type = "button";
  prevBtn.className = "lightbox-nav lightbox-prev";
  prevBtn.textContent = "‹";
  overlay.appendChild(prevBtn);

  const nextBtn = createElement("button") as HTMLButtonElement;
  nextBtn.type = "button";
  nextBtn.className = "lightbox-nav lightbox-next";
  nextBtn.textContent = "›";
  overlay.appendChild(nextBtn);

  const counter = createElement("div");
  counter.className = "lightbox-counter";
  overlay.appendChild(counter);

  const closeBtn = createElement("button") as HTMLButtonElement;
  closeBtn.type = "button";
  closeBtn.className = "lightbox-close";
  closeBtn.textContent = "✕";
  overlay.appendChild(closeBtn);

  function update() {
    const { src, tweet } = images[current];
    imgEl.src = src;
    imgAnchor.href = src;

    tweetBox.innerHTML = "";
    if (tweet) {
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
      tweetBox.style.display = "";
    } else {
      tweetBox.style.display = "none";
    }

    prevBtn.style.visibility = images.length > 1 ? "" : "hidden";
    nextBtn.style.visibility = images.length > 1 ? "" : "hidden";
    if (images.length > 1) counter.textContent = `${current + 1} / ${images.length}`;
  }

  const close = () => {
    document.body.removeChild(overlay);
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKey);
  };

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") { close(); return; }
    if (e.key === "ArrowLeft") { current = (current - 1 + images.length) % images.length; update(); }
    if (e.key === "ArrowRight") { current = (current + 1) % images.length; update(); }
  }

  prevBtn.addEventListener("click", (e) => { e.stopPropagation(); current = (current - 1 + images.length) % images.length; update(); });
  nextBtn.addEventListener("click", (e) => { e.stopPropagation(); current = (current + 1) % images.length; update(); });
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", onKey);

  update();
  document.body.style.overflow = "hidden";
  document.body.appendChild(overlay);
}

function buildImageCard(
  img: LanImage,
  lanId: number,
  thumbSrc: string,
  grid: HTMLElement,
  carousel: CarouselEntry[],
  index: number,
  selected: Set<HTMLElement> = new Set(),
  allTags: Tag[] = [],
  filterBar?: HTMLElement,
): HTMLElement {
  const card = createElement("div");
  card.className = "image-card";
  card.id = `img-${img.id}`;
  card.dataset.tagIds = JSON.stringify((img.tags ?? []).map((t) => t.id));

  const imgEl = createElement("img") as HTMLImageElement;
  imgEl.src = thumbSrc;
  imgEl.alt = "";
  imgEl.loading = "lazy";
  imgEl.addEventListener("error", () => { imgEl.src = `/uploads/lan/${lanId}/${img.filename}`; }, { once: true });
  card.appendChild(imgEl);

  const tweet = carousel[index]?.tweet;
  card.style.cursor = "pointer";
  card.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest(".image-delete-btn, .image-tag-strip, .image-tag-add")) return;
    if (e.shiftKey && me!.role === "admin") {
      if (selected.has(card)) {
        selected.delete(card);
        card.classList.remove("selected");
      } else {
        selected.add(card);
        card.classList.add("selected");
      }
      return;
    }
    openLightbox(carousel, index);
  });

  if (tweet) {
    const badge = createElement("span");
    badge.className = "image-tweet-badge";
    badge.textContent = "💬";
    card.appendChild(badge);
  }

  // tag strip
  const tagStrip = createElement("div") as HTMLDivElement;
  tagStrip.className = "image-tag-strip";

  const cardTags: Tag[] = [...(img.tags ?? [])];

  function syncTagIds() {
    card.dataset.tagIds = JSON.stringify(cardTags.map((t) => t.id));
    // update filter bar visibility
    if (filterBar) {
      const usedIds = new Set(
        Array.from(filterBar.closest("section")!.querySelectorAll<HTMLElement>(".image-card"))
          .flatMap((c) => JSON.parse(c.dataset.tagIds ?? "[]") as number[])
      );
      filterBar.querySelectorAll<HTMLElement>(".image-filter-pill").forEach((pill) => {
        const id = parseInt(pill.dataset.tagId ?? "0", 10);
        pill.style.display = usedIds.has(id) ? "" : "none";
      });
      filterBar.style.display = usedIds.size ? "" : "none";
    }
  }

  function renderTagPill(tag: Tag) {
    const pill = createElement("span") as HTMLSpanElement;
    pill.className = "image-tag-pill";
    pill.textContent = tag.name;

    if (me!.role === "admin") {
      const removeBtn = createElement("button") as HTMLButtonElement;
      removeBtn.type = "button";
      removeBtn.className = "image-tag-remove";
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const res = await fetch(`http://localhost:8080/api/lan/${lanId}/images/${img.id}/tags/${tag.id}/`, {
          method: "DELETE",
          headers: authHeaders(),
        });
        if (res.ok) {
          pill.remove();
          const idx = cardTags.findIndex((t) => t.id === tag.id);
          if (idx !== -1) cardTags.splice(idx, 1);
          syncTagIds();
          // also add back to allTags suggestions if missing
          if (!allTags.find((t) => t.id === tag.id)) allTags.push(tag);
        }
      });
      pill.appendChild(removeBtn);
    }
    return pill;
  }

  for (const tag of cardTags) {
    tagStrip.appendChild(renderTagPill(tag));
  }

  if (me!.role === "admin") {
    const addBtn = createElement("button") as HTMLButtonElement;
    addBtn.type = "button";
    addBtn.className = "image-tag-add";
    addBtn.textContent = "+";
    addBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      addBtn.style.display = "none";
      const input = createElement("input") as HTMLInputElement;
      input.type = "text";
      input.className = "image-tag-input";
      input.placeholder = "Tag...";
      input.setAttribute("list", "tag-suggestions");
      tagStrip.appendChild(input);
      input.focus();

      async function submit() {
        const name = input.value.trim();
        input.remove();
        addBtn.style.display = "";
        if (!name) return;
        const res = await fetch(`http://localhost:8080/api/lan/${lanId}/images/${img.id}/tags/`, {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (res.ok) {
          const tag: Tag = await res.json();
          if (!cardTags.find((t) => t.id === tag.id)) {
            cardTags.push(tag);
            tagStrip.insertBefore(renderTagPill(tag), addBtn);
            syncTagIds();
            if (!allTags.find((t) => t.id === tag.id)) {
              allTags.push(tag);
              // add to datalist
              const opt = document.createElement("option");
              opt.value = tag.name;
              document.getElementById("tag-suggestions")?.appendChild(opt);
            }
            // add filter pill if new
            if (filterBar && !filterBar.querySelector(`[data-tag-id="${tag.id}"]`)) {
              const filterPill = createElement("button") as HTMLButtonElement;
              filterPill.type = "button";
              filterPill.className = "image-filter-pill";
              filterPill.textContent = tag.name;
              filterPill.dataset.tagId = String(tag.id);
              filterBar.appendChild(filterPill);
              filterBar.style.display = "";
            }
          }
        }
      }

      input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") { input.remove(); addBtn.style.display = ""; } });
      input.addEventListener("blur", submit);
    });
    tagStrip.appendChild(addBtn);
  }

  if (cardTags.length > 0 || me!.role === "admin") {
    card.appendChild(tagStrip);
  }

  if (me!.role === "admin") {
    card.draggable = true;

    const deleteBtn = createElement("button") as HTMLButtonElement;
    deleteBtn.type = "button";
    deleteBtn.className = "image-delete-btn";
    deleteBtn.textContent = "🗑";
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
