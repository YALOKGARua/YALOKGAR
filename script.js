/* Current year and small UX enhancements */
(() => {
  const yearEl = document.getElementById("year");

  // Set current year in footer
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  // Improve anchor navigation A11y: focus section after scroll
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", () => {
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

  // Reveal-on-scroll for elements with .reveal
  const revealEls = Array.from(document.querySelectorAll(".reveal"));
  if (revealEls.length) {
    const rObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-inview");
            rObserver.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.15 }
    );
    revealEls.forEach((el, i) => {
      if (!el.style.getPropertyValue("--reveal-delay")) {
        el.style.setProperty("--reveal-delay", `${Math.min(i * 80, 400)}ms`);
      }
      rObserver.observe(el);
    });
  }

})();
