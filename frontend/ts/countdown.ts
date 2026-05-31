import { getAuthUser } from "./auth.js";
import { LAN_START } from "./config.js";

const TARGET = LAN_START;

async function init() {
  await getAuthUser();
  tick();
  setInterval(tick, 1000);
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function typewrite(el: HTMLElement, text: string): Promise<void> {
  for (const char of text) {
    el.textContent += char;
    let ms = 65 + Math.random() * 45;
    if (char === "." || char === "!") ms += 250;
    else if (char === ",") ms += 120;
    else if (char === " ") ms -= 20;
    await delay(ms);
  }
}

let done = false;

function tick() {
  if (done) return;

  const now = new Date();
  const diff = TARGET.getTime() - now.getTime();

  if (diff <= 0) {
    done = true;
    const units = document.getElementById("countdown-units")!;
    const rsvp = document.querySelector<HTMLElement>(".countdown-rsvp");
    units.classList.add("fading-out");
    if (rsvp) rsvp.classList.add("fading-out");

    setTimeout(async () => {
      const timerGroup = document.querySelector<HTMLElement>(".countdown-timer-group");
      if (timerGroup) timerGroup.hidden = true;

      const started = document.getElementById("countdown-started")!;
      const textEl = document.getElementById("typewriter-text")!;
      started.hidden = false;

      await delay(500);
      await typewrite(textEl, "Nei nå skare bli godt å få chilla litt i den STOLEN ass");
      await delay(1000);
      started.classList.add("fading-out");
      await delay(800);
      started.hidden = true;
      started.classList.remove("fading-out");

      const hore = document.getElementById("hore-text")!;
      hore.hidden = false;
      await delay(600);
      window.location.replace("/");
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
