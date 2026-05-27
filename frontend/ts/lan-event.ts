import { fetchById, fetchAll } from "./crud.js";
import { requireAuth, authHeaders } from "./auth.js";
import { LAN, User, Game, Award, LanGuest, LanQuote, RsvpEntry } from "./types.js";
import { createElement, createStarIcon, buildSommerlanLogo } from "./utils.js";
import { BLOCKS, GAMES, renderMatrix } from "./matrix.js";

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
} else if (new Date(lan.startDate) > new Date()) {
  await renderUpcoming(lan);
} else {
  const year = lan.startDate.substring(0, 4);

  const [tweetRes, imageRes, tagsRes, quotesRes, guestsRes] = await Promise.all([
    fetch(`/data/tweets/${year}.json`),
    fetch(`http://localhost:8080/api/lan/${lan.lanId}/images/`, { headers: authHeaders() }),
    fetch(`http://localhost:8080/api/tags/`, { headers: authHeaders() }),
    fetch(`http://localhost:8080/api/lan/${lan.lanId}/quotes/`, { headers: authHeaders() }),
    fetch(`http://localhost:8080/api/lan/${lan.lanId}/guests/`, { headers: authHeaders() }),
  ]);

  const tweets: TweetEntry[] = tweetRes.ok ? await tweetRes.json() : [];
  const lanImages: LanImage[] = imageRes.ok ? await imageRes.json() : [];
  const allTags: Tag[] = tagsRes.ok ? await tagsRes.json() : [];
  const lanQuotes: LanQuote[] = quotesRes.ok ? await quotesRes.json() : [];
  const lanGuests: LanGuest[] = guestsRes.ok ? await guestsRes.json() : [];
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

  renderLan(lan, tweets, lanImages, imageToTweet, lanImageFilenames, allTags, lanQuotes, lanGuests);
}


async function renderUpcoming(lan: LAN) {
  const sorted = [...(allLans ?? [])].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const idx = sorted.findIndex((l) => l.lanId === lan.lanId);
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const next = idx < sorted.length - 1 ? sorted[idx + 1] : null;

  // Title row
  const titleRow = createElement("div") as HTMLDivElement;
  titleRow.className = "event-title-row";
  const prevLink = createElement("a") as HTMLAnchorElement;
  prevLink.className = "event-nav-arrow";
  if (prev) { prevLink.href = `lan-event.html?id=${prev.lanId}`; prevLink.innerHTML = `&#8592; <span>${prev.startDate.substring(0, 4)}</span>`; }
  else prevLink.setAttribute("aria-hidden", "true");
  const title = createElement("h1") as HTMLHeadingElement;
  const hash = createElement("span"); hash.className = "hash"; hash.textContent = "#";
  title.appendChild(hash);
  title.append(`SommerLAN ${lan.startDate.substring(0, 4)}`);
  const nextLink = createElement("a") as HTMLAnchorElement;
  nextLink.className = "event-nav-arrow";
  if (next) { nextLink.href = `lan-event.html?id=${next.lanId}`; nextLink.innerHTML = `<span>${next.startDate.substring(0, 4)}</span> &#8594;`; }
  else nextLink.setAttribute("aria-hidden", "true");
  const titleCenter = createElement("div") as HTMLDivElement;
  titleCenter.className = "event-title-center";
  titleCenter.appendChild(title);
  titleRow.appendChild(prevLink); titleRow.appendChild(titleCenter); titleRow.appendChild(nextLink);
  content.appendChild(titleRow);

  if (lan.invitation) {
    const inv = createElement("p") as HTMLParagraphElement;
    inv.className = "event-invitation";
    inv.textContent = lan.invitation;
    content.appendChild(inv);
  }

  // RSVP form
  const wrapper = createElement("div") as HTMLDivElement;
  wrapper.className = "rsvp-wrapper";
  wrapper.style.padding = "0";
  wrapper.style.maxWidth = "100%";

  const blocksEl = createElement("div") as HTMLDivElement;
  blocksEl.className = "event-blocks";

  for (const block of BLOCKS) {
    const blockEl = createElement("div") as HTMLDivElement;
    blockEl.className = "event-block";
    if (block.key === "main") blockEl.classList.add("event-block-main");

    const blockHeader = createElement("div") as HTMLDivElement;
    blockHeader.className = "event-block-header";
    const badge = createElement("span") as HTMLSpanElement;
    badge.className = `event-badge badge-${block.key}`;
    badge.textContent = block.label;
    blockHeader.appendChild(badge);
    blockEl.appendChild(blockHeader);

    const dayGrid = createElement("div") as HTMLDivElement;
    dayGrid.className = "day-grid";

    for (const date of block.dates) {
      const d = new Date(date + "T00:00:00");
      const dayName = d.toLocaleDateString("nb-NO", { weekday: "long" });
      const dayNum = d.getDate();
      const monthName = d.toLocaleDateString("nb-NO", { month: "long" });
      const game = GAMES[date as keyof typeof GAMES];

      const label = createElement("label") as HTMLLabelElement;
      label.className = "day-card";
      const cb = createElement("input") as HTMLInputElement;
      cb.type = "checkbox"; cb.name = "day"; cb.value = date;
      const nameSpan = createElement("span") as HTMLSpanElement;
      nameSpan.className = "day-name";
      nameSpan.textContent = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      const dateSpan = createElement("span") as HTMLSpanElement;
      dateSpan.className = "day-date";
      dateSpan.textContent = `${dayNum}. ${monthName}`;
      if (game) {
        const gameSpan = createElement("span") as HTMLSpanElement;
        gameSpan.className = "day-card-game"; gameSpan.textContent = " ⚽"; gameSpan.title = game;
        dateSpan.appendChild(gameSpan);
      }
      label.appendChild(cb); label.appendChild(nameSpan); label.appendChild(dateSpan);
      dayGrid.appendChild(label);
    }
    blockEl.appendChild(dayGrid);
    blocksEl.appendChild(blockEl);
  }
  wrapper.appendChild(blocksEl);

  const footer = createElement("div") as HTMLDivElement;
  footer.className = "rsvp-footer";
  const submitBtn = createElement("button") as HTMLButtonElement;
  submitBtn.id = "rsvp-submit"; submitBtn.disabled = true; submitBtn.className = "inactive";
  submitBtn.textContent = "Meld på";
  footer.appendChild(submitBtn);
  wrapper.appendChild(footer);

  // Confirmed state (shown when user already has an RSVP)
  const confirmedDiv = createElement("div") as HTMLDivElement;
  confirmedDiv.className = "rsvp-confirmed";
  const confirmedMsg = createElement("p") as HTMLParagraphElement;
  confirmedMsg.className = "rsvp-confirmed-msg";
  confirmedMsg.textContent = "Du er påmeldt!";
  const endreBtn = createElement("button") as HTMLButtonElement;
  endreBtn.type = "button";
  endreBtn.className = "rsvp-endre-btn";
  endreBtn.textContent = "Endre datoer";
  confirmedDiv.appendChild(confirmedMsg);
  confirmedDiv.appendChild(endreBtn);

  content.appendChild(confirmedDiv);
  content.appendChild(wrapper);

  // Matrix
  const matrixSection = createElement("section") as HTMLElement;
  matrixSection.className = "event-section";
  const matrixH2 = createElement("h2");
  matrixH2.innerHTML = `<span class="hash">#</span>Påmeldte`;
  matrixSection.appendChild(matrixH2);
  const matrixContainer = createElement("div") as HTMLDivElement;
  matrixContainer.style.overflowX = "auto";
  matrixSection.appendChild(matrixContainer);
  content.appendChild(matrixSection);

  // Single fetch: populate matrix + check existing RSVP
  const rsvpRes = await fetch(`http://localhost:8080/api/lan/${lan.lanId}/rsvp/`, { headers: authHeaders() });
  const rsvpEntries: RsvpEntry[] = rsvpRes.ok ? await rsvpRes.json() : [];
  renderMatrix(matrixContainer, rsvpEntries);
  const mine = rsvpEntries.find((e) => e.userId === me!.id);
  const myDates = mine?.dates ?? [];

  for (const date of myDates) {
    const cb = wrapper.querySelector<HTMLInputElement>(`input[value="${date}"]`);
    if (cb) cb.checked = true;
  }

  const showConfirmed = () => {
    confirmedDiv.style.display = "";
    wrapper.style.display = "none";
  };
  const showForm = () => {
    confirmedDiv.style.display = "none";
    wrapper.style.display = "";
    updateBtn();
  };

  if (myDates.length > 0) showConfirmed(); else showForm();

  endreBtn.addEventListener("click", showForm);

  const updateBtn = () => {
    const anyChecked = wrapper.querySelectorAll<HTMLInputElement>("input[name=day]:checked").length > 0;
    submitBtn.disabled = !anyChecked;
    submitBtn.classList.toggle("inactive", !anyChecked);
  };
  wrapper.querySelectorAll<HTMLInputElement>("input[name=day]").forEach((cb) => cb.addEventListener("change", updateBtn));
  updateBtn();

  submitBtn.addEventListener("click", async () => {
    const dates = Array.from(wrapper.querySelectorAll<HTMLInputElement>("input[name=day]:checked")).map((cb) => cb.value);
    submitBtn.disabled = true; submitBtn.textContent = "Sender…";
    const res = await fetch(`http://localhost:8080/api/lan/${lan.lanId}/rsvp/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ dates }),
    });
    if (res.ok) {
      const updated: RsvpEntry[] = await (await fetch(`http://localhost:8080/api/lan/${lan.lanId}/rsvp/`, { headers: authHeaders() })).json();
      renderMatrix(matrixContainer, updated);
      submitBtn.textContent = "Meld på";
      showConfirmed();
    } else {
      submitBtn.textContent = "Feil – prøv igjen";
      submitBtn.disabled = false;
    }
  });
}

function renderLan(
  lan: LAN,
  tweets: TweetEntry[],
  lanImages: LanImage[],
  imageToTweet: Map<string, TweetEntry>,
  lanImageFilenames: Set<string>,
  allTags: Tag[],
  lanQuotes: LanQuote[],
  lanGuests: LanGuest[],
) {
  const now = new Date();
  const isHappening = new Date(lan.startDate) <= now && new Date(lan.endDate) >= now;
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

  // === Title row ===
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
  if (isHappening) {
    const pill = createElement("span") as HTMLSpanElement;
    pill.className = "upcoming-badge happening-badge";
    pill.textContent = "HAPPENING STATUS: IT'S";
    title.appendChild(pill);
  }

  const nextLink = createElement("a") as HTMLAnchorElement;
  nextLink.className = "event-nav-arrow";
  if (next) {
    nextLink.href = `lan-event.html?id=${next.lanId}`;
    nextLink.innerHTML = `<span>${next.startDate.substring(0, 4)}</span> &#8594;`;
  } else {
    nextLink.setAttribute("aria-hidden", "true");
  }

  titleRow.appendChild(prevLink);
  const titleOrLogo = lan.lanId === 30 ? buildSommerlanLogo(me!.color, me!.color2 ?? me!.color) : title;
  const titleCenter = createElement("div") as HTMLDivElement;
  titleCenter.className = "event-title-center";
  titleCenter.appendChild(titleOrLogo);
  titleRow.appendChild(titleCenter);
  titleRow.appendChild(nextLink);
  content.appendChild(titleRow);

  if (isHappening) content.classList.add("happening");

  // === Dates display ===
  const datesDisplay = createElement("p") as HTMLParagraphElement;
  datesDisplay.className = "event-dates";
  const buildDatesText = (from: string, to: string) =>
    from && to && from === to ? from : from && to ? `${from} – ${to}` : from || to;
  const datesText = buildDatesText(lan.fromDisplay ?? "", lan.toDisplay ?? "");
  datesDisplay.textContent = datesText;
  if (datesText) content.appendChild(datesDisplay);


  // === Description display ===
  const descDisplay = createElement("p") as HTMLParagraphElement;
  descDisplay.className = "event-description";
  descDisplay.textContent = lan.description ?? "";
  if (lan.description) content.appendChild(descDisplay);

  // === Invitation display ===
  const invitationDisplay = createElement("p") as HTMLParagraphElement;
  invitationDisplay.className = "event-invitation";
  invitationDisplay.textContent = lan.invitation ?? "";
  invitationDisplay.style.display = lan.invitation ? "" : "none";
  content.appendChild(invitationDisplay);
  if (lan.isRomjulsLAN) content.classList.add("romjulslan");

  document.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (document.querySelector(".lightbox-overlay")) return;
    if (document.activeElement && ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;
    if (e.key === "ArrowLeft" && prev) window.location.href = `lan-event.html?id=${prev.lanId}`;
    if (e.key === "ArrowRight" && next) window.location.href = `lan-event.html?id=${next.lanId}`;
  });

  // === Participants section ===
  const pSection = createElement("section") as HTMLElement;
  pSection.className = "event-section";
  const pH2 = createElement("h2");
  const updateParticipantCount = () => {
    const total = (lan.participants?.length ?? 0) + lanGuests.length;
    pH2.innerHTML = `<span class="hash">#</span>Deltakere <span class="section-count">(${total})</span>`;
  };
  updateParticipantCount();
  pSection.appendChild(pH2);
  const pPillList = createElement("div") as HTMLDivElement;
  pPillList.className = "pill-list event-pills";
  const buildParticipantViewPills = () => {
    pPillList.innerHTML = "";
    for (const p of lan.participants ?? []) {
      const pill = createElement("a") as HTMLAnchorElement;
      pill.className = "event-pill";
      pill.href = `participant.html?id=${p.id}`;
      pill.style.backgroundColor = `color-mix(in srgb, ${p.color} 20%, var(--bg))`;
      pill.style.color = p.color;
      pill.style.fontWeight = "bold";
      pill.append(p.nickname || p.name);
      if (firstTimers.has(p.id)) {
        const badge = createElement("span") as HTMLSpanElement;
        badge.className = "first-event-badge";
        badge.appendChild(createStarIcon());
        badge.title = "Første LAN!";
        pill.appendChild(badge);
      }
      pPillList.appendChild(pill);
    }
  };
  buildParticipantViewPills();
  pSection.appendChild(pPillList);

  // Guest sub-row
  const guestRow = createElement("div") as HTMLDivElement;
  guestRow.className = "guest-row";
  if (!lanGuests.length) guestRow.style.display = "none";
  const guestLabel = createElement("h3") as HTMLHeadingElement;
  guestLabel.className = "guest-row-label";
  const guestHash = createElement("span"); guestHash.className = "hash"; guestHash.textContent = "#";
  guestLabel.appendChild(guestHash);
  guestLabel.append("Gjester");
  guestRow.appendChild(guestLabel);
  const guestPillList = createElement("div") as HTMLDivElement;
  guestPillList.className = "pill-list guest-pill-list";
  const buildGuestPill = (g: LanGuest): HTMLElement => {
    const wrap = createElement("span") as HTMLSpanElement;
    wrap.className = "guest-pill";
    wrap.textContent = g.name;
    if (me?.role === "admin") {
      const del = createElement("button") as HTMLButtonElement;
      del.type = "button";
      del.className = "guest-delete-btn";
      del.textContent = "✕";
      del.title = "Fjern gjest";
      del.addEventListener("click", async () => {
        const res = await fetch(`http://localhost:8080/api/lan/${lan.lanId}/guests/${g.id}/`, {
          method: "DELETE", headers: authHeaders(),
        });
        if (res.ok) {
          wrap.remove();
          lanGuests.splice(lanGuests.indexOf(g), 1);
          updateParticipantCount();
          if (!lanGuests.length) guestRow.style.display = "none";
        }
      });
      wrap.appendChild(del);
    }
    return wrap;
  };
  for (const g of lanGuests) guestPillList.appendChild(buildGuestPill(g));
  guestRow.appendChild(guestPillList);
  pSection.appendChild(guestRow);

  // Admin: add guest form
  if (me?.role === "admin") {
    const guestAddForm = createElement("div") as HTMLDivElement;
    guestAddForm.className = "quote-add-form guest-add-form";
    const guestInput = createElement("input") as HTMLInputElement;
    guestInput.type = "text";
    guestInput.placeholder = "Legg til gjest...";
    guestInput.className = "lan-text-input";
    const guestAddBtn = createElement("button") as HTMLButtonElement;
    guestAddBtn.type = "button";
    guestAddBtn.className = "quote-submit-btn";
    guestAddBtn.textContent = "Legg til";
    const submitGuest = async () => {
      const name = guestInput.value.trim();
      if (!name) return;
      const fd = new URLSearchParams({ name });
      const res = await fetch(`http://localhost:8080/api/lan/${lan.lanId}/guests/`, {
        method: "POST", headers: authHeaders(), body: fd,
      });
      if (res.ok) {
        const g: LanGuest = await res.json();
        lanGuests.push(g);
        guestPillList.appendChild(buildGuestPill(g));
        guestRow.style.display = "";
        updateParticipantCount();
        guestInput.value = "";
      }
    };
    guestAddBtn.addEventListener("click", submitGuest);
    guestInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); submitGuest(); } });
    guestAddForm.appendChild(guestInput);
    guestAddForm.appendChild(guestAddBtn);
    pSection.appendChild(guestAddForm);
  }

  if ((lan.participants && lan.participants.length > 0) || lanGuests.length > 0) content.appendChild(pSection);

  // === Games section ===
  const gSection = createElement("section") as HTMLElement;
  gSection.className = "event-section";
  const gH2 = createElement("h2");
  gSection.appendChild(gH2);
  const gPillList = createElement("div") as HTMLDivElement;
  gPillList.className = "pill-list event-pills";
  const updateGameCount = () => {
    gH2.innerHTML = `<span class="hash">#</span>Spill <span class="section-count">(${lan.games?.length ?? 0})</span>`;
  };
  const buildGameViewPills = () => {
    gPillList.innerHTML = "";
    for (const game of lan.games ?? []) {
      const pill = createElement("span");
      pill.className = "event-pill game-pill";
      pill.textContent = game.name;
      gPillList.appendChild(pill);
    }
  };
  updateGameCount();
  buildGameViewPills();
  gSection.appendChild(gPillList);

  // Add game form — available to all logged-in users
  const gameDatalist = createElement("datalist") as HTMLDataListElement;
  gameDatalist.id = `game-suggestions-${lan.lanId}`;
  fetch("http://localhost:8080/api/game/", { headers: authHeaders() })
    .then(r => r.ok ? r.json() : [])
    .then((games: Game[]) => {
      for (const g of games) {
        const opt = document.createElement("option");
        opt.value = g.name;
        gameDatalist.appendChild(opt);
      }
    });
  gSection.appendChild(gameDatalist);

  const gameAddForm = createElement("div") as HTMLDivElement;
  gameAddForm.className = "quote-add-form";
  gameAddForm.style.marginTop = "0.75rem";
  const gameInput = createElement("input") as HTMLInputElement;
  gameInput.type = "text";
  gameInput.placeholder = "Legg til spill...";
  gameInput.className = "lan-text-input";
  gameInput.setAttribute("list", gameDatalist.id);
  const gameAddBtn = createElement("button") as HTMLButtonElement;
  gameAddBtn.type = "button";
  gameAddBtn.className = "quote-submit-btn";
  gameAddBtn.textContent = "Legg til";

  const submitGame = async () => {
    const name = gameInput.value.trim();
    if (!name) return;
    const fd = new URLSearchParams({ name });
    const res = await fetch(`http://localhost:8080/api/lan/${lan.lanId}/games/`, {
      method: "POST", headers: authHeaders(), body: fd,
    });
    if (res.ok) {
      const game: Game = await res.json();
      if (!lan.games) lan.games = [];
      if (!lan.games.some(g => g.id === game.id)) {
        lan.games.push(game);
        buildGameViewPills();
        updateGameCount();
        if (!gameDatalist.querySelector(`option[value="${game.name}"]`)) {
          const opt = document.createElement("option");
          opt.value = game.name;
          gameDatalist.appendChild(opt);
        }
      }
      gameInput.value = "";
    }
  };

  gameAddBtn.addEventListener("click", submitGame);
  gameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); submitGame(); } });
  gameAddForm.appendChild(gameInput);
  gameAddForm.appendChild(gameAddBtn);
  gSection.appendChild(gameAddForm);

  content.appendChild(gSection);

  // === Awards section ===
  const aSection = createElement("section") as HTMLElement;
  aSection.className = "event-section";
  const aH2 = createElement("h2");
  aH2.innerHTML = `<span class="hash">#</span>Kåringer <span class="section-count">(${lan.awards?.length ?? 0})</span>`;
  aSection.appendChild(aH2);
  const aPillList = createElement("div") as HTMLDivElement;
  aPillList.className = "pill-list event-pills";
  const buildAwardViewPills = () => {
    aPillList.innerHTML = "";
    for (const award of lan.awards ?? []) {
      const pill = createElement("span");
      pill.className = "event-pill game-pill";
      pill.textContent = award.name;
      aPillList.appendChild(pill);
    }
  };
  buildAwardViewPills();
  aSection.appendChild(aPillList);
  if (lan.awards && lan.awards.length > 0) content.appendChild(aSection);

  renderQuoteSection(lan.lanId, lanQuotes);
  renderImageSection(lan.lanId, lanImages, imageToTweet, lanImageFilenames, allTags);

  // === Edit mode (admin only) ===
  if (me?.role !== "admin") return;

  // Caches so we only fetch once
  let cachedUsers: User[] | null = null;
  let cachedGames: Game[] | null = null;
  let cachedAwards: Award[] | null = null;

  // Edit button in title row
  const editBtn = createElement("button") as HTMLButtonElement;
  editBtn.type = "button";
  editBtn.textContent = "✎";
  editBtn.className = "edit-button lan-event-edit-btn";
  editBtn.addEventListener("click", openEdit);
  titleCenter.appendChild(editBtn);

  // Edit actions bar
  const editBar = createElement("div") as HTMLDivElement;
  editBar.className = "edit-actions";
  editBar.style.display = "none";
  const saveBtn = createElement("button") as HTMLButtonElement;
  saveBtn.type = "button"; saveBtn.className = "save-btn"; saveBtn.textContent = "Lagre";
  const cancelBtn = createElement("button") as HTMLButtonElement;
  cancelBtn.type = "button"; cancelBtn.className = "delete-btn"; cancelBtn.textContent = "Avbryt";
  editBar.appendChild(cancelBtn);
  editBar.appendChild(saveBtn);
  titleRow.after(editBar);

  // All edit form fields grouped in one wrapper
  const editFields = createElement("div") as HTMLDivElement;
  editFields.className = "edit-fields";
  editFields.style.display = "none";
  editBar.after(editFields);

  // Year + era inputs
  const editMetaRow = createElement("div") as HTMLDivElement;
  editMetaRow.className = "from-to-row";
  const yearInput = createElement("input") as HTMLInputElement;
  yearInput.type = "number"; yearInput.className = "lan-year-input"; yearInput.value = year;
  editMetaRow.appendChild(yearInput);
  const eraGroup = createElement("div") as HTMLDivElement;
  eraGroup.className = "radio-group";
  for (const { value: val, label: lbl } of [
    { value: "pre", label: "Classical era" },
    { value: "main", label: "SommerLAN" },
    { value: "side", label: "Side-event" },
  ] as const) {
    const l = createElement("label") as HTMLLabelElement;
    const r = createElement("input") as HTMLInputElement;
    r.type = "radio"; r.name = "lan-event-era"; r.value = val; r.checked = lan.event === val;
    l.appendChild(r); l.append(lbl);
    eraGroup.appendChild(l);
  }
  editMetaRow.appendChild(eraGroup);
  editFields.appendChild(editMetaRow);

  // From / to display inputs
  const editDatesRow = createElement("div") as HTMLDivElement;
  editDatesRow.className = "from-to-row";
  const fromInput = createElement("input") as HTMLInputElement;
  fromInput.type = "text"; fromInput.placeholder = "Fra"; fromInput.className = "lan-text-input";
  fromInput.value = lan.fromDisplay ?? "";
  const toInput = createElement("input") as HTMLInputElement;
  toInput.type = "text"; toInput.placeholder = "Til"; toInput.className = "lan-text-input";
  toInput.value = lan.toDisplay ?? "";
  const sep = createElement("span"); sep.textContent = "–";
  editDatesRow.appendChild(fromInput); editDatesRow.appendChild(sep); editDatesRow.appendChild(toInput);
  editFields.appendChild(editDatesRow);

  // Description textarea
  const descInput = createElement("textarea") as HTMLTextAreaElement;
  descInput.className = "lan-text-input";
  descInput.placeholder = "Beskrivelse"; descInput.value = lan.description ?? "";
  editFields.appendChild(descInput);

  // Invitation textarea
  const invitationInput = createElement("textarea") as HTMLTextAreaElement;
  invitationInput.className = "lan-text-input lan-invitation-input";
  invitationInput.placeholder = "Invitasjonstekst..."; invitationInput.value = lan.invitation ?? "";
  editFields.appendChild(invitationInput);

  // RomjulsLAN checkbox
  const romjulsLabel = createElement("label") as HTMLLabelElement;
  romjulsLabel.className = "romjulslan-checkbox-row";
  const romjulsCheckbox = createElement("input") as HTMLInputElement;
  romjulsCheckbox.type = "checkbox";
  romjulsCheckbox.checked = lan.isRomjulsLAN ?? false;
  romjulsLabel.appendChild(romjulsCheckbox);
  romjulsLabel.append(" RomjulsLAN ❄");
  editFields.appendChild(romjulsLabel);

  // Nickname section (built fresh each time edit opens)
  const nicknameSection = createElement("div") as HTMLDivElement;
  nicknameSection.className = "nickname-section";
  const nicknameHeader = createElement("h5") as HTMLHeadingElement;
  nicknameHeader.className = "nickname-section-header";
  nicknameHeader.textContent = "Kallenavn";
  const nicknameList = createElement("div") as HTMLDivElement;
  nicknameList.className = "nickname-list";
  nicknameSection.appendChild(nicknameHeader);
  nicknameSection.appendChild(nicknameList);

  function buildCheckbox(item: User | Game | Award, name: string, checked: boolean): HTMLLabelElement {
    const label = createElement("label") as HTMLLabelElement;
    const span = createElement("span") as HTMLSpanElement;
    span.className = "pill-text";
    span.textContent = ("nickname" in item && item.nickname) ? item.nickname : item.name;
    const cb = createElement("input") as HTMLInputElement;
    cb.type = "checkbox"; cb.name = name; cb.value = String(item.id); cb.checked = checked;
    label.appendChild(span); label.appendChild(cb);
    return label;
  }

  function refreshNicknameSection(userCheckboxes: HTMLLabelElement[], users: User[]) {
    nicknameList.innerHTML = "";
    for (const label of userCheckboxes) {
      const cb = label.querySelector<HTMLInputElement>("input");
      if (!cb?.checked) continue;
      const userId = parseInt(cb.value);
      const user = users.find(u => u.id === userId);
      const participant = lan.participants?.find(p => p.id === userId);
      const baseName = user?.nickname || user?.name || cb.value;
      const eventNick = participant?.eventNickname ?? "";

      const row = createElement("div") as HTMLDivElement;
      row.className = "nickname-row";
      const nameSpan = createElement("span") as HTMLSpanElement;
      nameSpan.className = "nickname-row-name";
      nameSpan.textContent = baseName;
      const nickInput = createElement("input") as HTMLInputElement;
      nickInput.type = "text"; nickInput.className = "nickname-input lan-text-input";
      nickInput.value = eventNick; nickInput.placeholder = "Tilleggsnavn...";

      const save = async () => {
        const val = nickInput.value.trim();
        const res = await fetch(`http://localhost:8080/api/lan/${lan.lanId}/participant/${userId}/nickname/`, {
          method: "PATCH",
          headers: authHeaders(),
          body: new URLSearchParams({ nickname: val }),
        });
        if (res.ok && participant) participant.eventNickname = val;
      };
      nickInput.addEventListener("blur", save);
      nickInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); nickInput.blur(); } });

      row.appendChild(nameSpan); row.appendChild(nickInput);
      nicknameList.appendChild(row);
    }
    nicknameSection.style.display = nicknameList.children.length ? "" : "none";
  }

  // New game input for edit mode
  const newGameInput = createElement("input") as HTMLInputElement;
  newGameInput.type = "text"; newGameInput.className = "lan-text-input";
  newGameInput.placeholder = "Nytt spill..."; newGameInput.style.display = "none";

  // New award input for edit mode
  const newAwardInput = createElement("input") as HTMLInputElement;
  newAwardInput.type = "text"; newAwardInput.className = "lan-text-input";
  newAwardInput.placeholder = "Ny kåring..."; newAwardInput.style.display = "none";

  let userCheckboxes: HTMLLabelElement[] = [];
  let gameCheckboxes: HTMLLabelElement[] = [];
  let awardCheckboxes: HTMLLabelElement[] = [];

  async function openEdit() {
    [cachedUsers, cachedGames, cachedAwards] = await Promise.all([
      cachedUsers ?? fetchAll<User>("user").then(u => u ?? []),
      cachedGames ?? fetchAll<Game>("game").then(g => g ?? []),
      cachedAwards ?? fetchAll<Award>("award").then(a => a ?? []),
    ]);

    // Header / meta
    datesDisplay.style.display = "none";
    descDisplay.style.display = "none";
    invitationDisplay.style.display = "none";
    editBar.style.display = "";
    editFields.style.display = "flex";
    document.getElementById("event-images")?.style.setProperty("display", "none");
    document.getElementById("event-quotes")?.style.setProperty("display", "none");

    // Participants: rebuild as checkboxes
    pPillList.className = "pill-list";
    pPillList.innerHTML = "";
    userCheckboxes = (cachedUsers ?? []).map(user => {
      const isOn = lan.participants?.some(p => p.id === user.id) ?? false;
      const participant = lan.participants?.find(p => p.id === user.id);
      const row = buildCheckbox(participant ?? user, "participants", isOn);
      if (participant?.eventNickname) row.setAttribute("data-event-nickname", participant.eventNickname);
      row.dataset.userId = String(user.id);
      if (isOn) {
        row.style.backgroundColor = `color-mix(in srgb, ${user.color} 20%, var(--bg))`;
        row.style.color = user.color;
        row.style.fontWeight = "700";
      }
      row.querySelector<HTMLInputElement>("input")!.addEventListener("change", () =>
        refreshNicknameSection(userCheckboxes, cachedUsers ?? [])
      );
      pPillList.appendChild(row);
      return row;
    });
    pSection.appendChild(nicknameSection);
    refreshNicknameSection(userCheckboxes, cachedUsers ?? []);
    if (!pSection.parentElement) content.insertBefore(pSection, gSection.parentElement ? gSection : null);

    // Games: rebuild as checkboxes
    gPillList.className = "pill-list";
    gPillList.innerHTML = "";
    gameCheckboxes = (cachedGames ?? []).map(game => {
      const isOn = lan.games?.some(g => g.id === game.id) ?? false;
      const row = buildCheckbox(game, "games", isOn);
      if (!isOn) row.style.display = "none";
      else row.style.backgroundColor = "var(--bg-dark)";
      gPillList.appendChild(row);
      return row;
    });
    newGameInput.style.display = "";
    gSection.appendChild(newGameInput);
    if (!gSection.parentElement) content.insertBefore(gSection, aSection.parentElement ? aSection : null);

    // Awards: rebuild as checkboxes
    aPillList.className = "pill-list";
    aPillList.innerHTML = "";
    awardCheckboxes = (cachedAwards ?? []).map(award => {
      const isOn = lan.awards?.some(a => a.id === award.id) ?? false;
      const row = buildCheckbox(award, "awards", isOn);
      if (!isOn) row.style.display = "none";
      else row.style.backgroundColor = "var(--bg-dark)";
      aPillList.appendChild(row);
      return row;
    });
    newAwardInput.style.display = "";
    aSection.appendChild(newAwardInput);
    if (!aSection.parentElement) content.insertBefore(aSection, null);

    // Show all unchecked game/award pills in edit mode
    for (const row of [...gameCheckboxes, ...awardCheckboxes]) row.style.display = "";

    editBtn.style.display = "none";
    content.classList.add("editing");
  }

  function closeEdit() {
    // Restore header
    datesDisplay.style.display = "";
    descDisplay.style.display = "";
    invitationDisplay.style.display = lan.invitation ? "" : "none";
    editBar.style.display = "none";
    editFields.style.display = "none";
    document.getElementById("event-images")?.style.removeProperty("display");
    document.getElementById("event-quotes")?.style.removeProperty("display");

    // Restore participants
    pPillList.className = "pill-list event-pills";
    buildParticipantViewPills();
    nicknameSection.remove();
    if (!lan.participants?.length && !lanGuests.length) pSection.remove();

    // Restore games
    gPillList.className = "pill-list event-pills";
    buildGameViewPills();
    newGameInput.remove();
    if (!lan.games?.length) gSection.remove();

    // Restore awards
    aPillList.className = "pill-list event-pills";
    buildAwardViewPills();
    newAwardInput.remove();
    if (!lan.awards?.length) aSection.remove();

    editBtn.style.display = "";
    content.classList.remove("editing");
  }

  async function handleSave() {
    const fd = new FormData();
    fd.append("lanId", String(lan.lanId));
    fd.append("description", descInput.value);
    fd.append("startDate", `${yearInput.value}-01-01`);
    fd.append("endDate", `${yearInput.value}-12-31`);
    fd.append("fromDisplay", fromInput.value);
    fd.append("toDisplay", toInput.value);
    const eraRadio = eraGroup.querySelector<HTMLInputElement>("input:checked");
    fd.append("event", eraRadio?.value ?? lan.event);
    fd.append("invitation", invitationInput.value);
    fd.append("isRomjulsLAN", romjulsCheckbox.checked ? "1" : "0");
    for (const lbl of userCheckboxes) {
      if (lbl.querySelector<HTMLInputElement>("input")?.checked) fd.append("participants", lbl.querySelector<HTMLInputElement>("input")!.value);
    }
    for (const lbl of gameCheckboxes) {
      if (lbl.querySelector<HTMLInputElement>("input")?.checked) fd.append("games", lbl.querySelector<HTMLInputElement>("input")!.value);
    }
    for (const lbl of awardCheckboxes) {
      if (lbl.querySelector<HTMLInputElement>("input")?.checked) fd.append("awards", lbl.querySelector<HTMLInputElement>("input")!.value);
    }

    const res = await fetch("http://localhost:8080/api/lan/", {
      method: "PATCH",
      headers: authHeaders(),
      body: fd,
    });

    if (res.ok) {
      const updated: LAN = await res.json();
      lan.description = descInput.value;
      lan.invitation = invitationInput.value || undefined;
      lan.fromDisplay = fromInput.value || undefined;
      lan.toDisplay = toInput.value || undefined;
      lan.event = (eraRadio?.value ?? lan.event) as typeof lan.event;
      lan.participants = updated.participants ?? [];
      lan.games = updated.games ?? [];
      lan.awards = updated.awards ?? [];
      lan.isRomjulsLAN = romjulsCheckbox.checked;
      content.classList.toggle("romjulslan", lan.isRomjulsLAN);

      const newYear = yearInput.value;
      descDisplay.textContent = lan.description;
      invitationDisplay.textContent = lan.invitation ?? "";
      invitationDisplay.style.display = lan.invitation ? "" : "none";
      const newDates = buildDatesText(fromInput.value, toInput.value);
      datesDisplay.textContent = newDates;
      const hashEl = createElement("span"); hashEl.className = "hash"; hashEl.textContent = "#";
      title.innerHTML = ""; title.appendChild(hashEl);
      title.append(`${eventLabels[lan.event] ?? lan.event} ${newYear}`);
    }

    closeEdit();
  }

  newGameInput.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const name = newGameInput.value.trim();
    if (!name) return;
    const fd = new FormData(); fd.append("gameName", name);
    const res = await fetch("http://localhost:8080/api/game/", { method: "POST", headers: authHeaders(), body: fd });
    if (!res.ok) return;
    const game: Game = await res.json();
    if (cachedGames) cachedGames.push(game);
    const row = buildCheckbox(game, "games", true);
    row.style.backgroundColor = "var(--bg-dark)";
    gameCheckboxes.push(row);
    gPillList.insertBefore(row, newGameInput);
    newGameInput.value = "";
  });

  newAwardInput.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const name = newAwardInput.value.trim();
    if (!name) return;
    const fd = new FormData(); fd.append("awardName", name);
    const res = await fetch("http://localhost:8080/api/award/", { method: "POST", headers: authHeaders(), body: fd });
    if (!res.ok) return;
    const award: Award = await res.json();
    if (cachedAwards) cachedAwards.push(award);
    const row = buildCheckbox(award, "awards", true);
    row.style.backgroundColor = "var(--bg-dark)";
    awardCheckboxes.push(row);
    aPillList.insertBefore(row, newAwardInput);
    newAwardInput.value = "";
  });

  saveBtn.addEventListener("click", handleSave);
  cancelBtn.addEventListener("click", closeEdit);

  if (tweets.length) {
    renderTweetFeed(tweets, lanImageFilenames);
  }
}

function renderQuoteSection(lanId: number, quotes: LanQuote[]) {
  const section = createElement("section");
  section.className = "event-section";
  section.id = "event-quotes";

  const h2 = createElement("h2");
  h2.innerHTML = `<span class="hash">#</span>Sitater <span class="section-count">(${quotes.length})</span>`;
  section.appendChild(h2);

  const quoteList = createElement("div") as HTMLDivElement;
  quoteList.className = "quote-list";

  function buildQuoteEl(q: LanQuote): HTMLElement {
    const bq = createElement("blockquote") as HTMLElement;
    bq.className = "lan-quote";

    const p = createElement("p") as HTMLParagraphElement;
    p.className = "quote-text";
    p.textContent = `«${q.quote}»`;
    bq.appendChild(p);

    const footer = createElement("footer") as HTMLElement;
    footer.className = "quote-attribution";
    footer.textContent = q.attributedTo ? `— ${q.attributedTo}` : "";
    footer.style.display = q.attributedTo ? "" : "none";
    bq.appendChild(footer);

    if (me?.role === "admin") {
      const actions = createElement("div") as HTMLDivElement;
      actions.className = "quote-actions";

      const edit = createElement("button") as HTMLButtonElement;
      edit.type = "button"; edit.className = "quote-edit-btn"; edit.textContent = "✎";

      const del = createElement("button") as HTMLButtonElement;
      del.type = "button"; del.className = "quote-delete-btn"; del.textContent = "✕";
      del.addEventListener("click", async () => {
        const res = await fetch(`http://localhost:8080/api/lan/${lanId}/quotes/${q.id}/`, {
          method: "DELETE", headers: authHeaders(),
        });
        if (res.ok) bq.remove();
      });

      edit.addEventListener("click", () => {
        const quoteEditInput = createElement("input") as HTMLInputElement;
        quoteEditInput.type = "text"; quoteEditInput.className = "lan-text-input quote-edit-input";
        quoteEditInput.value = q.quote;

        const attrEditInput = createElement("input") as HTMLInputElement;
        attrEditInput.type = "text"; attrEditInput.className = "lan-text-input quote-edit-input";
        attrEditInput.value = q.attributedTo ?? "";
        attrEditInput.placeholder = "Hvem sa det?";

        const save = createElement("button") as HTMLButtonElement;
        save.type = "button"; save.className = "quote-submit-btn"; save.textContent = "Lagre";

        const cancel = createElement("button") as HTMLButtonElement;
        cancel.type = "button"; cancel.className = "quote-delete-btn"; cancel.textContent = "Avbryt";

        const editForm = createElement("div") as HTMLDivElement;
        editForm.className = "quote-edit-form";
        editForm.appendChild(quoteEditInput); editForm.appendChild(attrEditInput);
        editForm.appendChild(save); editForm.appendChild(cancel);

        p.style.display = "none";
        if (footer) footer.style.display = "none";
        bq.insertBefore(editForm, actions);

        cancel.addEventListener("click", () => {
          editForm.remove();
          p.style.display = ""; if (footer) footer.style.display = "";
        });

        save.addEventListener("click", async () => {
          const text = quoteEditInput.value.trim();
          if (!text) return;
          const fd = new URLSearchParams({ quote: text, attributedTo: attrEditInput.value.trim() });
          const res = await fetch(`http://localhost:8080/api/lan/${lanId}/quotes/${q.id}/`, {
            method: "PATCH", headers: authHeaders(), body: fd,
          });
          if (res.ok) {
            const updated: LanQuote = await res.json();
            q.quote = updated.quote; q.attributedTo = updated.attributedTo;
            p.textContent = `«${updated.quote}»`;
            if (footer) footer.textContent = updated.attributedTo ? `— ${updated.attributedTo}` : "";
            if (footer) footer.style.display = updated.attributedTo ? "" : "none";
            editForm.remove();
            p.style.display = "";
          }
        });

        quoteEditInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); attrEditInput.focus(); } });
        attrEditInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); save.click(); } });
        quoteEditInput.focus();
      });

      actions.appendChild(edit); actions.appendChild(del);
      bq.appendChild(actions);
    }

    return bq;
  }

  for (const q of quotes) {
    quoteList.appendChild(buildQuoteEl(q));
  }
  section.appendChild(quoteList);

  // Add form — available to all logged-in users
  const form = createElement("div") as HTMLDivElement;
  form.className = "quote-add-form";

  const quoteInput = createElement("input") as HTMLInputElement;
  quoteInput.type = "text";
  quoteInput.placeholder = "Sitat...";
  quoteInput.className = "lan-text-input";

  const attrInput = createElement("input") as HTMLInputElement;
  attrInput.type = "text";
  attrInput.placeholder = "Hvem sa det?";
  attrInput.className = "lan-text-input";

  const submitBtn = createElement("button") as HTMLButtonElement;
  submitBtn.type = "button";
  submitBtn.className = "quote-submit-btn";
  submitBtn.textContent = "Legg til";

  const submit = async () => {
    const text = quoteInput.value.trim();
    if (!text) return;
    const fd = new URLSearchParams({ quote: text, attributedTo: attrInput.value.trim() });
    const res = await fetch(`http://localhost:8080/api/lan/${lanId}/quotes/`, {
      method: "POST",
      headers: authHeaders(),
      body: fd,
    });
    if (res.ok) {
      const q: LanQuote = await res.json();
      quoteList.appendChild(buildQuoteEl(q));
      quoteInput.value = "";
      attrInput.value = "";
    }
  };

  submitBtn.addEventListener("click", submit);
  quoteInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); attrInput.focus(); } });
  attrInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } });

  form.appendChild(quoteInput);
  form.appendChild(attrInput);
  form.appendChild(submitBtn);
  section.appendChild(form);

  content.appendChild(section);
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
  section.id = "event-images";

  const header = createElement("div");
  header.className = "event-section-header";
  const h2 = createElement("h2");
  h2.innerHTML = `<span class="hash">#</span>Bilder <span class="section-count">(${lanImages.length})</span>`;
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
      const de = e as DragEvent;
      dragSrc = (de.target as HTMLElement).closest(".image-card");
      if (!dragSrc) return;
      if (!selected.has(dragSrc)) {
        selected.forEach((c) => c.classList.remove("selected"));
        selected.clear();
      }
      const dragging = selected.size > 0 ? Array.from(selected) : [dragSrc];
      dragging.forEach((c) => c.classList.add("dragging"));
      de.dataTransfer!.effectAllowed = "move";
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
    const click = e as MouseEvent;
    if ((click.target as HTMLElement).closest(".image-delete-btn, .image-tag-strip, .image-tag-add")) return;
    if (click.shiftKey && me!.role === "admin") {
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
  section.id = "event-tweets";
  const h2 = createElement("h2");
  h2.innerHTML = `<span class="hash">#</span>Twitter <span class="section-count">(${tweets.length})</span>`;
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
