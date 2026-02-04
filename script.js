(() => {
  const root = document.documentElement;
  if (root.classList.contains("no-js")) root.classList.remove("no-js");
  root.classList.add("js");
  if (root.dataset.js !== "ready") root.dataset.js = "pending";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  const PERF = (() => {
    const mem = typeof navigator.deviceMemory === "number" ? navigator.deviceMemory : 4;
    const cores = typeof navigator.hardwareConcurrency === "number" ? navigator.hardwareConcurrency : 4;
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    const mega = (Math.max(1, window.innerWidth) * Math.max(1, window.innerHeight) * dpr * dpr) / 1e6;

    const conn = typeof navigator.connection === "object" && navigator.connection ? navigator.connection : null;
    const saveData = !!(conn && conn.saveData);
    const effectiveType = conn && typeof conn.effectiveType === "string" ? conn.effectiveType : "";
    const netLow = saveData || effectiveType === "2g" || effectiveType === "slow-2g";

    const hintedLow = prefersReducedMotion || isMobile || isTouch || mem <= 4 || cores <= 4 || mega >= 3.5 || netLow;

    const url = new URL(window.location.href);
    const forced = url.searchParams.get("perf");
    const tier = forced === "low" || forced === "hi" ? forced : hintedLow ? "low" : "hi";

    return tier === "low"
      ? {
          tier,
          matrixFps: 6,
          particlesFps: 8,
          canvasScale: 0.25,
          particleCount: 6,
          linkDist: 80,
          linkEvery: 8,
          shadowEnabled: false,
          matrixEnabled: false
        }
      : {
          tier,
          matrixFps: 8,
          particlesFps: 12,
          canvasScale: 0.35,
          particleCount: 10,
          linkDist: 90,
          linkEvery: 5,
          shadowEnabled: false,
          matrixEnabled: true
        };
  })();

  root.dataset.perf = PERF.tier;

  const clampInt = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  const ACTIVITY = (() => {
    let lastScroll = 0;
    const mark = () => {
      lastScroll = performance.now();
    };
    const opts = { passive: true };
    window.addEventListener("scroll", mark, opts);
    window.addEventListener("wheel", mark, opts);
    window.addEventListener("touchmove", mark, opts);
    return {
      mark,
      isScrolling: (t) => t - lastScroll < 140
    };
  })();

  const POINTER = (() => {
    const s = { x: 0, y: 0, inside: false, last: 0 };
    const update = (e) => {
      s.x = e.clientX;
      s.y = e.clientY;
      s.inside = true;
      s.last = performance.now();
    };
    const leave = () => {
      s.inside = false;
      s.last = performance.now();
    };
    const opts = { passive: true };
    if ("PointerEvent" in window) {
      window.addEventListener("pointermove", update, opts);
      window.addEventListener("pointerdown", update, opts);
      window.addEventListener("pointerenter", update, opts);
      window.addEventListener("pointerleave", leave, opts);
    } else {
      window.addEventListener("mousemove", update, opts);
      window.addEventListener("mousedown", update, opts);
      window.addEventListener("mouseleave", leave, opts);
    }
    window.addEventListener("blur", leave, opts);
    return s;
  })();

  const RESIZE = (() => {
    const fns = new Set();
    let raf = 0;

    const flush = () => {
      raf = 0;
      fns.forEach((fn) => {
        try { fn(); } catch (_) {}
      });
    };

    const on = () => {
      if (raf) return;
      raf = requestAnimationFrame(flush);
    };

    window.addEventListener("resize", on, { passive: true });

    return {
      add: (fn) => fns.add(fn),
      delete: (fn) => fns.delete(fn)
    };
  })();

  const createTask = (run, { fps = 60, when = () => true } = {}) => {
    let last = 0;
    let interval = 1000 / Math.max(1, fps);

    const setFps = (nextFps) => {
      interval = 1000 / Math.max(1, nextFps);
    };

    const step = (t) => {
      if (!when(t)) return;
      if (t - last < interval) return;
      last = t;
      run(t);
    };

    return { step, setFps };
  };

  const TICKER = (() => {
    const tasks = new Map();
    let rafId = 0;
    let running = false;

    const frame = (t) => {
      rafId = requestAnimationFrame(frame);
      if (document.hidden) return;
      tasks.forEach((task) => task.step(t));
    };

    const start = () => {
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(frame);
    };

    const stop = () => {
      if (!running) return;
      cancelAnimationFrame(rafId);
      rafId = 0;
      running = false;
    };

    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) stop();
        else start();
      },
      { passive: true }
    );

    start();

    return {
      add: (name, task) => tasks.set(name, task),
      delete: (name) => tasks.delete(name),
      has: (name) => tasks.has(name)
    };
  })();

  const fitCanvas = (canvas, scale) => {
    const w = Math.max(1, Math.floor(window.innerWidth * scale));
    const h = Math.max(1, Math.floor(window.innerHeight * scale));
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
  };

  const enableMotionUI = () => {
    const animated = document.querySelectorAll("[data-animate]");
    if (!animated.length) {
      root.dataset.js = "ready";
      return;
    }

    if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
      animated.forEach((el) => el.classList.add("is-visible"));
      root.dataset.js = "ready";
      return;
    }

    const vh = window.innerHeight || 0;
    const cutoff = vh * 0.9;
    animated.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < cutoff) el.classList.add("is-visible");
    });

    root.dataset.js = "ready";
  };
  
  const initMatrixRain = () => {
    if (prefersReducedMotion || isMobile || !PERF.matrixEnabled) return;
    
    const canvas = document.getElementById("matrix-bg");
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    
    const chars = "01<>{}[];=+-*/YALOKGAR10101010110010".split("");
    const fontSize = 16;
    const font = `${fontSize}px monospace`;
    
    let drops = [];
    let speeds = [];
    let columnCount = 0;

    const reset = () => {
      columnCount = Math.max(1, Math.floor(canvas.width / fontSize));
      drops = new Float32Array(columnCount);
      speeds = new Float32Array(columnCount);
      for (let i = 0; i < columnCount; i++) {
        drops[i] = Math.random() * (canvas.height / fontSize);
        speeds[i] = 0.3 + Math.random() * 0.5;
      }
    };

    const resize = () => {
      fitCanvas(canvas, PERF.canvasScale);
      ctx.font = font;
      ctx.textBaseline = "top";
      reset();
    };

    resize();
    RESIZE.add(resize);
    
    const colors = [
      "rgba(57,255,20,0.2)",
      "rgba(57,255,20,0.35)",
      "rgba(0,255,255,0.3)",
      "rgba(57,255,20,0.6)",
      "rgba(255,0,255,0.25)",
      "rgba(0,255,255,0.5)"
    ];
    
    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = "rgba(3,3,8,0.1)";
      ctx.fillRect(0, 0, w, h);

      const len = drops.length;
      for (let i = 0; i < len; i++) {
        const y = drops[i] * fontSize;
        if (y < h) {
          const char = chars[(Math.random() * chars.length) | 0];
          const ci = (Math.random() * 6) | 0;
          ctx.fillStyle = colors[ci];
          ctx.fillText(char, i * fontSize, y);
        }
        
        drops[i] += speeds[i];
        
        if (drops[i] * fontSize > h && Math.random() > 0.98) {
          drops[i] = -Math.random() * 8;
        }
      }
    };

    const task = createTask(
      (t) => {
        if (ACTIVITY.isScrolling(t)) return;
        draw();
      },
      { fps: PERF.matrixFps }
    );

    TICKER.add("matrix", task);
  };
  
  const initParticles = () => {
    return;
    
    const canvas = document.createElement("canvas");
    canvas.id = "particles-canvas";
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    
    const linkDist = PERF.linkDist;
    const linkDist2 = linkDist * linkDist;

    const resize = () => {
      fitCanvas(canvas, PERF.canvasScale);
    };

    resize();
    RESIZE.add(resize);
    
    const particleCount = PERF.particleCount;
    const px = new Float32Array(particleCount);
    const py = new Float32Array(particleCount);
    const vx = new Float32Array(particleCount);
    const vy = new Float32Array(particleCount);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      px[i] = Math.random() * canvas.width;
      py[i] = Math.random() * canvas.height;
      vx[i] = (Math.random() - 0.5) * 0.3;
      vy[i] = (Math.random() - 0.5) * 0.3;
      sizes[i] = Math.random() * 1.5 + 0.5;
    }
    
    let frameNo = 0;

    const task = createTask(
      (t) => {
        if (ACTIVITY.isScrolling(t)) return;
        frameNo++;

        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);
        
        for (let i = 0; i < particleCount; i++) {
          px[i] += vx[i];
          py[i] += vy[i];
          if (px[i] < 0 || px[i] > w) vx[i] *= -1;
          if (py[i] < 0 || py[i] > h) vy[i] *= -1;
        }
        
        ctx.fillStyle = "rgba(57,255,20,0.7)";
        for (let i = 0; i < particleCount; i++) {
          ctx.beginPath();
          ctx.arc(px[i], py[i], sizes[i], 0, 6.28);
          ctx.fill();
        }

        if (frameNo % PERF.linkEvery === 0) {
          ctx.strokeStyle = "rgba(0,255,255,0.1)";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          for (let i = 0; i < particleCount - 1; i++) {
            for (let j = i + 1; j < particleCount; j++) {
              const dx = px[i] - px[j];
              const dy = py[i] - py[j];
              if (dx * dx + dy * dy < linkDist2) {
                ctx.moveTo(px[i], py[i]);
                ctx.lineTo(px[j], py[j]);
              }
            }
          }
          ctx.stroke();
        }
      },
      { fps: PERF.particlesFps }
    );

    TICKER.add("particles", task);
  };
  
  const initCursorGlow = () => {
    return;
    
    const glow = document.querySelector(".cursor-glow");
    if (!(glow instanceof HTMLElement)) return;

    glow.style.opacity = "0";

    let gx = 0;
    let gy = 0;
    let visible = false;
    let rafId = 0;

    const update = () => {
      rafId = 0;
      if (!POINTER.inside) {
        if (visible) {
          glow.style.opacity = "0";
          visible = false;
        }
        return;
      }

      if (!visible) {
        visible = true;
        gx = POINTER.x;
        gy = POINTER.y;
        glow.style.opacity = "1";
      }

      gx += (POINTER.x - gx) * 0.15;
      gy += (POINTER.y - gy) * 0.15;

      glow.style.transform = `translate3d(${gx | 0}px, ${gy | 0}px, 0) translate(-50%, -50%)`;
      
      if (Math.abs(POINTER.x - gx) > 1 || Math.abs(POINTER.y - gy) > 1) {
        rafId = requestAnimationFrame(update);
      }
    };

    const schedule = () => {
      if (!rafId) rafId = requestAnimationFrame(update);
    };

    window.addEventListener("pointermove", schedule, { passive: true });
    window.addEventListener("pointerleave", () => {
      if (visible) {
        glow.style.opacity = "0";
        visible = false;
      }
    }, { passive: true });
  };
  
  const initScrollAnimations = () => {
    const animatedElements = document.querySelectorAll("[data-animate]");
    
    if (!animatedElements.length) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, index) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              entry.target.classList.add("is-visible");
            }, index * 50);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
      }
    );
    
    animatedElements.forEach((el) => observer.observe(el));
  };
  
  const initMarquee = () => {
    const marquees = document.querySelectorAll(".marquee");
    
    marquees.forEach((marquee) => {
      const content = marquee.querySelector(".marquee-content");
      if (!content) return;
      
      const clone = content.cloneNode(true);
      marquee.appendChild(clone);
    });
  };
  
  const initSmoothScroll = () => {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", function (e) {
        e.preventDefault();
        
        const targetId = this.getAttribute("href");
        if (targetId === "#") return;
        
        const target = document.querySelector(targetId);
        if (!target) return;
        
        const header = document.querySelector(".header");
        const headerHeight = header instanceof HTMLElement ? header.offsetHeight : 0;
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight;
        
        window.scrollTo({
          top: targetPosition,
          behavior: "smooth"
        });
      });
    });
  };
  
  const initMobileMenu = () => {
    const menuBtn = document.querySelector(".menu-btn");
    const nav = document.querySelector(".nav");
    
    if (!menuBtn || !nav) return;

    let lastFocused = null;

    const setState = (open) => {
      menuBtn.classList.toggle("active", open);
      nav.classList.toggle("open", open);
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      menuBtn.setAttribute("aria-label", open ? "Закрыть меню навигации" : "Открыть меню навигации");
      document.body.style.overflow = open ? "hidden" : "";
      if (open) {
        lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const firstLink = nav.querySelector("a");
        if (firstLink instanceof HTMLElement) firstLink.focus({ preventScroll: true });
      } else {
        if (lastFocused) lastFocused.focus({ preventScroll: true });
        lastFocused = null;
      }
    };

    const isOpen = () => nav.classList.contains("open");

    menuBtn.addEventListener("click", () => setState(!isOpen()));

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setState(false));
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen()) setState(false);
    });

    document.addEventListener("pointerdown", (e) => {
      if (!isOpen()) return;
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (menuBtn.contains(target) || nav.contains(target)) return;
      setState(false);
    });
  };
  
  const initHeaderHide = () => {
    const header = document.querySelector(".header");
    if (!header) return;
    
    let lastScroll = 0;
    let ticking = false;

    const update = () => {
      const currentScroll = window.scrollY;
      
      if (currentScroll > lastScroll && currentScroll > 100) {
        header.classList.add("hidden");
      } else {
        header.classList.remove("hidden");
      }
      
      if (currentScroll > 50) {
        header.classList.add("scrolled");
      } else {
        header.classList.remove("scrolled");
      }
      
      lastScroll = currentScroll;
      ticking = false;
    };
    
    window.addEventListener("scroll", () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
  };
  
  const initActiveNav = () => {
    const sections = document.querySelectorAll("section[id]");
    const navLinks = document.querySelectorAll(".nav-link");
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            navLinks.forEach((link) => {
              link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
            });
          }
        });
      },
      { rootMargin: "-40% 0px -60% 0px" }
    );
    
    sections.forEach((section) => observer.observe(section));
  };
  
  const initProjectHover = () => {
    const cards = document.querySelectorAll(".project-card");
    cards.forEach((card) => {
      card.addEventListener("mouseenter", () => {
        const title = card.querySelector(".project-title");
        if (title) title.style.textShadow = "0 0 20px rgba(76, 201, 255, 0.5)";
      });
      card.addEventListener("mouseleave", () => {
        const title = card.querySelector(".project-title");
        if (title) title.style.textShadow = "";
      });
    });
  };
  
  const initFAQ = () => {
    const items = document.querySelectorAll(".faq-item");
    
    if (!items.length) return;

    const state = new Map();

    const syncHeights = () => {
      items.forEach((item) => {
        const s = state.get(item);
        if (!s) return;
        if (!item.classList.contains("active")) return;
        s.answer.style.maxHeight = `${s.answer.scrollHeight}px`;
      });
    };

    const closeAll = () => {
      items.forEach((item) => {
        const s = state.get(item);
        if (!s) return;
        item.classList.remove("active");
        s.question.setAttribute("aria-expanded", "false");
        s.answer.style.maxHeight = "0px";
        s.answer.setAttribute("aria-hidden", "true");
      });
    };

    items.forEach((item, idx) => {
      const question = item.querySelector(".faq-question");
      const answer = item.querySelector(".faq-answer");
      if (!(question instanceof HTMLButtonElement) || !(answer instanceof HTMLElement)) return;

      const id = answer.id || `faq-answer-${idx + 1}`;
      answer.id = id;
      question.setAttribute("aria-controls", id);
      question.setAttribute("aria-expanded", "false");
      answer.setAttribute("aria-hidden", "true");
      answer.style.maxHeight = "0px";

      state.set(item, { question, answer });

      question.addEventListener("click", () => {
        const isActive = item.classList.contains("active");
        closeAll();
        if (isActive) return;
        item.classList.add("active");
        question.setAttribute("aria-expanded", "true");
        answer.setAttribute("aria-hidden", "false");
        answer.style.maxHeight = `${answer.scrollHeight}px`;
      });
    });

    window.addEventListener("resize", () => {
      syncHeights();
    });
  };

  const initBackToTop = () => {
    const btn = document.querySelector(".back-to-top");
    if (!(btn instanceof HTMLElement)) return;

    let ticking = false;

    const update = () => {
      ticking = false;
      btn.classList.toggle("visible", window.scrollY > 500);
    };

    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
      },
      { passive: true }
    );

    update();
  };
  
  const initTypingEffect = () => {
    const typing = document.querySelector(".typing");
    if (!typing) return;
    typing.style.width = "0";
    setTimeout(() => {
      typing.style.width = "";
    }, 100);
  };
  
  const initGlitchEffect = () => {
  };
  
  const initSkillHover = () => {
    const chips = document.querySelectorAll(".skill-chip");
    chips.forEach((chip) => {
      chip.addEventListener("mouseenter", () => {
        chip.style.transform = "translateY(-3px) scale(1.08)";
      });
      chip.addEventListener("mouseleave", () => {
        chip.style.transform = "";
      });
    });
  };
  
  const initScrollProgress = () => {
  };
  
  const initParallaxBadges = () => {
  };
  
  const initMagneticButtons = () => {
  };
  
  const initContactLinkCopy = () => {
    const contactLinks = document.querySelectorAll(".contact-link-item");
    
    contactLinks.forEach((link) => {
      link.addEventListener("click", function(e) {
        const value = this.querySelector(".contact-link-value");
        if (!value) return;
        
        const text = value.textContent;
        const href = this.getAttribute("href");
        
        if (href && href.startsWith("mailto:")) return;
        if (href && (href.startsWith("http") || href.startsWith("/"))) return;
        
        if (navigator.clipboard) {
          e.preventDefault();
          navigator.clipboard.writeText(text).then(() => {
            const original = value.textContent;
            value.textContent = "Скопировано!";
            value.style.color = "var(--neon-green)";
            
            setTimeout(() => {
              value.textContent = original;
              value.style.color = "";
            }, 1500);
          });
        }
      });
    });
  };
  
  const initHeroTextAnimation = () => {
  };
  
  const initAchievementHover = () => {
    const cards = document.querySelectorAll(".achievement-card");
    cards.forEach((card) => {
      card.addEventListener("mouseenter", () => {
        const icon = card.querySelector(".achievement-icon");
        if (icon) icon.style.transform = "scale(1.15) rotate(8deg)";
      });
      card.addEventListener("mouseleave", () => {
        const icon = card.querySelector(".achievement-icon");
        if (icon) icon.style.transform = "";
      });
    });
  };

  const initLeetCodeAnimation = () => {
  };
  
  const init3DTilt = () => {
  };
  
  const initKonamiCode = () => {
  };
  
  const initTextReveal = () => {
  };
  
  const initImageHover = () => {
    const wrap = document.querySelector(".hero-image-wrap");
    if (!wrap) return;
    wrap.addEventListener("mouseenter", () => {
      wrap.style.transform = "scale(1.03)";
    });
    wrap.addEventListener("mouseleave", () => {
      wrap.style.transform = "";
    });
  };
  
  const initRingDots = () => {
  };
  
  const initDataStream = () => {
  };
  
  const initClickRipple = () => {
  };
  
  const initNoiseOverlay = () => {
  };
  
  const initServiceWorker = () => {
    if (!("serviceWorker" in navigator)) return;

    const once = (fn) => {
      let done = false;
      return () => {
        if (done) return;
        done = true;
        try { fn(); } catch (_) {}
      };
    };

    const reloadNow = once(() => window.location.reload());

    const safePost = (sw, msg) => {
      try {
        if (!sw) return;
        sw.postMessage(msg);
      } catch (_) {}
    };

    const wire = (registration) => {
      const promote = () => safePost(registration.waiting, "skipWaiting");

      const onUpdateFound = () => {
        const sw = registration.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          if (sw.state !== "installed") return;
          if (!navigator.serviceWorker.controller) return;
          promote();
        });
      };

      registration.addEventListener("updatefound", onUpdateFound);
      navigator.serviceWorker.addEventListener("controllerchange", reloadNow);

      const update = () => {
        try { registration.update(); } catch (_) {}
        promote();
      };

      const schedule = (() => {
        let last = 0;
        return () => {
          const now = Date.now();
          if (now - last < 15000) return;
          last = now;
          update();
        };
      })();

      window.addEventListener("online", schedule, { passive: true });
      window.addEventListener("focus", schedule, { passive: true });
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) schedule();
      }, { passive: true });

      setInterval(schedule, 30 * 60 * 1000);
      schedule();
    };

    window.addEventListener("load", () => {
      const swUrl = new URL("./sw.js", window.location.href);
      const scopeUrl = new URL("./", window.location.href);

      const register = async () => {
        try {
          return await navigator.serviceWorker.register(swUrl, { scope: scopeUrl.pathname, updateViaCache: "none" });
        } catch (_) {
          try {
            return await navigator.serviceWorker.register(swUrl, { scope: scopeUrl.pathname });
          } catch (_) {
            return null;
          }
        }
      };

      register().then((reg) => {
        if (!reg) return;
        wire(reg);
      }).catch(() => {});
    });
  };
  
  const initPreloader = () => {
    window.addEventListener("load", () => {
      document.body.classList.add("loaded");
    });
  };
  
  const init = () => {
    const safe = (fn) => {
      try { fn(); } catch (_) {}
    };

    [
      enableMotionUI,
      initMatrixRain,
      initParticles,
      initCursorGlow,
      initScrollAnimations,
      initMarquee,
      initSmoothScroll,
      initMobileMenu,
      initHeaderHide,
      initActiveNav,
      initProjectHover,
      initFAQ,
      initBackToTop,
      initTypingEffect,
      initGlitchEffect,
      initSkillHover,
      initScrollProgress,
      initParallaxBadges,
      initMagneticButtons,
      initContactLinkCopy,
      initHeroTextAnimation,
      initAchievementHover,
      initLeetCodeAnimation,
      init3DTilt,
      initKonamiCode,
      initTextReveal,
      initImageHover,
      initRingDots,
      initDataStream,
      initClickRipple,
      initNoiseOverlay,
      initServiceWorker,
      initPreloader
    ].forEach(safe);
  };
  
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
