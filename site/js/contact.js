// /site/js/contact.js
(function () {
    const form = document.getElementById('contactForm');
    const status = document.getElementById('contactStatus');
  
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.textContent = 'Sending...';
  
      const payload = {
        name: (form.First_name?.value || '').trim(),
        email: (form.Email?.value || ''), // optional: add an email field if you want
        message: [
          `First: ${form.First_name?.value || ''}`,
          `Last: ${form.Last_name?.value || ''}`,
          `Phone: ${form.Phone?.value || ''}`,
          `Location: ${form.Location?.value || ''}`
        ].join(' | ')
      };
  
      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          status.textContent = 'Thanks! I’ll get back to you.';
          window.location.href = '/thanks.html';
          form.reset();
        } else {
          status.textContent = 'Please try again.';
        }
      } catch {
        status.textContent = 'Please try again.';
      }
    });
  })();
  