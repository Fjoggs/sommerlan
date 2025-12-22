export const showError = (message: string) => {
  const toast = document.createElement("div");
  toast.className = "error-toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 5000);
};

// Global error boundary for unhandled rejections
window.addEventListener("unhandledrejection", (event) => {
  event.preventDefault();
  console.error("Unhandled rejection:", event.reason);

  if (event.reason?.name === "ApiError") {
    showError(event.reason.message);
  } else {
    showError("An unexpected error occurred");
  }
});
