(() => {
  "use strict";

  function init() {
    const projects = Array.isArray(window.PORTFOLIO_PROJECTS) ? window.PORTFOLIO_PROJECTS : [];
    const entries = new Map(projects.filter((project) => project && project.id).map((project) => [project.id, project]));
    if (!entries.size || typeof HTMLDialogElement === "undefined" || !HTMLDialogElement.prototype.showModal) return;
    document.documentElement.classList.add("gallery-ready");

    const element = (tag, className, text) => {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    };
    const button = (className, label, text) => {
      const node = element("button", className, text);
      node.type = "button";
      node.setAttribute("aria-label", label);
      return node;
    };
    const allowedUrl = (value) => {
      if (typeof value !== "string" || !value.trim()) return "";
      const path = value.trim();
      // Local previews can be opened directly from index.html. Permit only paths
      // inside this site, never a file: URL or a path that climbs out of it.
      if (/[\u0000-\u001f\u007f\\]/.test(path) || path.startsWith("//")) return "";
      try {
        const resolved = new URL(path, document.baseURI);
        if (["http:", "https:"].includes(resolved.protocol)) return path;
        if (resolved.protocol === "mailto:" && /^mailto:/i.test(path)) return path;
        if (resolved.protocol === "file:" && document.baseURI.startsWith("file:")
          && !/^(?:[a-z][a-z\d+.-]*:|\/)/i.test(path)
          && resolved.href.startsWith(new URL(".", document.baseURI).href)) return path;
        return "";
      } catch {
        return "";
      }
    };
    const slidesFor = (project) => Array.isArray(project.slides)
      ? project.slides.filter((slide) => slide && allowedUrl(slide.src))
      : [];

    const dialog = element("dialog", "project-dialog");
    dialog.setAttribute("aria-labelledby", "project-dialog-title");
    dialog.setAttribute("aria-describedby", "project-dialog-summary");
    const shell = element("div", "project-dialog-shell");
    const header = element("div", "project-dialog-header");
    const kicker = element("p", "project-dialog-kicker", "Project preview");
    const close = button("project-icon-button project-dialog-close", "Close project preview", "×");
    close.addEventListener("click", () => dialog.close());
    header.append(kicker, close);

    const grid = element("div", "project-dialog-grid");
    const media = element("figure", "project-dialog-media");
    const imageButton = button("project-gallery-image-button", "Enlarge project image");
    const image = element("img", "project-gallery-image");
    image.decoding = "async";
    imageButton.append(image, element("span", "project-image-hint", "Enlarge image ↗"));
    const mediaControls = element("div", "project-gallery-controls");
    const previous = button("project-icon-button project-gallery-previous", "Previous project image", "←");
    const count = element("span", "project-gallery-count", "1 / 1");
    count.setAttribute("aria-live", "polite");
    const next = button("project-icon-button project-gallery-next", "Next project image", "→");
    const autoplayToggle = button("project-gallery-autoplay", "Pause automatic slideshow", "Pause slides");
    mediaControls.append(previous, count, next, autoplayToggle);
    const caption = element("figcaption", "project-gallery-caption");
    media.append(imageButton, mediaControls, caption);

    const copy = element("div", "project-dialog-copy");
    const meta = element("p", "project-dialog-meta");
    const title = element("h2", "project-dialog-title");
    title.id = "project-dialog-title";
    const summary = element("p", "project-dialog-summary");
    summary.id = "project-dialog-summary";
    const detail = element("p", "project-dialog-detail");
    const highlights = element("ul", "project-dialog-highlights");
    const outcome = element("p", "project-dialog-outcome");
    const stack = element("ul", "project-dialog-stack");
    const actions = element("div", "project-dialog-actions");
    const seeMore = element("a", "project-dialog-action project-dialog-action-primary", "See more · full case study");
    const tryDemo = element("a", "project-dialog-action project-dialog-action-secondary", "Try demo");
    const viewCode = element("a", "project-dialog-action project-dialog-action-secondary", "View code");
    const demoUnavailable = button("project-dialog-action project-dialog-action-secondary", "Demo is not publicly available", "Try demo");
    demoUnavailable.disabled = true;
    const demoNote = element("p", "project-dialog-demo-note");
    actions.append(seeMore, tryDemo, demoUnavailable, viewCode);
    copy.append(meta, title, summary, detail, highlights, outcome, stack, actions, demoNote);
    grid.append(media, copy);
    shell.append(header, grid);
    dialog.append(shell);

    const zoom = element("dialog", "project-zoom-dialog");
    zoom.setAttribute("aria-label", "Project image viewer");
    const zoomShell = element("div", "project-zoom-shell");
    const zoomHeader = element("div", "project-zoom-header");
    const zoomTitle = element("p", "project-zoom-title", "Project image");
    const zoomActions = element("div", "project-zoom-actions");
    const actualSize = button("project-zoom-size", "View image at actual size", "Actual size");
    const zoomClose = button("project-icon-button", "Close enlarged image", "×");
    zoomClose.addEventListener("click", () => zoom.close());
    zoomActions.append(actualSize, zoomClose);
    zoomHeader.append(zoomTitle, zoomActions);
    const zoomViewport = element("div", "project-zoom-viewport");
    zoomViewport.dataset.size = "fit";
    const zoomImage = element("img", "project-zoom-image");
    zoomImage.decoding = "async";
    zoomViewport.append(zoomImage);
    const zoomFooter = element("div", "project-zoom-footer");
    const zoomPrev = button("project-icon-button", "Previous enlarged image", "←");
    const zoomCount = element("span", "project-zoom-count", "1 / 1");
    zoomCount.setAttribute("aria-live", "polite");
    const zoomNext = button("project-icon-button", "Next enlarged image", "→");
    const zoomCaption = element("p", "project-zoom-caption");
    zoomFooter.append(zoomPrev, zoomCount, zoomNext, zoomCaption);
    zoomShell.append(zoomHeader, zoomViewport, zoomFooter);
    zoom.append(zoomShell);
    document.body.append(dialog, zoom);

    let project = null;
    let slides = [];
    let index = 0;
    let returnFocus = null;
    let autoplayTimer = null;
    let autoplayPaused = false;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const autoplayDelay = 3000;

    function stopAutoplay() {
      if (autoplayTimer !== null) window.clearTimeout(autoplayTimer);
      autoplayTimer = null;
    }

    function updateAutoplay() {
      stopAutoplay();
      autoplayToggle.hidden = slides.length < 2 || reducedMotion.matches;
      autoplayToggle.textContent = autoplayPaused ? "Play slides" : "Pause slides";
      autoplayToggle.setAttribute("aria-label", autoplayPaused ? "Play automatic slideshow" : "Pause automatic slideshow");
      const focusingGallery = media.contains(document.activeElement) && document.activeElement !== autoplayToggle;
      if (!dialog.open || zoom.open || slides.length < 2 || autoplayPaused || reducedMotion.matches
        || document.hidden || focusingGallery) return;
      autoplayTimer = window.setTimeout(() => move(1, true), autoplayDelay);
    }

    autoplayToggle.addEventListener("click", () => {
      autoplayPaused = !autoplayPaused;
      updateAutoplay();
    });
    media.addEventListener("focusin", updateAutoplay);
    media.addEventListener("focusout", () => queueMicrotask(updateAutoplay));
    document.addEventListener("visibilitychange", updateAutoplay);
    reducedMotion.addEventListener("change", updateAutoplay);

    function renderSlide() {
      const slide = slides[index];
      const available = Boolean(slide);
      media.classList.toggle("is-empty", !available);
      if (available) {
        image.src = slide.src;
        image.alt = slide.alt || `${project.title} screenshot ${index + 1}`;
        zoomImage.src = slide.src;
        zoomImage.alt = image.alt;
        caption.textContent = slide.caption || "";
        zoomCaption.textContent = slide.caption || "";
        imageButton.setAttribute("aria-label", `Enlarge image ${index + 1} of ${slides.length}: ${image.alt}`);
      } else {
        image.removeAttribute("src");
        zoomImage.removeAttribute("src");
        image.alt = "";
        zoomImage.alt = "";
        caption.textContent = "Image coming soon";
        zoomCaption.textContent = "";
      }
      imageButton.disabled = !available;
      const hasMany = slides.length > 1;
      for (const control of [previous, next, zoomPrev, zoomNext]) control.disabled = !hasMany;
      autoplayToggle.hidden = !hasMany || reducedMotion.matches;
      count.textContent = available ? `${index + 1} / ${slides.length}` : "No images";
      zoomCount.textContent = count.textContent;
      zoomTitle.textContent = available ? `${project.title} · image ${index + 1}` : project.title;
    }

    function move(delta, automatic = false) {
      if (slides.length < 2) return;
      index = (index + delta + slides.length) % slides.length;
      count.setAttribute("aria-live", automatic ? "off" : "polite");
      renderSlide();
      if (!reducedMotion.matches) {
        media.classList.remove("is-transitioning");
        // Restart the short entrance animation on each slide change.
        void image.offsetWidth;
        media.classList.add("is-transitioning");
      }
      zoomViewport.scrollTo(0, 0);
      updateAutoplay();
    }
    previous.addEventListener("click", () => move(-1));
    next.addEventListener("click", () => move(1));
    zoomPrev.addEventListener("click", () => move(-1));
    zoomNext.addEventListener("click", () => move(1));

    function openZoom() {
      if (!slides.length || !dialog.open) return;
      zoomViewport.dataset.size = "fit";
      actualSize.textContent = "Actual size";
      actualSize.setAttribute("aria-label", "View image at actual size");
      zoom.showModal();
      updateAutoplay();
      zoomClose.focus();
    }
    imageButton.addEventListener("click", openZoom);
    actualSize.addEventListener("click", () => {
      const isActual = zoomViewport.dataset.size !== "actual";
      zoomViewport.dataset.size = isActual ? "actual" : "fit";
      actualSize.textContent = isActual ? "Fit to screen" : "Actual size";
      actualSize.setAttribute("aria-label", isActual ? "Fit image to screen" : "View image at actual size");
      zoomViewport.scrollTo(0, 0);
    });
    zoom.addEventListener("close", () => {
      if (dialog.open) imageButton.focus();
      updateAutoplay();
    });
    dialog.addEventListener("close", () => {
      stopAutoplay();
      media.classList.remove("is-transitioning");
      if (zoom.open) zoom.close();
      if (returnFocus && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
      project = null;
      slides = [];
    });
    for (const target of [dialog, zoom]) {
      target.addEventListener("click", (event) => {
        if (event.target === target) target.close();
      });
    }
    document.addEventListener("keydown", (event) => {
      if (!dialog.open || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
      if (event.target.closest("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      move(event.key === "ArrowRight" ? 1 : -1);
    });

    function openProject(id, trigger) {
      const entry = entries.get(id);
      if (!entry || dialog.open) return;
      project = entry;
      slides = slidesFor(entry);
      index = 0;
      autoplayPaused = false;
      returnFocus = trigger || document.activeElement;
      dialog.dataset.category = entry.category || "";
      zoom.dataset.category = entry.category || "";
      kicker.textContent = entry.category ? `${entry.category} / Project preview` : "Project preview";
      meta.textContent = Array.isArray(entry.meta) ? entry.meta.filter(Boolean).join(" · ") : "";
      title.textContent = entry.title || "Untitled project";
      summary.textContent = entry.summary || "";
      detail.textContent = entry.overview || "";
      detail.hidden = !entry.overview;
      highlights.replaceChildren();
      for (const item of Array.isArray(entry.highlights) ? entry.highlights.slice(0, 3) : []) {
        highlights.append(element("li", "", item));
      }
      highlights.hidden = !highlights.children.length;
      outcome.textContent = entry.outcome || "";
      outcome.hidden = !entry.outcome;
      stack.replaceChildren();
      for (const item of Array.isArray(entry.stack) ? entry.stack : []) {
        stack.append(element("li", "", item));
      }
      stack.hidden = !stack.children.length;
      const detailHref = allowedUrl(entry.detail);
      seeMore.hidden = !detailHref;
      if (detailHref) seeMore.href = detailHref;
      const demoHref = allowedUrl(entry.demo && entry.demo.href);
      tryDemo.hidden = !demoHref;
      demoUnavailable.hidden = Boolean(demoHref);
      if (demoHref) {
        tryDemo.href = demoHref;
        if (/^https?:\/\//i.test(demoHref) && new URL(demoHref, document.baseURI).origin !== window.location.origin) {
          tryDemo.target = "_blank";
          tryDemo.rel = "noopener noreferrer";
        } else {
          tryDemo.removeAttribute("target");
          tryDemo.removeAttribute("rel");
        }
      }
      demoNote.textContent = entry.demo && entry.demo.note
        ? entry.demo.note
        : demoHref ? "" : "A public demo is not available for this project yet.";
      demoNote.hidden = !demoNote.textContent;
      const codeHref = typeof entry.code_url === "string" && /^https:\/\/github\.com\/KyleJBonachita\/[A-Za-z0-9_.-]+(?:\/[^\s]*)?$/.test(entry.code_url)
        ? entry.code_url : "";
      viewCode.hidden = !codeHref;
      if (codeHref) viewCode.href = codeHref;
      renderSlide();
      dialog.showModal();
      close.focus();
      updateAutoplay();
    }

    for (const card of document.querySelectorAll(".chapter-project[data-project-id]")) {
      if (!entries.has(card.dataset.projectId)) continue;
      card.classList.add("gallery-card");
      card.querySelectorAll("a[data-open-project]").forEach((link) => {
        link.setAttribute("aria-haspopup", "dialog");
      });
    }
    document.addEventListener("click", (event) => {
      const card = event.target.closest(".chapter-project[data-project-id]");
      if (!card || !entries.has(card.dataset.projectId)) return;
      const opener = event.target.closest("a[data-open-project]");
      if (opener && card.contains(opener)) {
        event.preventDefault();
        openProject(opener.dataset.openProject || card.dataset.projectId, opener);
        return;
      }
      if (event.target.closest("a, button, input, select, textarea, summary, [role='button']")) return;
      openProject(card.dataset.projectId, card.querySelector("a[data-open-project]") || card);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
