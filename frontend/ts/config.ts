const res = await fetch("/api/countdown/");
const data = await res.json();
export const LAN_START = new Date(data.target);
