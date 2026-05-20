const LAN_START = new Date("2026-07-14T00:00:00");

if (new Date() >= LAN_START) {
  document.querySelectorAll<HTMLElement>(".nav-pre-lan").forEach((el) => {
    el.hidden = true;
  });
}
