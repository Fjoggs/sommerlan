import { getAuthUser, authHeaders } from "./auth.js";


const me = await getAuthUser();
if (me) {
  const avatar = document.getElementById("profile-avatar") as HTMLAnchorElement | null;
  if (avatar) {
    const initial = (me.nickname ?? me.name).charAt(0).toUpperCase();
    avatar.textContent = initial;
    avatar.style.background = me.color2
      ? `linear-gradient(135deg, ${me.color}, ${me.color2})`
      : me.color || "var(--primary)";
  }

  if (me.impersonating) {
    const banner = document.createElement("div");
    banner.className = "impersonation-banner";
    const displayName = me.nickname || me.name;
    banner.innerHTML = `Innlogget som <strong>${displayName}</strong> (testmodus)`;
    const stopBtn = document.createElement("button");
    stopBtn.textContent = "Avslutt";
    stopBtn.className = "impersonation-stop-btn";
    stopBtn.addEventListener("click", async () => {
      await fetch("/api/admin/impersonate/stop/", {
        method: "POST",
        headers: authHeaders(),
      });
      window.location.reload();
    });
    banner.appendChild(stopBtn);
    document.body.insertBefore(banner, document.body.firstChild);
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
