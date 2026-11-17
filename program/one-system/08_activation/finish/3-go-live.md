# Gates: one-system finish, go live

Scope: Stage 3: StarNet is live and the live tests L1 to L10 pass. G13 runs the live acceptance test, which creates real missions and can spend model credit: run this stage only after HANDOFF steps 1 to 11 are done. Ledger format: Leonxlnx/unlazy (MIT). Copy to /opt/starnet/one-system/.finish/3-go-live.md and run the checker on this file only.

- [ ] G12: Paperclip and the workforce gateway are running as services
  CHECK: bash -c 'systemctl is-active paperclip.service starnet-workforce.service | sort -u | tr -d "\n"; echo'
  EXPECT: /^active$/m
  EVIDENCE: pending

- [ ] G13: L1, the live factory acceptance run, passes every step with nothing left unrun
  CHECK: bash -c 'set -a; . /etc/starnet/workforce.env; cd /opt/starnet/one-system && FACTORY_GATEWAY_URL=https://factory.thepaulieffect.com FACTORY_OWNER_TOKEN="$GATEWAY_BEARER_TOKEN" node scripts/factory-live-acceptance.mjs'
  EXPECT: /\d+ steps: \d+ pass, 0 fail, 0 not run/
  EVIDENCE: pending

- [ ] G14: L2, the walk test on the live checkout covers all 12 districts
  CHECK: bash -c 'cd /opt/starnet/one-system && node test/icm-walk.test.js'
  EXPECT: (12 districts, 51 agents)
  EVIDENCE: pending

- [ ] G15: L3, Instinct is acting chief over HTTPS while its heartbeat runs
  CHECK: bash -c 'set -a; . /etc/starnet/workforce.env; curl -fsS -H "Authorization: Bearer $GATEWAY_BEARER_TOKEN" https://factory.thepaulieffect.com/v1/factory/chief'
  EXPECT: "acting":"instinct"
  EVIDENCE: pending

- [ ] G16: L3, Heisenberg became acting chief after 6 minutes without the heartbeat, then Instinct again when it resumed (record both responses with times)
  EVIDENCE: pending

- [ ] G17: L4a, no standing mission was created before any approval, across one scheduled time (Paperclip issue list attached)
  EVIDENCE: pending

- [ ] G18: L4b, after Bambú approved one revenue standing job on the phone, its mission appeared once for the named agent and nothing else was scheduled (or NOT_RUN by Bambú's choice, written here)
  EVIDENCE: pending

- [ ] G19: the Command Center production page at /starnet/control shows the acting chief, districts, agents and scheduled jobs from live StarNet, not "Not connected" (screenshot)
  EVIDENCE: pending

- [ ] G20: L5, a found-first-launch run started from the phone assigned stage 1 to boring-marketer and stopped at the owner gate after outreach-draft
  EVIDENCE: pending

- [ ] G21: L6, "Tell Instinct" created an order Instinct acknowledged by id, and a direct task became a mission with a "you went direct" notice
  EVIDENCE: pending

- [ ] G22: L7, a mission needing publish parked, the phone showed its exact permissions, and Bambú's authorization released it (with the owner approval key)
  EVIDENCE: pending

- [ ] G23: L8, emergency stop (typed STOP) paused every worker and Resume all resumed them
  EVIDENCE: pending

- [ ] G24: L9, after 24 hours, receipts show lanes and route notes and month-to-date spend is under budget
  EVIDENCE: pending

- [ ] G25: L10, after one night, no duplicate missions and no stuck run without a nudge or escalation
  EVIDENCE: pending
