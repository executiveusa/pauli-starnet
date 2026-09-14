#!/usr/bin/env python3
"""PostaStudios inquiry endpoint - stdlib only, no dependencies.
POST /api/inquiry  {"name","email","networks","message"?,"company"?}
Writes one JSON line per inquiry to DATA_DIR/inquiries.jsonl.
Honeypot: any "company" value => pretend success, store nothing.
"""
import json, os, re, time
from http.server import BaseHTTPRequestHandler, HTTPServer

DATA_DIR = os.environ.get("POSTA_DATA_DIR", "/srv/postastudios/inquiries")
PORT = int(os.environ.get("POSTA_PORT", "8903"))
EMAIL_RE = re.compile(r"^[^@\s]{1,64}@[^@\s]{1,255}\.[^@\s]{2,24}$")

class H(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype="application/json"):
        b = body if isinstance(body, bytes) else json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(b)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(b)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path.rstrip("/") in ("", "/health"):
            self._send(200, {"ok": True, "service": "postastudios-inquiry"})
        else:
            self._send(404, {"ok": False, "error": "not found"})

    def do_POST(self):
        if not self.path.startswith("/api/inquiry"):
            self._send(404, {"ok": False, "error": "not found"}); return
        try:
            n = min(int(self.headers.get("Content-Length", 0)), 16384)
            raw = self.rfile.read(n)
            ctype = self.headers.get("Content-Type", "")
            if "application/json" in ctype:
                d = json.loads(raw.decode("utf-8", "replace"))
            else:
                from urllib.parse import parse_qs
                d = {k: v[0] for k, v in parse_qs(raw.decode("utf-8", "replace")).items()}
        except Exception:
            self._send(400, {"ok": False, "error": "bad request"}); return

        if (d.get("company") or "").strip():
            self._send(200, {"ok": True}); return  # honeypot: silent drop

        name = (d.get("name") or "").strip()[:120]
        email = (d.get("email") or "").strip()[:254]
        nets = (d.get("networks") or "").strip()[:300]
        msg = (d.get("message") or "").strip()[:4000]
        if not name or not EMAIL_RE.match(email) or not nets:
            self._send(422, {"ok": False, "error": "name, valid email and networks are required"}); return

        os.makedirs(DATA_DIR, exist_ok=True)
        rec = {"ts": int(time.time()), "name": name, "email": email,
               "networks": nets, "message": msg,
               "ip": self.headers.get("X-Forwarded-For", self.client_address[0])}
        with open(os.path.join(DATA_DIR, "inquiries.jsonl"), "a", encoding="utf-8") as f:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
        self._send(200, {"ok": True})

    def log_message(self, *a):  # quiet
        pass

if __name__ == "__main__":
    HTTPServer(("127.0.0.1", PORT), H).serve_forever()
