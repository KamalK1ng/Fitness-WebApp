// Trigger CSS Animations when elements are scrolled into view

// This JS uses the Intersection Observer API to determine if objects are within the viewport
// It addes an 'in-view' class to elements when they come into view (and removes the class when not on screen)
// Use to add @keyframe or transition animations to elements so they animate once they are on screen

//TO USE
// Simply add the .animate class to those HTML elements that you wish to animate. For example, <h1 class="animate">
// Once in the viewport, the JS will add the 'in-view' class to those elements. For example, <h1 class="animate in-view">
// Define your CSS to enable animations once that element is in view. For example, h1.in-view { }

//Check if the document is loaded (so that this script can be placed in the <head>)
document.addEventListener("DOMContentLoaded", () => {

	// Use Intersection Observer to determine if objects are within the viewport
	const observer = new IntersectionObserver(entries => {
	  entries.forEach(entry => {
		if (entry.isIntersecting) {
		  entry.target.classList.add('in-view');
		  return;
		}
		entry.target.classList.remove('in-view');
	  });
	});

	// Get all the elements with the .animate class applied
	const allAnimatedElements = document.querySelectorAll('.animate');

	// Add the observer to each of those elements
	allAnimatedElements.forEach((element) => observer.observe(element));

}); 


window.addEventListener('load', function() {
  setTimeout(function() {
    const button = document.querySelector('.learn_more');
    if (!button) return;                 // ← guard so we don't error on pages without it
    button.style.display = 'block';
    setTimeout(function() {
      button.classList.add('visible');
    }, 10);
  }, 2000);
});



document.addEventListener("DOMContentLoaded", () => {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        if (entry.target.classList.contains('animate-img')) {
          entry.target.classList.add('in-view');
          setTimeout(() => {
            const text = document.querySelector('.animate-text');
            text.classList.add('in-view');
          }, 500);
        } else if (entry.target.classList.contains('animate-text')) {
          setTimeout(() => {
            entry.target.classList.add('in-view');
          }, 500);
        }
      }
    });
  }, { threshold: 0.4 });

  document.querySelectorAll('.animate-img, .animate-text').forEach(el => {
    observer.observe(el);
  });
});


document.addEventListener("DOMContentLoaded", function () {
	const revealElements = document.querySelectorAll(".scroll-reveal");
  
	function revealOnScroll() {
	  const triggerPoint = window.innerHeight * 0.85;
  
	  revealElements.forEach((el) => {
		const elementTop = el.getBoundingClientRect().top;
  
		if (elementTop < triggerPoint) {
		  el.classList.add("in-view");
		}
	  });
	}
  
	window.addEventListener("scroll", revealOnScroll);
	revealOnScroll(); // Trigger on load too
});


// function toggleAccordion(clickedHeader) {
//   const clickedAccordion = clickedHeader.closest('.accordion-mistake');
//   const isOpen = clickedAccordion.classList.contains('open');
//   document.querySelectorAll('.accordion-mistake').forEach((accordion) => {
//     accordion.classList.remove('open');
//   });
//   if (!isOpen) {
//     clickedAccordion.classList.add('open');
//   }
// }

function toggleAccordion(clickedHeader){
  const clicked = clickedHeader.closest('.accordion-mistake');
  const wasOpen = clicked.classList.contains('open');

  document.querySelectorAll('.accordion-mistake').forEach(a => a.classList.remove('open'));
  if (!wasOpen) clicked.classList.add('open');
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.accordion-header').forEach(h => {
    h.addEventListener('click', () => toggleAccordion(h));
  });
});

// Function to fetch updated data
async function updateMetric() {
  try {
    // Replace 'data.php' with your PHP file that outputs JSON
    const response = await fetch('data.php');
    const data = await response.json();
    document.getElementById('metric').textContent = data.value;
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}


// touch feature for phones
document.addEventListener('DOMContentLoaded', () => {
  const isTouch = window.matchMedia('(hover: none)').matches;
  if (!isTouch) return;                      // desktop keeps hover behavior

  const tabs = document.querySelectorAll('.who-its-for .tabs .tab');
  if (!tabs.length) return;

  // open the first by default on touch
  tabs[0].classList.add('active');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    }, { passive: true });
  });
});


/* =========================
   API base (works for file://, local server, and live SWA)
   ========================= */
// ===== API base (local vs live) =====
const IS_FILE   = !location.origin.startsWith('http');
const IS_LOCAL  = location.origin.startsWith('http://127.0.0.1:5500') ||
                  location.origin.startsWith('http://localhost:5500');

const API_ORIGIN = IS_FILE ? 'http://localhost:7071'         // opened via file://
                  : IS_LOCAL ? 'http://localhost:7071'       // served with http-server
                  : location.origin;                         // live SWA

const API_BASE = `${API_ORIGIN}/api`;



/* =========================
   Telemetry (ONE source of truth)
   ========================= */
   (function initTelemetry() {
    if (window.__fyfTelemetryInit) return;
    window.__fyfTelemetryInit = true;
  
    const SID_KEY = 'fyf_sid';
    const sid =
      sessionStorage.getItem(SID_KEY) ||
      (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
    sessionStorage.setItem(SID_KEY, sid);
  
    const pagePath = location.pathname || '/';
    let t0 = Date.now();
    let hideAt = 0;
    let lastStopSentAt = 0;
    const MIN_HIDE_MS = 5000; // only count a stop if hidden for ≥ 5s
  
    function send(ev) {
      const now = Date.now();
      const payload = {
        sessionId: sid,
        path: pagePath,
        event: ev, // "start" | "stop"
        durationMs: Math.max(0, now - t0),
        timestamp: now
      };
  
      try {
        const body = JSON.stringify(payload);
        if (ev === 'stop' && navigator.sendBeacon) {
          const blob = new Blob([body], { type: 'application/json' });
          navigator.sendBeacon(`${API_BASE}/track`, blob);
        } else {
          fetch(`${API_BASE}/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body
          });
        }
        if (ev === 'start') t0 = now;
        if (ev === 'stop')  lastStopSentAt = now;
      } catch {}
    }
  
    // start once when first visible
    if (document.visibilityState === 'visible') send('start');
  
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        hideAt = Date.now();
        // send stop only if we remain hidden long enough
        setTimeout(() => {
          if (document.visibilityState === 'hidden' && Date.now() - hideAt >= MIN_HIDE_MS) {
            // avoid duplicate stops in rare cases
            if (Date.now() - lastStopSentAt >= 1000) send('stop');
          }
        }, MIN_HIDE_MS);
      } else if (document.visibilityState === 'visible') {
        // if we were truly away long enough, start a new session on return
        if (hideAt && Date.now() - hideAt >= MIN_HIDE_MS) {
          send('start');
        }
        hideAt = 0;
      }
    });
  
    // safety net on page unload
    addEventListener('pagehide', () => send('stop'));
  })();
  
/* =========================
   Tiny top-right metrics badge
   ========================= */
   (function initMetricsBadge() {
    if (window.__fyfBadgeInit) return;
    window.__fyfBadgeInit = true;
  
    const b = document.createElement('div');
    b.id = 'metrics-badge';
    b.style.cssText =
      'position:fixed;top:91.5%;right:4px;z-index:9999;font:14px system-ui,Segoe UI,Roboto,Arial;' +
      'background:rgba(0,0,0,.75);color:#fff;padding:8px 10px;border-radius:10px;' +
      'box-shadow:0 2px 10px rgba(0,0,0,.3);pointer-events:none';
    b.innerHTML =
      '<div id="m1">Active: —</div><div id="m2">Avg: —</div>' +
      '<div id="m3" style="opacity:.7">Loading…</div>';
  
    // ensure body exists
    window.addEventListener('load', () => document.body.appendChild(b));
  
    async function tick() {
      const m1 = document.querySelector('#m1');
      const m2 = document.querySelector('#m2');
      const m3 = document.querySelector('#m3');
      if (!m1 || !m2 || !m3) return; // nothing to update yet
  
      try {
        const r = await fetch(`${API_BASE}/metrics?nocache=${Date.now()}`, { cache: 'no-store' });
        if (!r.ok) throw 0;
        const m = await r.json();
        const avg = m.averageSeconds ?? 0;
        const formatted = avg >= 60 ? `${(avg / 60).toFixed(2)} min` : `${avg.toFixed(2)} s`;
  
        m1.textContent = 'Active: ' + (m.activeNow ?? '—');
        m2.textContent = 'Avg: ' + formatted;
        m3.textContent = 'Updated ' + new Date().toLocaleTimeString();
      } catch {
        m3.textContent = 'Offline ' + new Date().toLocaleTimeString();
      }
    }
  
    tick();
    setInterval(tick, 15000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') tick();
    });
  })();
  