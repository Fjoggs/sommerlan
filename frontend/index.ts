import "./ts/errorHandler.js";
import { fetchLans } from "./ts/frontpage.js";

// Prevent animations on page load
document.addEventListener("DOMContentLoaded", () => {
  // Add no-transitions class to body
  document.body.classList.add("no-transitions");

  // Remove it after a short delay to enable transitions
  setTimeout(() => {
    document.body.classList.remove("no-transitions");
  }, 100);
});

await fetchLans();
