# Revenue missions for Heisenberg

These packages are ready to dispatch through the authenticated owner surface. They follow `prompts/overlays/heisenberg.md`: objective, observable done-when, complete inputs, least-privilege tools/skills, budget and gates, and a checkable receipt.

## Dispatch path

The live owner page is `https://pauli-starnet-city.netlify.app/owner.html`.

It signs in through `POST /.netlify/functions/owner/login`, then sends task text through `POST /.netlify/functions/owner/tasks`. The owner function attaches the server-held `PAULI_GATEWAY_TOKEN` and forwards to `POST $PAULI_GATEWAY_URL/v1/heisenberg/tasks`. The gateway returns a task ID immediately; `GET /v1/heisenberg/tasks/:id` is the status and receipt path.

The owner function deliberately refuses all work when `OWNER_SECRET` is unset. Set `OWNER_SECRET` in the Netlify site's environment, redeploy, open the owner page, unlock with the same secret, and dispatch each package. `PAULI_GATEWAY_URL` and `PAULI_GATEWAY_TOKEN` must remain server-side and configured; do not put either token in a browser, file, URL, or commit.

## Packages

1. `sovereign-agent-city-audit.md` - make the $2,500 City Audit a concrete sellable delivery system.
2. `pauli-scroll-world-open-source.md` - package Pauli Scroll World as an open-source anti-slop workflow, stopping before public release.

Both are zero-spend, reversible preparation missions. Outreach, publishing, paid services, destructive changes, and promises to a client remain gated.
