const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('#site-nav');
const navLinks = siteNav ? [...siteNav.querySelectorAll('a[href^="#"]')] : [];
const selectableSections = navLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

function selectSection(sectionId) {
  navLinks.forEach((link) => {
    const isSelected = link.getAttribute('href') === `#${sectionId}`;
    link.toggleAttribute('aria-current', isSelected);
  });

  selectableSections.forEach((section) => {
    const isSelected = section.id === sectionId;
    section.classList.remove('is-selected');
    if (isSelected) requestAnimationFrame(() => section.classList.add('is-selected'));
  });
}

if (menuToggle && siteNav) {
  menuToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  siteNav.addEventListener('click', (event) => {
    if (event.target.matches('a')) {
      const targetId = event.target.getAttribute('href').slice(1);
      if (selectableSections.some((section) => section.id === targetId)) selectSection(targetId);
      siteNav.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  });
}

if (window.location.hash && selectableSections.some((section) => section.id === window.location.hash.slice(1))) {
  selectSection(window.location.hash.slice(1));
}
