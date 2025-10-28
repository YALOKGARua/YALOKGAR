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
})();
