# Kyle Josef M. Bonachita — Technical VA Portfolio

A static portfolio for automation, web development, and data operations. The site opens in dark mode; its header switch saves a light-mode choice in the browser.

![Portfolio desktop preview](./preview.png)

## Explore the work

Scroll through all three specialties or use the project chooser to focus on one. Deep links such as `#automation`, `#web-development`, and `#data-operations` work with browser history. Projects remain readable when JavaScript is unavailable.

- **Automation:** Appscripter source-backup dashboard and CLI; Morning Tech Team Power Automate reminder.
- **Web development:** Device Custody Tracker; Tech Support Ticketing System; a link to earlier software projects.
- **Data operations:** Hotel Booking QA; E-commerce Order QA; the browser-only Data Quality Lab; and device inventory record tracking.

The ticketing preview and hotel review examples use fictional content. The hotel and e-commerce pages publish aggregate results from locally analyzed datasets, and include reproducible Python scripts. No raw booking, order, customer, address, inventory-price, or internal work records are included in the site. The Hotel Booking QA script can optionally create a **private local** review CSV; keep that output out of the repository.

## Run locally

From this folder:

    python -m http.server 8000

Open `http://localhost:8000/`. The site uses HTML, CSS, JavaScript, SVG, and Python scripts. It has no build step.

## Reproduce the data checks

The source datasets are supplied separately and are not included here. Pass your local CSV paths to the scripts:

    python scripts/hotel_qa.py "Hotel Reservations.csv" hotel-summary.json
    python scripts/ecommerce_qa.py "Amazon Sale Report.csv" "Sale Report.csv" --output ecommerce-summary.json

The hotel command also accepts `--review-csv ../private-review.csv` to write flagged source rows **outside this repository** for human follow-up. Its JSON output contains aggregate counts only. The e-commerce command reports counts at the order-line level and treats cancellation status and the separate inventory snapshot as context. CSV and XLSX files are ignored by Git here to reduce the chance of committing source or review data.

## Update details

Edit `site-config.js` for the contact links, name, and location. The main work listing is in `index.html`; case studies are in `work/`, demos in `lab/`, and aggregate data in `data/`.
