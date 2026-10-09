"""Regression tests: untrusted brand configs must be escaped or refused, never rendered."""
import copy
import json
import os
import re
import sys

import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import brand_safety  # noqa: E402
import render as render_mod  # noqa: E402
from brand_safety import (  # noqa: E402
    BrandConfigError, contained_path, default_output_name, sanitize_svg,
)
from render import build_html, main, parse_args  # noqa: E402

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
    return build_html(c, HERE)[0]


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


@pytest.mark.parametrize(
    "font",
    ['"Cormorant Garamond"', "'Cormorant Garamond'", "Cormorant Garamond", "Montserrat", '"Montserrat Alt One"', "Space-Grotesk Mono"],
)
def test_valid_quoted_and_unquoted_fonts_are_accepted_and_preserved(font):
    out = render(cfg(display_font=font))
    assert f"font-family: {font}, serif" in out


@pytest.mark.parametrize(
    "font",
    ['"Cormorant Garamond', 'Cormorant Garamond"', "\"Cormorant Garamond'", "'Cormorant Garamond\"", "'Cormorant Garamond", '""', "", '"a"b"', "Foo;Bar"],
)
def test_mismatched_or_malformed_font_quotes_are_rejected(font):
    with pytest.raises(BrandConfigError):
        render(cfg(display_font=font))


def test_beads_src_cannot_escape_config_dir():
    with pytest.raises(BrandConfigError):
        render(cfg(logo={"mode": "beads", "src": "../../../../../../etc/passwd", "srcW": 5, "srcH": 5}))


def test_shipped_samples_still_render():
    ex = json.load(open(os.path.join(HERE, "brand.config.example.json")))
    assert "\\u003cpath" in render(ex)
    kdir = os.path.join(HERE, "..", "..", "samples", "kupuri-media")
    k = json.load(open(os.path.join(kdir, "brand.config.json")))
    out = build_html(k, kdir)[0]
    assert "KUPURI" in out and "MEDIA" in out


def test_placeholders_in_user_text_are_not_expanded():
    out = render(cfg(tagline="__BRAND_JSON__"))
    assert "__BRAND_JSON__" in out


# ---- filesystem boundary, color signs and CLI ----------------------------------------


@pytest.fixture(autouse=True)
def never_run_npx(monkeypatch):
    """No test in this file may start a subprocess (npx/hyperframes). Fail loudly if one does."""
    def boom(*args, **kwargs):
        raise AssertionError(f"subprocess.run must not be called in tests: {args!r}")
    monkeypatch.setattr(render_mod.subprocess, "run", boom)


def write_cfg(tmp_path, c, name="brand.config.json"):
    path = tmp_path / name
    path.write_text(json.dumps(c))
    return str(path)


@pytest.mark.parametrize(
    "brand",
    ["../../etc/passwd", "/etc/cron.d/x", "..\\..\\win", "a/b/c", "./x", "", "   ", "\u202e\x00evil", "x" * 500],
)
def test_default_output_name_is_a_plain_slug(brand):
    name = default_output_name(brand)
    assert re.fullmatch(r"[a-z0-9-]{1,64}-intro\.mp4", name), name
    assert "/" not in name and "\\" not in name and ".." not in name.replace("-intro.mp4", "")


def test_contained_path_refuses_escapes(tmp_path):
    assert contained_path(str(tmp_path), "ok-intro.mp4") == os.path.join(os.path.realpath(tmp_path), "ok-intro.mp4")
    for bad in ("../x.mp4", "sub/x.mp4", "/tmp/x.mp4"):
        with pytest.raises(BrandConfigError):
            contained_path(str(tmp_path), bad)


def test_contained_path_refuses_symlink_escape(tmp_path):
    outside = tmp_path / "outside"
    outside.mkdir()
    inside = tmp_path / "inside"
    inside.mkdir()
    (inside / "evil-intro.mp4").symlink_to(outside / "target.mp4")
    with pytest.raises(BrandConfigError):
        contained_path(str(inside), "evil-intro.mp4")


def test_main_default_output_stays_in_cwd(tmp_path, monkeypatch, capsys):
    monkeypatch.chdir(tmp_path)
    path = write_cfg(tmp_path, cfg(brand="../../../tmp/pwned"))
    assert main([path, "--check"]) == 0
    printed = capsys.readouterr().out.strip().split()[-1]
    assert os.path.dirname(printed) == os.path.realpath(tmp_path)
    assert printed.endswith("tmp-pwned-intro.mp4")


def test_beads_file_too_large_is_refused_before_parse(tmp_path, monkeypatch):
    monkeypatch.setattr(brand_safety, "MAX_BEADS_BYTES", 64)
    (tmp_path / "beads.json").write_text(json.dumps([{"x": 1, "y": 1, "r": 1, "c": "#fff"}] * 20))
    c = cfg(logo={"mode": "beads", "src": "beads.json", "srcW": 5, "srcH": 5})
    with pytest.raises(BrandConfigError, match="larger than"):
        build_html(c, str(tmp_path))


def test_beads_read_is_capped_even_if_stat_lies(tmp_path, monkeypatch):
    monkeypatch.setattr(brand_safety, "MAX_BEADS_BYTES", 64)
    (tmp_path / "beads.json").write_text(" " * 500 + "[]")
    monkeypatch.setattr(brand_safety.os.path, "getsize", lambda p: 1)
    c = cfg(logo={"mode": "beads", "src": "beads.json", "srcW": 5, "srcH": 5})
    with pytest.raises(BrandConfigError, match="larger than"):
        build_html(c, str(tmp_path))


@pytest.mark.parametrize("content", ["not json", "{", '{"a": 1}', "[1, 2]", "\ufffe\x00"])
def test_bad_beads_content_maps_to_brand_config_error(tmp_path, content):
    (tmp_path / "beads.json").write_text(content)
    c = cfg(logo={"mode": "beads", "src": "beads.json", "srcW": 5, "srcH": 5})
    with pytest.raises(BrandConfigError):
        build_html(c, str(tmp_path))


def test_beads_missing_file_or_directory_maps_to_brand_config_error(tmp_path):
    (tmp_path / "adir").mkdir()
    for src in ("nope.json", "adir"):
        c = cfg(logo={"mode": "beads", "src": src, "srcW": 5, "srcH": 5})
        with pytest.raises(BrandConfigError):
            build_html(c, str(tmp_path))


def test_beads_non_utf8_maps_to_brand_config_error(tmp_path):
    (tmp_path / "beads.json").write_bytes(b"\xff\xfe\x00[")
    c = cfg(logo={"mode": "beads", "src": "beads.json", "srcW": 5, "srcH": 5})
    with pytest.raises(BrandConfigError):
        build_html(c, str(tmp_path))


def test_deeply_nested_json_maps_to_brand_config_error(tmp_path):
    (tmp_path / "beads.json").write_text("[" * 100000 + "]" * 100000)
    c = cfg(logo={"mode": "beads", "src": "beads.json", "srcW": 5, "srcH": 5})
    with pytest.raises(BrandConfigError):
        build_html(c, str(tmp_path))


@pytest.mark.parametrize("name,content", [("missing.json", None), ("bad.json", "{nope"), ("big.json", "x" * 2_000_000)])
def test_main_refuses_unreadable_config_cleanly(tmp_path, name, content):
    if content is not None:
        (tmp_path / name).write_text(content)
    with pytest.raises(SystemExit) as exc:
        main([str(tmp_path / name), "--check"])
    assert "[refused]" in str(exc.value.code)


@pytest.mark.parametrize(
    "value",
    ["hsl(-10, 50%, 50%)", "rgb(+1 +2 +3)", "rgba(0, 0, 0, +.5)", "hsl(120 50% 50%)", "#c9a86a", "gold"],
)
def test_signed_functional_colors_are_accepted(value):
    render(cfg(bg=value))


@pytest.mark.parametrize(
    "value",
    ["rgb(1);}", "rgb(1)</style>", "hsl(1,2%,3%) url(x)", "rgb(a)", "expression(1)", "rgb(1,2,3", "red;x", "url(//e)"],
)
def test_color_punctuation_beyond_signs_is_still_refused(value):
    with pytest.raises(BrandConfigError):
        render(cfg(bg=value))


def test_cli_rejects_bad_quality_and_unknown_flags(tmp_path, capsys):
    path = write_cfg(tmp_path, cfg())
    for argv in ([path, "--quality", "ultra"], [path, "--nope"], [], [path, "--out"]):
        with pytest.raises(SystemExit) as exc:
            parse_args(argv)
        assert exc.value.code == 2
    capsys.readouterr()


def test_cli_accepts_valid_arguments(tmp_path):
    path = write_cfg(tmp_path, cfg())
    args = parse_args([path, "--out", "x.mp4", "--quality", "high", "--check"])
    assert (args.out, args.quality, args.check) == ("x.mp4", "high", True)


def test_main_render_path_uses_mocked_subprocess_only(tmp_path, monkeypatch):
    calls = []

    class Done:
        returncode = 0

    monkeypatch.setattr(render_mod.subprocess, "run", lambda cmd, cwd=None: calls.append((cmd, cwd)) or Done())
    monkeypatch.chdir(tmp_path)
    path = write_cfg(tmp_path, cfg(brand="Demo Co"))
    assert main([path, "--quality", "draft"]) == 0
    (cmd, cwd), = calls
    assert cmd[:3] == ["npx", "--yes", "hyperframes@0.8.86"]
    assert cmd[-1] == os.path.join(os.path.realpath(tmp_path), "demo-co-intro.mp4")
    assert not os.path.exists(cwd)


def test_main_never_reaches_subprocess_for_refused_config(tmp_path):
    path = write_cfg(tmp_path, cfg(logo={"mode": "svg", "markup": "<svg><script>1</script></svg>"}))
    with pytest.raises(SystemExit):
        main([path])


# ---- accent alpha (bloom) ----------------------------------------------------------------
# The bloom used to be `__ACCENT__33`, which only works for 6-digit hex: appended to a
# 3-digit hex, a named color or rgb()/hsl() it produced invalid CSS and the bloom vanished.
# The glow is now a separate 20% opacity layer (#bloom::before) that uses the accent as-is.

ACCENT_FORMS = [
    "#f80", "#ff8800", "#ff880080", "orange",
    "rgb(255 136 0)", "rgb(255, 136, 0)", "rgba(255, 136, 0, 1)",
    "hsl(32 100% 50%)", "hsl(+32, +100%, +50%)", "rgb(+255 +136 +0)",
]
# rgb each form resolves to and its own alpha, so the expected pixel is computed, not recorded
ACCENT_EXPECTED = {
    "#f80": ((255, 136, 0), 1.0), "#ff8800": ((255, 136, 0), 1.0), "#ff880080": ((255, 136, 0), 128 / 255),
    "orange": ((255, 165, 0), 1.0),
    "rgb(255 136 0)": ((255, 136, 0), 1.0), "rgb(255, 136, 0)": ((255, 136, 0), 1.0),
    "rgba(255, 136, 0, 1)": ((255, 136, 0), 1.0),
    "hsl(32 100% 50%)": ((255, 136, 0), 1.0), "hsl(+32, +100%, +50%)": ((255, 136, 0), 1.0),
    "rgb(+255 +136 +0)": ((255, 136, 0), 1.0),
}


def bloom_layer_rule(html):
    m = re.search(r"#bloom::before \{[^}]*\}", html)
    assert m, "#bloom::before rule not found"
    return m.group(0)


@pytest.mark.parametrize("accent", ACCENT_FORMS)
def test_bloom_layer_uses_the_accent_unmodified_at_20_percent_opacity(accent):
    html = render(cfg(accent=accent))
    rule = bloom_layer_rule(html)
    assert f"radial-gradient(circle, {accent} 0%, transparent 60%)" in rule
    assert "opacity: 0.2" in rule
    assert f"{accent}33" not in html
    assert "__ACCENT__" not in html
    assert "color-mix" not in html  # no Chrome 111+ dependency


def test_template_never_concatenates_alpha_onto_the_accent_placeholder():
    with open(os.path.join(HERE, "template.html"), encoding="utf-8") as fh:
        assert not re.search(r"__ACCENT2?__[0-9A-Fa-f]", fh.read())


def _chrome():
    import shutil
    for name in ("google-chrome", "chromium", "chromium-browser", "chrome"):
        found = shutil.which(name)
        if found:
            return found
    return None


@pytest.mark.skipif(_chrome() is None, reason="needs a headless Chrome binary")
@pytest.mark.parametrize("accent", ACCENT_FORMS)
def test_bloom_alpha_renders_real_pixels(tmp_path, accent):
    """Screenshot the real #bloom::before rule over white: center pixel is the accent at 20% alpha."""
    Image = pytest.importorskip("PIL.Image")
    import subprocess
    rule = bloom_layer_rule(render(cfg(accent=accent))).replace("#bloom::before", "#b::before")
    page = tmp_path / "bloom.html"
    page.write_text(
        "<!doctype html><style>html,body{margin:0;background:#fff}"
        f"#b{{position:relative;width:300px;height:300px}} {rule}</style><div id=b></div>"
    )
    shot = tmp_path / "bloom.png"
    # Popen, not run(): the autouse guard above blocks subprocess.run so no test can start
    # npx/hyperframes. This only launches a local headless Chrome on a file:// page.
    proc = subprocess.Popen(
        [_chrome(), "--headless", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
         "--window-size=300,300", f"--screenshot={shot}", f"file://{page}"],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    proc.communicate(timeout=60)
    assert proc.returncode == 0 and shot.exists()
    with Image.open(shot) as img:
        px = img.convert("RGB").getpixel((150, 150))
    (r, g, b), own_alpha = ACCENT_EXPECTED[accent]
    a = 0.2 * own_alpha
    want = tuple(round(c * a + 255 * (1 - a)) for c in (r, g, b))
    assert all(abs(x - y) <= 4 for x, y in zip(px, want)), f"{accent}: pixel {px}, expected ~{want}"
    assert px != (255, 255, 255), "bloom did not render at all"
