import { renderMatrix } from "./matrix.js";
import { requireAuth, authHeaders } from "./auth.js";
import type { RsvpEntry } from "./types.js";

const API_URL = "http://localhost:8080/api";
const lanId = new URLSearchParams(location.search).get("lan");

async function init() {
  const me = await requireAuth();
  if (!me) return;

  const container = document.getElementById("participant-matrix")!;

  if (!lanId) {
    container.innerHTML = `<p class="loading-text">Mangler LAN-ID i URL (?lan=ID).</p>`;
    return;
  }

  try {
    const res = await fetch(`${API_URL}/lan/${lanId}/rsvp/`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`${res.status}`);
    const entries: RsvpEntry[] = await res.json();
    renderMatrix(container, entries);
  } catch {
    container.innerHTML = `<p class="loading-text">Kunne ikke laste påmeldte.</p>`;
  }
}

init();
