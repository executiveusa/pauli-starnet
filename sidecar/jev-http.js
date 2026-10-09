/* Shared HTTP helper for the JEV shadow plane.
   One place for the POST + timeout + bounded retry logic that the gateway and
   OpenRouter call sites used to repeat.

   Retry state is request-local: each call owns its attempt counter, so
   concurrent requests never share a "retried" flag (the old
   `callModel._retried` style flag was global: one request's retry disabled
   the retry of every concurrent request, and a throw could leave it stuck). */
'use strict';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* POST a JSON body. Retries up to `maxRetries` extra times when the response
   status is accepted by `shouldRetry`, waiting `retryDelayMs` between attempts.
   Network errors and timeouts are NOT retried: they propagate to the caller,
   which already maps them to a provider error. Always returns the last response
   (even if still failing) as { resp, text, parsed, attempts }. */
async function postJson(url, {
  headers = {},
  body,
  timeoutMs = 10000,
  maxRetries = 1,
  retryDelayMs = 3000,
  shouldRetry = (status) => status === 429 || status >= 500,
  fetchImpl = (...args) => fetch(...args),
  sleep = defaultSleep,
} = {}) {
  const retries = Number.isInteger(maxRetries) && maxRetries > 0 ? Math.min(maxRetries, 3) : 0;
  let attempts = 0;
  for (;;) {
    attempts += 1;
    const resp = await fetchImpl(url, {
      signal: AbortSignal.timeout(timeoutMs),
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
    const text = await resp.text();
    if (!resp.ok && attempts <= retries && shouldRetry(resp.status)) {
      await sleep(retryDelayMs);
      continue;
    }
    let parsed = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { /* leave null: callers check shape */ }
    return { resp, text, parsed, attempts };
  }
}

/* OpenRouter chat completion in the shape both free-lane callers use. A 429 is
   retried once per model request after `retryDelayMs`. */
function openRouterChat({ apiKey, model, system, user, extra, fetchImpl, sleep, retryDelayMs = 8000 }) {
  return postJson(OPENROUTER_URL, {
    headers: { authorization: 'Bearer ' + apiKey, accept: 'application/json' },
    body: {
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0,
      max_tokens: 400,
      response_format: { type: 'json_object' },
      ...(extra || {}),
    },
    timeoutMs: 25000,
    maxRetries: 1,
    retryDelayMs,
    shouldRetry: (status) => status === 429,
    fetchImpl,
    sleep,
  });
}

/* Typed-gateway POST: 429 and 5xx are retried once after `retryDelayMs`. */
function gatewayPost({ url, token, body, fetchImpl, sleep, retryDelayMs = 3000 }) {
  return postJson(url, {
    headers: { authorization: 'Bearer ' + token },
    body,
    timeoutMs: 10000,
    maxRetries: 1,
    retryDelayMs,
    shouldRetry: (status) => status === 429 || status >= 500,
    fetchImpl,
    sleep,
  });
}

module.exports = { OPENROUTER_URL, postJson, openRouterChat, gatewayPost };
