/* Theme toggle, current year, and small UX enhancements */
(() => {
  const storageKey = "theme";
  const doc = document.documentElement;
  const btn = document.querySelector(".theme-toggle");
  const yearEl = document.getElementById("year");
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  const hasManual = () => localStorage.getItem(storageKey) !== null;
  const getManual = () => localStorage.getItem(storageKey);

  function currentTheme() {
    if (hasManual()) return getManual();
    return media.matches ? "dark" : "light";
  }

  function applyTheme(mode) {
    if (mode === "dark") {
      doc.setAttribute("data-theme", "dark");
    } else {
      doc.removeAttribute("data-theme");
    }
    updateButton(mode);
  }

  function updateButton(mode) {
    if (!btn) return;
    const isDark = mode === "dark";
    btn.setAttribute("aria-pressed", String(isDark));
    btn.title = isDark ? "Светлая тема" : "Тёмная тема";
    btn.textContent = isDark ? "☀️" : "🌓";
  }

  // Set current year in footer
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  // Initialize theme and button
  if (hasManual()) {
    applyTheme(getManual());
  } else {
    // Respect system preference by default
    updateButton(currentTheme());
  }

  // React to OS theme changes if user didn't choose manually
  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", () => {
      if (!hasManual()) {
        applyTheme(currentTheme());
      }
    });
  } else if (typeof media.addListener === "function") {
    // Safari < 14
    media.addListener(() => {
      if (!hasManual()) {
        applyTheme(currentTheme());
      }
    });
  }

  // Handle button click
  if (btn) {
    btn.addEventListener("click", () => {
      const next = currentTheme() === "dark" ? "light" : "dark";
      localStorage.setItem(storageKey, next);
      applyTheme(next);
    });
  }

  // Improve anchor navigation A11y: focus section after scroll
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;

      // Let native smooth scroll work (CSS), then focus section
      setTimeout(() => {
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
        target.addEventListener(
          "blur",
          () => target.removeAttribute("tabindex"),
          { once: true }
        );
      }, 300);
    });
  });

  // Mobile menu toggle
  const menuBtn = document.querySelector(".menu-toggle");
  const nav = document.getElementById("site-nav");
  if (menuBtn && nav) {
    const close = () => {
      nav.classList.remove("open");
      menuBtn.setAttribute("aria-expanded", "false");
    };
    const open = () => {
      nav.classList.add("open");
      menuBtn.setAttribute("aria-expanded", "true");
    };
    menuBtn.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", String(isOpen));
    });
    // Close menu after clicking any nav link
    nav.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", () => close());
    });
    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
    // Close if viewport gets wider than mobile
    const mql = window.matchMedia("(min-width: 981px)");
    const onChange = () => {
      if (mql.matches) close();
    };
    if (typeof mql.addEventListener === "function") mql.addEventListener("change", onChange);
    else if (typeof mql.addListener === "function") mql.addListener(onChange);
  }

  // Active nav link highlight based on section in view
  const sections = Array.from(document.querySelectorAll("section[id]"));
  const navLinks = new Map();
  document.querySelectorAll('#site-nav a[href^="#"]').forEach((a) => {
    const id = a.getAttribute("href");
    if (id && id.startsWith("#")) navLinks.set(id, a);
  });
  if (sections.length && navLinks.size) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = "#" + entry.target.id;
          const link = navLinks.get(id);
          if (!link) return;
          if (entry.isIntersecting) {
            document
              .querySelectorAll("#site-nav a.active")
              .forEach((el) => {
                el.classList.remove("active");
                el.removeAttribute("aria-current");
              });
            link.classList.add("active");
            link.setAttribute("aria-current", "true");
          }
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    sections.forEach((sec) => observer.observe(sec));
  }
})();
