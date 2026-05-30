import { getAuthUser } from "./auth.js";
import { LAN_START } from "./config.js";

const TARGET = LAN_START;

async function init() {
  await getAuthUser();
  tick();
  setInterval(tick, 1000);
}

function tick() {
  const now = new Date();
  const diff = TARGET.getTime() - now.getTime();

  if (diff <= 0) {
    const units = document.getElementById("countdown-units")!;
    const rsvp = document.querySelector<HTMLElement>(".countdown-rsvp");
    units.classList.add("fading-out");
    if (rsvp) rsvp.classList.add("fading-out");

    setTimeout(() => {
      const timerGroup = document.querySelector<HTMLElement>(".countdown-timer-group");
      if (timerGroup) timerGroup.hidden = true;
      const started = document.getElementById("countdown-started")!;
      started.hidden = false;
      started.classList.add("active");
      setTimeout(() => window.location.replace("/"), 4600);
    }, 800);

    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  (document.getElementById("cd-days") as HTMLElement).textContent = String(days);
  (document.getElementById("cd-hours") as HTMLElement).textContent = String(hours).padStart(2, "0");
  (document.getElementById("cd-minutes") as HTMLElement).textContent = String(minutes).padStart(2, "0");
  (document.getElementById("cd-seconds") as HTMLElement).textContent = String(seconds).padStart(2, "0");
}

init();
