(() => {
  const config = window.PORTFOLIO_CONFIG || {};
  const name = typeof config.name === "string" && config.name.trim() ? config.name.trim() : "Kyle Josef M. Bonachita";
  document.querySelectorAll("[data-owner-name]").forEach((node) => { node.textContent = name; });
  const location = typeof config.location === "string" ? config.location.trim() : "";
  document.querySelectorAll("[data-location]").forEach((node) => { if (location) node.textContent = location; });
  document.querySelectorAll("[data-year]").forEach((node) => { node.textContent = String(new Date().getFullYear()); });

  const email = typeof config.email === "string" ? config.email.trim() : "";
  const emailLinks = document.querySelectorAll(".js-email-link");
  const contactPlaceholder = document.querySelector(".js-contact-placeholder");
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const subject = encodeURIComponent("Let's talk about a workflow");
    emailLinks.forEach((link) => {
      link.href = "mailto:" + email + "?subject=" + subject;
      link.hidden = false;
    });
    if (contactPlaceholder) contactPlaceholder.hidden = true;
  }
  [
    [".js-linkedin-link", config.linkedin],
    [".js-github-link", config.github],
    [".js-upwork-link", config.upwork]
  ].forEach(([selector, value]) => {
    if (typeof value !== "string" || !/^https:\/\//i.test(value.trim())) return;
    document.querySelectorAll(selector).forEach((link) => {
      link.href = value.trim();
      link.hidden = false;
    });
  });

  const menuButton = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".site-nav");
  if (menuButton && nav) {
    const closeMenu = () => {
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Open navigation");
      nav.classList.remove("is-open");
    };
    menuButton.addEventListener("click", () => {
      const willOpen = menuButton.getAttribute("aria-expanded") !== "true";
      menuButton.setAttribute("aria-expanded", String(willOpen));
      menuButton.setAttribute("aria-label", willOpen ? "Close navigation" : "Open navigation");
      nav.classList.toggle("is-open", willOpen);
    });
    nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMenu(); });
    window.addEventListener("resize", () => { if (window.innerWidth > 820) closeMenu(); });
  }

  const revealNodes = document.querySelectorAll(".reveal");
  if (revealNodes.length) {
    document.documentElement.classList.add("js");
    if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08, rootMargin: "0px 0px 35px 0px" });
      revealNodes.forEach((node) => observer.observe(node));
    } else {
      revealNodes.forEach((node) => node.classList.add("is-visible"));
    }
  }
})();
