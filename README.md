# Kyle Josef M. Bonachita — Developer & Automation Portfolio

A static portfolio for internal tools, automation, and data operations. It opens in dark mode; its header switch saves a light-mode choice in the browser.

![Portfolio desktop preview](./preview.png)

## Explore the work

Scroll through all three specialties or use the project chooser to focus on one. Deep links such as `#automation`, `#web-development`, and `#data-operations` work with browser history. Each card opens a project preview with a slide gallery, image zoom, a case-study link, and a demo link. Cards remain readable and link to their case studies when JavaScript is unavailable.

- **Automation:** Appscripter, Gery Knowledge Assistant, Morning Tech Team reminder, Session Segregator, and NVIDIA Session Hub.
- **Web development and technical tools:** NVGS Server, Device Custody Tracker, Tech Support Ticketing System, Foot Pedal Configurator, and RFID Attendance Management.
- **Data operations:** Inventory CSV Cleanup Demo, Equipment Inventory & Handoffs, Hotel Booking Record Review, Sales & Inventory Record Review, and an earlier transaction-analysis study.

The NVGS and Gery case studies link to their public source. NVGS documents a completed fake-data pilot; its production import and some deployment steps remain to be confirmed. Gery's model API code is optional and disabled by default, so the portfolio makes no claim of live LLM API use. The internal-tool previews and guided walkthroughs use illustrative or invented content. The inventory cleanup demo uses fictional rows and lets visitors filter, exclude or restore rows, then export ready records and a complete review trail. The hotel and e-commerce pages publish aggregate results from locally analyzed datasets and include reproducible Python scripts. No raw booking, order, customer, address, inventory-price, or internal work records are included in the site. The hotel review script can optionally create a **private local** review CSV; keep that output out of the repository. The ticketing case study includes one clearly labeled hypothetical impact calculation; it is not a measured project result.

## Run locally

From this folder:

    python -m http.server 8000

Open `http://localhost:8000/`. The site uses HTML, CSS, JavaScript, SVG, and Python scripts. The site itself needs no web framework or bundler; `scripts/build_portfolio.py` regenerates static cards and gallery data after you edit `projects.json`.

## Reproduce the data checks

The source datasets are supplied separately and are not included here. Pass your local CSV paths to the scripts:

    python scripts/hotel_qa.py "Hotel Reservations.csv" hotel-summary.json
    python scripts/ecommerce_qa.py "Amazon Sale Report.csv" "Sale Report.csv" --output ecommerce-summary.json

The hotel command also accepts `--review-csv ../private-review.csv` to write flagged source rows **outside this repository** for human follow-up. Its JSON output contains aggregate counts only. The e-commerce command reports counts at the order-line level and treats cancellation status and the separate inventory snapshot as context. CSV and XLSX files are ignored by Git here to reduce the chance of committing source or review data.

## Add or update projects

The project list lives in `projects.json`. Add images under `assets/`, edit the project entry, then run:

    python scripts/build_portfolio.py

The builder updates static homepage cards, `projects-data.js`, and an illustrated workflow slide for each project. Each card displays the project's `stack` as skill badges. You can add as many images as you like in a project's `images` list, and add a public source link with `code_url`. Use `templates/project-case.html` as a starting page for a new case study. See [HOW_TO_ADD_PROJECTS.md](./HOW_TO_ADD_PROJECTS.md) for a complete walkthrough.

## Update details

Edit `site-config.js` for contact links, name, and location. `projects.json` controls project cards and galleries; the generated homepage cards are in `index.html`. Case studies are in `work/` and `lab/`, guided previews in `demo/`, and aggregate data in `data/`.
