// Validates sidecar/jev-question-packs.json against the same shape rules the
// shadow plane enforces (validCustomQuestions), so a bad pack fails in CI
// instead of being silently dropped at service start.
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const packs = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "sidecar", "jev-question-packs.json"), "utf8"));

function validCustomQuestions(q) {
  if (!q || typeof q !== "object" || Array.isArray(q)) return false;
  const keys = Object.keys(q);
  if (!keys.length || keys.length > 8) return false;
  for (const k of keys) {
    if (!/^[a-z0-9_]{1,32}$/.test(k)) return false;
    const v = q[k];
    if (!v || typeof v !== "object") return false;
    if (v.type === "boolean" && typeof v.instructions === "string" && v.instructions.length > 0) continue;
    if (v.type === "choice" && v.criteria && typeof v.criteria === "object" && !Array.isArray(v.criteria)
        && Object.keys(v.criteria).length >= 2 && Object.keys(v.criteria).length <= 8) continue;
    return false;
  }
  return true;
}

const names = Object.keys(packs);
assert.ok(names.length >= 3, "expected at least 3 citizen packs");
for (const required of ["ad-gap-analyzer", "brand-quality-gate", "inbox-triage"]) {
  assert.ok(names.includes(required), "missing pack: " + required);
}
for (const [name, q] of Object.entries(packs)) {
  assert.ok(/^[a-z0-9-]{1,40}$/.test(name), "bad pack name: " + name);
  assert.ok(validCustomQuestions(q), "pack fails shape rules: " + name);
}
console.log("jev-question-packs: PASS (" + names.join(", ") + ")");
