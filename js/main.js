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

/* Gallery lightbox */
const galleryItems = Array.from(document.querySelectorAll('.gallery-item'));
if (galleryItems.length) {
  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', 'Image viewer');
  lightbox.innerHTML =
    '<button class="lightbox-prev" aria-label="Previous image">&lsaquo;</button>' +
    '<img alt="">' +
    '<button class="lightbox-next" aria-label="Next image">&rsaquo;</button>' +
    '<button class="lightbox-close" aria-label="Close">&times;</button>';
  document.body.appendChild(lightbox);

  const lightboxImg = lightbox.querySelector('img');
  let currentIndex = 0;
  let lastFocused = null;

  function show(i) {
    currentIndex = (i + galleryItems.length) % galleryItems.length;
    const item = galleryItems[currentIndex];
    lightboxImg.src = item.dataset.full;
    lightboxImg.alt = item.querySelector('img').alt;
  }

  function open(i) {
    lastFocused = document.activeElement;
    show(i);
    lightbox.classList.add('open');
    document.body.classList.add('lightbox-open');
    lightbox.querySelector('.lightbox-close').focus();
  }

  function close() {
    lightbox.classList.remove('open');
    document.body.classList.remove('lightbox-open');
    lightboxImg.removeAttribute('src');
    if (lastFocused) lastFocused.focus();
  }

  galleryItems.forEach((item, i) => item.addEventListener('click', () => open(i)));
  lightbox.querySelector('.lightbox-close').addEventListener('click', close);
  lightbox.querySelector('.lightbox-prev').addEventListener('click', () => show(currentIndex - 1));
  lightbox.querySelector('.lightbox-next').addEventListener('click', () => show(currentIndex + 1));
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) close();
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(currentIndex - 1);
    else if (e.key === 'ArrowRight') show(currentIndex + 1);
  });
}
