# Gates: one-system finish, evidence

Scope: Stage 4: the evidence is published and independently reviewed. Ledger format: Leonxlnx/unlazy (MIT). Copy to /opt/starnet/one-system/.finish/4-evidence.md and run the checker on this file only.

- [ ] G26: the evidence PR (LIVE-EVIDENCE.md) is open in pauli-starnet
  CHECK: gh pr list -R executiveusa/pauli-starnet --state open --search "LIVE-EVIDENCE in:title" --json number -q length
  EXPECT: /^[1-9]\d*\s*$/
  EVIDENCE: pending

- [ ] G27: the Claude Review approved the evidence PR's head commit, and Bambú received the link and a five-line summary
  EVIDENCE: pending
