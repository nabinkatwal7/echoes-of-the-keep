"""Parse structured spells and class spell lists from the cleaned PDF text.

Input : content/extracted/pages.json (reading order) and pages_raw.json (one list item per line)
Output: content/extracted/structured/spells.json, spell-lists.json
Run after extract_phb.py.
"""
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
EXT = ROOT / "content" / "extracted"
FIRST_PAGE, LAST_PAGE = 187, 265
CLASSES = ["Bard", "Cleric", "Druid", "Paladin", "Ranger", "Sorcerer", "Warlock", "Wizard"]

HEADER_RE = re.compile(
    r"^(?P<name>.+?)\s+(?:(?P<lvl>\d)\s?(?:st|nd|rd|th)\s?-\s?level\s+(?P<school>[A-Za-z]+)(?P<rit>\s+\(ritual\))?"
    r"|(?P<school0>[A-Za-z]+)\s+cantrip)\s*$",
    re.I,
)
FIELDS_RE = re.compile(
    r"Casting Time:\s*(?P<ct>.*?)\s+Range:\s*(?P<rg>.*?)\s+Components?:\s*(?P<co>.*?)\s+Duration:\s*(?P<du>.*)$"
)


# OCR errors in the PDF text layer
NAME_FIXES = {"Cloud kill": "Cloudkill"}
LIST_ALIASES = {"CloudkilI": "Cloudkill", "Destructive Smite": "Destructive Wave"}


def norm(name):
    return re.sub(r"[^a-z0-9]", "", name.lower())


def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", re.sub(r"['’?]", "", name.lower())).strip("-")


def spell_lines(pages):
    lines = []
    for i in range(FIRST_PAGE, LAST_PAGE + 1):
        lines += [l.strip() for l in pages[i].split("\n") if l.strip()]
    start = next(i for i, l in enumerate(lines) if l.startswith("Spell Descriptions"))
    return lines[start + 2:]


def parse_spells(lines):
    starts = []
    for i, l in enumerate(lines[:-1]):
        if lines[i + 1].startswith("Casting Time:") and HEADER_RE.match(l):
            starts.append(i)
    spells = []
    for n, i in enumerate(starts):
        h = HEADER_RE.match(lines[i])
        end = starts[n + 1] if n + 1 < len(starts) else len(lines)
        # the field block may wrap across lines; join until Duration is present
        j = i + 1
        block = lines[j]
        while "Duration:" not in block and j + 1 < end:
            j += 1
            block += " " + lines[j]
        f = FIELDS_RE.match(block)
        if not f:
            print("  could not parse fields for", h.group("name"))
            continue
        body = lines[j + 1:end]
        text = "\n".join(body)
        higher = ""
        m = re.search(r"(?:^|\n)At Higher Levels\.?\s*(.*)$", text, re.S)
        if m:
            higher, text = m.group(1).strip(), text[:m.start()]
        school = (h.group("school") or h.group("school0")).lower()
        spells.append({
            "index": slug(NAME_FIXES.get(h.group("name").strip(), h.group("name").strip())),
            "name": NAME_FIXES.get(h.group("name").strip(), h.group("name").strip()),
            "level": int(h.group("lvl")) if h.group("lvl") else 0,
            "school": school,
            "ritual": bool(h.group("rit")),
            "castingTime": f.group("ct").strip(),
            "range": f.group("rg").strip(),
            "components": f.group("co").strip(),
            "duration": f.group("du").strip(),
            "concentration": f.group("du").lower().startswith("concentration"),
            "description": text.strip(),
            "higherLevels": higher.replace("\n", " ").strip(),
            "classes": [],
        })
    return spells


def parse_lists(raw_pages):
    lines = []
    for i in range(FIRST_PAGE, LAST_PAGE + 1):
        lines += [l.strip() for l in raw_pages[i].split("\n") if l.strip()]
    end = next(i for i, l in enumerate(lines) if l.startswith("Spell Descriptions"))
    lists = {c: {} for c in CLASSES}
    cls = lvl = None
    for l in lines[:end]:
        m = re.match(r"^(%s) Spells$" % "|".join(CLASSES), l)
        if m:
            cls, lvl = m.group(1), None
            continue
        if cls is None:
            continue
        if l.startswith("Cantrips"):
            lvl = 0
            continue
        m = re.match(r"^(\d)\s*[A-Za-z ]{1,3}\s*Level$", l, re.I)
        if m:
            lvl = int(m.group(1))
            continue
        if lvl is not None:
            lists[cls].setdefault(lvl, []).append(l)
    return lists


def main():
    pages = json.loads((EXT / "pages.json").read_text(encoding="utf-8"))
    raw = json.loads((EXT / "pages_raw.json").read_text(encoding="utf-8"))
    spells = parse_spells(spell_lines(pages))
    lists = parse_lists(raw)
    by_norm = {norm(s["name"]): s for s in spells}
    resolved = {c: {} for c in CLASSES}
    unresolved = []
    for cls, levels in lists.items():
        for lvl, names in levels.items():
            i = 0
            names = [LIST_ALIASES.get(x, x) for x in names]
            while i < len(names):
                one = norm(names[i])
                two = norm(names[i] + names[i + 1]) if i + 1 < len(names) else None
                if two in by_norm and one not in by_norm or (two in by_norm and by_norm[two]["level"] == lvl and one not in by_norm):
                    s, step = by_norm[two], 2
                elif one in by_norm:
                    s, step = by_norm[one], 1
                elif two in by_norm:
                    s, step = by_norm[two], 2
                else:
                    unresolved.append((cls, lvl, names[i])); i += 1; continue
                s["classes"].append(cls)
                resolved[cls].setdefault(lvl, []).append(s["index"])
                i += step
    out = EXT / "structured"
    out.mkdir(exist_ok=True)
    (out / "spells.json").write_text(json.dumps(spells, indent=1, ensure_ascii=False), encoding="utf-8")
    (out / "spell-lists.json").write_text(json.dumps(resolved, indent=1, ensure_ascii=False), encoding="utf-8")
    by_level = {}
    for s in spells:
        by_level[s["level"]] = by_level.get(s["level"], 0) + 1
    print(len(spells), "spells", dict(sorted(by_level.items())))
    print({c: sum(len(v) for v in l.values()) for c, l in resolved.items()})
    (out / "spell-gaps.json").write_text(json.dumps({"listed_but_no_description_in_pdf": sorted({u[2] for u in unresolved})}, indent=1), encoding="utf-8")
    print(len(unresolved), "unresolved list entries", unresolved[:20])
    print("spells with no class:", [s["name"] for s in spells if not s["classes"]][:30])


if __name__ == "__main__":
    sys.exit(main())
