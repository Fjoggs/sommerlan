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

const btn = document.getElementById("trigger-btn") as HTMLButtonElement;
const started = document.getElementById("countdown-started")!;
const textEl = document.getElementById("typewriter-text")!;

btn.addEventListener("click", async () => {
  btn.disabled = true;
  btn.classList.add("fading-out");

  await delay(400);
  btn.hidden = true;
  btn.classList.remove("fading-out");

  textEl.textContent = "";
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
  await delay(1500);
  hore.hidden = true;

  textEl.textContent = "";
  btn.hidden = false;
  btn.disabled = false;
});
