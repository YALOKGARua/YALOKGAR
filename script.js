/* Clean, lightweight animations and UX helpers only */
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

      // Flash highlight target container briefly
      try {
        const flashEl = target.querySelector(":scope > .container") || target;
        flashEl.classList.add("anchor-flash");
        setTimeout(() => flashEl.classList.remove("anchor-flash"), 1200);
      } catch (_) {}

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
      { rootMargin: "-45% 0px -50% 0px", threshold: 0.6 }
    );
    sections.forEach((sec) => observer.observe(sec));
  }

  // Reveal-on-scroll fallback for elements with .reveal (when AOS is not available)
  (function revealFallback() {
    const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.documentElement;
    const revealEls = Array.from(document.querySelectorAll(".reveal"));

    // If reduced motion or low performance, ensure everything is visible immediately (accessibility/perf)
    if (prefersReduced || root.dataset.lowperf === "1") {
      revealEls.forEach((el) => el.classList.add("is-inview"));
      return;
    }

    if (!window.AOS) {
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
    }
  })();

  // Force/remember low performance mode via query/localStorage + heuristic
  function applyForcedLowPerf() {
    const root = document.documentElement;
    try {
      const params = new URLSearchParams(location.search);
      const storeKey = "lowperf";
      if (params.get("lowperf") === "1" || params.get("perf") === "low") {
        root.dataset.lowperf = "1";
        try { localStorage.setItem(storeKey, "1"); } catch(_) {}
      } else if (params.get("lowperf") === "0" || params.get("perf") === "high") {
        delete root.dataset.lowperf;
        try { localStorage.removeItem(storeKey); } catch(_) {}
      } else {
        try { if (localStorage.getItem(storeKey) === "1") root.dataset.lowperf = "1"; } catch(_) {}
      }
      // Heuristic if not forced
      if (!root.dataset.lowperf) {
        const hc = navigator.hardwareConcurrency || 0;
        const dm = navigator.deviceMemory || 0;
        const isMobile = Math.max(screen.width, screen.height) <= 900;
        if ((hc && hc <= 4) || (dm && dm <= 4 && isMobile)) {
          root.dataset.lowperf = "1";
        }
      }
    } catch(_) {}
  }

  // Low performance detector: sets data-lowperf="1" on <html> if FPS is low
  function detectLowPerf(callback) {
    const root = document.documentElement;
    let frames = 0;
    const maxFrames = 24;
    let start = performance.now();
    let last = start;
    let worst = 0;

    function tick(now) {
      const dt = now - last;
      last = now;
      worst = Math.max(worst, dt);
      frames++;
      if (frames < maxFrames) {
        requestAnimationFrame(tick);
      } else {
        const total = now - start;
        const fps = (frames / total) * 1000;
        const low = fps < 50 || worst > 32;
        if (low) root.dataset.lowperf = "1";
        if (typeof callback === "function") callback(low);
      }
    }
    requestAnimationFrame(tick);
  }

  // Code rain and typewriter enhancements
  function initTypewriterVars() {
    const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelectorAll(".typing").forEach((el) => {
      const len = (el.textContent || "").length;
      if (!el.style.getPropertyValue("--type-steps")) el.style.setProperty("--type-steps", String(len || 24));
      if (!el.style.getPropertyValue("--type-ch")) el.style.setProperty("--type-ch", (len || 24) + "ch");
      if (prefersReduced) el.style.removeProperty("animation");
    });
  }

  // Rotate typed code lines in hero
  function initTypingRotation() {
    const el = document.querySelector(".code-line .typing");
    if (!el) return;
    const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lines = [
      "int main() { return 0; }",
      "std::vector<int> v; v.reserve(1024);",
      "auto sum = std::accumulate(v.begin(), v.end(), 0);",
      "std::unique_ptr<QObject> obj = std::make_unique<QObject>();",
      "for (auto& x : v) x += 1;"
    ];
    let i = 0;

    const apply = (s) => {
      try {
        el.textContent = s;
        const len = (s || "").length;
        el.style.setProperty("--type-steps", String(len || 24));
        el.style.setProperty("--type-ch", (len || 24) + "ch");
        el.style.animation = "none";
        void el.offsetWidth; // reflow to restart animation
        el.style.animation = "";
      } catch (_) {}
    };

    apply(lines[i]);
    if (prefersReduced) return;

    let timer = 0;
    const start = () => {
      stop();
      timer = window.setInterval(() => {
        i = (i + 1) % lines.length;
        apply(lines[i]);
      }, 5200);
    };
    const stop = () => { if (timer) { clearInterval(timer); timer = 0; } };

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop(); else start();
    });
    start();
  }

  // Mouse reactive 3D tilt and highlight for cards
  function initCardTilt() {
    const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (prefersReduced || !finePointer || document.documentElement.dataset.lowperf === "1") return;

    const cards = document.querySelectorAll(".card");
    cards.forEach((card) => {
      let rect = null;
      let raf = 0;

      const update = (x, y) => {
        const rx = (0.5 - y) * 8;   // tilt X: up/down
        const ry = (x - 0.5) * 8;   // tilt Y: left/right
        card.style.setProperty("--rx", rx.toFixed(2) + "deg");
        card.style.setProperty("--ry", ry.toFixed(2) + "deg");
        card.style.setProperty("--mx", Math.round(x * 100) + "%");
        card.style.setProperty("--my", Math.round(y * 100) + "%");
      };

      const onEnter = () => {
        rect = card.getBoundingClientRect();
        card.style.setProperty("--hov", "1");
      };

      const onMove = (e) => {
        if (!rect) rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        if (!raf) {
          raf = requestAnimationFrame(() => {
            update(x, y);
            raf = 0;
          });
        }
      };

      const onLeave = () => {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
        card.style.setProperty("--hov", "0");
        rect = null;
      };

      card.addEventListener("pointerenter", onEnter);
      card.addEventListener("pointermove", onMove);
      card.addEventListener("pointerleave", onLeave);
    });
  }

  // Scroll progress bar
  function initScrollProgressBar() {
    const bar = document.querySelector(".scroll-progress");
    if (!bar) return;
    if (document.documentElement.dataset.lowperf === "1") { try { bar.style.display = "none"; } catch(_) {} return; }

    let raf = 0;
    const set = () => {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const val = Math.min(1, Math.max(0, window.scrollY / max));
      bar.style.setProperty("--scroll", String(val));
      raf = 0;
    };

    const onScroll = () => { if (!raf) raf = requestAnimationFrame(set); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", set, { passive: true });
    set();
  }

  // Add anchor links to section headings
  function initH2Anchors() {
    document.querySelectorAll("section[id]").forEach((sec) => {
      const h2 = sec.querySelector(":scope > .container h2, :scope > h2");
      if (!h2) return;
      if (h2.querySelector("a.anchor")) return;
      const id = sec.id;
      const a = document.createElement("a");
      a.className = "anchor";
      a.href = "#" + id;
      a.setAttribute("aria-label", "Ссылка на раздел");
      a.innerHTML = '<i class="ri-link-m" aria-hidden="true"></i>';
      h2.appendChild(a);
    });
  }

  // Parallax for hero and boost code rain speed on hover
  function initHeroParallaxAndRainBoost() {
    const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || document.documentElement.dataset.lowperf === "1") return;

    const hero = document.getElementById("hero");
    if (!hero) return;
    const text = hero.querySelector(".hero-text");
    const media = hero.querySelector(".hero-media");
    let active = false;
    let raf = 0;

    const update = () => {
      if (!active) { raf = 0; return; }
      const rect = hero.getBoundingClientRect();
      const y = Math.max(-20, Math.min(20, -rect.top * 0.05));
      if (text) text.style.transform = `translateY(${y}px)`;
      if (media) media.style.transform = `translateY(${(-y * 0.6)}px)`;
      raf = requestAnimationFrame(update);
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        active = e.isIntersecting;
        if (active && !raf) raf = requestAnimationFrame(update);
        if (!active) {
          if (text) text.style.transform = "";
          if (media) media.style.transform = "";
        }
      });
    }, { rootMargin: "-10% 0px -10% 0px", threshold: 0 });
    io.observe(hero);

    // Speed boost for code rain on hover
    const canvas = document.getElementById("code-rain");
    if (canvas && canvas._rain) {
      const base = canvas._rain.opts.speed;
      hero.addEventListener("pointerenter", () => { canvas._rain.opts.speed = base * 1.6; });
      hero.addEventListener("pointerleave", () => { canvas._rain.opts.speed = base; });
    }
  }

  // Auto-hide sticky header when scrolling down, show when scrolling up/top
  function initAutoHideHeader() {
    const header = document.querySelector(".site-header");
    const nav = document.getElementById("site-nav");
    if (!header) return;

    let lastY = window.scrollY;
    let raf = 0;
    let down = 0, up = 0;

    const step = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;

      const nearTop = y < 10;
      const menuOpen = !!(nav && nav.classList.contains("open"));
      const headerFocused = header.contains(document.activeElement);

      if (nearTop || menuOpen || headerFocused) {
        header.classList.remove("is-hidden");
        down = up = 0;
        raf = 0;
        return;
      }

      if (delta > 0) { // scrolling down
        down += delta; up = 0;
        if (down > 24) header.classList.add("is-hidden");
      } else if (delta < 0) { // scrolling up
        up += -delta; down = 0;
        if (up > 16) header.classList.remove("is-hidden");
      }

      raf = 0;
    };

    const onScroll = () => { if (!raf) raf = requestAnimationFrame(step); };
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // Copy buttons in Contacts section
  function initContactCopyButtons() {
    const list = document.querySelectorAll("#contact .contacts li");
    if (!list.length) return;

    let live = document.getElementById("live-copy");
    if (!live) {
      live = document.createElement("div");
      live.id = "live-copy";
      live.setAttribute("aria-live", "polite");
      Object.assign(live.style, {
        position: "absolute", width: "1px", height: "1px", overflow: "hidden",
        clip: "rect(1px, 1px, 1px, 1px)", clipPath: "inset(50%)", whiteSpace: "nowrap"
      });
      document.body.appendChild(live);
    }

    const fallbackCopy = (text) => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (_) {}
      document.body.removeChild(ta);
    };

    list.forEach((li) => {
      const a = li.querySelector("a");
      if (!a) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy-btn";
      btn.setAttribute("title", "Скопировать");
      btn.setAttribute("aria-label", "Скопировать");
      btn.innerHTML = '<i class="ri-file-copy-line" aria-hidden="true"></i>';
      a.insertAdjacentElement("afterend", btn);

      const icon = btn.querySelector("i");

      const copy = async (value) => {
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(value);
          } else {
            fallbackCopy(value);
          }
          if (icon) icon.className = "ri-check-line";
          live.textContent = "Скопировано: " + value;
          setTimeout(() => { if (icon) icon.className = "ri-file-copy-line"; }, 1200);
        } catch (_) {}
      };

      btn.addEventListener("click", () => {
        let value = a.getAttribute("href") || a.textContent || "";
        value = value.trim();
        if (value.startsWith("mailto:")) value = value.replace(/^mailto:/i, "");
        copy(value);
      });
    });
  }

  // Theme toggle (system/dark/light)
  function initThemeToggle() {
    const btn = document.querySelector(".theme-toggle");
    if (!btn) return;
    const root = document.documentElement;
    const icon = btn.querySelector("i");

    const apply = (state) => {
      if (state === "dark") {
        root.setAttribute("data-theme", "dark");
        if (icon) icon.className = "ri-moon-line";
        btn.title = "Тема: тёмная";
        btn.setAttribute("aria-label", "Сменить тему (тёмная)");
      } else if (state === "light") {
        root.setAttribute("data-theme", "light");
        if (icon) icon.className = "ri-sun-line";
        btn.title = "Тема: светлая";
        btn.setAttribute("aria-label", "Сменить тему (светлая)");
      } else {
        root.removeAttribute("data-theme");
        if (icon) icon.className = "ri-computer-line";
        btn.title = "Тема: системная";
        btn.setAttribute("aria-label", "Сменить тему (системная)");
      }
    };

    const read = () => {
      const val = localStorage.getItem("theme");
      return val === "dark" || val === "light" ? val : "system";
    };

    const write = (state) => {
      if (state === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", state);
      apply(state);
    };

    const cycle = (state) => (state === "system" ? "dark" : state === "dark" ? "light" : "system");

    let state = read();
    apply(state);

    btn.addEventListener("click", () => {
      state = cycle(state);
      write(state);
    });

    try {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = () => { if (state === "system") apply("system"); };
      if (typeof mql.addEventListener === "function") mql.addEventListener("change", onChange);
      else if (typeof mql.addListener === "function") mql.addListener(onChange);
    } catch (_) {}
  }

  function initCodeRain() {
    const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    class CodeRain {
      constructor(canvas, options) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.opts = Object.assign({
          fontSize: 14,
          speed: 0.9,
          backgroundAlpha: 0.08
        }, options || {});
        let dpr = window.devicePixelRatio || 1;
        if (document.documentElement.dataset.lowperf === "1") dpr = 1;
        this.scale = Math.max(1, Math.min(2, dpr));
        this.chars = ("01{}[]()<>;=+-*/%#&|^~!?$" + " C++QtλΣ→←·•").split("");
        this.running = false;
        this.visible = true;
        this._tick = this._tick.bind(this);
        this._setupStyles();
        this._resize();
        this.low = document.documentElement.dataset.lowperf === "1";
        this._skip = 0;
      }
      _setupStyles() {
        const fs = this.opts.fontSize;
        const mono = getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim() || "monospace";
        this.ctx.font = `${fs}px ${mono}`;
        this.ctx.textBaseline = "top";
        const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#0ea5e9";
        const rgba = (hex, a = 1) => {
          let h = hex.replace("#","").trim();
          if (h.length === 3) h = h.split("").map(x=>x+x).join("");
          const n = parseInt(h, 16);
          const r = (n>>16)&255, g = (n>>8)&255, b = n&255;
          return `rgba(${r}, ${g}, ${b}, ${a})`;
        };
        this.fadeColor = rgba(accent, this.opts.backgroundAlpha);
        this.textColor = rgba(accent, this.low ? 0.7 : 0.82);
        this.shadowColor = rgba(accent, 0.4);
        this.shadowBlur = this.low ? 0 : 4;
        this.step = this.low ? 3 : 2;
      }
      _resize(sizeEl) {
        const rect = (sizeEl || this.canvas).getBoundingClientRect();
        const w = Math.max(1, Math.floor(rect.width));
        const h = Math.max(1, Math.floor(rect.height));
        this.canvas.width = Math.floor(w * this.scale);
        this.canvas.height = Math.floor(h * this.scale);
        this.canvas.style.width = w + "px";
        this.canvas.style.height = h + "px";
        this.ctx.setTransform(1,0,0,1,0,0);
        this.ctx.scale(this.scale, this.scale);
        const fs = this.opts.fontSize;
        this.columns = Math.max(1, Math.floor(w / fs));
        this.drops = Array.from({length: this.columns}, () => -Math.random() * 20);
      }
      start() {
        if (this.running) return;
        this.running = true;
        this.raf = requestAnimationFrame(this._tick);
      }
      stop() {
        this.running = false;
        if (this.raf) cancelAnimationFrame(this.raf);
        this.raf = 0;
      }
      _tick() {
        if (!this.running || !this.visible || document.hidden) {
          this.raf = requestAnimationFrame(this._tick);
          return;
        }
        if (this.low) {
          this._skip = !this._skip;
          if (this._skip) {
            this.raf = requestAnimationFrame(this._tick);
            return;
          }
        }
        const ctx = this.ctx;
        const { fontSize, speed } = this.opts;
        const w = this.canvas.width / this.scale;
        const h = this.canvas.height / this.scale;

        // Fade trail
        ctx.fillStyle = this.fadeColor;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = this.textColor;
        ctx.shadowColor = this.shadowColor;
        ctx.shadowBlur = this.shadowBlur;

        for (let i = 0; i < this.columns; i += this.step) {
          const ch = this.chars[(Math.random() * this.chars.length) | 0];
          const x = i * fontSize;
          const y = this.drops[i] * fontSize;
          ctx.fillText(ch, x, y);
          if (y > h && Math.random() > 0.975) this.drops[i] = -Math.random() * 20;
          else this.drops[i] += (Math.random() * 0.5 + speed);
        }
        this.raf = requestAnimationFrame(this._tick);
      }
      dispose() { this.stop(); }
    }

    const disposers = [];

    // Hero canvas sized to hero section
    const heroCanvas = document.getElementById("code-rain");
    if (heroCanvas) {
      const hero = document.getElementById("hero");
      const low = document.documentElement.dataset.lowperf === "1";
      let heroRain = null;

      const create = () => {
        if (heroRain) return;
        heroRain = new CodeRain(heroCanvas, { fontSize: low ? 16 : 14, speed: low ? 0.6 : 0.9, backgroundAlpha: low ? 0.05 : 0.06 });
        heroCanvas._rain = heroRain;

        const onResize = () => heroRain._resize(hero || heroCanvas);
        onResize();

        const io = new IntersectionObserver((entries) => {
          entries.forEach(e => {
            heroRain.visible = e.isIntersecting;
            if (e.isIntersecting) heroRain.start(); else heroRain.stop();
          });
        }, { rootMargin: "-10% 0px", threshold: 0 });

        if (hero) io.observe(hero);
        else heroRain.start();

        window.addEventListener("resize", onResize, { passive: true });
        disposers.push(() => { try { io.disconnect(); } catch(e){} window.removeEventListener("resize", onResize); heroRain.dispose(); });
      };

      if (hero) {
        hero.addEventListener("pointerenter", create, { once: true });
      } else {
        // No hero container? initialize lazily after load
        setTimeout(create, 0);
      }
    }

    // Fullscreen canvas on 404
    const fullCanvas = document.getElementById("code-rain-404");
    if (fullCanvas) {
      const low404 = document.documentElement.dataset.lowperf === "1";
      const rain404 = new CodeRain(fullCanvas, { fontSize: low404 ? 18 : 16, speed: low404 ? 0.7 : 1.0, backgroundAlpha: low404 ? 0.04 : 0.045 });
      const onResize404 = () => rain404._resize(); // canvas is fixed to viewport
      const io404 = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          rain404.visible = e.isIntersecting;
          if (e.isIntersecting) rain404.start(); else rain404.stop();
        });
      }, { threshold: 0 });
      onResize404();
      io404.observe(document.body);
      window.addEventListener("resize", onResize404, { passive: true });
      disposers.push(() => { try { io404.disconnect(); } catch(e){} window.removeEventListener("resize", onResize404); rain404.dispose(); });
    }

    const onVis = () => {
      // Stop RAFs when tab hidden; start when visible handled by observers
      // No-op here; the tick checks document.hidden
    };
    document.addEventListener("visibilitychange", onVis);

    return {
      dispose() {
        disposers.forEach(fn => { try { fn(); } catch(e){} });
        document.removeEventListener("visibilitychange", onVis);
      }
    };
  }

  // Boot
  let rain;
  const scheduleNonCritical = (fn) => {
    const rIC = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
    if (document.readyState === "complete") rIC(fn);
    else window.addEventListener("load", () => rIC(fn), { once: true });
  };

  const boot = () => {
    applyForcedLowPerf();

    // Essential, low-cost inits first
    try {
      initThemeToggle();
      initTypewriterVars();
      initH2Anchors();
      initContactCopyButtons();
    } catch(_) {}

    const low = document.documentElement.dataset.lowperf === "1";
    const hydrate = () => {
      scheduleNonCritical(() => {
        try {
          initTypingRotation();
          initScrollProgressBar();
          initAutoHideHeader();
          initCardTilt();
          initHeroParallaxAndRainBoost();
        } catch(_) {}
        if (!low) {
          try { rain = initCodeRain(); } catch(_) {}
        }
        scheduleNonCritical(initAOSAnimations);
      });
    };

    if (low) hydrate();
    else detectLowPerf(() => hydrate());
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();

  window.addEventListener("pagehide", () => { try { rain && rain.dispose(); } catch(_) {} });

  // Initialize AOS animations if available (lightweight settings)
  function initAOSAnimations() {
    if (!window.AOS) return;
    const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const setAOS = (el, type, delay, duration = 500, easing = "ease-out-cubic", offset = 32) => {
      if (!el) return;
      if (!el.hasAttribute("data-aos")) {
        el.setAttribute("data-aos", type);
        el.setAttribute("data-aos-delay", String(Math.min(delay, 500)));
        el.setAttribute("data-aos-offset", String(offset));
        el.setAttribute("data-aos-duration", String(duration));
        el.setAttribute("data-aos-easing", easing);
      }
      if (!el.classList.contains("reveal")) el.classList.add("reveal");
    };

    const cascade = (rootSelector, childSelector, types = ["fade-up"], step = 70, base = 0) => {
      document.querySelectorAll(rootSelector).forEach((root) => {
        const items = root.querySelectorAll(childSelector);
        items.forEach((el, i) => {
          const type = Array.isArray(types) ? types[i % types.length] : types;
          setAOS(el, type, base + i * step);
        });
      });
    };

    const decorateAnimations = () => {
      if (prefersReduced) return; // Skip heavy motion for users who prefer reduced motion

      // Sections: animate headings
      document.querySelectorAll("section h2").forEach((el, i) => setAOS(el, "fade-right", i * 50));

      // Containers: first level children (texts, lists, ctas)
      document.querySelectorAll("section .container").forEach((container) => {
        const kids = container.querySelectorAll(":scope > p, :scope > ul, :scope > .cta, :scope > .contacts, :scope > .chips");
        kids.forEach((el, i) => setAOS(el, "fade-up", i * 70));
      });

      // Grids of projects/stat blocks
      cascade(".grid.projects", ".card", ["zoom-in", "fade-up"], 80);

      // Chips and contacts list
      cascade(".chips", ".chip", ["zoom-in"], 45);
      cascade(".contacts", "li", ["fade-up"], 60);

      // Buttons inside ctas/links
      cascade(".cta", ".btn", ["zoom-in"], 50);

      // Stats images and other images inside cards
      document.querySelectorAll(".card img, #stats img").forEach((el, i) => setAOS(el, "fade-up", i * 60));

      // Nav items light enter animation
      document.querySelectorAll("#site-nav a").forEach((el, i) => setAOS(el, "fade-down", i * 30, 400, "ease-out-cubic", 0));
    };

    decorateAnimations();

    AOS.init({
      once: true,
      offset: 48,
      duration: 500,
      easing: "ease-out-cubic",
      anchorPlacement: "top-bottom",
      startEvent: "load",
      disable: () => ((window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) || document.documentElement.dataset.lowperf === "1")
    });

    // Refresh after load to ensure proper positions
    window.addEventListener("load", () => {
      try { AOS.refresh(); } catch (_) {}
    });

    // Safety fallback: if after 900ms элементы .reveal остались невидимыми, показать их каскадом
    setTimeout(() => {
      const stillHidden = Array.from(document.querySelectorAll(".reveal"))
        .filter((el) => !el.classList.contains("is-inview"));
      stillHidden.forEach((el, i) => {
        if (!el.style.getPropertyValue("--reveal-delay")) {
          el.style.setProperty("--reveal-delay", `${Math.min(i * 60, 500)}ms`);
        }
        el.classList.add("is-inview");
      });
    }, 900);
  }

  // Scroll-to-top floating button visibility
  const toTopBtn = document.querySelector(".to-top");
  if (toTopBtn) {
    const show = () => toTopBtn.classList.add("is-visible");
    const hide = () => toTopBtn.classList.remove("is-visible");

    // Prefer IntersectionObserver watching the hero section (or header as fallback)
    const hero = document.getElementById("hero") || document.querySelector("header");
    if ("IntersectionObserver" in window && hero) {
      const topObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) hide();
            else show();
          });
        },
        { rootMargin: "-20% 0px 0px 0px", threshold: 0 }
      );
      topObserver.observe(hero);
    } else {
      // Fallback to scroll position
      const onScroll = () => {
        if (window.scrollY > 320) show();
        else hide();
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }
  }
})();
