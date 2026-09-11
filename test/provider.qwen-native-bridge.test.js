/* node test/provider.qwen-native-bridge.test.js - qwen native text tool-call bridge.
   Fixtures are the ACTUAL outputs captured live from Groq qwen/qwen3.6-27b and qwen/qwen3.8-27b
   on 2026-09-11 (research-lane tasks 7fa0a1ca and 2bdf7964). */
'use strict';
const A = require('./_assert.js');
const { makeOpenAICompatibleProvider, _internals } = require('../sidecar/providers/openai-compatible.js');
const bridge = _internals.bridgeQwenNativeToolCalls;

const TOOLS = [
  { type: 'function', function: { name: 'web_search', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'web_fetch', parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } } }
];

// verbatim qwen3.8-27b output (task 2bdf7964): valid native blocks, hyphenated name with glued parameter
const Q38 = 'I\'ll research both from the official sources. Let me fetch the relevant pages.\n\n<tool_call>\n<function=web-fetch:url>\n<parameter=url>\nhttps://nodejs.org/en/about/\n</parameter>\n</function>\n</tool_call>\n<tool_call>\n<function=web-fetch:url>\n<parameter=url>\nhttps://www.python.org/downloads/\n</parameter>\n</function>\n</tool_call>';

// verbatim qwen3.6-27b output (task 7fa0a1ca, think trimmed): malformed table-ish pseudo calls, unclosed blocks
const Q36 = 'I\'ll search for both pieces of information in parallel.\n\n<tool_call>\n| web_search | query: "current active Node.js LTS version codename site:nodejs.org" |\n|---|---|\n| web_search | query: "latest Python 3 stable release version site:python.org" |\n|---|---|\n\n<tool_call>\n| web_search | query: "current active Node.js LTS version codename site:nodejs.org" |\n<tool_call>\n| web_search | query: "latest Python 3 stable release version site:python.org" |';

module.exports = (async () => {
  // --- the real 3.8 payload bridges into two strict web_fetch calls
  {
    const r = bridge(Q38, TOOLS);
    A.ok(r && r.calls.length === 2, 'qwen3.8 fixture: two calls');
    A.eq(r.calls[0].name, 'web_fetch', 'glued :url suffix normalized to web_fetch');
    A.eq(r.calls[0].args, { url: 'https://nodejs.org/en/about/' }, 'first url arg');
    A.eq(r.calls[1].args, { url: 'https://www.python.org/downloads/' }, 'second url arg');
    A.eq(r.preamble, "I'll research both from the official sources. Let me fetch the relevant pages.", 'intent preamble kept as text');
  }
  // --- the real 3.6 payload is malformed: never executed
  {
    const r = bridge(Q36, TOOLS);
    A.ok(!r || r.calls.length === 0, 'qwen3.6 fixture rejected (no calls synthesized)');
  }
  // --- strictness battery
  A.eq(bridge('just prose, no markup', TOOLS), null, 'plain prose passes through (null)');
  A.ok(bridge('<tool_call>\n<function=web_search>\n<parameter=query>\nnode lts\n</parameter>\n</function>\n</tool_call>', TOOLS).calls.length === 1, 'exact name + single call bridges');
  A.eq(bridge('<tool_call>\n<function=shell_exec>\n<parameter=cmd>\nls\n</parameter>\n</function>\n</tool_call>', TOOLS).rejected, 'unknown-tool', 'non-offered tool rejected');
  A.eq(bridge('<tool_call>\n<function=web_fetch>\n<parameter=href>\nhttps://x.test\n</parameter>\n</function>\n</tool_call>', TOOLS).rejected, 'unknown-param', 'undeclared parameter rejected');
  A.eq(bridge('<tool_call>\n<function=web_fetch>\n</function>\n</tool_call>', TOOLS).rejected, 'missing-required', 'missing required param rejected');
  A.eq(bridge('<tool_call>\n<function=web_fetch>\n<parameter=url>\nhttps://x.test\n</parameter>\njunk\n</function>\n</tool_call>', TOOLS).rejected, 'mixed-params', 'prose mixed inside function body rejected');
  { const r = bridge('look: <tool_call> half a block\n<tool_call>\n<function=web_fetch>\n<parameter=url>\nhttps://x.test\n</parameter>\n</function>\n</tool_call>', TOOLS); A.ok(r && r.calls.length === 0 && !!r.rejected, 'stray fragment outside blocks rejects all (reason: ' + (r && r.rejected) + ')'); }
  A.eq(bridge('<tool_call>\n<function=web_fetch>\n<parameter=url>\nhttps://x.test\n</parameter>\n</function>\n</tool_call>\n Done!', TOOLS).rejected, 'trailing-prose', 'prose after the last block rejected');
  A.eq(bridge('<tool_call>\n<function=web_fetch>\n<parameter=url>\nhttps://x.test\n</parameter>\n</function>\n</tool_call>'.repeat(5).split('</tool_call>').join('</tool_call>\n'), TOOLS).rejected, 'too-many', 'fifth call over the cap rejected');
  {
    const two = '<tool_call>\n<function=web_fetch>\n<parameter=url>\nhttps://a.test\n</parameter>\n</function>\n</tool_call>\n<tool_call>\n<function=web_search>\n<parameter=query>\nq\n</parameter>\n</function>\n</tool_call>';
    const r = bridge(two, TOOLS);
    A.ok(r && r.calls.length === 2 && r.calls[1].name === 'web_search', 'two contiguous mixed-tool blocks bridge');
  }
  {
    const r = bridge('<tool_call>\n<function=web_search>\n<parameter=query>\n42\n</parameter>\n</function>\n</tool_call>', TOOLS);
    A.eq(r.calls[0].args.query, 42, 'numeric-looking value types as JSON number');
  }
  // --- full stream path: buffered text becomes wire events only at finish
  {
    const line = obj => 'data: ' + JSON.stringify(obj);
    const sse = [
      line({ choices: [{ delta: { content: Q38.slice(0, 60) } }] }),
      line({ choices: [{ delta: { content: Q38.slice(60) } }] }),
      line({ choices: [{ finish_reason: 'stop', delta: {} }] }),
      'data: [DONE]', ''
    ].join('\n');
    const p = makeOpenAICompatibleProvider({ fetch: async () => new Response(sse, { status: 200 }), key: 'K', baseUrl: 'https://example.test/v1/' });
    const evs = []; for await (const e of p.stream({ model: 'qwen/qwen3.8-27b', messages: [], tools: TOOLS })) evs.push(e);
    A.eq(evs.filter(e => e.type === 'tool_start').map(e => e.name), ['web_fetch', 'web_fetch'], 'stream synthesizes two tool_starts');
    A.eq(JSON.parse(evs.find(e => e.type === 'tool_args' && e.index === 0).chunk), { url: 'https://nodejs.org/en/about/' }, 'stream tool_args chunk is valid JSON');
    A.eq(evs.find(e => e.type === 'done').finishReason, 'tool_calls', 'finish overridden to tool_calls');
    A.eq(evs.filter(e => e.type === 'text').map(e => e.delta).join(''), "I'll research both from the official sources. Let me fetch the relevant pages.", 'preamble streamed as the turn text');
  }
  // --- non-qwen models are untouched: text streams immediately
  {
    const line = obj => 'data: ' + JSON.stringify(obj);
    const sse = [line({ choices: [{ delta: { content: 'hi' } }] }), line({ choices: [{ finish_reason: 'stop', delta: {} }] }), 'data: [DONE]', ''].join('\n');
    const p = makeOpenAICompatibleProvider({ fetch: async () => new Response(sse, { status: 200 }), key: 'K', baseUrl: 'https://example.test/v1/' });
    const evs = []; for await (const e of p.stream({ model: 'openai/gpt-oss-120b', messages: [] })) evs.push(e);
    A.eq(evs.filter(e => e.type === 'text').map(e => e.delta).join(''), 'hi', 'non-qwen text streams verbatim');
  }
  // --- rejected markup streams verbatim as text (honest fall-through)
  {
    const line = obj => 'data: ' + JSON.stringify(obj);
    const sse = [line({ choices: [{ delta: { content: Q36 } }] }), line({ choices: [{ finish_reason: 'stop', delta: {} }] }), 'data: [DONE]', ''].join('\n');
    const p = makeOpenAICompatibleProvider({ fetch: async () => new Response(sse, { status: 200 }), key: 'K', baseUrl: 'https://example.test/v1/' });
    const evs = []; for await (const e of p.stream({ model: 'qwen/qwen3.6-27b', messages: [], tools: TOOLS })) evs.push(e);
    A.eq(evs.filter(e => e.type === 'tool_start').length, 0, 'rejected payload: no tool events');
    A.eq(evs.filter(e => e.type === 'text').map(e => e.delta).join(''), Q36, 'rejected payload streams verbatim');
    A.eq(evs.find(e => e.type === 'done').finishReason, 'stop', 'rejected payload keeps stop finish');
  }
  A.report();
})();
