---
stage: 05_receipts-board
status: done
built_by: claude-session-01UT634v
verified_by: ""
commit: executiveusa/terabithia@02b04ad
proof:
  - https://github.com/executiveusa/terabithia/pull/24
blocker: ""
---
$ npm run test:bridge
Receipt tests passed: 7   (plus every other suite green)
$ npm run verify:receipts demo-receipts.jsonl
{"ok":true,"count":3}            exit=0
$ (change "done" to "dona" in receipt 2) npm run verify:receipts demo-receipts.jsonl
{"ok":false,"count":3,"broken_at":1,"reason":"receipt content does not match its hash"}   exit=1
