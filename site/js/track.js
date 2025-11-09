// site/js/track.js

(function () {
    const api = '/api/track';
  
    // stable session id per browser tab
    const KEY = 'fyf_session_id';
    const SID = (() => {
      let s = sessionStorage.getItem(KEY);
      if (!s) { s = (crypto.randomUUID?.() || Math.random().toString(36).slice(2)); sessionStorage.setItem(KEY, s); }
      return s;
    })();
  
    const startTs = Date.now();
  
    async function send(event, extra = {}) {
      try {
        await fetch(api, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true, // lets it fire on page unload
          body: JSON.stringify({
            sessionId: SID,
            path: location.pathname || '/',
            event,                      // "start" | "stop"
            durationMs: Date.now() - startTs,
            ...extra
          })
        });
      } catch { /* swallow — tracking must never break UX */ }
    }
  
    // Fire "start" once DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => send('start'));
    } else {
      send('start');
    }
  
    // Fire "stop" when leaving the page
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') send('stop');
    });
    window.addEventListener('pagehide', () => send('stop'));
  })();
  