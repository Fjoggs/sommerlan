import { requireAuth } from "./auth.js";

const TARGET = new Date("2026-07-20T13:37:00");

async function init() {
  const me = await requireAuth();
  if (!me) return;
  tick();
  setInterval(tick, 1000);
}

function tick() {
  const now = new Date();
  const diff = TARGET.getTime() - now.getTime();

  if (diff <= 0) {
    document.getElementById("countdown-units")!.hidden = true;
    document.getElementById("countdown-started")!.hidden = false;
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
