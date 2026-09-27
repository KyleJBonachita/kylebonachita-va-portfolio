(() => {
  "use strict";

  const keys = ["automation", "web-development", "data-operations"];
  const labels = {
    automation: "Automation",
    "web-development": "Web development",
    "data-operations": "Data operations"
  };
  const chapters = keys
    .map((key) => document.querySelector(`[data-chapter][id="${key}"]`))
    .filter(Boolean);
  if (!chapters.length) return;

  const chapterByKey = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const controls = [...document.querySelectorAll("[data-focus]")]
    .filter((control) => control.dataset.focus === "all" || chapterByKey.has(control.dataset.focus));
  const status = document.querySelector("[data-focus-status]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const revealNodes = [...document.querySelectorAll("[data-reveal]")];
  let mode = "all";
  let progressFrame = 0;
  let revealObserver;
  let chapterObserver;

  document.documentElement.classList.add("chapters-js");

  function hashKey() {
    try {
      return decodeURIComponent(window.location.hash.slice(1)).toLowerCase();
    } catch {
      return "";
    }
  }

  function modeFromLocation() {
    const key = hashKey();
    return chapterByKey.has(key) ? key : "all";
  }

  function revealEverything() {
    revealNodes.forEach((node) => node.classList.add("is-visible"));
    if (revealObserver) {
      revealObserver.disconnect();
      revealObserver = undefined;
    }
  }

  function setupReveals() {
    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      revealEverything();
      return;
    }
    revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
    revealNodes.forEach((node) => revealObserver.observe(node));
    document.documentElement.classList.add("motion-ready");
  }

  function scheduleProgress() {
    if (progressFrame) return;
    progressFrame = window.requestAnimationFrame(updateProgress);
  }

  function updateProgress() {
    progressFrame = 0;
    const viewportHeight = Math.max(window.innerHeight, 1);
    let current = "";
    let bestDistance = Infinity;

    chapters.forEach((chapter) => {
      if (chapter.hidden) return;
      const rect = chapter.getBoundingClientRect();
      const value = Math.min(1, Math.max(0,
        (viewportHeight - rect.top) / (viewportHeight + Math.max(rect.height, 1))
      ));
      const percentage = `${(value * 100).toFixed(2)}%`;
      chapter.style.setProperty("--chapter-progress", percentage);
      chapter.dataset.progress = String(Math.round(value * 100));
      const progressNode = chapter.querySelector("[data-chapter-progress]");
      if (progressNode) progressNode.style.setProperty("--chapter-progress", percentage);

      if (rect.bottom <= 0 || rect.top >= viewportHeight) return;
      const distance = Math.abs((rect.top + Math.min(rect.height, viewportHeight) / 2) - viewportHeight / 2);
      if (distance < bestDistance) {
        bestDistance = distance;
        current = chapter.id;
      }
    });

    chapters.forEach((chapter) => chapter.classList.toggle("is-current", chapter.id === current));
    if (current) document.documentElement.dataset.currentChapter = current;
    else delete document.documentElement.dataset.currentChapter;
  }

  function setupChapterObserver() {
    if (!("IntersectionObserver" in window)) return;
    chapterObserver = new IntersectionObserver(() => scheduleProgress(), {
      rootMargin: "-10% 0px -10% 0px",
      threshold: [0, 0.1, 0.25, 0.5, 0.75]
    });
    chapters.forEach((chapter) => chapterObserver.observe(chapter));
  }

  function targetFor(key) {
    const chapter = key === "all" ? chapters[0] : chapterByKey.get(key);
    if (!chapter) return null;
    return chapter.querySelector("h2, h3") || chapter;
  }

  function focusTarget(target) {
    if (!target) return;
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    try {
      target.focus({ preventScroll: true });
    } catch {
      target.focus();
    }
  }

  function moveToChapter(key, { focus = false, smooth = false } = {}) {
    const target = targetFor(key);
    if (!target) return;
    if (focus) focusTarget(target);
    window.requestAnimationFrame(() => {
      target.scrollIntoView({
        block: "start",
        behavior: smooth && !reducedMotion.matches ? "smooth" : "auto"
      });
    });
  }

  function render(nextMode, options = {}) {
    mode = nextMode === "all" || chapterByKey.has(nextMode) ? nextMode : "all";
    const focused = mode !== "all";
    document.documentElement.dataset.chapterFocus = mode;
    document.documentElement.classList.toggle("chapter-focus-mode", focused);

    chapters.forEach((chapter) => {
      const hide = focused && chapter.id !== mode;
      chapter.hidden = hide;
      // A component's author CSS can override the browser's default [hidden] rule.
      chapter.style.display = hide ? "none" : "";
      chapter.classList.toggle("is-focused", focused && !hide);
    });

    controls.forEach((control) => {
      const selected = control.dataset.focus === mode;
      control.setAttribute("aria-pressed", String(selected));
      control.classList.toggle("is-active", selected);
      control.setAttribute("aria-controls",
        control.dataset.focus === "all"
          ? chapters.map((chapter) => chapter.id).join(" ")
          : control.dataset.focus
      );
      if (control.tagName === "BUTTON" && !control.hasAttribute("type")) control.type = "button";
    });

    if (status) {
      status.textContent = mode === "all"
        ? "Showing all three areas in order."
        : `Showing ${labels[mode]} projects only.`;
    }
    scheduleProgress();
    if (options.scroll) moveToChapter(mode, { focus: Boolean(options.focus), smooth: Boolean(options.smooth) });
  }

  controls.forEach((control) => {
    control.addEventListener("click", (event) => {
      event.preventDefault();
      const key = control.dataset.focus;
      if (key !== mode || hashKey() !== key) {
        window.history.pushState({ chapterFocus: key }, "", `#${key}`);
      }
      render(key, { scroll: true, focus: true, smooth: true });
    });
  });

  function syncLocation() {
    const key = hashKey();
    const nextMode = modeFromLocation();
    render(nextMode, { scroll: key === "all" || chapterByKey.has(key), smooth: false });
  }

  window.addEventListener("hashchange", syncLocation);
  window.addEventListener("popstate", syncLocation);
  window.addEventListener("scroll", scheduleProgress, { passive: true });
  window.addEventListener("resize", scheduleProgress, { passive: true });
  if (typeof reducedMotion.addEventListener === "function") {
    reducedMotion.addEventListener("change", () => {
      if (reducedMotion.matches) revealEverything();
    });
  } else if (typeof reducedMotion.addListener === "function") {
    reducedMotion.addListener(() => {
      if (reducedMotion.matches) revealEverything();
    });
  }

  setupReveals();
  setupChapterObserver();
  render(modeFromLocation());
  if (chapterByKey.has(hashKey())) {
    window.requestAnimationFrame(() => moveToChapter(hashKey()));
  }
})();