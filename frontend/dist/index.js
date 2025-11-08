const fetchData = async () => {
    const res = await fetch("http://localhost:8080/api/lan");
    const lans = await res.json();
    const preContainer = document.getElementById("pre");
    const mainContainer = document.getElementById("main");
    lans.forEach((lan) => {
        if (lan.event === "pre") {
            const entry = buildEntry(lan);
            preContainer?.appendChild(entry);
        }
    });
};
const buildEntry = (lan) => {
    const startDate = new Date(lan.startDate);
    const container = createElement("div", `id-${startDate}`);
    container.className = "timeline-event";
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
export const createElement = (tagName, id) => {
    const element = document.createElement(tagName);
    if (id) {
        element.setAttribute("id", id);
    }
    return element;
};
fetchData();
