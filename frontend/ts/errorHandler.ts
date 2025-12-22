// ts/errorHandler.ts
export const showError = (message: string) => {
  const toast = document.createElement("div");
  toast.className = "error-toast";

  // Create icon
  const icon = document.createElement("span");
  icon.className = "toast-icon";
  icon.textContent = "!";

  // Create message
  const messageSpan = document.createElement("span");
  messageSpan.className = "toast-message";
  messageSpan.textContent = message;

  toast.appendChild(icon);
  toast.appendChild(messageSpan);

  // Get or create toast container
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  // Add new toast to container (newest at top)
  container.insertBefore(toast, container.firstChild);

  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 300);
  }, 5000);
};

// Global error boundary for unhandled rejections
window.addEventListener("unhandledrejection", (event) => {
  event.preventDefault();
  console.error("Unhandled rejection:", event.reason);

  showError("An unexpected error occurred");
});
