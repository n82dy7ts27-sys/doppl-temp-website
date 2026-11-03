#!/usr/bin/env python3
"""Export a native Word copy deck and safely import its edited copy.

Export requires python-docx. Import uses only Python's standard library.
"""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import difflib
import hashlib
import json
from pathlib import Path
import re
import sys
import tempfile
import xml.etree.ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "lib/site-copy.json"
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
NS = {"w": W[1:-1]}
PLACEHOLDER = re.compile(r"\{[A-Za-z_][A-Za-z0-9_]*\}|%s")
# Decorative artwork fields may be intentionally removed by the writer.
OPTIONAL_COPY_IDS = frozenset({
    "difference.fieldHuman", "difference.fieldGenerative", "difference.fieldCaption",
})


def read_copy(path):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError(f"Duplicate JSON key: {key}")
            result[key] = value
        return result
    data = json.loads(Path(path).read_text(encoding="utf-8"), object_pairs_hook=unique)
    if not isinstance(data, dict) or not data:
        raise ValueError("Copy source must be a nonempty flat JSON object")
    for key, value in data.items():
        if not isinstance(key, str) or not re.fullmatch(r"[A-Za-z0-9_.-]+", key):
            raise ValueError(f"Invalid copy ID: {key!r}")
        if not isinstance(value, str) or (not value.strip() and key not in OPTIONAL_COPY_IDS):
            raise ValueError(f"Copy must be a nonempty string: {key}")
    return data


def digest(copy):
    return hashlib.sha256(json.dumps(copy, ensure_ascii=False, sort_keys=True,
                                     separators=(",", ":")).encode()).hexdigest()


def words(value):
    value = re.sub(r"([a-z])([A-Z])", r"\1 \2", value)
    return value.replace("_", " ").replace("-", " ").capitalize()


def grouping(key):
    """Use stable IDs to provide page and section navigation, never alter copy."""
    parts = key.split(".")
    prefix = parts[0]
    secondary = any(p.lower() in {"meta", "metadata", "aria", "alt", "seo"}
                    or p.lower().startswith("aria") or p.lower().endswith(("aria", "alt"))
                    for p in parts)
    secondary |= key == "motion.instructions" or prefix in {"optical", "accessibility"}
    secondary |= key.endswith((".artTitle", ".artDescription", ".metadataFallback"))
    secondary |= key.startswith("diagrams.process.") and key.endswith(".explanation")
    secondary |= key == "contact.capabilitySubject"
    secondary |= key.startswith("diagrams.judgement.")
    if secondary:
        page = "Search previews" if prefix == "metadata" else "Accessibility and secondary labels"
        section = words(prefix)
        if key.startswith("diagrams.judgement."):
            section = "Reusable diagram labels"
        return True, page, section
    if prefix in {"brand", "navigation", "motion"} or key == "contact.talk":
        return False, "Shared navigation", words(prefix)
    if prefix == "work" and len(parts) > 2 and parts[1] in {"phase", "overlap", "frequency"}:
        return False, "Project pages", words(parts[1])
    if prefix == "study":
        return False, "Project pages", "Shared project interface"
    if prefix == "notFound":
        return False, "Page not found", "Recovery message"
    if prefix == "diagrams":
        section = "Capabilities" if parts[1] == "production" else "Our process"
        return False, "Home page", section
    sections = {"hero": "Hero", "difference": "Our point of view", "work": "Selected work",
                "capabilities": "Capabilities", "commission": "Ways in", "approach": "Our process",
                "studio": "The studio", "contact": "Contact", "footer": "Footer"}
    return False, "Home page", sections.get(prefix, words(prefix))


PAGE_ORDER = ["Shared navigation", "Home page", "Project pages", "Page not found",
              "Search previews", "Accessibility and secondary labels"]
SECTION_ORDER = ["Hero", "Our point of view", "Selected work", "Capabilities", "Ways in",
                 "Our process", "The studio", "Contact", "Footer", "Shared project interface",
                 "Phase", "Overlap", "Frequency"]


def order(label, sequence):
    return sequence.index(label) if label in sequence else len(sequence)


def block_order(key):
    parts = key.split(".")
    if parts[0] == "capabilities":
        if len(parts) == 2:
            return (0, order(parts[1], ["aside", "label", "title", "description", "cta"]), 0)
        return (2, order(parts[1], ["film", "imagery", "worlds", "development", "finishing"]),
                order(parts[2], ["title", "short", "description", "scopes", "note"]))
    if key.startswith("diagrams.production."):
        return (1, 0, 0)
    if parts[0] == "approach" and len(parts) == 2:
        return (0, order(parts[1], ["aside", "label", "title", "description"]), 0)
    if parts[0] == "approach" or key.startswith("diagrams.process."):
        stage = parts[1] if parts[0] == "approach" else parts[2]
        return (1, order(stage, ["define", "prove", "build", "review", "finish", "extend"]),
                0 if parts[0] == "approach" else 1)
    if parts[0] == "studio":
        return (0, order(parts[1], ["aside", "label", "fieldMinds", "fieldPossibilities", "title",
                                   "description", "belief", "founder", "founderRole", "noteLabel", "note", "cta"]), 0)
    if parts[0] == "contact":
        return (0, order(parts[1], ["aside", "label", "title", "questionMark", "description",
                                   "invitation", "email", "copy", "copied", "copyFailed"]), 0)
    return (0, 0, 0)


def export_deck(args):
    from docx import Document
    from docx.enum.style import WD_STYLE_TYPE
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml import OxmlElement
    from docx.shared import Inches, Pt, RGBColor
    copy = read_copy(args.source)
    output = Path(args.docx).resolve()
    baseline = Path(args.baseline).resolve() if args.baseline else output.with_suffix(".baseline.json")
    if not args.overwrite and (output.exists() or baseline.exists()):
        raise ValueError("Output or baseline already exists; use --overwrite to replace both")
    doc = Document()
    sec = doc.sections[0]
    sec.page_width, sec.page_height = Inches(8.5), Inches(11)
    sec.top_margin = sec.bottom_margin = Inches(.7)
    sec.left_margin = sec.right_margin = Inches(.8)
    sec.footer_distance = Inches(.3)
    for name in ["Normal", "Title", "Subtitle", "Heading 1", "Heading 2", "Heading 3"]:
        style = doc.styles[name]
        for border in style.element.findall(".//" + W + "pBdr"):
            border.getparent().remove(border)
        style.font.name = "Arial"
        style.font.color.rgb = RGBColor(0, 0, 0)
        style.font.size = Pt(11)
    normal = doc.styles["Normal"].paragraph_format
    normal.space_after = Pt(7)
    normal.line_spacing = 1.08
    normal.widow_control = True
    doc.styles["Title"].font.size = Pt(26)
    doc.styles["Title"].paragraph_format.space_after = Pt(14)
    for name, size, before in [("Heading 1", 18, 15), ("Heading 2", 13, 12), ("Heading 3", 11, 9)]:
        style = doc.styles[name]
        style.font.size = Pt(size)
        style.font.bold = True
        style.paragraph_format.space_before = Pt(before)
        style.paragraph_format.space_after = Pt(6)
        style.paragraph_format.keep_with_next = True
    id_style = doc.styles.add_style("Copy ID", WD_STYLE_TYPE.PARAGRAPH)
    id_style.font.name = "Arial"
    id_style.font.size = Pt(9)
    id_style.font.color.rgb = RGBColor.from_string("666666")
    id_style.paragraph_format.space_before = Pt(7)
    id_style.paragraph_format.space_after = Pt(2)
    id_style.paragraph_format.keep_with_next = True
    copy_style = doc.styles.add_style("Editable copy", WD_STYLE_TYPE.PARAGRAPH)
    copy_style.base_style = doc.styles["Normal"]
    copy_style.paragraph_format.space_after = Pt(5)
    footer = sec.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    footer.add_run("Doppl Studio website copy   |   ").font.size = Pt(9)
    field = OxmlElement("w:fldSimple")
    field.set(W + "instr", "PAGE")
    footer._p.append(field)
    doc.core_properties.title = "Doppl Studio website copy"
    doc.core_properties.subject = "Editable website copy and writer handoff"
    doc.core_properties.author = "Doppl Studio"
    doc.add_paragraph("Doppl Studio website copy", "Title")
    doc.add_paragraph("Edit the website wording in this document and return the revised Word file. The copy IDs connect each text block to its exact place on the website.")
    doc.add_paragraph("How to edit", "Heading 2")
    for text in [
        "Edit the text below each grey copy ID. Keep every ID unchanged and keep each block in place. The page and section headings are navigation only.",
        "Preserve placeholders such as {year}, {title} and %s exactly. You may change the words around them.",
        "Keep line breaks where they matter. Use Enter or Shift Enter within the same copy block when a new line is needed. Do not delete an entire block. Only difference.fieldHuman, difference.fieldGenerative and difference.fieldCaption may be left empty.",
        "Accept all tracked changes before returning the file. Comments can explain a suggestion, but only the edited text is imported. Return the .docx file rather than a PDF.",
        "Customer facing wording comes first, grouped by page and section. Search previews, accessibility labels and other secondary text appear at the end. Repeated wording with different IDs belongs to different website locations and can be edited separately.",
    ]:
        doc.add_paragraph(text)
    doc.add_paragraph(f"This handoff contains {len(copy)} editable copy blocks.")

    groups = {}
    for key, value in copy.items():
        secondary, page, section = grouping(key)
        groups.setdefault((secondary, page), {}).setdefault(section, []).append((key, value))
    last_secondary = None
    for secondary, page in sorted(groups, key=lambda item: (item[0], order(item[1], PAGE_ORDER))):
        if secondary != last_secondary:
            doc.add_page_break()
            doc.add_paragraph("Secondary website text" if secondary else "Customer facing website copy", "Heading 1")
            if secondary:
                doc.add_paragraph("This section contains search previews and accessibility text. Keep labels useful and descriptive, and preserve all placeholders.")
            last_secondary = secondary
        doc.add_paragraph(page, "Heading 2")
        for section, blocks in sorted(groups[(secondary, page)].items(),
                                      key=lambda item: order(item[0], ["Brand", "Navigation", "Contact"]
                                                             if page == "Shared navigation" else SECTION_ORDER)):
            doc.add_paragraph(section, "Heading 3")
            for key, value in sorted(blocks, key=lambda item: block_order(item[0])):
                # Native editable block controls retain IDs through Word run splitting.
                control = OxmlElement("w:sdt")
                props = OxmlElement("w:sdtPr")
                tag = OxmlElement("w:tag")
                tag.set(W + "val", "copy:" + key)
                props.append(tag)
                alias = OxmlElement("w:alias")
                alias.set(W + "val", key)
                props.append(alias)
                control.append(props)
                content = OxmlElement("w:sdtContent")
                id_p = doc.add_paragraph("COPY ID  " + key, "Copy ID")
                content.append(id_p._p)
                copy_p = doc.add_paragraph(value, "Editable copy")
                content.append(copy_p._p)
                control.append(content)
                doc._body._body.insert(len(doc._body._body) - 1, control)
    output.parent.mkdir(parents=True, exist_ok=True)
    baseline.parent.mkdir(parents=True, exist_ok=True)
    doc.save(output)
    baseline.write_text(json.dumps({
        "format": "doppl-copy-deck-v1", "created_utc": datetime.now(timezone.utc).isoformat(),
        "source": str(Path(args.source).resolve()), "sha256": digest(copy), "copy": copy,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Exported {len(copy)} copy blocks to {output}")
    print(f"Keep baseline for import: {baseline}")


def paragraph_text(paragraph):
    parts = []
    for node in paragraph.iter():
        if node.tag == W + "t":
            parts.append(node.text or "")
        elif node.tag in {W + "br", W + "cr"}:
            if node.get(W + "type", "textWrapping") == "textWrapping":
                parts.append("\n")
        elif node.tag == W + "tab":
            parts.append("\t")
    return "".join(parts)


def extract_docx(path):
    with ZipFile(path) as archive:
        xml = ET.fromstring(archive.read("word/document.xml"))
    for node in xml.iter():
        if node.tag in {W + "ins", W + "del", W + "moveFrom", W + "moveTo"}:
            raise ValueError("Unaccepted tracked changes found; accept changes in Word before importing")
    result = {}
    for control in xml.findall(".//w:sdt", NS):
        tag = control.find("w:sdtPr/w:tag", NS)
        if tag is None or not tag.get(W + "val", "").startswith("copy:"):
            continue
        key = tag.get(W + "val")[5:]
        if key in result:
            raise ValueError(f"Duplicate copy ID: {key}")
        content = control.find("w:sdtContent", NS)
        if content is None or any(child.tag != W + "p" for child in content):
            raise ValueError(f"Unsupported block structure for {key}; keep copy as plain paragraphs")
        paragraphs = list(content)
        if not paragraphs or paragraph_text(paragraphs[0]) != "COPY ID  " + key:
            raise ValueError(f"Visible copy ID changed or missing: {key}")
        value = "\n".join(paragraph_text(p) for p in paragraphs[1:])
        if not value.strip() and key not in OPTIONAL_COPY_IDS:
            raise ValueError(f"Empty copy block: {key}")
        result[key] = value
    visible_ids = [paragraph_text(p)[len("COPY ID  "):]
                   for p in xml.findall(".//w:p", NS)
                   if paragraph_text(p).startswith("COPY ID  ")]
    if Counter(visible_ids) != Counter(result.keys()):
        raise ValueError("Visible copy IDs were duplicated or moved outside their original blocks")
    return result


def import_deck(args):
    source = Path(args.source)
    baseline_path = Path(args.baseline) if args.baseline else Path(args.docx).with_suffix(".baseline.json")
    baseline = json.loads(baseline_path.read_text(encoding="utf-8"))
    if baseline.get("format") != "doppl-copy-deck-v1":
        raise ValueError("Unrecognised baseline format")
    original = baseline["copy"]
    if digest(original) != baseline.get("sha256"):
        raise ValueError("Baseline checksum mismatch")
    current = read_copy(source)
    if current != original:
        changed = sorted(k for k in set(current) | set(original) if current.get(k) != original.get(k))
        raise ValueError("Website copy changed after export. Reconcile or re-export first. Conflicting IDs: " + ", ".join(changed))
    imported = extract_docx(args.docx)
    missing, extra = set(original) - set(imported), set(imported) - set(original)
    if missing or extra:
        raise ValueError(f"Copy ID set mismatch. Missing: {sorted(missing)}. Unexpected: {sorted(extra)}")
    for key in original:
        if Counter(PLACEHOLDER.findall(original[key])) != Counter(PLACEHOLDER.findall(imported[key])):
            raise ValueError(f"Placeholders changed for {key}")
    changed = [k for k in original if original[k] != imported[k]]
    for key in changed:
        print("\n" + key)
        for line in difflib.unified_diff(original[key].splitlines(), imported[key].splitlines(),
                                        fromfile="website", tofile="Word", lineterm=""):
            print(line)
    if args.apply and changed:
        # Preserve ID order, Unicode and complete multiline strings, write atomically.
        ordered = {key: imported[key] for key in original}
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=source.parent,
                                         prefix=".site-copy-", suffix=".json", delete=False) as out:
            out.write(json.dumps(ordered, ensure_ascii=False, indent=2) + "\n")
            temporary = Path(out.name)
        temporary.replace(source)
    print(f"{'Applied' if args.apply else 'Dry run'}: {len(changed)} changed of {len(original)} copy blocks.")
    if not args.apply:
        print("No files changed. Review the diff, then repeat with --apply.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    for command in ("export", "import"):
        sub = commands.add_parser(command)
        sub.add_argument("docx", help="Word document path")
        sub.add_argument("--source", default=str(DEFAULT_SOURCE), help="Flat website copy JSON")
        sub.add_argument("--baseline", help="Original baseline JSON; defaults to the DOCX name with .baseline.json")
        if command == "export":
            sub.add_argument("--overwrite", action="store_true")
        else:
            sub.add_argument("--apply", action="store_true", help="Apply validated edits; otherwise preview only")
    args = parser.parse_args()
    try:
        (export_deck if args.command == "export" else import_deck)(args)
    except (ValueError, OSError, KeyError, ET.ParseError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
