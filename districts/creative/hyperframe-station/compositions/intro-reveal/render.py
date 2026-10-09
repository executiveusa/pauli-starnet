#!/usr/bin/env python3
"""intro-reveal renderer: brand config in, animated MP4 out.

Usage:
  python3 render.py <brand.config.json> [--out <output.mp4>] [--quality draft|standard|high]

The config is the whole job: logo (svg markup OR beads json), wordmark,
tagline, credits, colors, duration. See brand.config.example.json.
"""
import json, os, re, shutil, subprocess, sys, tempfile

from brand_safety import BrandConfigError, embed_json, validate_brand

HERE = os.path.dirname(os.path.abspath(__file__))

def build_html(cfg, config_dir):
    """Validate the untrusted config and fill the template. Raises BrandConfigError."""
    brand, fields = validate_brand(cfg, config_dir)
    html = open(os.path.join(HERE, "template.html")).read()
    wm = fields["wordmark"]
    wm2 = fields["wordmark2"]
    wm_html = wm + (' <span class="w2">' + wm2 + "</span>" if wm2 else "")
    values = {
        "__BG__": brand["bg"],
        "__INK__": brand["ink"],
        "__ACCENT2__": brand["accent2"],
        "__ACCENT__": brand["accent"],
        "__DISPLAY_FONT__": brand.get("display_font", '"Cormorant Garamond"'),
        "__WORDMARK_HTML__": wm_html,
        "__TAGLINE__": fields["tagline"],
        "__CREDITS__": fields["credits"],
        "__DURATION__": str(brand["duration"]),
        "__BRAND_JSON__": embed_json(brand),
    }
    # One pass, so placeholder-looking text inside a value is never expanded again.
    pattern = re.compile("|".join(re.escape(k) for k in sorted(values, key=len, reverse=True)))
    return pattern.sub(lambda m: values[m.group(0)], html)

def main():
    cfg_path = sys.argv[1]
    out = None; quality = "standard"
    args = sys.argv[2:]
    for i, a in enumerate(args):
        if a == "--out": out = args[i+1]
        if a == "--quality": quality = args[i+1]
    cfg = json.load(open(cfg_path))
    out = out or (str(cfg.get("brand", "brand")).lower().replace(" ", "-") + "-intro.mp4")
    try:
        html = build_html(cfg, os.path.dirname(os.path.abspath(cfg_path)))
    except BrandConfigError as exc:
        # Fail closed: an unsafe config never reaches the renderer.
        sys.exit(f"[refused] unsafe brand config: {exc}")

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
