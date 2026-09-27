(() => {
  "use strict";

  const byId = (id) => document.getElementById(id);
  const elements = {
    title: byId("walk-title"),
    summary: byId("walk-summary"),
    category: byId("walk-category"),
    preview: byId("walk-preview"),
    previewImage: byId("walk-preview-image"),
    previewCaption: byId("walk-preview-caption"),
    shell: byId("walk-shell"),
    unavailable: byId("walk-unavailable"),
    unavailableMessage: byId("walk-unavailable-message"),
    total: byId("walk-total"),
    shortTitle: byId("walk-project-short"),
    stepList: byId("walk-step-list"),
    stepCount: byId("walk-step-count"),
    stepTitle: byId("walk-step-title"),
    stepDetail: byId("walk-step-detail"),
    stepContext: byId("walk-step-context"),
    progressText: byId("walk-progress-text"),
    progressFill: byId("walk-progress-fill"),
    announcement: byId("walk-announcement"),
    previous: byId("walk-prev"),
    next: byId("walk-next"),
    restart: byId("walk-restart"),
    after: byId("walk-after"),
    detailLink: byId("walk-detail-link")
  };

  const projects = Array.isArray(window.PORTFOLIO_PROJECTS) ? window.PORTFOLIO_PROJECTS : [];
  const requestedId = new URLSearchParams(window.location.search).get("project");
  const project = projects.find((item) => item && item.id === requestedId);

  function localPagePath(path) {
    return typeof path === "string" && /^(work|lab)\/[a-z0-9-]+\.html$/.test(path) ? `../${path}` : "../index.html#work";
  }

  function localAssetPath(path) {
    return typeof path === "string" && /^assets\/[a-zA-Z0-9/_-]+\.(?:png|jpe?g|webp|svg)$/.test(path) ? `../${path}` : null;
  }

  function showUnavailable(message) {
    elements.title.textContent = "Guided sample unavailable";
    elements.summary.textContent = "Choose a project from the portfolio to explore its workflow.";
    elements.unavailableMessage.textContent = message;
    elements.unavailable.hidden = false;
    elements.shell.hidden = true;
    elements.after.hidden = true;
  }

  if (!project) {
    showUnavailable("This project link was not found. Return to the portfolio and choose a project card.");
    return;
  }

  const steps = Array.isArray(project.workflow)
    ? project.workflow.filter((step) => step && typeof step.title === "string" && step.title.trim() && typeof step.detail === "string" && step.detail.trim()).slice(0, 4)
    : [];
  if (steps.length < 2) {
    showUnavailable("This project does not have a guided workflow yet. Its case study is available from the portfolio.");
    return;
  }

  const categoryNames = {
    automation: "AUTOMATION",
    "web-development": "WEB DEVELOPMENT",
    "data-operations": "DATA OPERATIONS"
  };
  const category = Object.hasOwn(categoryNames, project.category) ? project.category : "automation";
  document.body.dataset.category = category;
  elements.category.textContent = `${categoryNames[category]} / GUIDED SAMPLE`;
  elements.title.textContent = project.title || "Project walkthrough";
  elements.summary.textContent = project.summary || "Explore how this project works, one stage at a time.";
  elements.shortTitle.textContent = project.title || "GUIDED SAMPLE";
  elements.total.textContent = `${steps.length} steps`;
  elements.detailLink.href = localPagePath(project.detail);
  document.title = `${project.title || "Project"} guided sample | Kyle Josef M. Bonachita`;

  const preview = (Array.isArray(project.slides) && project.slides[0]) || (Array.isArray(project.images) && project.images[0]);
  const imagePath = preview && localAssetPath(preview.src);
  if (imagePath) {
    elements.previewImage.src = imagePath;
    elements.previewImage.alt = typeof preview.alt === "string" ? preview.alt : "Illustrative project preview";
    elements.previewCaption.textContent = typeof preview.caption === "string" ? preview.caption : "Illustrative project preview.";
    elements.preview.hidden = false;
  }

  const stepButtons = steps.map((step, index) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    const number = document.createElement("span");
    const name = document.createElement("strong");
    button.type = "button";
    number.textContent = String(index + 1).padStart(2, "0");
    name.textContent = step.title;
    button.append(number, name);
    button.addEventListener("click", () => showStep(index));
    item.append(button);
    elements.stepList.append(item);
    return button;
  });

  let activeStep = 0;
  function showStep(index) {
    if (index < 0 || index >= steps.length) return;
    activeStep = index;
    const step = steps[index];
    elements.stepCount.textContent = `STEP ${String(index + 1).padStart(2, "0")} / ${String(steps.length).padStart(2, "0")}`;
    elements.stepTitle.textContent = step.title;
    elements.stepDetail.textContent = step.detail;
    elements.stepContext.textContent = index === steps.length - 1
      ? "End of this illustrative sequence. The full case study explains the operating procedure and evidence."
      : "This is an illustrative sequence; it does not run the underlying project or use private records.";
    elements.progressText.textContent = `${index + 1} of ${steps.length}`;
    elements.progressFill.style.width = `${((index + 1) / steps.length) * 100}%`;
    elements.previous.disabled = index === 0;
    elements.next.disabled = index === steps.length - 1;
    elements.restart.disabled = index === 0;
    stepButtons.forEach((button, buttonIndex) => {
      if (buttonIndex === index) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });
    elements.announcement.textContent = `Step ${index + 1} of ${steps.length}: ${step.title}. ${step.detail}`;
  }

  elements.previous.addEventListener("click", () => showStep(activeStep - 1));
  elements.next.addEventListener("click", () => showStep(activeStep + 1));
  elements.restart.addEventListener("click", () => showStep(0));
  elements.shell.hidden = false;
  elements.after.hidden = false;
  showStep(0);
})();
