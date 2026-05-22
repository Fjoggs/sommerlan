import { fetchAll, fetchById } from "./crud.js";
import { showError } from "./errorHandler.js";
import { LAN, Participant, User } from "./types.js";

const API_URL = "http://localhost:8080/api";

const GROUPS: { dates: string[]; cls: string }[] = [
  { dates: ["2026-07-14", "2026-07-15", "2026-07-16"], cls: "col-preprelan" },
  { dates: ["2026-07-17", "2026-07-18", "2026-07-19"], cls: "col-prelan" },
  {
    dates: [
      "2026-07-20", "2026-07-21", "2026-07-22", "2026-07-23",
      "2026-07-24", "2026-07-25", "2026-07-26",
    ],
    cls: "col-main",
  },
];

const getUpcomingLanId = async (): Promise<number | undefined> => {
  const lans = await fetchAll<LAN>("lan");
  if (!lans?.length) return undefined;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = lans
    .filter((lan) => new Date(lan.endDate) >= today)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  return upcoming[0]?.lanId;
};

const renderParticipants = (participants: Participant[]) => {
  const container = document.getElementById("participants-body")!;
  container.innerHTML = "";

  participants.forEach((participant) => {
    const row = document.createElement("div");
    row.className = "rsvp-row";

    const nameCell = document.createElement("div");
    nameCell.className = "rsvp-name";
    nameCell.textContent = participant.name;
    nameCell.style.color = participant.color;
    row.appendChild(nameCell);

    GROUPS.forEach(({ dates, cls }) => {
      const group = document.createElement("div");
      group.className = `rsvp-group ${cls}`;

      dates.forEach((date) => {
        const ribbon = document.createElement("span");
        const attending = participant.dates?.includes(date) ?? false;
        ribbon.className = attending ? "ribbon ribbon--on" : "ribbon ribbon--off";
        if (attending) ribbon.style.backgroundColor = participant.color;
        group.appendChild(ribbon);
      });

      row.appendChild(group);
    });

    container.appendChild(row);
  });
};

const populateUsers = async () => {
  const users = await fetchAll<User>("user");
  if (!users) return;

  const select = document.getElementById("user-select") as HTMLSelectElement;
  users.forEach((user) => {
    const option = document.createElement("option");
    option.value = String(user.id);
    option.textContent = user.name;
    select.appendChild(option);
  });
};

const lanId = await getUpcomingLanId();

if (!lanId) {
  showError("Ingen kommende LAN funnet");
} else {
  const loadParticipants = async () => {
    const lan = await fetchById<LAN>("lan", lanId);
    if (!lan) return;
    renderParticipants(lan.participants ?? []);
  };

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    const userId = (form.elements.namedItem("userId") as HTMLSelectElement).value;
    const dates = Array.from(
      form.querySelectorAll<HTMLInputElement>("input[name=date]:checked"),
    ).map((cb) => cb.value);

    const body = new FormData();
    body.append("lanId", String(lanId));
    body.append("userId", userId);
    dates.forEach((date) => body.append("dates", date));

    const res = await fetch(`${API_URL}/rsvp/`, { method: "POST", body });
    if (!res.ok) {
      showError(`${res.status}: Failed to submit RSVP`);
      return;
    }

    const lan: LAN = await res.json();
    renderParticipants(lan.participants ?? []);
    form.reset();
  };

  document.querySelectorAll<HTMLButtonElement>(".select-all-btn").forEach((btn) => {
  const group = btn.closest(".date-group")!;
  const checkboxes = Array.from(group.querySelectorAll<HTMLInputElement>("input[type=checkbox]"));

  const update = () => {
    const allChecked = checkboxes.every((cb) => cb.checked);
    btn.classList.toggle("all-selected", allChecked);
  };

  checkboxes.forEach((cb) => cb.addEventListener("change", update));

  btn.addEventListener("click", () => {
    const allChecked = checkboxes.every((cb) => cb.checked);
    checkboxes.forEach((cb) => (cb.checked = !allChecked));
    update();
  });
});

document.getElementById("rsvp-form")?.addEventListener("submit", onSubmit);

  await populateUsers();
  await loadParticipants();
}
