#!/usr/bin/env python3
"""intro-reveal renderer: brand config in, animated MP4 out.

Usage:
  python3 render.py <brand.config.json> [--out <output.mp4>] [--quality draft|standard|high] [--check]

The config is the whole job: logo (svg markup OR beads json), wordmark,
tagline, credits, colors, duration. See brand.config.example.json.
--check validates the config and prints the output path without rendering.
"""
import argparse, os, re, shutil, subprocess, sys, tempfile

from brand_safety import (
    BrandConfigError, contained_path, default_output_name, embed_json, load_config, validate_brand,
)

HERE = os.path.dirname(os.path.abspath(__file__))

def build_html(cfg, config_dir):
    """Validate the untrusted config and fill the template. Raises BrandConfigError."""
    brand, fields = validate_brand(cfg, config_dir)
    with open(os.path.join(HERE, "template.html"), encoding="utf-8") as fh:
        html = fh.read()
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
    return pattern.sub(lambda m: values[m.group(0)], html), brand

def parse_args(argv=None):
    parser = argparse.ArgumentParser(prog="render.py", description="Render an intro-reveal MP4 from a brand config.")
    parser.add_argument("config", help="path to brand.config.json")
    parser.add_argument("--out", help="output .mp4 path (default: a safe name in the current directory)")
    parser.add_argument("--quality", choices=["draft", "standard", "high"], default="standard")
    parser.add_argument("--check", action="store_true", help="validate only; do not render")
    return parser.parse_args(argv)

def main(argv=None):
    args = parse_args(argv)
    config_path = os.path.abspath(args.config)
    try:
        cfg = load_config(config_path)
        html, brand = build_html(cfg, os.path.dirname(config_path))
        if args.out:
            out = os.path.abspath(args.out)
        else:
            out = contained_path(os.getcwd(), default_output_name(brand["brand"]))
    except BrandConfigError as exc:
        # Fail closed: an unsafe config never reaches the renderer.
        sys.exit(f"[refused] unsafe brand config: {exc}")
    if args.check:
        print("[ok]", out)
        return 0

    work = tempfile.mkdtemp(prefix="hf-render-")
    try:
        with open(os.path.join(work, "index.html"), "w", encoding="utf-8") as fh:
            fh.write(html)
        cmd = ["npx", "--yes", "hyperframes@0.8.86", "render", "--quality", args.quality, "--output", out]
        print("[render]", " ".join(cmd), "cwd=", work)
        r = subprocess.run(cmd, cwd=work)
        if r.returncode != 0: sys.exit(r.returncode)
        print("[done]", out)
    finally:
        shutil.rmtree(work, ignore_errors=True)
    return 0

if __name__ == "__main__":
    sys.exit(main())
