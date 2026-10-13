"""Column-aware text: pdftotext -layout, then split each page at its vertical gutter (left column, then right)."""
import re, subprocess, pathlib

PDF = pathlib.Path(__file__).resolve().parents[2] / "DD-Player-Handbook.pdf"


def layout_pages():
    out = subprocess.run(["pdftotext", "-layout", "-enc", "UTF-8", str(PDF), "-"], capture_output=True, check=True)
    return out.stdout.decode("utf-8", "replace").split("\f")


def split_columns(page):
    lines = [l.expandtabs() for l in page.split("\n")]
    body = [l for l in lines if l.strip()]
    if len(body) < 8:
        return "\n".join(l.strip() for l in lines if l.strip())
    width = max(len(l) for l in body)
    lo, hi = int(width * 0.35), int(width * 0.65)
    best, best_blank = None, -1
    for x in range(lo, hi):
        blank = sum(1 for l in body if len(l) <= x or l[x] == " ")
        # a gutter is blank over a run of >=3 columns for nearly all lines
        run = all(sum(1 for l in body if len(l) <= xx or l[xx] == " ") >= 0.97 * len(body) for xx in (x - 1, x, x + 1))
        if run and blank > best_blank:
            best, best_blank = x, blank
    if best is None:
        return "\n".join(l.strip() for l in lines if l.strip())
    left = [l[:best].strip() for l in lines]
    right = [l[best:].strip() for l in lines]
    return "\n".join([l for l in left if l] + [l for l in right if l])
