# Kyle Josef M. Bonachita — Technical VA Portfolio

A responsive portfolio focused on workflow automation, web and technical support, and data operations.

![Portfolio desktop preview](./preview.png)

## Selected work

- **Appscripter:** a local dashboard and CLI for reviewing Google Apps Script source backups before optional publication.
- **Morning Tech Team reminder:** a scheduled Power Automate flow that posts an Adaptive Card reminder in Microsoft Teams.
- **Device Custody Tracker:** a responsive Apps Script web app for inventory, checkout, returns, and shift audits.
- **Data Quality Lab:** an interactive browser demo that cleans fictional inventory CSV records and exports a reviewed file.

The case studies distinguish built projects, a built workflow, and a portfolio demo. Example images and CSV data use placeholders or fictional records; internal production data and private links are excluded.

## Run locally

From this folder:

    python -m http.server 8000

Then open http://localhost:8000/ in a browser. The site uses plain HTML, CSS, and JavaScript, with no build step or package installation.

## Update details

Edit `site-config.js` to change the name, email, LinkedIn, GitHub, Upwork, or location displayed on the site. Case-study content is in `work/`; the interactive CSV demo is in `lab/`.

## Checks

The responsive layout, navigation, case-study pages, images, and CSV demo were checked in Chromium at desktop, tablet, and mobile widths.