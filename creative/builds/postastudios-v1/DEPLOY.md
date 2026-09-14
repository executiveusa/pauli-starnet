# PostaStudios site - deploy note for the watcher (VPS srv1099662)

## What this bundle is
Static product site + one tiny backend for the inquiry form. Zero dependencies
(python3 stdlib only). EN at /, es-MX at /es/.

## Layout on the VPS (suggested)
- Site root: /srv/postastudios/site/  (index.html, es/, api/)
- Data:      /srv/postastudios/inquiries/inquiries.jsonl  (created on first POST)

## What the deploy needs
1. Static hosting of /srv/postastudios/site with nginx (or Caddy):
   - / and /es/ served as static files
   - reverse-proxy /api/ -> 127.0.0.1:8903
2. The inquiry service:
   - copy api/inquiry.py to /srv/postastudios/site/api/inquiry.py
   - install api/postastudios-inquiry.service to /etc/systemd/system/, then
     systemctl daemon-reload && systemctl enable --now postastudios-inquiry
   - the service binds 127.0.0.1:8903 only; nginx proxies /api/inquiry to it
   - DynamicUser + StateDirectory=postastudios keeps it unprivileged; if you
     prefer a fixed user, create postastudios and chown /srv/postastudios
3. nginx server block sketch:
     location /api/ { proxy_pass http://127.0.0.1:8903; proxy_set_header X-Forwarded-For $remote_addr; }
     location / { root /srv/postastudios/site; try_files $uri $uri/ =404; }
4. TLS: whatever certbot flow the box already runs. Site must be HTTPS (form posts).
5. Health check: GET /api/health (via nginx /api/) returns {"ok":true}.

## Verifying the form end to end after deploy
curl -s -X POST https://<host>/api/inquiry -H 'Content-Type: application/json' \
  -d '{"name":"Deploy Test","email":"deploy@test.invalid","networks":"Instagram"}'
=> {"ok":true} and a line in /srv/postastudios/inquiries/inquiries.jsonl.
Honeypot check: same POST with "company":"x" => {"ok":true} and NO new line.

## Notes
- Inquiries currently STORE ONLY (jsonl). No mailbox exists for the domain;
  forwarding (email/WhatsApp digest) is a follow-up once the owner picks where
  inquiries should land. The jsonl file is the source of truth until then.
- Form works without JS too (plain POST -> JSON response). JS gives inline success.
- No analytics, no trackers, no external assets beyond Google Fonts CSS.
