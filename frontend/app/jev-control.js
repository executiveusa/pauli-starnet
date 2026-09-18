(function () {
  'use strict';

  var KEY = 'starnet.jev.enabled';
  var api = '/api/jev-decision';

  function enabled() {
    try { return localStorage.getItem(KEY) === '1'; } catch (_) { return false; }
  }

  function setEnabled(value) {
    var on = value === true;
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (_) {}
    render();
    try { window.dispatchEvent(new CustomEvent('starnet:jev-toggle', { detail: { enabled: on } })); } catch (_) {}
    return on;
  }

  async function decide(state) {
    if (!enabled()) return { ok: true, bypassed: true, disabled: true, reason: 'jev_toggle_off' };
    var response = await fetch(api, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json',
        'x-starnet-jev-enabled': '1'
      },
      body: JSON.stringify({ enabled: true, state: state })
    });
    var text = await response.text();
    var body = text;
    try { body = text ? JSON.parse(text) : null; } catch (_) {}
    if (!response.ok) {
      var err = new Error((body && body.reason) || (body && body.error) || ('Jev HTTP ' + response.status));
      err.status = response.status;
      err.body = body;
      throw err;
    }
    return body;
  }

  async function runTest() {
    var status = document.getElementById('jev-status');
    if (!status) return;
    if (!enabled()) {
      status.textContent = 'OFF · no calls';
      return;
    }
    status.textContent = 'TESTING…';
    try {
      var result = await decide({
        request: 'Inspect the mobile navigation, verify external links, run tests, and create a preview. Do not merge production without approval.',
        environment: 'preview',
        requestedBy: 'commander',
        proof: ['inspection required', 'tests required', 'preview required']
      });
      var a = result && result.answers;
      var agent = a && a.agent && a.agent.choice ? a.agent.choice : 'decision ready';
      status.textContent = 'READY · ' + agent;
      console.info('[StarNet Jev] test result', result);
    } catch (err) {
      var body = err && err.body;
      if (body && body.reason === 'netlify_ai_gateway_credentials_unavailable') {
        status.textContent = 'ON · add Netlify credits';
      } else {
        status.textContent = 'ON · test unavailable';
      }
      console.warn('[StarNet Jev] test failed', err);
    }
  }

  function render() {
    var box = document.getElementById('jev-control');
    if (!box) return;
    var on = enabled();
    var input = document.getElementById('jev-toggle');
    var status = document.getElementById('jev-status');
    if (input) input.checked = on;
    box.setAttribute('data-enabled', on ? '1' : '0');
    if (status) status.textContent = on ? 'ON · idle' : 'OFF · no calls';
  }

  function mount() {
    if (document.getElementById('jev-control')) return;

    var style = document.createElement('style');
    style.textContent =
      '#jev-control{position:fixed;right:14px;bottom:14px;z-index:12000;display:flex;align-items:center;gap:9px;padding:8px 10px;background:rgba(8,10,12,.94);border:1px solid rgba(255,184,77,.28);box-shadow:0 8px 28px rgba(0,0,0,.34);font:14px/1.1 VT323,monospace;color:#c7b999}' +
      '#jev-control[data-enabled="1"]{border-color:rgba(255,184,77,.72);color:#ffd28a}' +
      '#jev-control .jev-name{letter-spacing:.08em}' +
      '#jev-control .jev-status{min-width:88px;color:#8d877c}' +
      '#jev-control button{font:inherit;background:#16191d;color:inherit;border:1px solid #4f473b;padding:3px 7px;cursor:pointer}' +
      '#jev-control button:hover{border-color:#b68a4c}' +
      '#jev-control label{display:inline-flex;align-items:center;gap:5px;cursor:pointer}' +
      '#jev-control input{accent-color:#d79a45}';
    document.head.appendChild(style);

    var el = document.createElement('div');
    el.id = 'jev-control';
    el.innerHTML =
      '<span class="jev-name">JEV</span>' +
      '<label><input id="jev-toggle" type="checkbox" aria-label="Enable Jev decision engine"><span>ENABLE</span></label>' +
      '<span id="jev-status" class="jev-status"></span>' +
      '<button id="jev-test" type="button" title="Uses one Jev request when enabled">TEST</button>';
    document.body.appendChild(el);

    document.getElementById('jev-toggle').addEventListener('change', function (e) {
      setEnabled(!!e.target.checked);
    });
    document.getElementById('jev-test').addEventListener('click', runTest);
    render();
  }

  window.StarNetJev = Object.freeze({
    isEnabled: enabled,
    setEnabled: setEnabled,
    decide: decide,
    test: runTest
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
