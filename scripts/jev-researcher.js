#!/usr/bin/env node
// JEV District researcher bench - daily application ideas on the free floor.
// Reads districts/jev/research/seeds.md, asks a free-tier OpenRouter model for
// 1-3 business-case ideas, writes districts/jev/research/daily/<date>.md and a
// receipt line to registry/jev-research-ledger.jsonl. Propose-only (money gate).
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const ENV_PATH = "/root/pauli-starnet/.env.jev-shadow";
const MODELS = ["deepseek/deepseek-v4-flash-0731:free", "z-ai/glm-5.2:free", "google/gemma-4-31b-it:free"];
const LEDGER = "/root/pauli-starnet/registry/jev-research-ledger.jsonl";

function apiKey() {
  try {
    const env = fs.readFileSync(ENV_PATH, "utf8");
    const m = env.match(/OPENROUTER_API_KEY=(\S+)/);
    return m && m[1];
  } catch { return null; }
}

async function callModel(model, prompt) {
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + apiKey() },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], max_tokens: 1800, temperature: 0.7 }),
  });
  if (resp.status === 429) { const e = new Error("rate_limited"); e.code = 429; throw e; }
  if (!resp.ok) throw new Error("http_" + resp.status);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "";
}

(async () => {
  const key = apiKey();
  if (!key) { console.error("no_openrouter_key"); process.exit(2); }
  const seeds = fs.readFileSync(path.join(ROOT, "districts/jev/research/seeds.md"), "utf8");
  const date = new Date().toISOString().slice(0, 10);
  const priorDir = path.join(ROOT, "districts/jev/research/daily");
  const prior = fs.existsSync(priorDir) ? fs.readdirSync(priorDir).sort().slice(-3).map(f => fs.readFileSync(path.join(priorDir, f), "utf8").slice(0, 800)).join("\n---\n") : "";
  const prompt = [
    "You are the JEV District researcher in StarNet City. Your standing job: cook JEV applications - real business cases that make money, digital-first, minimal human bottleneck.",
    "JEV is a typed-decision model: it answers typed questions with confidence scores; it decides, it does not write prose.",
    "Money gate: you propose only; nothing spends or ships without the owner.",
    "Standing seeds:\n" + seeds,
    prior ? "Recent prior reports (do not repeat these ideas; extend or replace them):\n" + prior : "",
    "Today (" + date + "): produce 1-3 ideas. For each: name, the typed questions JEV would answer, the money lane it feeds, cost-to-try (free floor first), and the smallest proof mission. Keep it under 250 words per idea, plain markdown."
  ].join("\n\n");
  let out = null, modelUsed = null, err = null;
  for (const m of MODELS) {
    try { out = await callModel(m, prompt); modelUsed = m; break; }
    catch (e) { err = e; if (e.code !== 429) break; }
  }
  if (!out) { console.error("research_failed: " + (err && err.message)); process.exit(1); }
  const reportPath = path.join(priorDir, date + ".md");
  fs.mkdirSync(priorDir, { recursive: true });
  fs.writeFileSync(reportPath, "# JEV Researcher - " + date + "\n\nmodel: " + modelUsed + " (free tier)\n\n" + out.trim() + "\n");
  fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
  fs.appendFileSync(LEDGER, JSON.stringify({ ts: new Date().toISOString(), citizen: "jev-researcher", model: modelUsed, cost_usd: 0, report: reportPath }) + "\n");
  console.log("OK " + reportPath + " model=" + modelUsed);
})();
