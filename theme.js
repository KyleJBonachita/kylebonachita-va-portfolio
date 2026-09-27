(() => {
  "use strict";

  const key = "kyle-portfolio-theme";
  let theme = "dark";
  try {
    if (window.localStorage.getItem(key) === "light") theme = "light";
  } catch { /* Storage may be unavailable in a private browsing context. */ }

  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.add("has-js");

  function updateButton(button) {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    button.setAttribute("aria-label", `Switch to ${next} mode`);
    button.querySelector("[data-theme-label]").textContent = `${next[0].toUpperCase()}${next.slice(1)} mode`;
    button.querySelector("[data-theme-icon]").textContent = next === "light" ? "☼" : "☾";
    const color = document.querySelector('meta[name="theme-color"]');
    if (color) color.content = root.dataset.theme === "dark" ? "#0d141b" : "#f4f6f7";
  }

  document.addEventListener("DOMContentLoaded", () => {
    const shell = document.querySelector(".nav-shell");
    if (!shell) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-toggle";
    button.innerHTML = '<span data-theme-icon aria-hidden="true"></span><span data-theme-label></span>';
    shell.insertBefore(button, shell.querySelector(".menu-toggle"));
    updateButton(button);
    button.addEventListener("click", () => {
      root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
      try { window.localStorage.setItem(key, root.dataset.theme); } catch { /* Keep the in-page choice. */ }
      updateButton(button);
    });
  });
})();
