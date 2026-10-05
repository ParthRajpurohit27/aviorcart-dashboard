/* bootstrap */

let _dashStarted = false;

document.addEventListener("DOMContentLoaded", function () {
  initSupabase();
  initStarBackground();
  wireLoginForm();
  wireDashboardControls();

  checkSession()
    .then(function (ok) {
      if (ok) showDashboard();
      else toggleScreen("login-screen", true);
    })
    .catch(function () {
      toggleScreen("login-screen", true);
    });
});

function showDashboard(): void {
  toggleScreen("login-screen", false);
  toggleScreen("dashboard-screen", true);
  const el = document.getElementById("welcome-user");
  if (el && currentUser) el.textContent = "👋 " + currentUser.email;
  if (_dashStarted) return;
  _dashStarted = true;
  initRouter();
  fetchOrders();
  subscribeRealtime();
}

function toggleScreen(id: string, show: boolean): void {
  const el = document.getElementById(id);
  if (el) el.style.display = show ? "flex" : "none";
}

function wireLoginForm(): void {
  const form = document.getElementById("login-form") as HTMLFormElement | null;
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const emailInput = document.getElementById("login-email") as HTMLInputElement;
    const passInput = document.getElementById("login-password") as HTMLInputElement;
    const errBox = document.getElementById("login-error") as HTMLElement;
    const btn = document.getElementById("login-submit") as HTMLButtonElement;

    btn.disabled = true;
    btn.textContent = "Signing in…";
    errBox.style.display = "none";

    loginAdmin(emailInput.value.trim(), passInput.value)
      .then(function (res) {
        btn.disabled = false;
        btn.textContent = "Sign In";
        if (!res.ok) {
          errBox.textContent = res.error || "Login failed";
          errBox.style.display = "block";
          return;
        }
        showDashboard();
      })
      .catch(function () {
        btn.disabled = false;
        btn.textContent = "Sign In";
        errBox.textContent = "Something went wrong. Try again.";
        errBox.style.display = "block";
      });
  });
}

function wireDashboardControls(): void {
  const refreshBtn = document.getElementById("refresh-btn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", function () {
      fetchOrders();
    });
  }

  const tabs = document.querySelectorAll(".filter-tab");
  for (let i = 0; i < tabs.length; i++) {
    const btn = tabs[i] as HTMLElement;
    btn.addEventListener("click", function () {
      const f = btn.dataset.filter as OrderFilter;
      setFilter(f);
    });
  }

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      logoutAdmin();
    });
  }

  const downloadBtns = document.querySelectorAll("[data-download]");
  for (let i = 0; i < downloadBtns.length; i++) {
    const btn = downloadBtns[i] as HTMLElement;
    btn.addEventListener("click", function () {
      const format = btn.dataset.download as DownloadFormat;
      downloadReport(activeFilter, format);
    });
  }
}

/* ── Client-side Router ── */

const _pageInitialized: Record<string, boolean> = {};

function initRouter(): void {
  const pages = ["dashboard", "products", "themes", "analytics", "settings", "invoice"];

  function showPage(hash: string): void {
    const page = hash.replace(/^#/, "") || "dashboard";

    // Show/hide sections
    pages.forEach(function (p) {
      const section = document.getElementById(p + "-page");
      if (section) {
        section.style.display = p === page ? "block" : "none";
      }
    });

    // Update nav link active class
    const navLinks = document.querySelectorAll(".top-nav .nav-link");
    navLinks.forEach(function (link) {
      const linkPage = (link as HTMLElement).getAttribute("data-page");
      if (linkPage === page) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });

    // Initialize page module on first visit
    if (!_pageInitialized[page]) {
      _pageInitialized[page] = true;
      switch (page) {
        case "products":
          if (typeof initProductsPage === "function") initProductsPage();
          break;
        case "analytics":
          if (typeof initAnalyticsPage === "function") initAnalyticsPage();
          break;
        case "themes":
          if (typeof initThemesPage === "function") initThemesPage();
          break;
        case "settings":
          if (typeof initSettingsPage === "function") initSettingsPage();
          break;
      }
    }
  }

  // Show initial page
  showPage(location.hash || "#dashboard");

  // Listen to hash changes
  window.addEventListener("hashchange", function () {
    showPage(location.hash);
  });
}

/* ── Declare page init functions (defined in pages/*.ts) ── */
declare function initProductsPage(): void;
declare function initAnalyticsPage(): void;
declare function initThemesPage(): void;
declare function initSettingsPage(): void;

/* ── Star Background Animation ── */

interface Star {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  a: number;
  va: number;
}

function initStarBackground(): void {
  const canvas = document.getElementById("bg-canvas") as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let W = 0;
  let H = 0;
  let stars: Star[] = [];

  function resize(): void {
    W = canvas!.width = window.innerWidth;
    H = canvas!.height = window.innerHeight;
  }

  function initStars(): void {
    const count = Math.floor((W * H) / 9000);
    stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.2 + 0.2,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        a: Math.random(),
        va: (Math.random() - 0.5) * 0.008,
      });
    }
  }

  resize();
  initStars();
  window.addEventListener("resize", function () {
    resize();
    initStars();
  });

  function draw(): void {
    ctx!.clearRect(0, 0, W, H);

    stars.forEach(function (s) {
      s.x += s.vx;
      s.y += s.vy;
      s.a += s.va;
      if (s.a > 1 || s.a < 0) s.va *= -1;
      if (s.x < 0) s.x = W;
      if (s.x > W) s.x = 0;
      if (s.y < 0) s.y = H;
      if (s.y > H) s.y = 0;

      ctx!.beginPath();
      ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx!.fillStyle = "rgba(251,191,36," + (s.a * 0.5).toFixed(2) + ")";
      ctx!.fill();
    });

    for (let i = 0; i < stars.length; i++) {
      for (let j = i + 1; j < stars.length; j++) {
        const d = Math.hypot(stars[i].x - stars[j].x, stars[i].y - stars[j].y);
        if (d < 100) {
          ctx!.beginPath();
          ctx!.moveTo(stars[i].x, stars[i].y);
          ctx!.lineTo(stars[j].x, stars[j].y);
          ctx!.strokeStyle = "rgba(251,191,36," + ((1 - d / 100) * 0.06).toFixed(3) + ")";
          ctx!.lineWidth = 0.5;
          ctx!.stroke();
        }
      }
    }

    requestAnimationFrame(draw);
  }

  draw();
}
