# pauli-starnet-city fallback deploy on Coolify (VPS).
# Serves the static frontend and replicates the Netlify gw proxy
# (/.netlify/functions/gw/*) via deploy/coolify/server.mjs, same allowlist
# logic as frontend/city/deploy/netlify/functions/gw.mjs.
# Env required at runtime: PAULI_GATEWAY_URL, PAULI_GATEWAY_TOKEN.
FROM node:20-alpine
WORKDIR /app
COPY frontend /app/frontend
COPY deploy/coolify/server.mjs /app/server.mjs
ENV PORT=80
EXPOSE 80
CMD ["node", "/app/server.mjs"]
