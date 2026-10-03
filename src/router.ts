// Simple client‑side router for the dashboard
// Shows the section matching the current hash and highlights the nav link.

export function initRouter() {
  // Helper to show the correct page based on location.hash
  const showPage = (hash: string) => {
    // Remove leading '#'
    const page = hash.replace(/^#/, "");
    // List of all page ids we have
    const pages = [
      "dashboard",
      "products",
      "themes",
      "analytics",
      "settings",
      "invoice",
    ];
    pages.forEach((p) => {
      const section = document.getElementById(`${p}-page`);
      if (section) {
        section.style.display = p === page ? "block" : "none";
      }
    });
    // Update nav link active class
    const navLinks = document.querySelectorAll('.top-nav .nav-link');
    navLinks.forEach((link) => {
      const href = (link as HTMLAnchorElement).getAttribute('href')?.replace(/^#/, "");
      if (href) {
        if (href === page) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      }
    });
  };

  // Initial load
  showPage(location.hash || "#dashboard");

  // Listen to hash changes (clicks on nav links will change hash)
  window.addEventListener('hashchange', () => showPage(location.hash));
}
