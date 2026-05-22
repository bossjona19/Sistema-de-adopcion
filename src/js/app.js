// Shared utilities loaded by every admin page

export function initMobileMenu() {
  const toggle  = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (!toggle || !sidebar) return;

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay?.classList.toggle('show');
  });

  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  });
}

// Mark the current nav item as active based on current page
export function setActiveNav() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-item').forEach(item => {
    const href = item.getAttribute('href') ?? '';
    item.classList.toggle('active', path.endsWith(href.replace('/', '')));
  });
}

// Populate sidebar user info (call from each page after auth)
export function setSidebarUser(displayName, initials) {
  document.querySelectorAll('[id$="-avatar"]').forEach(el => { el.textContent = initials; });
  document.querySelectorAll('[id$="-username"]').forEach(el => { el.textContent = displayName; });
}
