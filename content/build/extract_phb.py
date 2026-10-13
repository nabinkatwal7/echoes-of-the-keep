"""Extract and clean text from DD-Player-Handbook.pdf into content/extracted/.

Usage: python content/build/extract_phb.py
Requires `pdftotext` (poppler/xpdf) on PATH.

The PDF's text layer has OCR-style letter spacing ("w ood elf", "o f"). We rebuild
words by joining adjacent fragments when the joined form is a word that appears
intact elsewhere in the book.
"""
import re, subprocess, json, collections, pathlib, sys, math

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import columns  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parents[2]
PDF = ROOT / "DD-Player-Handbook.pdf"
OUT = ROOT / "content" / "extracted"

SHORT_OK = set("a i to of in on an as at be by do go he if is it me my no or so up us we".split())
TOKEN = re.compile(r"^([^\w]*)([A-Za-z'’]+)([^\w]*)$")
MAX_GROUP = 14


def run_pdftotext(*flags):
    out = subprocess.run(["pdftotext", *flags, "-enc", "UTF-8", str(PDF), "-"],
                         capture_output=True, check=True).stdout.decode("utf-8", "replace")
    return out.split("\f")


def is_table_page(raw):
    """Class tables and similar: reading-order mode scrambles columns, content-stream order keeps rows."""
    rows = [l for l in raw.split("\n") if len(re.findall(r"[+\d]+", l)) >= 3 and len(l) < 90]
    return len(rows) >= 14


def pdf_pages():
    raw, flow = run_pdftotext("-raw"), run_pdftotext()
    pages = [r if is_table_page(r) else f for r, f in zip(raw, flow)]
    return pages, raw


class Lexicon:
    """Word costs: general English (wordninja) plus words seen in the book."""

    def __init__(self, pages):
        import wordninja
        self.base = wordninja.DEFAULT_LANGUAGE_MODEL._wordcost
        c = collections.Counter()
        for p in pages:
            for t in p.split():
                m = TOKEN.match(t)
                if m:
                    c[m.group(2).lower()] += 1
        self.book = {w: n for w, n in c.items() if n >= 3 and (len(w) >= 4 or w in self.base)}
        ranked = sorted(self.book, key=lambda w: -self.book[w])
        self.book_cost = {w: math.log((i + 1) * math.log(len(ranked) + 1)) for i, w in enumerate(ranked)}

    def known(self, w):
        w = w.lower()
        return w in SHORT_OK or w in self.base or w in self.book

    def cost(self, w):
        w = w.lower()
        if w in SHORT_OK:
            return 2.0
        if len(w) == 1:
            return 14.0
        best = min(self.base.get(w, 99), self.book_cost.get(w, 99) + 1.5)
        return best if best < 99 else 16.0


def pre(line):
    line = re.sub(r"(?<=[A-Za-z])\ufffd(?=s\b)", "\u2019", line)
    line = re.sub(r"^\ufffd\s*", "\u2022 ", line)
    return line.replace("\ufffd", " \u2014 ")


def post(line):
    line = re.sub(r"\s*\u2014\s*", "\u2014", line)
    line = re.sub(r"\s+([,.;:!?)])", r"\1", line)
    return re.sub(r"\(\s+", "(", line)


def fix_line(line, lex):
    line = pre(line)
    toks = line.split()
    n = len(toks)
    parsed = [TOKEN.match(t) for t in toks]
    INF = 1e9
    best = [INF] * (n + 1)
    back = [None] * (n + 1)
    best[0] = 0.0
    for i in range(n):
        if best[i] >= INF:
            continue
        # keep token as is
        m = parsed[i]
        c = lex.cost(m.group(2)) if m else 0.0
        if best[i] + c < best[i + 1]:
            best[i + 1], back[i + 1] = best[i] + c, (i, 1)
        if not m:
            continue
        for k in range(2, MAX_GROUP + 1):
            if i + k > n:
                break
            ms = parsed[i:i + k]
            if any(x is None for x in ms):
                break
            if any(x.group(3) for x in ms[:-1]) or any(x.group(1) for x in ms[1:]):
                break
            joined = "".join(x.group(2) for x in ms)
            if not lex.known(joined):
                continue
            c = lex.cost(joined) + 1.0
            # joining two already-good words needs a clear win
            if all(lex.cost(x.group(2)) < 8 and x.group(2).lower() not in SHORT_OK for x in ms):
                c += 6.0
            if best[i] + c < best[i + k]:
                best[i + k], back[i + k] = best[i] + c, (i, k)
    out, j = [], n
    while j > 0:
        i, k = back[j]
        if k == 1:
            out.append(toks[i])
        else:
            ms = parsed[i:j]
            out.append(ms[0].group(1) + "".join(x.group(2) for x in ms) + ms[-1].group(3))
        j = i
    return post(" ".join(reversed(out)))


SECTIONS = [  # (file, title, first pdf page index, last pdf page index inclusive)
    ("00-front-matter", "Preface and Introduction", 2, 6),
    ("01-step-by-step-characters", "Chapter 1: Step-by-Step Characters", 7, 11),
    ("02-races", "Chapter 2: Races", 12, 37),
    ("03-classes", "Chapter 3: Classes", 38, 112),
    ("04-personality-and-background", "Chapter 4: Personality and Background", 113, 132),
    ("05-equipment", "Chapter 5: Equipment", 133, 150),
    ("06-customization-options", "Chapter 6: Customization Options", 151, 158),
    ("07-using-ability-scores", "Chapter 7: Using Ability Scores", 159, 165),
    ("08-adventuring", "Chapter 8: Adventuring", 166, 171),
    ("09-combat", "Chapter 9: Combat", 172, 181),
    ("10-spellcasting", "Chapter 10: Spellcasting", 182, 186),
    ("11-spells", "Chapter 11: Spells", 187, 265),
    ("appendix-a-conditions", "Appendix A: Conditions", 266, 268),
    ("appendix-b-gods-of-the-multiverse", "Appendix B: Gods of the Multiverse", 269, 275),
    ("appendix-c-planes-of-existence", "Appendix C: The Planes of Existence", 276, 279),
    ("appendix-d-creature-statistics", "Appendix D: Creature Statistics", 280, 287),
    ("appendix-e-inspirational-reading", "Appendix E: Inspirational Reading", 288, 288),
]
WRAP_MIN = 42


def normalise_page(text, lex):
    text = text.replace("\u00ad\n", "")  # soft hyphen at line end
    lines = [l for l in text.split("\n")]
    # join "be-" + "hind" hyphenation when the joined form is a known word
    out = []
    for l in lines:
        if out and out[-1].endswith("-") and l and l[0].islower():
            head, tail = out[-1].rsplit(" ", 1)[-1][:-1], l.split(" ", 1)[0]
            if lex.known(re.sub(r"\W", "", head + tail)):
                out[-1] = out[-1][:-1] + l
                continue
        out.append(l)
    # soft-wrap prose lines into paragraphs; leave short lines and numeric table rows alone
    paras, cur = [], ""
    for l in out:
        nums = len(re.findall(r"\b\d+\b", l))
        if l.startswith("•") and cur:
            paras.append(cur); cur = ""
        heading = (len(l) < WRAP_MIN and l[:1].isupper() and len(l.split()) <= 5
                   and not re.search(r"[.!?,;:”\")]$", l) and not re.search(r"\d", l))
        if heading and cur and re.search(r"[.!?”\"]$", cur):
            paras.append(cur); cur = ""
            paras.append("### " + l)
            continue
        cur = (cur + " " + l) if cur else l
        if len(l) < WRAP_MIN or nums > 1:
            paras.append(cur); cur = ""
    if cur:
        paras.append(cur)
    return "\n\n".join(paras)


def clean_page(text, lex):
    text = text.replace(" • ", "\n• ")  # headings and bullets share a line in reading-order mode
    lines = [fix_line(l.strip(), lex) for l in text.split("\n")]
    return "\n".join(l for l in lines if l)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    pages, raw = pdf_pages()
    lex = Lexicon(raw)
    cleaned = [clean_page(p, lex) for p in pages]
    (OUT / "pages.json").write_text(json.dumps(cleaned, ensure_ascii=False), encoding="utf-8")
    cleaned_raw = [clean_page(p, lex) for p in raw]
    cols = [r if is_table_page(r) else columns.split_columns(l) for r, l in zip(raw, columns.layout_pages())]
    cleaned_cols = [clean_page(p, lex) for p in cols]
    (OUT / "pages_cols.json").write_text(json.dumps(cleaned_cols, ensure_ascii=False), encoding="utf-8")
    (OUT / "pages_raw.json").write_text(json.dumps(cleaned_raw, ensure_ascii=False), encoding="utf-8")
    chapters = OUT / "chapters"
    chapters.mkdir(exist_ok=True)
    for name, title, a, b in SECTIONS:
        body = [f"# {title}\n"]
        for i in range(a, b + 1):
            body.append(f"\n<!-- pdf-page {i} -->\n\n" + normalise_page(cleaned[i], lex))
        (chapters / f"{name}.md").write_text("\n".join(body), encoding="utf-8")
    print(len(cleaned), "pages;", len(SECTIONS), "chapter files")



if __name__ == "__main__":
    sys.exit(main())
