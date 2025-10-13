// Accessible hamburger toggler
const menuBtn = document.querySelector('.menu-toggle');
const nav = document.getElementById('primary-nav');

if (menuBtn && nav) {
  menuBtn.addEventListener('click', () => {
    const expanded = menuBtn.getAttribute('aria-expanded') === 'true';
    menuBtn.setAttribute('aria-expanded', String(!expanded));
    document.body.classList.toggle('nav-open', !expanded);
  });

  // Close menu after clicking a link
  nav.addEventListener('click', e => {
    if (e.target.closest('a')) {
      menuBtn.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('nav-open');
    }
  });

  // ESC closes menu
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      menuBtn.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('nav-open');
      menuBtn.focus();
    }
  });
}
