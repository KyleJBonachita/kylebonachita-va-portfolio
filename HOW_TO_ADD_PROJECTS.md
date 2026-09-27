# Add a project or gallery image

You can update the cards and galleries by editing one file: `projects.json`. The homepage cards and process-map slides are generated from it, so you do not need to hand-edit the card HTML.

## Add a new project

1. Save a preview image in `assets/`. A landscape PNG, JPG, or SVG around 1200 × 720 works well. If you do not have a safe screenshot yet, use `assets/project-placeholder.svg`. Label illustrations as illustrations; files placed here may become public when the site is published.
2. Copy `templates/project-case.html` to `work/your-project-id.html`. Replace all `[BRACKETED FIELDS]` with the problem, what you built, the operating procedure, verified outcome, and current limits. The project ID should be lowercase with hyphens, such as `inventory-sync`.
3. Add an entry to the `projects` array in `projects.json`. Choose `automation`, `web-development`, or `data-operations` for `category`. Put the card in the order you want it to appear within that section.

Here is a complete starter entry. Replace its text and paths with your own:

```json
{
  "id": "inventory-sync",
  "category": "automation",
  "title": "Inventory Sync",
  "meta": ["Built workflow", "Inventory updates"],
  "summary": "A one-sentence description of what the tool does.",
  "stack": ["Power Automate", "Google Sheets"],
  "detail": "work/inventory-sync.html",
  "overview": "Why I built this and who it helps.",
  "highlights": ["Main input", "Important safeguard", "Useful output"],
  "outcome": "What is verified so far; say if time savings are unmeasured.",
  "images": [
    {
      "src": "assets/inventory-sync-overview.png",
      "alt": "Sanitized Inventory Sync dashboard",
      "caption": "Dashboard screenshot with private records removed."
    }
  ],
  "workflow": [
    {"title": "Receive", "detail": "Read the incoming inventory update."},
    {"title": "Check", "detail": "Validate the required fields."},
    {"title": "Sync", "detail": "Update the destination and log the result."}
  ]
}
```

4. Run `python scripts/build_portfolio.py` from the website folder. This checks that the detail page and images exist, then updates the static cards in `index.html`, `projects-data.js`, and the illustrated workflow slide in `assets/gallery/`.
5. Preview with `python -m http.server 8000`, then open `http://localhost:8000/`. Check the new card, gallery arrows, image zoom, **See more**, and **Try demo** on both desktop and phone widths.

## Add more images to an existing project

Save each image under `assets/`, then add another object to that project's `images` array. The gallery shows images in that order and appends the generated process map as the final slide. Update `alt` and `caption` to say what each image shows. Run `python scripts/build_portfolio.py` again.

## Point “Try demo” to a working demo

If you omit `demo`, the button opens a guided sample walkthrough built from the project's `workflow` steps. It is labeled as an illustrative preview. To link a working browser demo, add this field to the project entry:

```json
"demo": {
  "href": "lab/my-demo.html#demo",
  "label": "Try demo",
  "note": "Interactive browser demo with sample data"
}
```

Keep the `detail` link pointed at the full case study. The two buttons should give visitors different ways to explore the work.

## Show an improvement percentage honestly

Record a before value and an after value for the same task, with the same unit and a comparable measurement period. For time or errors, calculate `(before − after) ÷ before × 100`. State the sample size and what changed. If you only have a prototype, describe what it does and what you plan to measure. The ticketing page contains a **clearly labeled hypothetical** calculation as an example; its numbers are not a project outcome.

Edit the source entry in `projects.json`, plus your image and case-study page. Leave `projects-data.js`, the card markup between `PROJECT-CARDS` markers in `index.html`, and files in `assets/gallery/` to the builder.
