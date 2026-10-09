"""Regression tests: untrusted brand configs must be escaped or refused, never rendered."""
import copy
import json
import os
import re
import sys

import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from brand_safety import BrandConfigError, sanitize_svg  # noqa: E402
from render import build_html  # noqa: E402

BENIGN_SVG = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
    '<defs><linearGradient id="g"><stop offset="0" stop-color="#c9a86a"/></linearGradient></defs>'
    '<path d="M50 10 L90 50 L50 90 L10 50 Z" fill="url(#g)" stroke="#c9a86a" stroke-width="1"/>'
    '<circle cx="50" cy="50" r="5" fill="#fff"/></svg>'
)
BASE = {
    "brand": "Test",
    "wordmark": "TEST",
    "wordmark2": "CO",
    "tagline": "hello",
    "credits": "me",
    "duration": 12,
    "logo": {"mode": "svg", "scale": 420, "markup": BENIGN_SVG},
}


def cfg(**changes):
    c = copy.deepcopy(BASE)
    c.update(changes)
    return c


def render(c):
    return build_html(c, HERE)


def test_benign_svg_renders_and_keeps_shapes():
    out = render(cfg())
    assert "<path" in sanitize_svg(BENIGN_SVG)
    assert "linearGradient" in out
    assert "__BRAND_JSON__" not in out and "__WORDMARK_HTML__" not in out


@pytest.mark.parametrize("field", ["wordmark", "wordmark2", "tagline", "credits"])
def test_text_fields_are_html_escaped(field):
    out = render(cfg(**{field: '<img src=x onerror=alert(1)>"&'}))
    assert "<img" not in out
    assert "&lt;img src=x onerror=alert(1)&gt;" in out


@pytest.mark.parametrize("tail", ["</script>", "</ScRiPt>", "</SCRIPT >", "</script\t\n>"])
def test_json_embed_has_no_script_end_tag(tail):
    out = render(cfg(brand="x" + tail + "<script>alert(1)</script>"))
    assert not re.search(r"</script", out.split("const BRAND =")[1].split("const D")[0], re.I)
    assert "\\u003c" in out
    assert len(re.findall(r"</script", out, re.I)) == len(re.findall(r"</script", open(os.path.join(HERE, "template.html")).read(), re.I))


def test_json_embed_roundtrips():
    out = render(cfg(brand="a</ScRiPt>b"))
    blob = out.split("const BRAND = ")[1].split(";\n      const D")[0]
    assert json.loads(blob)["brand"] == "a</ScRiPt>b"


@pytest.mark.parametrize(
    "markup",
    [
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg"><SCRIPT>alert(1)</SCRIPT></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><path d="M0 0"/></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" onclick="x()"/></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div>x</div></foreignObject></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="http://evil/x.svg#a"/></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><path d="M0 0"/></a></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil/x.png"/></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" fill="url(https://evil/x)"/></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg"><style>@import url(//evil)</style></svg>',
        '<!DOCTYPE svg [<!ENTITY a "b">]><svg xmlns="http://www.w3.org/2000/svg"/>',
        '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"',
        "<div>not svg</div>",
        "",
    ],
)
def test_unsafe_svg_is_refused(markup):
    with pytest.raises(BrandConfigError):
        render(cfg(logo={"mode": "svg", "markup": markup}))


@pytest.mark.parametrize(
    "field,value",
    [
        ("bg", "red;}</style><script>alert(1)</script>"),
        ("accent", "#fff} body{background:url(//evil)"),
        ("display_font", 'x}</style><script>1</script>'),
        ("duration", "12</script>"),
    ],
)
def test_css_and_numeric_fields_fail_closed(field, value):
    with pytest.raises(BrandConfigError):
        render(cfg(**{field: value}))


def test_beads_src_cannot_escape_config_dir():
    with pytest.raises(BrandConfigError):
        render(cfg(logo={"mode": "beads", "src": "../../../../../../etc/passwd", "srcW": 5, "srcH": 5}))


def test_shipped_samples_still_render():
    ex = json.load(open(os.path.join(HERE, "brand.config.example.json")))
    assert "\\u003cpath" in render(ex)
    kdir = os.path.join(HERE, "..", "..", "samples", "kupuri-media")
    k = json.load(open(os.path.join(kdir, "brand.config.json")))
    out = build_html(k, kdir)
    assert "KUPURI" in out and "MEDIA" in out


def test_placeholders_in_user_text_are_not_expanded():
    out = render(cfg(tagline="__BRAND_JSON__"))
    assert "__BRAND_JSON__" in out
