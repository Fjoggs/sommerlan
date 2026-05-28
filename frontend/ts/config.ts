const res = await fetch("http://localhost:8080/api/countdown/");
const data = await res.json();
export const LAN_START = new Date(data.target);
