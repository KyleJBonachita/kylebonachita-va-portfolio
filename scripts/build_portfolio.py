"""Build static portfolio cards, gallery data, and illustrated process slides.

Edit projects.json, then run: python scripts/build_portfolio.py
The generated cards remain usable when JavaScript is disabled.
"""

from __future__ import annotations

import html
import json
import re
import textwrap
from pathlib import Path, PurePosixPath
from urllib.parse import urlsplit
from xml.sax.saxutils import escape as xml_escape


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "projects.json"
INDEX = ROOT / "index.html"
DATA_JS = ROOT / "projects-data.js"
GALLERY_DIR = ROOT / "assets" / "gallery"
CATEGORIES = ("automation", "web-development", "data-operations")
PALETTES = {
    "automation": ("#102442", "#a6c0ff", "#273f68"),
    "web-development": ("#2e1c2b", "#ffaf91", "#553643"),
    "data-operations": ("#0c2e27", "#91e3bc", "#1c5041"),
}


def safe_local_path(value: str) -> Path:
    url = urlsplit(value)
    if url.scheme or url.netloc:
        raise ValueError(f"Use a local site path: {value}")
    relative = PurePosixPath(url.path)
    if not url.path or relative.is_absolute() or ".." in relative.parts:
        raise ValueError(f"Unsafe site path: {value}")
    return ROOT.joinpath(*relative.parts)


def lines(value: str, width: int, count: int) -> list[str]:
    return textwrap.wrap(value, width=width, break_long_words=False)[:count]


def svg_text(value: str, x: int, y: int, width: int, count: int, size: int, color: str, weight: int = 400) -> str:
    parts = lines(value, width, count)
    return "".join(
        f'<text x="{x}" y="{y + offset * (size + 9)}" fill="{color}" '
        f'font-family="Arial,sans-serif" font-size="{size}" font-weight="{weight}">{xml_escape(part)}</text>'
        for offset, part in enumerate(parts)
    )


def build_diagram(project: dict) -> str:
    background, accent, panel = PALETTES[project["category"]]
    title = svg_text(project["title"], 70, 105, 32, 2, 46, "#fff", 700)
    boxes = []
    for index, step in enumerate(project["workflow"][:4]):
        column, row = index % 2, index // 2
        x, y = 70 + column * 545, 207 + row * 207
        boxes.append(
            f'<rect x="{x}" y="{y}" width="515" height="178" rx="18" fill="{panel}" stroke="{accent}" stroke-opacity=".42"/>'
            f'<text x="{x + 26}" y="{y + 41}" fill="{accent}" font-family="Arial,sans-serif" font-size="16" font-weight="700">STEP {index + 1:02}</text>'
            + svg_text(step["title"], x + 26, y + 86, 29, 1, 25, "#fff", 700)
            + svg_text(step["detail"], x + 26, y + 122, 44, 2, 17, "#d9e4ef")
        )
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720" role="img">'
        f'<rect width="1200" height="720" fill="{background}"/>'
        f'<circle cx="1150" cy="-30" r="290" fill="{accent}" opacity=".08"/>'
        f'<text x="70" y="53" fill="{accent}" font-family="Arial,sans-serif" font-size="16" font-weight="700" letter-spacing="3">PROCESS MAP / ILLUSTRATIVE</text>'
        + title
        + "".join(boxes)
        + f'<text x="70" y="665" fill="{accent}" font-family="Arial,sans-serif" font-size="16">How the workflow is designed · no private records shown</text>'
        + "</svg>\n"
    )


def render_card(project: dict) -> str:
    esc = html.escape
    image = project["slides"][0]
    detail = "./" + project["detail"]
    demo = "./" + project["demo"]["href"]
    visual_class = {"automation": "visual--automation", "web-development": "visual--web", "data-operations": "visual--data"}[project["category"]]
    stack = " · ".join(project["stack"])
    return (
        f'          <article class="chapter-project" data-project-id="{esc(project["id"])}" data-reveal>\n'
        f'            <a class="chapter-project-visual {visual_class}" href="{esc(detail)}" data-open-project="{esc(project["id"])}" aria-label="Preview {esc(project["title"])}">'
        f'<img src="./{esc(image["src"])}" alt="{esc(image["alt"])}" width="1200" height="720" loading="lazy"><span class="project-visual-cta" aria-hidden="true">View gallery ↗</span></a>\n'
        f'            <div class="chapter-project-content"><div class="chapter-project-meta"><span>{esc(project["meta"][0])}</span><span>{esc(project["meta"][1])}</span></div>'
        f'<h3>{esc(project["title"])}</h3><p>{esc(project["summary"])}</p><p class="project-stack">{esc(stack)}</p>'
        f'<div class="chapter-project-actions">'
        f'<a class="chapter-project-link" href="{esc(detail)}">See more <span aria-hidden="true">↗</span></a>'
        f'<a class="chapter-project-demo" href="{esc(demo)}">Try demo <span aria-hidden="true">↗</span></a>'
        f'</div></div>\n'
        '          </article>'
    )


def replace_cards(document: str, category: str, cards: str) -> str:
    start_marker = f"<!-- PROJECT-CARDS:{category}:START -->"
    end_marker = f"<!-- PROJECT-CARDS:{category}:END -->"
    if start_marker in document and end_marker in document:
        before, remainder = document.split(start_marker, 1)
        _, after = remainder.split(end_marker, 1)
        return before + start_marker + "\n" + cards + "\n          " + end_marker + after

    section_pattern = re.compile(
        rf'(<section class="chapter [^"]+" id="{re.escape(category)}".*?<div class="chapter-projects">)(.*?)(\n        </div>\n      </div>\n    </section>)',
        re.S,
    )
    result, count = section_pattern.subn(
        lambda match: match.group(1) + f"\n          {start_marker}\n{cards}\n          {end_marker}" + match.group(3),
        document,
        count=1,
    )
    if count != 1:
        raise ValueError(f"Could not locate the {category} card grid in index.html")
    return result


def main() -> None:
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    projects = source["projects"]
    if not projects:
        raise ValueError("projects.json needs at least one project")
    identifiers: set[str] = set()
    GALLERY_DIR.mkdir(parents=True, exist_ok=True)

    for project in projects:
        identifier = project["id"]
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", identifier) or identifier in identifiers:
            raise ValueError(f"Project ID must be unique and lowercase: {identifier}")
        identifiers.add(identifier)
        if project["category"] not in CATEGORIES:
            raise ValueError(f"Unknown category for {identifier}")
        if len(project["meta"]) != 2 or len(project["workflow"]) < 2 or len(project["workflow"]) > 4:
            raise ValueError(f"{identifier}: use two metadata labels and two to four workflow steps")
        if not safe_local_path(project["detail"]).is_file():
            raise ValueError(f"{identifier}: detail page does not exist")
        for image in project["images"]:
            if not image["src"].startswith("assets/") or not safe_local_path(image["src"]).is_file():
                raise ValueError(f"{identifier}: image missing or outside assets: {image['src']}")

        diagram = GALLERY_DIR / f"{identifier}-workflow.svg"
        diagram.write_text(build_diagram(project), encoding="utf-8")
        project["slides"] = project["images"] + [{
            "src": f"assets/gallery/{identifier}-workflow.svg",
            "alt": f"Illustrative process map for {project['title']}",
            "caption": "Illustrative process map based on the case study; no private records shown.",
        }]
        if "demo" not in project:
            project["demo"] = {
                "href": f"demo/walkthrough.html?project={identifier}",
                "label": "Try demo",
                "note": "Guided sample with invented data, not the live system",
            }
        if not safe_local_path(project["demo"]["href"]).is_file():
            raise ValueError(f"{identifier}: demo page does not exist")

    page = INDEX.read_text(encoding="utf-8")
    for category in CATEGORIES:
        cards = "\n".join(render_card(project) for project in projects if project["category"] == category)
        page = replace_cards(page, category, cards)
    INDEX.write_text(page, encoding="utf-8")
    DATA_JS.write_text(
        "/* Generated from projects.json by scripts/build_portfolio.py. */\n"
        + "window.PORTFOLIO_PROJECTS = " + json.dumps(projects, ensure_ascii=True, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    print(f"Built {len(projects)} cards, gallery data, and workflow slides.")


if __name__ == "__main__":
    main()
