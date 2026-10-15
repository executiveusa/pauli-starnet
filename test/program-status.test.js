/* program-status.test.js: the StarNet v1 program status is derived from evidence, and a claim without proof or
   an independent verifier never reads as done. Run: node test/program-status.test.js */
'use strict';
const A = require('./_assert.js');

(async () => {
  const { parseEvidence, stageStatus } = await import('../program/starnet-v1/_system/status.mjs');
  const ev = body => parseEvidence(`---\n${body}\n---\nraw output`);
  A.eq(stageStatus(null).status, 'open', 'no evidence file is open');
  A.eq(stageStatus(ev('status: done\nbuilt_by: a\nverified_by: b\nproof:\n  - https://x/1')).status, 'done', 'proof + independent verifier is done');
  A.eq(stageStatus(ev('status: done\nbuilt_by: a\nverified_by: a\nproof:\n  - https://x/1')).status, 'claimed', 'a builder verifying itself is only claimed');
  A.eq(stageStatus(ev('status: done\nbuilt_by: a\nverified_by: b\nproof:')).status, 'claimed', 'done without proof is only claimed');
  A.eq(stageStatus(ev('status: done\nproof:\n  - https://x/1')).status, 'claimed', 'no named builder or verifier is only claimed');
  const blocked = stageStatus(ev('status: blocked\nblocker: captain must remove the watch check'));
  A.ok(blocked.status === 'blocked' && /watch/.test(blocked.note), 'blocked names who must act');
  A.eq(ev('status: done   # inline comment\nproof:\n  - one\n  - two\nverified_by: x').proof.length, 2, 'proof list parses; comments ignored');
  A.report();
})();
