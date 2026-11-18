# Gates: one-system finish, verify merged code

Scope: Stage 2: the merged code passes its tests and builds, and the OpenRouter key works. Runs on the new checkouts under /opt/starnet; changes nothing that is running. Ledger format: Leonxlnx/unlazy (MIT). Copy to /opt/starnet/one-system/.finish/2-verify-merged-code.md and run the checker on this file only.

- [ ] G9: on the merged StarNet checkout, every fast test passes except the 3 known base failures listed in HANDOFF
  CHECK: bash -c 'cd /opt/starnet/one-system && f=0; while read -r t; do case "$t" in ""|\#*) continue;; esac; node "$t" >/dev/null 2>&1 || case "$t" in *qa-product-perfect-claims*|*crt-context-loss*|*website-app-sync*) ;; *) echo "NEW FAILURE $t"; f=1;; esac; done < test/fast.list; [ "$f" = 0 ] && echo FAST-TESTS-NO-NEW-FAILURES'
  EXPECT: FAST-TESTS-NO-NEW-FAILURES
  EVIDENCE: pending

- [ ] G10: on the merged Command Center checkout, install, acceptance and build pass
  CHECK: bash -c 'cd /opt/starnet/command-center && npm ci >/dev/null && npm run -s verify:acceptance && npm run -s build >/dev/null && echo CC-ACCEPTANCE-AND-BUILD-OK'
  EXPECT: CC-ACCEPTANCE-AND-BUILD-OK
  EVIDENCE: pending

- [ ] G11: the OpenRouter key StarNet uses is accepted by OpenRouter (key never shown)
  CHECK: bash -c 'set -a; . /etc/starnet/workforce.env; curl -fsS -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $OPENROUTER_API_KEY" https://openrouter.ai/api/v1/key && echo " OPENROUTER-KEY-OK"'
  EXPECT: 200 OPENROUTER-KEY-OK
  EVIDENCE: pending
