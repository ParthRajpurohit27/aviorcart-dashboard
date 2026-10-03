"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initRouter = initRouter;
function initRouter() {
    const showPage = (hash) => {
        const page = hash.replace(/^#/, "");
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
        const navLinks = document.querySelectorAll('.top-nav .nav-link');
        navLinks.forEach((link) => {
            const href = link.getAttribute('href')?.replace(/^#/, "");
            if (href) {
                if (href === page) {
                    link.classList.add('active');
                }
                else {
                    link.classList.remove('active');
                }
            }
        });
    };
    showPage(location.hash || "#dashboard");
    window.addEventListener('hashchange', () => showPage(location.hash));
}
