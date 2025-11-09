// site/js/metrics-badge.js
(function () {
    // Create the badge at the top-right, fixed
    const wrap = document.createElement('div');
    wrap.id = 'metrics-badge';
    wrap.style.position = 'fixed';
    wrap.style.top = '8px';
    wrap.style.right = '8px';
    wrap.style.zIndex = '9999';
    wrap.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
    wrap.style.fontSize = '40px';
    wrap.style.background = 'rgba(0,0,0,0.75)';
    wrap.style.color = '#fff';
    wrap.style.padding = '8px 10px';
    wrap.style.borderRadius = '10px';
    wrap.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
    wrap.style.backdropFilter = 'blur(4px)';
    wrap.style.pointerEvents = 'none'; // click-through
  
    const line1 = document.createElement('div'); // Active now
    const line2 = document.createElement('div'); // Avg
    const line3 = document.createElement('div'); // Updated
    line1.textContent = 'Active: —';
    line2.textContent = 'Avg: —';
    line3.style.opacity = '0.7';
    wrap.append(line1, line2, line3);
    document.body.appendChild(wrap);
  
    const fmtSec = s => `${(Math.round(s * 10) / 10).toFixed(1)}s`;
    const tick = async () => {
      try {
        const r = await fetch('/api/metrics?minutes=60&activeWindowSec=120', { cache: 'no-store' });
        if (!r.ok) throw new Error('metrics fetch failed');
        const m = await r.json();
        line1.textContent = `Active: ${m.activeNow}`;
        line2.textContent = `Avg: ${fmtSec(m.averageSeconds || 0)} • last ${m.windowMinutes}m`;
        const t = new Date();
        line3.textContent = `Updated ${t.toLocaleTimeString()}`;
      } catch {
        line1.textContent = 'Active: —';
        line2.textContent = 'Avg: —';
        const t = new Date();
        line3.textContent = `Offline ${t.toLocaleTimeString()}`;
      }
    };
  
    // Update every 15s; prime once quickly
    tick();
    setInterval(tick, 15000);
  })();
  