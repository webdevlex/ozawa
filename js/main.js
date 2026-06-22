/* Scroll-aware header */
const header = document.querySelector('.site-header');
function onScroll() {
  header.classList.toggle('scrolled', window.scrollY > 10);
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* Mobile nav toggle */
const toggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');
const navCta = document.querySelector('.nav-cta');

if (toggle && navLinks) {
  toggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open);
    if (navCta) navCta.classList.toggle('open', open);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-inner')) {
      navLinks.classList.remove('open');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', false);
      if (navCta) navCta.classList.remove('open');
    }
  });
}

/* Contact form — fetch submit */
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = contactForm.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Sending…';
    btn.disabled = true;

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: new FormData(contactForm)
      });
      const data = await res.json();
      if (data.success) {
        contactForm.style.display = 'none';
        document.querySelector('.form-success').style.display = 'block';
      } else {
        throw new Error(data.message);
      }
    } catch {
      btn.textContent = originalText;
      btn.disabled = false;
      document.querySelector('.form-error').style.display = 'block';
    }
  });
}

/* Mark active nav link */
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a').forEach(a => {
  const href = a.getAttribute('href').split('/').pop();
  if (href === currentPage) a.classList.add('active');
});
