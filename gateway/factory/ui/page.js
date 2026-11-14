'use strict';
// Standalone page glue (no inline script, so the CSP can forbid it). Same-origin gateway, token kept in sessionStorage only.
(function () {
  var out = document.getElementById('out'); var form = document.getElementById('f'); var input = document.getElementById('t');
  var conn = null;
  function start(token) {
    if (conn) conn.stop();
    out.innerHTML = '<div id="factory-status" role="status" aria-live="polite" style="padding:8px 10px;border:1px solid #2a2f3a;border-radius:8px;background:#161922"></div>';
    var el = document.getElementById('factory-status');
    conn = window.FactoryStatus.connect({ gateway: location.origin, token: token, onModel: function (m) { el.innerHTML = window.FactoryStatus.renderHtml(m); } });
  }
  form.addEventListener('submit', function (e) { e.preventDefault(); var t = input.value.trim(); if (!t) return; try { sessionStorage.setItem('factory.token', t); } catch (x) { /* private mode */ } input.value = ''; start(t); });
  var saved = null; try { saved = sessionStorage.getItem('factory.token'); } catch (x) { /* private mode */ }
  if (saved) start(saved);
})();
