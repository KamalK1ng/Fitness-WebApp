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
        button.style.display = 'block'; // First, make it visible
        setTimeout(function() {
            button.classList.add('visible');
        }, 10); // Small delay to allow the browser to register the display change
    }, 2000); // Delay in milliseconds (3 seconds)
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
          }, 500); // 0.5s delay for image first
        } else if (entry.target.classList.contains('animate-text')) {
          // fallback in case image loads late
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
//     const clickedAccordion = clickedHeader.closest('.accordion-mistake');
//     const isOpen = clickedAccordion.classList.contains('open');

//     // Close all accordions
//     document.querySelectorAll('.accordion-mistake').forEach((accordion) => {
//         accordion.classList.remove('open');
//     });

//     // Toggle clicked one (re-open if it was closed)
//     if (!isOpen) {
//         clickedAccordion.classList.add('open');
//     }
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






// api features

(() => {
  const sessionId = crypto.randomUUID();
  const path = location.pathname || "/";
  let start = performance.now();

  const send = (url, data) => {
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, blob);
    } else {
      // Fallback
      fetch(url, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(data) });
    }
  };

  const startEvent = () => {
    start = performance.now();
    send("/api/track", { sessionId, path, event: "start", timestamp: Date.now() });
  };

  const stopEvent = () => {
    const durationMs = Math.max(0, Math.round(performance.now() - start));
    send("/api/track", { sessionId, path, event: "stop", durationMs, timestamp: Date.now() });
  };

  // Fire on load/visible
  if (document.visibilityState === "visible") startEvent();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      stopEvent();
    } else if (document.visibilityState === "visible") {
      startEvent();
    }
  });

  // Safety net on unload
  window.addEventListener("pagehide", stopEvent);
})();




// existing site logic ...
// ---- tracking + metrics (bottom of index.js) ----
(function track() {
  const SID_KEY='fyf_sid';
  const sid = sessionStorage.getItem(SID_KEY) || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
  sessionStorage.setItem(SID_KEY, sid);
  const t0 = Date.now();

  async function send(ev) {
    try {
      navigator.sendBeacon && ev==='stop'
        ? navigator.sendBeacon('/api/track', new Blob([JSON.stringify({ sessionId:sid, path:location.pathname, event:ev, durationMs: Date.now()-t0 })], {type:'application/json'}))
        : fetch('/api/track', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ sessionId:sid, path:location.pathname, event:ev, durationMs: Date.now()-t0 })});
    } catch {}
  }
  send('start');
  addEventListener('visibilitychange', () => { if (document.visibilityState==='hidden') send('stop'); });
  addEventListener('pagehide', () => send('stop'));
})();

(function badge() {
  function ensure() {
    let b = document.getElementById('metrics-badge');
    if (!b) {
      b = document.createElement('div');
      b.id = 'metrics-badge';
      b.style.cssText = 'position:fixed;top:8px;right:8px;z-index:9999;font:14px system-ui,Segoe UI,Roboto,Arial;background:rgba(0,0,0,.75);color:#fff;padding:8px 10px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,.3);pointer-events:none';
      b.innerHTML = '<div id="m1">Active: —</div><div id="m2">Avg: —</div><div id="m3" style="opacity:.7">Loading…</div>';
      document.body.appendChild(b);
    }
    return b;
  }
  async function tick() {
    const b = ensure();
    try {
      const r = await fetch('/api/metrics?nocache=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw 0;
      const m = await r.json();
      b.querySelector('#m1').textContent = 'Active: ' + (m.activeNow ?? '—');
      b.querySelector('#m2').textContent = 'Avg: ' + ((m.averageSeconds ?? 0).toFixed(1)) + 's';
      b.querySelector('#m3').textContent = 'Updated ' + new Date().toLocaleTimeString();
    } catch {
      b.querySelector('#m3').textContent = 'Offline ' + new Date().toLocaleTimeString();
    }
  }
  tick();
  setInterval(tick, 15000);
})();
