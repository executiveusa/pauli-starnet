/**
 * agent-mail-client.js - minimal MCP-over-HTTP client for MCP Agent Mail.
 *
 * The comms fabric for the city: agents register an identity, send/receive
 * threaded markdown messages, and hold advisory file reservations. Server is
 * Dicklesworthstone/mcp_agent_mail (HTTP-only FastMCP, git-backed archive).
 *
 * No dependencies. Node 18+.
 *
 * Env:
 *   AGENT_MAIL_URL    default http://127.0.0.1:8765/mcp/
 *   AGENT_MAIL_TOKEN  bearer token (from Infisical HERMES prod - never hardcode)
 */
"use strict";

const DEFAULT_URL = "http://127.0.0.1:8765/mcp/";

class AgentMailClient {
  constructor({ url, token, clientName } = {}) {
    this.url = url || process.env.AGENT_MAIL_URL || DEFAULT_URL;
    this.token = token || process.env.AGENT_MAIL_TOKEN || "";
    if (!this.token) throw new Error("AGENT_MAIL_TOKEN is required (load from Infisical, never hardcode)");
    this.clientName = clientName || "starnet-agent";
    this.sessionId = null;
    this.nextId = 0;
    this.initialized = false;
  }

  async rpc(method, params, isNotification = false) {
    const body = { jsonrpc: "2.0", method };
    if (!isNotification) body.id = ++this.nextId;
    if (params !== undefined) body.params = params;
    const headers = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };
    if (this.sessionId) headers["mcp-session-id"] = this.sessionId;
    const res = await fetch(this.url, { method: "POST", headers, body: JSON.stringify(body) });
    const sid = res.headers.get("mcp-session-id");
    if (sid) this.sessionId = sid;
    let raw = await res.text();
    for (const line of raw.split("\n")) {
      if (line.startsWith("data:")) { raw = line.slice(5).trim(); break; }
    }
    if (!raw.trim()) return {}; // notifications answer 202 with an empty body
    let parsed;
    try { parsed = JSON.parse(raw); } catch { throw new Error(`agent-mail: non-JSON reply to ${method}: ${raw.slice(0, 200)}`); }
    if (parsed.error) throw new Error(`agent-mail ${method}: ${parsed.error.message || JSON.stringify(parsed.error)}`);
    return parsed.result;
  }

  async init() {
    if (this.initialized) return;
    await this.rpc("initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: this.clientName, version: "1.0" },
    });
    await this.rpc("notifications/initialized", undefined, true);
    this.initialized = true;
  }

  async call(tool, args) {
    await this.init();
    const result = await this.rpc("tools/call", { name: tool, arguments: args });
    const text = (result?.content || [])
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n");
    try { return JSON.parse(text); } catch { return text; }
  }

  ensureProject(humanKey) { return this.call("ensure_project", { human_key: humanKey }); }

  /** Register (or re-identify) this agent. Server assigns the memorable name. */
  async register(projectKey, { program, model, taskDescription } = {}) {
    const out = await this.call("register_agent", {
      project_key: projectKey,
      program: program || this.clientName,
      model: model || "unknown",
      task_description: taskDescription || "",
    });
    this.agentName = out.name;
    this.agentToken = out.registration_token;
    return out;
  }

  send(projectKey, { to, subject, body, importance = "normal", threadId }) {
    return this.call("send_message", {
      project_key: projectKey,
      sender_name: this.agentName,
      sender_token: this.agentToken,
      to: Array.isArray(to) ? to : [to],
      subject,
      body_md: body,
      importance,
      ...(threadId ? { thread_id: threadId } : {}),
    });
  }

  inbox(projectKey, { limit = 20, urgentOnly = false } = {}) {
    return this.call("fetch_inbox", {
      project_key: projectKey,
      agent_name: this.agentName,
      registration_token: this.agentToken,
      limit,
      urgent_only: urgentOnly,
    });
  }

  reply(projectKey, messageId, body) {
    return this.call("reply_message", {
      project_key: projectKey,
      sender_name: this.agentName,
      sender_token: this.agentToken,
      message_id: messageId,
      body_md: body,
    });
  }

  reserveFiles(projectKey, paths, { ttlSeconds = 3600, exclusive = true, reason = "" } = {}) {
    return this.call("file_reservation_paths", {
      project_key: projectKey,
      agent_name: this.agentName,
      registration_token: this.agentToken,
      paths,
      ttl_seconds: ttlSeconds,
      exclusive,
      reason,
    });
  }

  directory(projectKey) { return this.call("list_agents", { project_key: projectKey }); }
}

module.exports = { AgentMailClient };
