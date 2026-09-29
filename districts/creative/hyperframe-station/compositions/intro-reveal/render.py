#!/usr/bin/env python3
"""intro-reveal renderer: brand config in, animated MP4 out.

Usage:
  python3 render.py <brand.config.json> [--out <output.mp4>] [--quality draft|standard|high]

The config is the whole job: logo (svg markup OR beads json), wordmark,
tagline, credits, colors, duration. See brand.config.example.json.
"""
import json, os, shutil, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))

def main():
    cfg_path = sys.argv[1]
    out = None; quality = "standard"
    args = sys.argv[2:]
    for i, a in enumerate(args):
        if a == "--out": out = args[i+1]
        if a == "--quality": quality = args[i+1]
    cfg = json.load(open(cfg_path))
    out = out or (cfg["brand"].lower().replace(" ", "-") + "-intro.mp4")

    logo = dict(cfg["logo"])
    if logo.get("mode") == "beads" and "src" in logo:
        beads = json.load(open(os.path.join(os.path.dirname(cfg_path), logo["src"])))
        logo["beads"] = beads
    brand = dict(cfg); brand["logo"] = logo

    html = open(os.path.join(HERE, "template.html")).read()
    wm = brand.get("wordmark", "")
    wm2 = brand.get("wordmark2", "")
    wm_html = wm + (' <span class="w2">' + wm2 + "</span>" if wm2 else "")
    html = (html
        .replace("__BG__", brand.get("bg", "#0a0a0a"))
        .replace("__INK__", brand.get("ink", "#f4f4f5"))
        .replace("__ACCENT2__", brand.get("accent2", brand.get("accent", "#c9a86a")))
        .replace("__ACCENT__", brand.get("accent", "#c9a86a"))
        .replace("__DISPLAY_FONT__", brand.get("display_font", '"Cormorant Garamond"'))
        .replace("__WORDMARK_HTML__", wm_html)
        .replace("__TAGLINE__", brand.get("tagline", ""))
        .replace("__CREDITS__", brand.get("credits", ""))
        .replace("__DURATION__", str(brand.get("duration", 12)))
        .replace("__BRAND_JSON__", json.dumps(brand)))

    work = tempfile.mkdtemp(prefix="hf-render-")
    try:
        open(os.path.join(work, "index.html"), "w").write(html)
        cmd = ["npx", "--yes", "hyperframes@0.8.86", "render", "--quality", quality, "--output", os.path.abspath(out)]
        print("[render]", " ".join(cmd), "cwd=", work)
        r = subprocess.run(cmd, cwd=work)
        if r.returncode != 0: sys.exit(r.returncode)
        print("[done]", os.path.abspath(out))
    finally:
        shutil.rmtree(work, ignore_errors=True)

if __name__ == "__main__":
    main()
