"""Parse structured (non-spell) content from the cleaned PDF text.

Input : content/extracted/pages.json (reading order), pages_raw.json (content-stream order, good for tables)
Output: content/extracted/structured/{conditions,feats,backgrounds,races,classes,equipment,creatures,gods}.json
Run after extract_phb.py.

Every record carries `pdfPages` (0-based PDF page indexes, see chapters/*.md markers) so entries can be
checked against the book. Parsing is heuristic; scripts/QA notes live in docs/07-website-content.md.
"""
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
EXT = ROOT / "content" / "extracted"
OUT = EXT / "structured"

PAGES = json.loads((EXT / "pages.json").read_text(encoding="utf-8"))
RAW = json.loads((EXT / "pages_raw.json").read_text(encoding="utf-8"))
COLS = json.loads((EXT / "pages_cols.json").read_text(encoding="utf-8"))  # column-aware reading order


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", re.sub(r"['’?]", "", s.lower())).strip("-")


def norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


def lines_of(pages, a, b):
    """[(line, pdf_page)] for pdf pages a..b inclusive."""
    out = []
    for i in range(a, b + 1):
        out += [(l.strip(), i) for l in pages[i].split("\n") if l.strip()]
    return out


def split_by_headings(lines, names, allow_prefix=False):
    """Split [(line,page)] at heading lines (normalised text equals a known display name, first occurrence only).

    With allow_prefix, a line that *starts with* a not-yet-seen name (e.g. "Medium Armor Master Prerequisite: ...",
    "Half-Orc Traits") also opens a section; the remainder of the line becomes the first body line.
    """
    want = {norm(n): n for n in names}
    sections, seen, cur = [], set(), None
    for l, pg in lines:
        n = norm(l)
        hit, rest = None, None
        if n in want and len(l) <= 40 and want[n] not in seen:
            hit = want[n]
        elif allow_prefix:
            for wn, disp in want.items():
                if disp in seen:
                    continue
                m = re.match(r"^" + r"\s*".join(map(re.escape, disp.replace(" ", ""))) + r"(?:\s+Traits)?\s*(.*)$", l)
                if m and (m.group(1) == "" or m.group(1)[:1].isupper() and len(disp) > 4):
                    hit, rest = disp, m.group(1)
                    break
        if hit:
            seen.add(hit)
            cur = {"name": hit, "lines": [rest] if rest else [], "pages": {pg}}
            sections.append(cur)
            continue
        if cur is not None:
            cur["lines"].append(l)
            cur["pages"].add(pg)
    return sections


def text_of(lines):
    return " ".join(lines)


def field(text, label, stops):
    m = re.search(re.escape(label) + r":?\s*(.*?)(?=" + "|".join(re.escape(s) + ":" for s in stops) + r"|$)", text, re.S)
    return m.group(1).strip() if m else None


# ---------------------------------------------------------------- conditions (Appendix A)
CONDITIONS = ["Blinded", "Charmed", "Deafened", "Exhaustion", "Frightened", "Grappled", "Incapacitated", "Invisible",
              "Paralyzed", "Petrified", "Poisoned", "Prone", "Restrained", "Stunned", "Unconscious"]


def conditions():
    secs = split_by_headings(lines_of(PAGES, 266, 268), CONDITIONS)
    return [{"index": slug(s["name"]), "name": s["name"], "description": "\n".join(s["lines"]),
             "pdfPages": sorted(s["pages"])} for s in secs]


# ---------------------------------------------------------------- feats (Chapter 6)
FEATS = ["Alert", "Athlete", "Actor", "Charger", "Crossbow Expert", "Defensive Duelist", "Dual Wielder", "Dungeon Delver",
         "Durable", "Elemental Adept", "Grappler", "Great Weapon Master", "Healer", "Heavily Armored", "Heavy Armor Master",
         "Inspiring Leader", "Keen Mind", "Lightly Armored", "Linguist", "Lucky", "Mage Slayer", "Magic Initiate",
         "Martial Adept", "Medium Armor Master", "Mobile", "Moderately Armored", "Mounted Combatant", "Observant",
         "Polearm Master", "Resilient", "Ritual Caster", "Savage Attacker", "Sentinel", "Sharpshooter", "Shield Master",
         "Skilled", "Skulker", "Spell Sniper", "Tavern Brawler", "Tough", "War Caster", "Weapon Master"]


def feats():
    lines = lines_of(RAW, 153, 158)
    out = []
    found = split_by_headings(lines, FEATS, allow_prefix=True)
    have = {x["name"] for x in found}
    # two feats can share a line in content-stream order; recover the rest from column-aware text
    for s in split_by_headings(lines_of(COLS, 153, 158), [n for n in FEATS if n not in have]):
        found.append(s)
    for s in found:
        body = [l for l in s["lines"]]
        text = "\n".join(body)
        pre = re.search(r"Prerequisite:\s*(.*)", text)
        out.append({"index": slug(s["name"]), "name": s["name"],
                    "prerequisite": pre.group(1).strip() if pre else None,
                    "description": text, "pdfPages": sorted(s["pages"])})
    return out


# ---------------------------------------------------------------- backgrounds (Chapter 4)
BACKGROUNDS = ["Acolyte", "Charlatan", "Criminal", "Entertainer", "Folk Hero", "Guild Artisan", "Hermit", "Noble",
               "Outlander", "Sage", "Sailor", "Soldier", "Urchin"]
BG_STOPS = ["Skill Proficiencies", "Tool Proficiencies", "Languages", "Equipment", "Feature", "Suggested Characteristics"]


SENTENCE_STARTERS = {"As", "You", "When", "Since", "Your", "Having", "The", "People", "With", "In", "Because", "During",
                     "Thanks", "Wherever", "After", "Everyone", "Nobles", "If", "Not", "Strangers", "Although", "A", "An",
                     "Most", "At", "Fortunately", "Even", "All", "By", "Many", "Once", "Though", "Whenever", "Having"}


def feature_name(text):
    text = re.sub(r"\s+([’'])", r"", text)
    m = re.search(r"Feature:\s*(.*)", text)
    if not m:
        return None
    words, out = m.group(1).split(), []
    for k, w in enumerate(words[:8]):
        if w in SENTENCE_STARTERS and out:
            break
        if w[0].isupper() or w in ("of", "the", "and", "to", "a"):
            out.append(w)
        else:
            break
    return " ".join(out) or None



def backgrounds():
    out = []
    for s in split_by_headings(lines_of(RAW, 113, 132), BACKGROUNDS, allow_prefix=True):
        t = text_of(s["lines"])
        out.append({
            "index": slug(s["name"]), "name": s["name"],
            "skillProficiencies": field(t, "Skill Proficiencies", BG_STOPS[1:] + ["d8", "d6"]),
            "toolProficiencies": field(t, "Tool Proficiencies", ["Languages", "Equipment"]),
            "languages": field(t, "Languages", ["Equipment"]),
            "equipment": field(t, "Equipment", ["Feature"]),
            "featureName": feature_name(t),
            "text": "\n".join(s["lines"]), "pdfPages": sorted(s["pages"])})
    return out


# ---------------------------------------------------------------- races (Chapter 2)
RACES = ["Dwarf", "Hill Dwarf", "Mountain Dwarf", "Elf", "High Elf", "Wood Elf", "Dark Elf (Drow)", "Halfling",
         "Lightfoot", "Stout", "Human", "Dragonborn", "Gnome", "Forest Gnome", "Rock Gnome", "Half-Elf", "Half-Orc", "Tiefling"]
TRAIT_RE = re.compile(r"^([A-Z][A-Za-z'’ -]{2,40}?)\.\s+(.+)$")


def races():
    """Walk chapter 2 as one stream. Trait groups start at 'Ability Score Increase.'; a group belongs to the race
    named by an immediately preceding '<Race> Traits' line, otherwise to the most recent race/subrace heading."""
    stream = lines_of(RAW, 12, 37)
    want = {norm(n): n for n in RACES}
    races_out, by_name = [], {}

    def get(name, pg):
        if name not in by_name:
            by_name[name] = {"index": slug(name), "name": name, "traits": [], "text": [], "pdfPages": set()}
            races_out.append(by_name[name])
        by_name[name]["pdfPages"].add(pg)
        return by_name[name]

    current, group_owner, pending = None, None, None
    for l, pg in stream:
        n = norm(l)
        m_traits = re.match(r"^(Variant )?(.+?) Traits$", l)
        if n in want and len(l) < 30:
            current, group_owner, pending = get(want[n], pg), None, None
            continue
        elif m_traits and norm(m_traits.group(2)) in want:
            owner = want[norm(m_traits.group(2))]
            pending = get(owner if not m_traits.group(1) else owner + " (Variant)", pg)
            group_owner = None
            continue
        m = TRAIT_RE.match(l)
        if m and len(m.group(1).split()) <= 5:
            name = m.group(1)
            if name == "Ability Score Increase":
                group_owner, pending = (pending or current), None
            if group_owner is not None:
                group_owner["traits"].append({"name": name, "description": m.group(2)})
                group_owner["pdfPages"].add(pg)
        elif group_owner is not None and group_owner["traits"] and not re.match(r"^[A-Z][^.]{0,30}$", l):
            group_owner["traits"][-1]["description"] += " " + l
        elif current is not None:
            current["text"].append(l)
    for r in races_out:
        r["pdfPages"] = sorted(r["pdfPages"])
        r["text"] = "\n".join(r["text"])
    return [r for r in races_out if r["traits"] or r["text"]]


# ---------------------------------------------------------------- classes (Chapter 3)
CLASSES = ["Barbarian", "Bard", "Cleric", "Druid", "Fighter", "Monk", "Paladin", "Ranger", "Rogue", "Sorcerer",
           "Warlock", "Wizard"]
ROW_RE = re.compile(r"^(\d{1,2})\s?(?:st|nd|rd|th)\s+(\+\d)\s*(.*)$")


# Hit dice per class (PHB class tables) used to cross-check the parsed text and fill OCR gaps.
HIT_DICE = {"Barbarian": 12, "Bard": 8, "Cleric": 8, "Druid": 8, "Fighter": 10, "Monk": 8, "Paladin": 10, "Ranger": 10,
            "Rogue": 8, "Sorcerer": 6, "Warlock": 8, "Wizard": 6}


def classes():
    # locate each class's page range from "The <Class>" table headings in the raw pages
    starts = {}
    for i in range(38, 113):
        for l in RAW[i].split("\n"):
            m = re.match(r"^The (%s)$" % "|".join(CLASSES), l.strip())
            if m and m.group(1) not in starts:
                starts[m.group(1)] = i
    order = sorted(starts.items(), key=lambda kv: kv[1])
    out = []
    for n, (name, a) in enumerate(order):
        b = order[n + 1][1] - 1 if n + 1 < len(order) else 112
        # level table: raw pages a..a+1
        rows = []
        for i in range(a, min(a + 3, b) + 1):
            for l in RAW[i].split("\n"):
                m = ROW_RE.match(l.strip())
                if m:
                    rows.append({"level": int(m.group(1)), "proficiencyBonus": m.group(2), "columns": m.group(3)})
        seen, uniq = set(), []
        for r in rows:
            if r["level"] not in seen:
                seen.add(r["level"]); uniq.append(r)
        text = "\n".join(l for l, _ in lines_of(COLS, a, b))
        hd = re.search(r"Hit Dice:?\s*1d\s?(\d+)|1d\s?(\d+) per \w+ level", text)
        prof = {k: (re.search(k + r":\s*(.*?)(?=\s+(?:Armor|Weapons|Tools|Saving Throws|Skills|Equipment):|\n|$)", text) or [None, None])[1]
                for k in ("Armor", "Weapons", "Tools", "Saving Throws", "Skills")}
        out.append({"index": slug(name), "name": name, "hitDie": int(hd.group(1) or hd.group(2)) if hd else HIT_DICE[name],
                    "proficiencies": prof, "levelTable": uniq, "pdfPages": [a, b], "text": text})
    return out


# ---------------------------------------------------------------- equipment (Chapter 5)
ROW_COST = r"\d[\d,]*\s?(?:cp|sp|ep|gp|pp)"
EQUIP_ROW = re.compile(r"^(?P<name>[A-Za-z][^\d—]*?)\s+(?P<cost>" + ROW_COST + r")\s*(?P<rest>.*)$")
DAMAGE = re.compile(r"^(?P<dice>\d+(?:d\d+)?) (?P<type>bludgeoning|piercing|slashing)\s*")
WEIGHT = re.compile(r"(?P<w>\d+(?: \d/\d)?(?:/\d)? ?lb\.)")
ARMOR_AC = re.compile(r"^(?P<ac>\+?\d+(?: \+ Dex modifier(?: \(max 2\))?)?)\s*(?P<rest>.*)$")
ARMOR_NAMES = {"padded", "leather", "studded leather", "hide", "chain shirt", "scale mail", "breastplate", "half plate",
               "ring mail", "chain mail", "chainmail", "splint", "plate", "shield"}


def equipment():
    rows, category = [], None
    for i in range(133, 151):
        merged = []
        for l in (x.strip() for x in RAW[i].split("\n")):
            # content-stream order splits "1d6" / "1 1/2 lb." / "1,000" across lines
            if merged and re.match(r"^(d\d+\b|/\s*\d|,?\d{3}\b|\d?/\d)", l) and re.search(r"\d$", merged[-1]):
                merged[-1] += l if l[0] in "d/," else " " + l
            elif merged and re.fullmatch(r"\d+ lb\.", l) and not merged[-1].rstrip().endswith("lb."):
                merged[-1] += " " + l
            else:
                merged.append(l)
        for l in merged:
            m = EQUIP_ROW.match(l)
            if not m:
                if l and len(l) < 40 and not re.search(r"[.,:;]$", l) and not re.search(r"\d", l):
                    category = l
                continue
            name, cost, rest = m.group("name").strip(), m.group("cost"), m.group("rest").strip()
            row = {"name": name, "category": category, "cost": cost, "rest": rest, "pdfPage": i}
            d = DAMAGE.match(rest)
            if d:
                row["damage"] = d.group("dice") + " " + d.group("type")
                rest = rest[d.end():]
                w = WEIGHT.match(rest)
                row["weight"] = w.group("w") if w else None
                row["properties"] = rest[w.end():].strip(" —") if w else rest.strip(" —")
            elif name.lower() in ARMOR_NAMES:
                a = ARMOR_AC.match(rest)
                if a:
                    row["armorClass"] = a.group("ac")
                    row["strengthRequired"] = (re.search(r"Str (\d+)", a.group("rest")) or [None, None])[1]
                    row["stealthDisadvantage"] = "Disadvantage" in a.group("rest")
                    w = WEIGHT.search(a.group("rest"))
                    row["weight"] = w.group("w") if w else None
            else:
                w = WEIGHT.fullmatch(rest) if rest else None
                if w:
                    row["weight"] = w.group("w")
            rows.append(row)
    return rows


# ---------------------------------------------------------------- creatures (Appendix D)
SIZE_RE = re.compile(r"^(Tiny|Small|Medium|Large|Huge|Gargantuan) ([a-z ]+(?:\([a-z ,]+\))?), ([a-z ]+)$")


def creatures():
    lines = lines_of(PAGES, 280, 287)
    idx = [i for i, (l, _) in enumerate(lines) if SIZE_RE.match(l) and i > 0]
    out = []
    for n, i in enumerate(idx):
        end = idx[n + 1] - 1 if n + 1 < len(idx) else len(lines)
        name = lines[i - 1][0]
        block = [l for l, _ in lines[i:end]]
        t = "\n".join(block)
        m = SIZE_RE.match(block[0])
        ab = re.search(r"STR DEX CON INT WIS CHA\s*\n?\s*(\d+) \(([+\-−]?\d+)\) (\d+) \(([+\-−]?\d+)\) (\d+) \(([+\-−]?\d+)\) (\d+) \(([+\-−]?\d+)\) (\d+) \(([+\-−]?\d+)\) (\d+) \(([+\-−]?\d+)\)", t)
        g = lambda pat: (re.search(pat, t) or [None, None])[1]
        out.append({
            "index": slug(name), "name": name, "size": m.group(1), "type": m.group(2), "alignment": m.group(3),
            "armorClass": g(r"Armor Class (.*)"), "hitPoints": g(r"Hit Points (.*)"), "speed": g(r"Speed (.*)"),
            "abilities": dict(zip(("str", "dex", "con", "int", "wis", "cha"), [int(ab.group(k)) for k in (1, 3, 5, 7, 9, 11)])) if ab else None,
            "savingThrows": g(r"Saving Throws (.*)"), "skills": g(r"Skills (.*)"),
            "damageResistances": g(r"Damage Resistances (.*)"), "senses": g(r"Senses (.*)"),
            "languages": g(r"Languages (.*)"), "challenge": g(r"Challenge (.*)"),
            "text": t, "pdfPages": sorted({pg for _, pg in lines[i:end]})})
    return out


# ---------------------------------------------------------------- gods (Appendix B)
def gods():
    """Pantheon tables: rows are 'Name Alignment Domains Symbol'. Kept as raw rows per pantheon page."""
    rows = []
    for i in range(269, 276):
        for l in RAW[i].split("\n"):
            m = re.match(r"^([A-Z][A-Za-z'’, -]+?)\s+(LG|NG|CG|LN|N|CN|LE|NE|CE)\s+([A-Z][A-Za-z, ]+?)\s+(.+)$", l.strip())
            if m:
                rows.append({"name": m.group(1), "alignment": m.group(2), "domains": m.group(3), "symbol": m.group(4), "pdfPage": i})
    return rows


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    result = {"conditions": conditions(), "feats": feats(), "backgrounds": backgrounds(), "races": races(),
              "classes": classes(), "equipment": equipment(), "creatures": creatures(), "gods": gods()}
    for k, v in result.items():
        (OUT / f"{k}.json").write_text(json.dumps(v, indent=1, ensure_ascii=False), encoding="utf-8")
    eq = result["equipment"]
    cats = {}
    for r in eq:
        cats[r["category"]] = cats.get(r["category"], 0) + 1
    print("conditions", len(result["conditions"]), "feats", len(result["feats"]), "backgrounds", len(result["backgrounds"]))
    print("races", [r["name"] for r in result["races"]])
    print("classes", [(c["name"], c["hitDie"], len(c["levelTable"])) for c in result["classes"]])
    print("equipment rows", len(eq), "weapons", sum(1 for r in eq if "damage" in r), "armor", sum(1 for r in eq if "armorClass" in r))
    print(cats)
    print("creatures", len(result["creatures"]), "gods", len(result["gods"]))


if __name__ == "__main__":
    sys.exit(main())
