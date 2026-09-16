# Pi Second Brain

Private retrieval for Bambú's ChatGPT export. The Drive adapter is pinned read-only to folder `16uo1fDUObkFNs241A_BVzac24ZyM4ddo` owned by `executiveusa@gmail.com`. Supply a short-lived Drive read token at runtime; no credential is stored in git. Downloaded archives and the database belong on Pi's private encrypted runtime volume, never the repository or shared city search.

Query after ingest:

```bash
BAMBOO_HOUSE_KEY_HEX=... python -m bamboo_house.second_brain.cli --db /private/bamboo/second-brain.db ask "What did I decide about the Watch-Brain?"
BAMBOO_HOUSE_KEY_HEX=... python -m bamboo_house.second_brain.cli --db /private/bamboo/second-brain.db stats
```

The result includes source file, conversation, role, timestamp, and passage text so Pi can answer with citations. Only `pi-personal-agent` may instantiate the store. Do not register this package with generic agent search.
