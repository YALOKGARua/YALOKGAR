(() => {
  const root = document.documentElement;
  if (root.classList.contains("no-js")) root.classList.remove("no-js");
  root.classList.add("js");
  if (root.dataset.js !== "ready") root.dataset.js = "pending";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const PERF = (() => {
    const mem = typeof navigator.deviceMemory === "number" ? navigator.deviceMemory : 8;
    const cores = typeof navigator.hardwareConcurrency === "number" ? navigator.hardwareConcurrency : 8;
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2.5));
    const mega = (Math.max(1, window.innerWidth) * Math.max(1, window.innerHeight) * dpr * dpr) / 1e6;

    const conn = typeof navigator.connection === "object" && navigator.connection ? navigator.connection : null;
    const saveData = !!(conn && conn.saveData);
    const effectiveType = conn && typeof conn.effectiveType === "string" ? conn.effectiveType : "";
    const netLow = saveData || effectiveType === "2g" || effectiveType === "slow-2g";

    const hintedLow = prefersReducedMotion || isMobile || mem <= 4 || cores <= 4 || mega >= 5.0 || netLow;

    const url = new URL(window.location.href);
    const forced = url.searchParams.get("perf");
    const tier = forced === "low" || forced === "hi" ? forced : hintedLow ? "low" : "hi";

    return tier === "low"
      ? {
          tier,
          matrixFps: 16,
          particlesFps: 24,
          canvasScale: 0.62,
          particleCount: 20,
          linkDist: 130,
          linkEvery: 3,
          shadowScale: 0.6
        }
      : {
          tier,
          matrixFps: 22,
          particlesFps: 34,
          canvasScale: 0.78,
          particleCount: 30,
          linkDist: 145,
          linkEvery: 2,
          shadowScale: 0.78
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
    if (prefersReducedMotion || isMobile) return;
    
    const canvas = document.getElementById("matrix-bg");
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const chars = "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン{}[]<>;=+-*/%#&|^~!?$@\\/:YALOKGAR".split("");
    const fontSize = 14;
    const font = `${fontSize}px "JetBrains Mono", monospace`;

    const sb25 = 25 * PERF.shadowScale;
    const sb20 = 20 * PERF.shadowScale;
    const sb12 = 12 * PERF.shadowScale;
    const sb5 = 5 * PERF.shadowScale;
    let drops = [];
    let speeds = [];

    const reset = () => {
      const columns = Math.max(1, Math.floor(canvas.width / fontSize));
      drops = Array.from({ length: columns }, () => Math.random() * (canvas.height / fontSize));
      speeds = Array.from({ length: columns }, () => 0.45 + Math.random() * 0.75);
    };

    const resize = () => {
      fitCanvas(canvas, PERF.canvasScale);
      ctx.font = font;
      reset();
    };

    resize();
    RESIZE.add(resize);
    
    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = "rgba(7, 8, 15, 0.06)";
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        
        const brightness = Math.random();
        if (brightness > 0.98) {
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = "#00e5ff";
          ctx.shadowBlur = sb25;
        } else if (brightness > 0.9) {
          ctx.fillStyle = "#4cc9ff";
          ctx.shadowColor = "#00e5ff";
          ctx.shadowBlur = sb20;
        } else if (brightness > 0.7) {
          ctx.fillStyle = `rgba(76, 201, 255, ${0.7 + brightness * 0.3})`;
          ctx.shadowColor = "#4cc9ff";
          ctx.shadowBlur = sb12;
        } else if (brightness > 0.4) {
          ctx.fillStyle = `rgba(43, 107, 255, ${0.28 + brightness * 0.34})`;
          ctx.shadowColor = "#2b6bff";
          ctx.shadowBlur = sb5;
        } else {
          ctx.fillStyle = `rgba(76, 201, 255, ${0.08 + brightness * 0.22})`;
          ctx.shadowBlur = 0;
        }
        
        ctx.fillText(char, x, y);
        ctx.shadowBlur = 0;
        
        if (y > h && Math.random() > 0.975) {
          drops[i] = -Math.random() * 10;
        }
        
        drops[i] += speeds[i];
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
    if (prefersReducedMotion || isMobile) return;
    
    const canvas = document.createElement("canvas");
    canvas.id = "particles-canvas";
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const linkDist = Math.max(80, PERF.linkDist);
    const linkDist2 = linkDist * linkDist;
    const cellSize = linkDist;
    const invCell = 1 / cellSize;

    let gridW = 1;
    let gridH = 1;
    let head = new Int32Array(1);

    const rebuildGrid = () => {
      gridW = Math.max(1, Math.ceil(canvas.width / cellSize));
      gridH = Math.max(1, Math.ceil(canvas.height / cellSize));
      head = new Int32Array(gridW * gridH);
    };

    const resize = () => {
      fitCanvas(canvas, PERF.canvasScale);
      rebuildGrid();
    };

    resize();
    RESIZE.add(resize);
    
    const particleBlur = 10 * PERF.shadowScale;
    
    const particles = [];
    const particleCount = PERF.particleCount;
    
    class Particle {
      constructor() {
        this.reset();
      }
      
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.speedY = (Math.random() - 0.5) * 0.5;
        this.opacity = Math.random() * 0.5 + 0.2;
        this.hue = Math.random() > 0.55 ? 198 : 350;
        const shadowAlpha = Math.min(1, this.opacity + 0.2);
        this.fill = `hsla(${this.hue}, 100%, 55%, ${this.opacity})`;
        this.shadow = `hsla(${this.hue}, 100%, 55%, ${shadowAlpha})`;
      }
      
      update(w, h) {
        this.x += this.speedX;
        this.y += this.speedY;
        
        if (this.x < 0 || this.x > w) this.speedX *= -1;
        if (this.y < 0 || this.y > h) this.speedY *= -1;
      }
      
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.shadowColor = this.shadow;
        ctx.fillStyle = this.fill;
        ctx.fill();
      }
    }
    
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }
    
    const next = new Int32Array(particles.length);

    const connectParticles = () => {
      head.fill(-1);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const cx = clampInt((p.x * invCell) | 0, 0, gridW - 1);
        const cy = clampInt((p.y * invCell) | 0, 0, gridH - 1);
        const idx = cx + cy * gridW;
        next[i] = head[idx];
        head[idx] = i;
      }

      ctx.lineWidth = 0.5;
      ctx.strokeStyle = "rgb(76, 201, 255)";

      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        const cx = clampInt((a.x * invCell) | 0, 0, gridW - 1);
        const cy = clampInt((a.y * invCell) | 0, 0, gridH - 1);

        for (let ox = -1; ox <= 1; ox++) {
          const nx = cx + ox;
          if (nx < 0 || nx >= gridW) continue;
          for (let oy = -1; oy <= 1; oy++) {
            const ny = cy + oy;
            if (ny < 0 || ny >= gridH) continue;

            let j = head[nx + ny * gridW];
            while (j !== -1) {
              if (j > i) {
                const b = particles[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const d2 = dx * dx + dy * dy;
                if (d2 <= linkDist2) {
                  const w = 1 - d2 / linkDist2;
                  const alpha = 0.10 * w;
                  if (alpha >= 0.003) {
                    ctx.globalAlpha = alpha;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                  }
                }
              }
              j = next[j];
            }
          }
        }
      }

      ctx.globalAlpha = 1;
    };
    
    let frameNo = 0;

    const task = createTask(
      (t) => {
        if (ACTIVITY.isScrolling(t)) return;
        frameNo++;

        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        ctx.shadowBlur = particleBlur;
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.update(w, h);
          p.draw();
        }
        ctx.shadowBlur = 0;

        if (frameNo % PERF.linkEvery === 0) connectParticles();
      },
      { fps: PERF.particlesFps }
    );

    TICKER.add("particles", task);
  };
  
  const initCursorGlow = () => {
    if (prefersReducedMotion || isMobile) return;
    
    const glow = document.querySelector(".cursor-glow");
    if (!(glow instanceof HTMLElement)) return;

    glow.style.opacity = "0";
    glow.style.willChange = "transform";

    const canTranslate = "translate" in glow.style;
    const setPos = canTranslate
      ? (x, y) => {
          glow.style.translate = `${x}px ${y}px`;
        }
      : (x, y) => {
          glow.style.left = "0";
          glow.style.top = "0";
          glow.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
        };

    const snap = (v) => Math.round(v * 2) / 2;

    let gx = 0;
    let gy = 0;
    let lastX = NaN;
    let lastY = NaN;
    let visible = false;

    const commit = (x, y) => {
      const sx = snap(x);
      const sy = snap(y);
      if (sx === lastX && sy === lastY) return;
      lastX = sx;
      lastY = sy;
      setPos(sx, sy);
    };

    const task = createTask(
      (t) => {
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
          commit(gx, gy);
          return;
        }

        const tx = POINTER.x;
        const ty = POINTER.y;

        const k = ACTIVITY.isScrolling(t) ? 0.22 : 0.12;
        gx += (tx - gx) * k;
        gy += (ty - gy) * k;

        commit(gx, gy);
      },
      {
        fps: 60,
        when: (t) => {
          if (POINTER.inside) {
            if (!visible) return true;
            if (ACTIVITY.isScrolling(t)) return true;
            if (t - POINTER.last < 320) return true;
            return Math.abs(POINTER.x - gx) > 0.6 || Math.abs(POINTER.y - gy) > 0.6;
          }
          return visible;
        }
      }
    );

    TICKER.add("cursorGlow", task);
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
    if (prefersReducedMotion) return;
    
    const projects = document.querySelectorAll(".project-card");
    
    projects.forEach((project) => {
      project.addEventListener("mouseenter", () => {
        projects.forEach((p) => {
          if (p !== project) {
            p.style.opacity = "0.4";
            p.style.filter = "blur(1px)";
          }
        });
      });
      
      project.addEventListener("mouseleave", () => {
        projects.forEach((p) => {
          p.style.opacity = "1";
          p.style.filter = "none";
        });
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
    const typingElements = document.querySelectorAll(".typing");
    
    typingElements.forEach((el) => {
      const text = el.textContent;
      el.textContent = "";
      el.style.borderRight = "2px solid var(--neon-green)";
      
      let i = 0;
      const typeChar = () => {
        if (i < text.length) {
          el.textContent += text.charAt(i);
          i++;
          setTimeout(typeChar, 60 + Math.random() * 40);
        }
      };
      
      setTimeout(typeChar, 800);
    });
  };
  
  const initGlitchEffect = () => {
    if (prefersReducedMotion) return;
    
    const glitchElements = document.querySelectorAll(".glitch");
    if (!glitchElements.length) return;

    let timer = 0;

    const tick = () => {
      glitchElements.forEach((el) => {
        el.style.animation = "none";
        void el.offsetWidth;
        el.style.animation = "";
      });
    };

    const start = () => {
      if (timer) return;
      timer = window.setInterval(tick, 5000);
    };

    const stop = () => {
      if (!timer) return;
      window.clearInterval(timer);
      timer = 0;
    };

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else start();
    }, { passive: true });

    start();
  };
  
  const initSkillHover = () => {
    const skills = document.querySelectorAll(".skill-chip");
    
    skills.forEach((skill) => {
      skill.addEventListener("mouseenter", function() {
        this.style.transform = "translateY(-2px) scale(1.05)";
      });
      
      skill.addEventListener("mouseleave", function() {
        this.style.transform = "";
      });
    });
  };
  
  const initScrollProgress = () => {
    const progressBar = document.createElement("div");
    progressBar.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      height: 2px;
      background: linear-gradient(90deg, #4cc9ff, #2b6bff, #ff2b3d);
      z-index: 10001;
      transform-origin: left;
      transform: scaleX(0);
      transition: transform 0.1s;
      box-shadow: 0 0 10px rgba(76, 201, 255, 0.65), 0 0 28px rgba(43, 107, 255, 0.35);
    `;
    document.body.appendChild(progressBar);

    let ticking = false;

    const update = () => {
      ticking = false;
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? scrollTop / docHeight : 0;
      progressBar.style.transform = `scaleX(${progress})`;
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
  
  const initParallaxBadges = () => {
    if (prefersReducedMotion || isMobile) return;
    
    const badges = document.querySelectorAll("[data-float]");
    
    if (!badges.length) return;

    const canTranslate = badges[0] instanceof HTMLElement && "translate" in badges[0].style;
    
    let scrollY = 0;
    let ticking = false;
    
    const update = () => {
      badges.forEach((badge, index) => {
        const speed = 0.02 + index * 0.01;
        const yPos = scrollY * speed;
        if (canTranslate && badge instanceof HTMLElement) badge.style.translate = `0px ${yPos}px`;
        else badge.style.transform = `translateY(${yPos}px)`;
      });
      ticking = false;
    };
    
    window.addEventListener("scroll", () => {
      scrollY = window.scrollY;
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
  };
  
  const initMagneticButtons = () => {
    if (prefersReducedMotion || isMobile) return;
    
    const buttons = Array.from(document.querySelectorAll(".btn-neon, .btn-ghost"));
    if (!buttons.length) return;

    const enterEvent = "PointerEvent" in window ? "pointerenter" : "mouseenter";
    const leaveEvent = "PointerEvent" in window ? "pointerleave" : "mouseleave";

    const canTranslate = buttons[0] instanceof HTMLElement && "translate" in buttons[0].style;
    const apply = canTranslate
      ? (el, x, y) => {
          el.style.translate = `${x}px ${y}px`;
        }
      : (el, x, y) => {
          el.style.transform = `translate(${x}px, ${y}px)`;
        };

    let active = null;
    let rect = null;
    let ox = 0;
    let oy = 0;

    const activate = (el) => {
      active = el;
      rect = el.getBoundingClientRect();
      ox = 0;
      oy = 0;
      el.style.willChange = "transform";
    };

    const deactivate = (el) => {
      apply(el, 0, 0);
      if (active === el) {
        active = null;
        rect = null;
      }
    };

    buttons.forEach((btn) => {
      if (!(btn instanceof HTMLElement)) return;
      btn.addEventListener(enterEvent, () => activate(btn));
      btn.addEventListener(leaveEvent, () => deactivate(btn));
    });

    RESIZE.add(() => {
      if (!active) return;
      rect = active.getBoundingClientRect();
    });

    window.addEventListener(
      "scroll",
      () => {
        if (!active) return;
        deactivate(active);
      },
      { passive: true }
    );

    const task = createTask(
      (t) => {
        if (!active || !rect) return;
        if (!POINTER.inside) return;
        if (ACTIVITY.isScrolling(t)) return;

        const dx = POINTER.x - rect.left - rect.width / 2;
        const dy = POINTER.y - rect.top - rect.height / 2;

        const tx = dx * 0.18;
        const ty = dy * 0.18;

        ox += (tx - ox) * 0.25;
        oy += (ty - oy) * 0.25;

        apply(active, ox, oy);
      },
      {
        fps: 60,
        when: (t) => {
          if (!active) return false;
          if (ACTIVITY.isScrolling(t)) return true;
          if (t - POINTER.last < 800) return true;
          return Math.abs(ox) > 0.2 || Math.abs(oy) > 0.2;
        }
      }
    );

    TICKER.add("magneticButtons", task);
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
    const lines = document.querySelectorAll(".hero-title .line");
    
    lines.forEach((line, index) => {
      line.style.opacity = "0";
      line.style.transform = "translateY(50px)";
      
      setTimeout(() => {
        line.style.transition = "opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)";
        line.style.opacity = "1";
        line.style.transform = "translateY(0)";
      }, 400 + index * 200);
    });
  };
  
  const initAchievementHover = () => {
    const cards = document.querySelectorAll(".achievement-card");
    
    cards.forEach((card) => {
      card.addEventListener("mouseenter", function() {
        const icon = this.querySelector(".achievement-icon");
        if (icon) {
          icon.style.transform = "scale(1.1) rotate(5deg)";
        }
      });
      
      card.addEventListener("mouseleave", function() {
        const icon = this.querySelector(".achievement-icon");
        if (icon) {
          icon.style.transform = "";
        }
      });
    });
  };

  const initLeetCodeAnimation = () => {
    const wheel = document.querySelector(".wheel-ring");
    if (!wheel) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            wheel.style.animation = "wheel-rotate 20s linear infinite";
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    
    observer.observe(wheel);
  };
  
  const init3DTilt = () => {
    if (prefersReducedMotion || isMobile) return;
    
    const tiltElements = Array.from(document.querySelectorAll(".code-window, .about-terminal, .stat-card"));
    if (!tiltElements.length) return;

    const enterEvent = "PointerEvent" in window ? "pointerenter" : "mouseenter";
    const leaveEvent = "PointerEvent" in window ? "pointerleave" : "mouseleave";

    let active = null;
    let rect = null;
    let rx = 0;
    let ry = 0;

    const activate = (el) => {
      active = el;
      rect = el.getBoundingClientRect();
      rx = 0;
      ry = 0;
      el.style.willChange = "transform";
    };

    const deactivate = (el) => {
      el.style.transform = "";
      if (active === el) {
        active = null;
        rect = null;
      }
    };

    tiltElements.forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      el.addEventListener(enterEvent, () => activate(el));
      el.addEventListener(leaveEvent, () => deactivate(el));
    });

    RESIZE.add(() => {
      if (!active) return;
      rect = active.getBoundingClientRect();
    });

    window.addEventListener(
      "scroll",
      () => {
        if (!active) return;
        deactivate(active);
      },
      { passive: true }
    );

    const task = createTask(
      (t) => {
        if (!active || !rect) return;
        if (!POINTER.inside) return;
        if (ACTIVITY.isScrolling(t)) return;

        const x = POINTER.x - rect.left;
        const y = POINTER.y - rect.top;

        const cx = rect.width / 2;
        const cy = rect.height / 2;

        const tx = (y - cy) / 20;
        const ty = (cx - x) / 20;

        rx += (tx - rx) * 0.2;
        ry += (ty - ry) * 0.2;

        const max = 12;
        const ax = Math.max(-max, Math.min(max, rx));
        const ay = Math.max(-max, Math.min(max, ry));

        active.style.transform = `perspective(1000px) rotateX(${ax}deg) rotateY(${ay}deg) translateZ(10px)`;
      },
      {
        fps: 60,
        when: (t) => {
          if (!active) return false;
          if (ACTIVITY.isScrolling(t)) return true;
          if (t - POINTER.last < 800) return true;
          return Math.abs(rx) > 0.1 || Math.abs(ry) > 0.1;
        }
      }
    );

    TICKER.add("tilt3d", task);
  };
  
  const initKonamiCode = () => {
    if (prefersReducedMotion) return;

    const sequence = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    let idx = 0;

    const normalizeKey = (k) => (k.length === 1 ? k.toLowerCase() : k);

    document.addEventListener("keydown", (e) => {
      const expected = sequence[idx];
      const actual = normalizeKey(e.key);
      if (actual === expected) {
        idx += 1;
        if (idx === sequence.length) {
          activateEasterEgg();
          idx = 0;
        }
        return;
      }

      idx = actual === sequence[0] ? 1 : 0;
    });
    
    const activateEasterEgg = () => {
      document.body.style.animation = "rainbow-bg 2s ease-in-out";
      
      const message = document.createElement("div");
      message.innerHTML = "🎮 KONAMI CODE ACTIVATED! 🎮";
      message.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-family: var(--font-mono);
        font-size: 2rem;
        color: #4cc9ff;
        text-shadow: 0 0 20px rgba(76, 201, 255, 0.85), 0 0 40px rgba(43, 107, 255, 0.65);
        z-index: 99999;
        animation: konami-bounce 0.5s ease-out;
        pointer-events: none;
      `;
      
      document.body.appendChild(message);
      
      setTimeout(() => {
        message.remove();
        document.body.style.animation = "";
      }, 2000);
    };
    
    const existing = document.getElementById("konami-style");
    if (existing) return;

    const style = document.createElement("style");
    style.id = "konami-style";
    style.textContent = `
      @keyframes rainbow-bg {
        0%, 100% { filter: hue-rotate(0deg); }
        50% { filter: hue-rotate(360deg); }
      }
      @keyframes konami-bounce {
        0% { transform: translate(-50%, -50%) scale(0); }
        50% { transform: translate(-50%, -50%) scale(1.2); }
        100% { transform: translate(-50%, -50%) scale(1); }
      }
    `;
    document.head.appendChild(style);
  };
  
  const initTextReveal = () => {
    const revealElements = document.querySelectorAll(".section-title, .hero-subtitle, .contact-title");
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    
    revealElements.forEach((el) => observer.observe(el));
  };
  
  const initImageHover = () => {
    const heroImage = document.querySelector(".hero-image");
    if (!heroImage) return;
    
    heroImage.addEventListener("mouseenter", () => {
      heroImage.style.filter = "grayscale(0%) contrast(1.1) brightness(1.05)";
    });
    
    heroImage.addEventListener("mouseleave", () => {
      heroImage.style.filter = "";
    });
  };
  
  const initRingDots = () => {
    const rings = document.querySelectorAll(".hero-ring");
    
    rings.forEach((ring) => {
      if (!ring.querySelector(".ring-dot")) {
        const dot = document.createElement("div");
        dot.className = "ring-dot";
        ring.appendChild(dot);
      }
    });
  };
  
  const initDataStream = () => {
    if (prefersReducedMotion || isMobile) return;
    
    const stream = document.createElement("div");
    stream.className = "data-stream";
    document.body.appendChild(stream);
  };
  
  const initClickRipple = () => {
    if (prefersReducedMotion) return;
    
    document.addEventListener("click", (e) => {
      const ripple = document.createElement("div");
      ripple.style.cssText = `
        position: fixed;
        left: ${e.clientX}px;
        top: ${e.clientY}px;
        width: 10px;
        height: 10px;
        background: rgba(76, 201, 255, 0.55);
        border-radius: 50%;
        pointer-events: none;
        z-index: 99999;
        transform: translate(-50%, -50%);
        animation: click-ripple 0.6s ease-out forwards;
      `;
      
      document.body.appendChild(ripple);
      
      setTimeout(() => ripple.remove(), 600);
    });

    const existing = document.getElementById("click-ripple-style");
    if (existing) return;

    const style = document.createElement("style");
    style.id = "click-ripple-style";
    style.textContent = `
      @keyframes click-ripple {
        0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(20); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  };
  
  const initNoiseOverlay = () => {
    if (prefersReducedMotion) return;
    
    const noise = document.createElement("div");
    noise.className = "noise-overlay";
    document.body.appendChild(noise);
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
