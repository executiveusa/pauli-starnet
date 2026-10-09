"""Fail-closed validation for intro-reveal brand configs.

The config is untrusted input: its text lands in HTML, its JSON lands in an inline
<script>, its logo markup is assigned to innerHTML, and its colors/fonts land in CSS.
Everything here either returns a safe value or raises BrandConfigError. Nothing is
silently repaired, so an unsafe config never reaches the renderer.
"""
import html
import json
import os
import re
import xml.etree.ElementTree as ET

SVG_NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG_NS)

ALLOWED_ELEMENTS = {
    "svg", "g", "path", "circle", "ellipse", "line", "polyline", "polygon", "rect",
    "defs", "linearGradient", "radialGradient", "stop", "clipPath", "title", "desc",
}
ALLOWED_ATTRIBUTES = {
    "viewBox", "preserveAspectRatio", "width", "height", "id", "d", "points", "transform",
    "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "y1", "x2", "y2",
    "fill", "fill-opacity", "fill-rule", "clip-rule", "stroke", "stroke-width",
    "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-opacity", "opacity",
    "offset", "stop-color", "stop-opacity", "gradientUnits", "gradientTransform",
    "clip-path", "fx", "fy",
}
LOCAL_URL = re.compile(r"^url\(#[A-Za-z0-9_-]+\)$")
COLOR = re.compile(
    r"^(#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,20}|(rgb|rgba|hsl|hsla)\([0-9 ,.%/]{1,40}\))$"
)
FONT = re.compile(r"^[\"']?[A-Za-z0-9][A-Za-z0-9 \-]{0,59}[\"']?$")
TEXT_FIELDS = ("wordmark", "wordmark2", "tagline", "credits")


class BrandConfigError(ValueError):
    pass


def escape_text(value):
    """HTML-escape user text for element content."""
    if not isinstance(value, str):
        raise BrandConfigError("text field must be a string")
    return html.escape(value, quote=True)


def embed_json(obj):
    """JSON for an inline <script>: no `<`, `>`, `&` or line separators can survive."""
    return (
        json.dumps(obj)
        .replace("<", "\\u003c")
        .replace(">", "\\u003e")
        .replace("&", "\\u0026")
        .replace("\u2028", "\\u2028")
        .replace("\u2029", "\\u2029")
    )


def check_color(value, field):
    if not isinstance(value, str) or not COLOR.match(value):
        raise BrandConfigError(f"{field}: not a plain CSS color")
    return value


def check_font(value):
    if not isinstance(value, str) or not FONT.match(value):
        raise BrandConfigError("display_font: letters, digits, spaces and hyphens only")
    return value


def check_number(value, field, low, high):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not (low <= value <= high):
        raise BrandConfigError(f"{field}: number between {low} and {high} required")
    return value


def _local(tag):
    if tag.startswith("{"):
        ns, _, name = tag[1:].partition("}")
        if ns != SVG_NS:
            raise BrandConfigError(f"svg: foreign namespace {ns!r} not allowed")
        return name
    return tag


def _check_attr(name, value):
    if name not in ALLOWED_ATTRIBUTES:
        raise BrandConfigError(f"svg: attribute {name!r} not allowed")
    lowered = value.lower()
    if "<" in value or ">" in value or "javascript:" in lowered or "data:" in lowered:
        raise BrandConfigError(f"svg: unsafe value in attribute {name!r}")
    if "url(" in lowered and not LOCAL_URL.match(value.strip()):
        raise BrandConfigError(f"svg: external reference in attribute {name!r}")
    if "http:" in lowered or "https:" in lowered or "//" in value:
        raise BrandConfigError(f"svg: external reference in attribute {name!r}")


def sanitize_svg(markup):
    """Return canonical safe SVG, or raise. The input string is never passed through."""
    if not isinstance(markup, str) or not markup.strip():
        raise BrandConfigError("svg: markup must be a non-empty string")
    if len(markup) > 200_000:
        raise BrandConfigError("svg: markup too large")
    if re.search(r"<!\s*(DOCTYPE|ENTITY)|<\?|<!\[CDATA\[", markup, re.I):
        raise BrandConfigError("svg: doctype, entity, processing instruction and CDATA not allowed")
    try:
        root = ET.fromstring(markup)
    except ET.ParseError as exc:
        raise BrandConfigError(f"svg: not well-formed XML ({exc})")
    if _local(root.tag) != "svg":
        raise BrandConfigError("svg: root element must be <svg>")

    def clean(node):
        name = _local(node.tag)
        if name not in ALLOWED_ELEMENTS:
            raise BrandConfigError(f"svg: element <{name}> not allowed")
        out = ET.Element(f"{{{SVG_NS}}}{name}")
        for attr, value in node.attrib.items():
            if attr.startswith("{") or attr.lower().startswith("on"):
                raise BrandConfigError(f"svg: attribute {attr!r} not allowed")
            _check_attr(attr, value)
            out.set(attr, value)
        if name in ("title", "desc"):
            out.text = node.text or ""
        elif (node.text or "").strip():
            raise BrandConfigError(f"svg: text inside <{name}> not allowed")
        for child in node:
            out.append(clean(child))
        return out

    return ET.tostring(clean(root), encoding="unicode")


def validate_brand(cfg, config_dir):
    """Return (safe_brand, html_fields). Raises BrandConfigError on anything unsafe."""
    if not isinstance(cfg, dict):
        raise BrandConfigError("config must be a JSON object")
    brand = dict(cfg)
    if not isinstance(brand.get("brand"), str) or not brand["brand"]:
        raise BrandConfigError("brand: non-empty string required")
    for field, default in (("bg", "#0a0a0a"), ("ink", "#f4f4f5"), ("accent", "#c9a86a")):
        brand[field] = check_color(brand.get(field, default), field)
    brand["accent2"] = check_color(brand.get("accent2", brand["accent"]), "accent2")
    if "display_font" in brand:
        brand["display_font"] = check_font(brand["display_font"])
    brand["duration"] = check_number(brand.get("duration", 12), "duration", 1, 120)

    fields = {}
    for key in TEXT_FIELDS:
        fields[key] = escape_text(brand.get(key, ""))

    logo = brand.get("logo")
    if not isinstance(logo, dict):
        raise BrandConfigError("logo: object required")
    logo = dict(logo)
    mode = logo.get("mode")
    if mode == "svg":
        logo["markup"] = sanitize_svg(logo.get("markup"))
        if "scale" in logo:
            check_number(logo["scale"], "logo.scale", 10, 4000)
    elif mode == "beads":
        for key in ("srcW", "srcH"):
            check_number(logo.get(key), f"logo.{key}", 1, 10000)
        if "scale" in logo:
            check_number(logo["scale"], "logo.scale", 0.01, 10)
        if "beads" in logo:
            raise BrandConfigError("logo.beads: load beads from logo.src, not inline")
        src = logo.get("src")
        if not isinstance(src, str) or not src:
            raise BrandConfigError("logo.src: beads file required")
        base = os.path.realpath(config_dir)
        path = os.path.realpath(os.path.join(base, src))
        if os.path.commonpath([base, path]) != base:
            raise BrandConfigError("logo.src: must stay inside the config directory")
        with open(path) as fh:
            beads = json.load(fh)
        if not isinstance(beads, list) or len(beads) > 50_000:
            raise BrandConfigError("beads: list of up to 50000 beads required")
        for bead in beads:
            if not isinstance(bead, dict):
                raise BrandConfigError("beads: each bead must be an object")
            for key in ("x", "y", "r"):
                check_number(bead.get(key), f"bead.{key}", -100000, 100000)
            check_color(bead.get("c"), "bead.c")
        logo["beads"] = beads
    else:
        raise BrandConfigError("logo.mode must be 'svg' or 'beads'")
    brand["logo"] = logo
    return brand, fields
