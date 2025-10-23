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

function toggleAccordion(clickedHeader) {
    const accordion = clickedHeader.closest('.accordion-mistake');
    const allAccordions = document.querySelectorAll('.accordion-mistake');

    allAccordions.forEach(item => {
        if (item !== accordion) {
            item.classList.remove('open');
            const body = item.querySelector('.accordion-body');
            body.style.maxHeight = null;
        }
    });

    accordion.classList.toggle('open');
    const body = accordion.querySelector('.accordion-body');
    
    if (accordion.classList.contains('open')) {
        body.style.maxHeight = body.scrollHeight + 'px';
    } else {
        body.style.maxHeight = null;
    }
}

function toggleAccordion(clickedHeader) {
    const clickedAccordion = clickedHeader.closest('.accordion-mistake');
    const isOpen = clickedAccordion.classList.contains('open');

    // Close all accordions
    document.querySelectorAll('.accordion-mistake').forEach((accordion) => {
        accordion.classList.remove('open');
    });

    // Toggle clicked one (re-open if it was closed)
    if (!isOpen) {
        clickedAccordion.classList.add('open');
    }
}

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

// Refresh every 5 seconds
setInterval(updateMetric, 5000);
updateMetric(); // initial load

(async ()=>{
  try {
    const r = await fetch('/api/metrics?minutes=10');
    if(!r.ok) return;
    const d = await r.json();
    const el = document.getElementById('metrics');
    if(el) el.textContent =
      `Active (last ${d.windowMinutes}m): ${d.activeVisitors} • Total: ${d.totalVisitors}`;
  } catch (err) {
    console.warn('Metrics fetch failed', err);
  }
})();