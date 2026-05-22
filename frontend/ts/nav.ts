import { requireAuth } from "./auth.js";

const LAN_START = new Date("2026-07-14T00:00:00");

if (new Date() >= LAN_START) {
  document.querySelectorAll<HTMLElement>(".nav-pre-lan").forEach((el) => {
    el.hidden = true;
  });
}

const me = await requireAuth();
if (me) {
  const avatar = document.getElementById("profile-avatar") as HTMLAnchorElement | null;
  if (avatar) {
    const initial = (me.nickname ?? me.name).charAt(0).toUpperCase();
    avatar.textContent = initial;
    avatar.style.backgroundColor = me.color || "var(--primary)";
  }

}

const nav = document.querySelector<HTMLElement>("nav.menu");
if (nav) {
  const hamburger = document.createElement("button");
  hamburger.className = "hamburger";
  hamburger.type = "button";
  hamburger.setAttribute("aria-label", "Meny");
  hamburger.setAttribute("aria-expanded", "false");
  hamburger.textContent = "☰";

  const close = () => {
    nav.classList.remove("open");
    hamburger.setAttribute("aria-expanded", "false");
    hamburger.textContent = "☰";
  };

  hamburger.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = nav.classList.toggle("open");
    hamburger.setAttribute("aria-expanded", String(open));
    hamburger.textContent = open ? "✕" : "☰";
  });

  nav.insertBefore(hamburger, nav.firstChild);

  nav.querySelectorAll<HTMLElement>(".menu-item").forEach((item) => {
    item.addEventListener("click", close);
  });

  document.addEventListener("click", (e) => {
    if (nav.classList.contains("open") && !nav.contains(e.target as Node)) {
      close();
    }
  });
}
