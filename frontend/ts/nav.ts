import { getAuthUser, authHeaders } from "./auth.js";
import { LAN_START } from "./config.js";


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

// Wire up RSVP/Påmeldte nav links to the next upcoming LAN
try {
  const res = await fetch("/api/lan/", { headers: authHeaders() });
  if (res.ok) {
    const lans: { lanId: number; startDate: string }[] = await res.json();
    const today = new Date().toISOString().substring(0, 10);
    const upcoming = lans
      .filter((l) => l.startDate > today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
    document.querySelectorAll<HTMLAnchorElement>("a.nav-pre-lan").forEach((el) => {
      if (upcoming) {
        const url = new URL(el.href, location.href);
        url.searchParams.set("lan", String(upcoming.lanId));
        el.href = url.toString();
      } else {
        el.hidden = true;
      }
    });
  }
} catch { /* ignore */ }
