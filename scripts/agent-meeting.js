#!/usr/bin/env node
/**
 * agent-meeting.js - convene a meeting between city agents over MCP Agent Mail.
 *
 * Usage:
 *   node scripts/agent-meeting.js --project /abs/path/to/repo \
 *     --agents HEISENBERG,MERCI,BEACON \
 *     --topic "Adopt beads DAG for mission triage" \
 *     --agenda "1) scratch evidence 2) risks 3) decision"
 *
 * Every participant registers, the first agent (chair) posts the agenda, each
 * other agent acknowledges in-thread, and the transcript is printed. The full
 * record persists in the git-backed Agent Mail archive.
 *
 * Env: AGENT_MAIL_URL, AGENT_MAIL_TOKEN (Infisical - never hardcode).
 */
"use strict";

const { AgentMailClient } = require("../shared/agent-mail-client.js");

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

async function main() {
  const project = arg("project", process.cwd());
  const agentSpecs = arg("agents", "HEISENBERG,MERCI").split(",").map((s) => s.trim()).filter(Boolean);
  const topic = arg("topic", "Fleet sync");
  const agenda = arg("agenda", "Status, blockers, next actions.");
  if (agentSpecs.length < 2) throw new Error("a meeting needs at least two agents");

  const participants = [];
  for (const spec of agentSpecs) {
    const client = new AgentMailClient({ clientName: `starnet-${spec.toLowerCase()}` });
    await client.ensureProject(project);
    const reg = await client.register(project, {
      program: `starnet-${spec.toLowerCase()}`,
      model: "runtime-selected",
      taskDescription: `meeting participant: ${spec}`,
    });
    participants.push({ spec, client, mailName: reg.name });
    console.log(`registered ${spec} as ${reg.name}`);
  }

  const [chair, ...rest] = participants;
  const others = rest.map((p) => p.mailName);

  console.log(`\nchair ${chair.mailName} opens: ${topic}`);
  const sent = await chair.client.send(project, {
    to: others,
    subject: `Meeting: ${topic}`,
    body: `Agenda:\n${agenda}\n\nReply in this thread with your position. - ${chair.spec} (chair)`,
    importance: "high",
  });
  const messageId = sent?.deliveries?.[0]?.payload?.id ?? sent?.id ?? 1;
  console.log(`agenda posted (message ${messageId})`);

  for (const p of rest) {
    const inbox = await p.client.inbox(project, { limit: 10 });
    const threadMsg = (Array.isArray(inbox) ? inbox : []).find((m) => m.id === messageId) ||
                      (Array.isArray(inbox) ? inbox : [])[0];
    if (!threadMsg) { console.log(`${p.mailName}: nothing in inbox`); continue; }
    await p.client.reply(project, threadMsg.id, `${p.spec} present. Position noted on: ${topic}.`);
    console.log(`${p.mailName} acknowledged in thread`);
  }

  const transcript = await chair.client.inbox(project, { limit: 50 });
  console.log("\n=== transcript (chair inbox) ===");
  for (const m of Array.isArray(transcript) ? transcript : []) {
    console.log(`#${m.id} ${m.from} -> ${chair.mailName} | ${m.subject}`);
  }
  console.log("\nmeeting complete - full record in the git-backed Agent Mail archive");
}

main().catch((err) => { console.error(`meeting failed: ${err.message}`); process.exit(1); });
