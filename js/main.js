/* ============================================================
   Hoffmann's Partyservice — main.js
   1. Hamburger nav
   2. Sticky header shadow
   3. Gallery lightbox
   4. Formspree contact form
   5. Scroll reveal
   ============================================================ */

(function () {
  'use strict';

  /* ── 1. Hamburger nav ─────────────────────────────────────── */
  const header = document.querySelector('.site-header');
  const hamburger = document.querySelector('.hamburger');

  if (hamburger && header) {
    hamburger.addEventListener('click', () => {
      header.classList.toggle('nav-open');
      const expanded = header.classList.contains('nav-open');
      hamburger.setAttribute('aria-expanded', expanded);
    });

    // Close menu when a mobile nav link is clicked
    document.querySelectorAll('.mobile-nav a').forEach(link => {
      link.addEventListener('click', () => header.classList.remove('nav-open'));
    });
  }

  /* ── 2. Hero slideshow ────────────────────────────────────── */
  const heroSlides = document.querySelectorAll('.hero-slide');
  if (heroSlides.length > 1) {
    let current = 0;
    setInterval(() => {
      heroSlides[current].classList.remove('active');
      current = (current + 1) % heroSlides.length;
      heroSlides[current].classList.add('active');
    }, 5000);
  }

  /* ── 3. Sticky header shadow ──────────────────────────────── */
  if (header) {
    const onScroll = () => {
      header.classList.toggle('scrolled', window.scrollY > 80);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── 3. Gallery lightbox ──────────────────────────────────── */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');

  if (lightbox && lightboxImg) {
    document.querySelectorAll('.gallery-item img').forEach(img => {
      img.parentElement.addEventListener('click', () => {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        lightbox.classList.add('open');
        document.body.style.overflow = 'hidden';
      });
    });

    const closeLightbox = () => {
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
    };

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', e => {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeLightbox();
    });
  }

  /* ── 3b. Event category modal ─────────────────────────────── */
  const eventModal       = document.getElementById('event-modal');
  const eventModalTitle  = document.getElementById('event-modal-title');
  const eventModalImg    = document.getElementById('event-modal-img');
  const eventModalCount  = document.getElementById('event-modal-counter');
  const eventModalClose  = eventModal && eventModal.querySelector('.event-modal-close');
  const eventModalPrev   = eventModal && eventModal.querySelector('.event-modal-prev');
  const eventModalNext   = eventModal && eventModal.querySelector('.event-modal-next');

  if (eventModal) {
    let currentPhotos = [];
    let currentIndex  = 0;

    const showEventPhoto = idx => {
      currentIndex = (idx + currentPhotos.length) % currentPhotos.length;
      eventModalImg.src = currentPhotos[currentIndex];
      eventModalImg.alt = eventModalTitle.textContent;
      const nav = eventModal.querySelector('.event-modal-nav');
      if (currentPhotos.length <= 1) {
        nav.style.display = 'none';
        eventModalCount.textContent = '';
      } else {
        nav.style.display = '';
        eventModalCount.textContent = (currentIndex + 1) + ' / ' + currentPhotos.length;
      }
    };

    const openEventModal = (category, photosStr) => {
      currentPhotos = photosStr.split(',').map(s => s.trim()).filter(Boolean);
      eventModalTitle.textContent = category;
      showEventPhoto(0);
      eventModal.classList.add('open');
      document.body.style.overflow = 'hidden';
    };

    const closeEventModal = () => {
      eventModal.classList.remove('open');
      document.body.style.overflow = '';
    };

    document.querySelectorAll('.event-card[data-category]').forEach(card => {
      card.addEventListener('click', () => {
        openEventModal(card.dataset.category, card.dataset.photos || '');
      });
    });

    if (eventModalClose) eventModalClose.addEventListener('click', closeEventModal);
    if (eventModalPrev)  eventModalPrev.addEventListener('click',  () => showEventPhoto(currentIndex - 1));
    if (eventModalNext)  eventModalNext.addEventListener('click',  () => showEventPhoto(currentIndex + 1));

    eventModal.addEventListener('click', e => {
      if (e.target === eventModal) closeEventModal();
    });

    document.addEventListener('keydown', e => {
      if (!eventModal.classList.contains('open')) return;
      if (e.key === 'Escape')      closeEventModal();
      if (e.key === 'ArrowLeft')   showEventPhoto(currentIndex - 1);
      if (e.key === 'ArrowRight')  showEventPhoto(currentIndex + 1);
    });
  }

  /* ── 4. Formspree contact form ────────────────────────────── */
  const form = document.getElementById('contact-form');
  const formStatus = document.getElementById('form-status');

  if (form && formStatus) {
    form.addEventListener('submit', async e => {
      e.preventDefault();

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Wird gesendet…';
      formStatus.style.display = 'none';
      formStatus.className = 'form-status';

      try {
        const response = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' },
        });

        if (response.ok) {
          formStatus.textContent = 'Vielen Dank! Ihre Anfrage wurde erfolgreich gesendet. Wir melden uns in Kürze.';
          formStatus.classList.add('success');
          form.reset();
        } else {
          throw new Error('Server error');
        }
      } catch {
        formStatus.textContent = 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut oder schreiben Sie uns direkt an info@hoffmanns-partyservice.de.';
        formStatus.classList.add('error');
      } finally {
        formStatus.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }

  /* ── 5. Menu side navigation ─────────────────────────────── */
  const sidenavLinks = document.querySelectorAll('.sidenav-link');
  if (sidenavLinks.length) {
    const sections = Array.from(sidenavLinks).map(link => {
      const id = link.getAttribute('href').slice(1);
      return document.getElementById(id);
    }).filter(Boolean);

    const highlightNav = () => {
      let current = sections[0] && sections[0].id;
      sections.forEach(sec => {
        if (window.scrollY + 130 >= sec.offsetTop) current = sec.id;
      });
      sidenavLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === '#' + current);
      });
    };

    window.addEventListener('scroll', highlightNav, { passive: true });
    highlightNav();

    const sidenavToggle = document.getElementById('sidenav-toggle');
    const sidenav = document.getElementById('menu-sidenav');
    if (sidenavToggle && sidenav) {
      sidenavToggle.addEventListener('click', () => sidenav.classList.toggle('open'));
      sidenavLinks.forEach(link => {
        link.addEventListener('click', () => sidenav.classList.remove('open'));
      });
    }
  }

  /* ── 7. Photo carousels ───────────────────────────────────── */
  document.querySelectorAll('.section-photos').forEach(strip => {
    const carousel = document.createElement('div');
    carousel.className = 'photo-carousel';
    strip.parentNode.insertBefore(carousel, strip);
    carousel.appendChild(strip);

    const prev = document.createElement('button');
    prev.className = 'carousel-btn carousel-prev';
    prev.setAttribute('aria-label', 'Vorheriges Foto');
    prev.innerHTML = '&#8249;';

    const next = document.createElement('button');
    next.className = 'carousel-btn carousel-next';
    next.setAttribute('aria-label', 'Nächstes Foto');
    next.innerHTML = '&#8250;';

    carousel.insertBefore(prev, strip);
    carousel.appendChild(next);

    prev.addEventListener('click', () => {
      const photoW = strip.querySelector('.section-photo')?.offsetWidth + 4 || 200;
      if (strip.scrollLeft <= 2) {
        strip.scrollTo({ left: strip.scrollWidth, behavior: 'smooth' });
      } else {
        strip.scrollBy({ left: -photoW, behavior: 'smooth' });
      }
    });
    next.addEventListener('click', () => {
      const photoW = strip.querySelector('.section-photo')?.offsetWidth + 4 || 200;
      if (strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 2) {
        strip.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        strip.scrollBy({ left: photoW, behavior: 'smooth' });
      }
    });
  });

  /* ── 8. Gallery marquee navigation ───────────────────────────── */
  document.querySelectorAll('.gallery-row').forEach(row => {
    const track = row.querySelector('.gallery-track');
    if (!track) return;

    // Create navigation buttons
    const prev = document.createElement('button');
    prev.className = 'gallery-nav-btn gallery-nav-prev';
    prev.setAttribute('aria-label', 'Vorherige Fotos');
    prev.innerHTML = '&#8249;';

    const next = document.createElement('button');
    next.className = 'gallery-nav-btn gallery-nav-next';
    next.setAttribute('aria-label', 'Nächste Fotos');
    next.innerHTML = '&#8250;';

    row.appendChild(prev);
    row.appendChild(next);

    // Get animation direction
    const isLeftScrolling = row.classList.contains('gallery-row--left');
    const itemWidth = 260; // CSS width + gap
    const scrollAmount = itemWidth * 2; // Scroll 2 images at a time

    const scrollGallery = (direction) => {
      const anim = track.getAnimations()[0];
      if (!anim) return;

      anim.pause();

      const duration = anim.effect.getTiming().duration;
      const halfWidth = track.scrollWidth / 2;
      const deltaTime = (scrollAmount / halfWidth) * duration;

      let newTime = (anim.currentTime || 0) + direction * deltaTime;
      newTime = ((newTime % duration) + duration) % duration;
      anim.currentTime = newTime;

      setTimeout(() => anim.play(), 2500);
    };

    prev.addEventListener('click', (e) => {
      e.preventDefault();
      scrollGallery(isLeftScrolling ? 1 : -1);
    });

    next.addEventListener('click', (e) => {
      e.preventDefault();
      scrollGallery(isLeftScrolling ? -1 : 1);
    });

    row.addEventListener('mouseenter', () => {
      const anim = track.getAnimations()[0];
      if (anim) anim.pause();
    });
    row.addEventListener('mouseleave', () => {
      const anim = track.getAnimations()[0];
      if (anim) anim.play();
    });
  });

  /* ── 6. Scroll reveal ─────────────────────────────────────── */
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  } else {
    // Fallback: show all at once
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  }
})();
