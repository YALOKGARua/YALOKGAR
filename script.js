(() => {
  const root = document.documentElement;
  root.classList.remove("no-js");
  root.classList.add("js");
  root.dataset.js = "pending";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  let lenis = null;

  const initLenis = () => {
    if (prefersReducedMotion || typeof Lenis === "undefined") return;

    lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 0.8,
      touchMultiplier: 1.5,
      infinite: false
    });

    const raf = (time) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };

    requestAnimationFrame(raf);

    if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
      
      lenis.on("scroll", ScrollTrigger.update);

      gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
      });

      gsap.ticker.lagSmoothing(0);
    }
  };

  const initCustomCursor = () => {
    if (isTouch || isMobile) return;

    const cursor = document.querySelector(".custom-cursor");
    if (!cursor) return;

    const dot = cursor.querySelector(".cursor-dot");
    const ring = cursor.querySelector(".cursor-ring");

    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;

    document.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate3d(${mouseX - 3}px, ${mouseY - 3}px, 0)`;
    }, { passive: true });

    const animateRing = () => {
      ringX += (mouseX - ringX) * 0.15;
      ringY += (mouseY - ringY) * 0.15;
      ring.style.transform = `translate3d(${ringX - 18}px, ${ringY - 18}px, 0)`;
      requestAnimationFrame(animateRing);
    };

    animateRing();

    const hoverTargets = document.querySelectorAll("a, button, [data-magnetic], .project-card, .achievement-card");

    hoverTargets.forEach((el) => {
      el.addEventListener("mouseenter", () => cursor.classList.add("cursor-hover"), { passive: true });
      el.addEventListener("mouseleave", () => cursor.classList.remove("cursor-hover"), { passive: true });
    });
  };

  const initMagneticButtons = () => {
    if (isTouch || isMobile || typeof gsap === "undefined") return;

    document.querySelectorAll("[data-magnetic]").forEach((btn) => {
      const strength = 0.35;
      const boundingRect = () => btn.getBoundingClientRect();

      btn.addEventListener("mousemove", (e) => {
        const rect = boundingRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        gsap.to(btn, {
          x: x * strength,
          y: y * strength,
          duration: 0.4,
          ease: "power2.out"
        });
      });

      btn.addEventListener("mouseleave", () => {
        gsap.to(btn, {
          x: 0,
          y: 0,
          duration: 0.6,
          ease: "elastic.out(1, 0.5)"
        });
      });
    });
  };

  const initVanillaTilt = () => {
    if (isTouch || isMobile || typeof VanillaTilt === "undefined") return;

    VanillaTilt.init(document.querySelectorAll("[data-tilt]"), {
      max: 8,
      speed: 400,
      glare: true,
      "max-glare": 0.15,
      scale: 1.02,
      perspective: 1000
    });
  };

  const initSplitting = () => {
    if (typeof Splitting === "undefined") return;

    Splitting({ target: "[data-splitting]" });
  };

  const initTypedJS = () => {
    if (prefersReducedMotion || typeof Typed === "undefined") return;

    const typingEl = document.querySelector(".typing-text");
    if (!typingEl) return;

    const text = typingEl.textContent || "";
    typingEl.textContent = "";

    new Typed(typingEl, {
      strings: [text],
      typeSpeed: 30,
      showCursor: true,
      cursorChar: "█",
      startDelay: 300,
      onComplete: (self) => {
        setTimeout(() => {
          if (self.cursor) self.cursor.style.display = "none";
        }, 2000);
      }
    });
  };

  const initTsParticles = () => {
    if (prefersReducedMotion || typeof tsParticles === "undefined") return;

    tsParticles.load("tsparticles", {
      fpsLimit: 60,
      particles: {
        number: {
          value: isMobile ? 30 : 80,
          density: { enable: true, value_area: 1000 }
        },
        color: {
          value: ["#39FF14", "#00FFFF", "#FF00FF", "#9D00FF"]
        },
        shape: { type: "circle" },
        opacity: {
          value: 0.3,
          random: true,
          anim: { enable: true, speed: 0.5, opacity_min: 0.1, sync: false }
        },
        size: {
          value: 2,
          random: true,
          anim: { enable: true, speed: 1, size_min: 0.5, sync: false }
        },
        links: {
          enable: true,
          distance: 150,
          color: "#39FF14",
          opacity: 0.15,
          width: 1
        },
        move: {
          enable: true,
          speed: 0.8,
          direction: "none",
          random: true,
          straight: false,
          out_mode: "out",
          bounce: false
        }
      },
      interactivity: {
        detect_on: "canvas",
        events: {
          onhover: { enable: !isMobile, mode: "grab" },
          onclick: { enable: true, mode: "push" },
          resize: true
        },
        modes: {
          grab: { distance: 140, line_linked: { opacity: 0.4 } },
          push: { quantity: 2 }
        }
      },
      detectRetina: true,
      background: { color: "transparent" }
    });
  };

  const initQuicklink = () => {
    if (typeof quicklink === "undefined") return;

    quicklink.listen({
      ignores: [
        (uri) => uri.includes("#"),
        (uri) => uri.includes("mailto:"),
        (uri) => uri.includes("tel:")
      ]
    });
  };

  const initGSAPAnimations = () => {
    if (prefersReducedMotion || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;

    gsap.registerPlugin(ScrollTrigger);

    gsap.fromTo(".hero-terminal", 
      { opacity: 0, y: 60, scale: 0.95 },
      { 
        opacity: 1, 
        y: 0, 
        scale: 1,
        duration: 1.2, 
        ease: "power3.out",
        delay: 0.2
      }
    );

    gsap.fromTo(".status-badge",
      { opacity: 0, x: (i) => i === 0 ? -50 : 50 },
      {
        opacity: 1,
        x: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: "power2.out",
        delay: 0.8
      }
    );

    gsap.fromTo(".hero-cta",
      { opacity: 0, y: 30 },
      { 
        opacity: 1, 
        y: 0, 
        duration: 0.8, 
        ease: "power2.out",
        delay: 1
      }
    );

    gsap.fromTo(".hex",
      { opacity: 0, scale: 0, rotation: -180 },
      {
        opacity: 0.5,
        scale: 1,
        rotation: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "back.out(1.7)",
        delay: 1.2
      }
    );

    document.querySelectorAll(".cyber-panel").forEach((panel) => {
      gsap.fromTo(panel,
        { opacity: 0, y: 80 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: panel,
            start: "top 85%",
            end: "top 50%",
            toggleActions: "play none none reverse"
          }
        }
      );
    });

    document.querySelectorAll(".project-card").forEach((card, i) => {
      gsap.fromTo(card,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: card,
            start: "top 88%",
            toggleActions: "play none none none"
          },
          delay: i * 0.08
        }
      );
    });

    document.querySelectorAll(".skill-category").forEach((cat, i) => {
      gsap.fromTo(cat,
        { opacity: 0, x: i % 2 === 0 ? -40 : 40 },
        {
          opacity: 1,
          x: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: cat,
            start: "top 85%",
            toggleActions: "play none none none"
          }
        }
      );
    });

    document.querySelectorAll(".bar-fill").forEach((bar) => {
      const fill = getComputedStyle(bar).getPropertyValue("--fill") || "0%";
      bar.style.width = "0%";
      
      gsap.to(bar, {
        width: fill,
        duration: 1.5,
        ease: "power2.out",
        scrollTrigger: {
          trigger: bar,
          start: "top 90%",
          toggleActions: "play none none none"
        }
      });
    });

    document.querySelectorAll(".achievement-card").forEach((card, i) => {
      gsap.fromTo(card,
        { opacity: 0, y: 40, rotateY: -15 },
        {
          opacity: 1,
          y: 0,
          rotateY: 0,
          duration: 0.6,
          ease: "power2.out",
          scrollTrigger: {
            trigger: card,
            start: "top 88%",
            toggleActions: "play none none none"
          },
          delay: i * 0.06
        }
      );
    });

    document.querySelectorAll(".section-header").forEach((header) => {
      gsap.fromTo(header,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: header,
            start: "top 85%",
            toggleActions: "play none none none"
          }
        }
      );
    });

    document.querySelectorAll(".contact-link").forEach((link, i) => {
      gsap.fromTo(link,
        { opacity: 0, x: -30 },
        {
          opacity: 1,
          x: 0,
          duration: 0.5,
          ease: "power2.out",
          scrollTrigger: {
            trigger: link,
            start: "top 90%",
            toggleActions: "play none none none"
          },
          delay: i * 0.1
        }
      );
    });
  };

  const initMatrixRain = () => {
    if (prefersReducedMotion) return;
    
    const canvas = document.getElementById("matrix-bg");
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    
    const chars = "01アイウエオカキクケコサシスセソタチツテトナニヌネノ<>{}[]();=+-*/\\|@#$%&YALOKGAR0123456789αβγδ∞§¶".split("");
    const fontSize = isMobile ? 14 : 16;
    
    let drops = [];
    let speeds = [];
    let colors = [];
    let brightness = [];
    let columnCount = 0;
    let animationId = null;
    let isVisible = true;

    const colorPalette = [
      { r: 57, g: 255, b: 20 },
      { r: 0, g: 255, b: 255 },
      { r: 255, g: 0, b: 255 },
      { r: 157, g: 0, b: 255 }
    ];

    const resize = () => {
      const scale = isMobile ? 0.5 : 0.7;
      canvas.width = Math.floor(window.innerWidth * scale);
      canvas.height = Math.floor(window.innerHeight * scale);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      
      const spacing = fontSize * 0.9;
      columnCount = Math.max(1, Math.floor(canvas.width / spacing));
      
      drops = new Float32Array(columnCount);
      speeds = new Float32Array(columnCount);
      colors = new Uint8Array(columnCount);
      brightness = new Float32Array(columnCount);
      
      for (let i = 0; i < columnCount; i++) {
        drops[i] = Math.random() * canvas.height / fontSize * -1;
        speeds[i] = 0.4 + Math.random() * 0.8;
        colors[i] = Math.floor(Math.random() * colorPalette.length);
        brightness[i] = 0.6 + Math.random() * 0.4;
      }
      
      ctx.font = `bold ${fontSize}px "Share Tech Mono", monospace`;
      ctx.textBaseline = "top";
    };

    let debounceTimer;
    const debouncedResize = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(resize, 100);
    };

    resize();
    window.addEventListener("resize", debouncedResize, { passive: true });

    const targetFps = isMobile ? 20 : 30;
    const frameInterval = 1000 / targetFps;
    let lastFrame = 0;

    const draw = (timestamp) => {
      if (!isVisible) {
        animationId = requestAnimationFrame(draw);
        return;
      }

      if (timestamp - lastFrame < frameInterval) {
        animationId = requestAnimationFrame(draw);
        return;
      }
      lastFrame = timestamp;
      
      ctx.fillStyle = "rgba(2, 2, 4, 0.06)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const charsLen = chars.length;
      const spacing = fontSize * 0.9;

      for (let i = 0; i < columnCount; i++) {
        const y = drops[i] * fontSize;
        
        if (y >= -fontSize && y < canvas.height + fontSize) {
          const col = colorPalette[colors[i]];
          const alpha = brightness[i];
          
          const isHead = Math.random() > 0.7;
          
          if (isHead) {
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.shadowColor = `rgb(${col.r}, ${col.g}, ${col.b})`;
            ctx.shadowBlur = 15;
          } else {
            ctx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${alpha * 0.8})`;
            ctx.shadowBlur = 0;
          }
          
          const char = chars[Math.floor(Math.random() * charsLen)];
          ctx.fillText(char, i * spacing, y);
          
          if (Math.random() > 0.85 && y > 0) {
            const trailAlpha = alpha * 0.3;
            ctx.shadowBlur = 0;
            ctx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${trailAlpha})`;
            ctx.fillText(chars[Math.floor(Math.random() * charsLen)], i * spacing, y - fontSize);
            ctx.fillText(chars[Math.floor(Math.random() * charsLen)], i * spacing, y - fontSize * 2);
          }
          
          ctx.shadowBlur = 0;
        }
        
        drops[i] += speeds[i];
        
        if (drops[i] * fontSize > canvas.height) {
          if (Math.random() > 0.92) {
            drops[i] = Math.random() * -25;
            speeds[i] = 0.4 + Math.random() * 0.8;
            colors[i] = Math.floor(Math.random() * colorPalette.length);
            brightness[i] = 0.6 + Math.random() * 0.4;
          }
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    document.addEventListener("visibilitychange", () => {
      isVisible = !document.hidden;
    });

    animationId = requestAnimationFrame(draw);
  };

  const initMarquee = () => {
    const marquee = document.querySelector(".marquee-track");
    if (!marquee) return;
    
    const content = marquee.querySelector(".marquee-content");
    if (!content) return;
    
    marquee.appendChild(content.cloneNode(true));
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
        const offset = header ? header.offsetHeight + 20 : 80;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        
        if (lenis) {
          lenis.scrollTo(top, { duration: 1.5 });
        } else {
          window.scrollTo({ top, behavior: "smooth" });
        }
        
        const nav = document.querySelector(".nav");
        const menuBtn = document.querySelector(".menu-btn");
        if (nav && nav.classList.contains("open")) {
          nav.classList.remove("open");
          menuBtn?.classList.remove("active");
          document.body.style.overflow = "";
        }
      });
    });
  };

  const initMobileMenu = () => {
    const menuBtn = document.querySelector(".menu-btn");
    const nav = document.querySelector(".nav");
    
    if (!menuBtn || !nav) return;

    menuBtn.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      menuBtn.classList.toggle("active", isOpen);
      menuBtn.setAttribute("aria-expanded", String(isOpen));
      document.body.style.overflow = isOpen ? "hidden" : "";
      
      if (lenis) {
        isOpen ? lenis.stop() : lenis.start();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("open")) {
        nav.classList.remove("open");
        menuBtn.classList.remove("active");
        document.body.style.overflow = "";
        if (lenis) lenis.start();
      }
    });
  };

  const initHeaderHide = () => {
    const header = document.querySelector(".header");
    if (!header) return;
    
    let lastScroll = 0;
    let ticking = false;

    const update = () => {
      const currentScroll = window.scrollY;
      header.classList.toggle("hidden", currentScroll > lastScroll && currentScroll > 120);
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
    
    if (!sections.length || !navLinks.length) return;
    
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
      { rootMargin: "-35% 0px -60% 0px" }
    );
    
    sections.forEach((section) => observer.observe(section));
  };

  const initBackToTop = () => {
    const btn = document.querySelector(".back-to-top");
    if (!btn) return;

    let ticking = false;

    const update = () => {
      btn.classList.toggle("visible", window.scrollY > 300);
      ticking = false;
    };

    window.addEventListener("scroll", () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (lenis) {
        lenis.scrollTo(0, { duration: 1.5 });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  };

  const enableMotionUI = () => {
    root.dataset.js = "ready";
  };

  const init = () => {
    const run = (fn) => { try { fn(); } catch (e) { console.warn(e); } };

    [
      enableMotionUI,
      initLenis,
      initCustomCursor,
      initMagneticButtons,
      initVanillaTilt,
      initSplitting,
      initTypedJS,
      initTsParticles,
      initQuicklink,
      initGSAPAnimations,
      initMatrixRain,
      initMarquee,
      initSmoothScroll,
      initMobileMenu,
      initHeaderHide,
      initActiveNav,
      initBackToTop
    ].forEach(run);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
