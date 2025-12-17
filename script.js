(() => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  const initMatrixRain = () => {
    if (prefersReducedMotion || isMobile) return;
    
    const canvas = document.getElementById("matrix-bg");
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resize();
    window.addEventListener("resize", resize);
    
    const chars = "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン{}[]<>;=+-*/%#&|^~!?$@\\/:YALOKGAR".split("");
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array(columns).fill(1);
    const speeds = Array(columns).fill(0).map(() => 0.5 + Math.random() * 0.5);
    
    const draw = () => {
      ctx.fillStyle = "rgba(10, 10, 15, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.font = `${fontSize}px "JetBrains Mono", monospace`;
      
      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        
        const brightness = Math.random();
        if (brightness > 0.98) {
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = "#00ff41";
          ctx.shadowBlur = 25;
        } else if (brightness > 0.9) {
          ctx.fillStyle = "#00ff41";
          ctx.shadowColor = "#00ff41";
          ctx.shadowBlur = 20;
        } else if (brightness > 0.7) {
          ctx.fillStyle = `rgba(0, 255, 65, ${0.7 + brightness * 0.3})`;
          ctx.shadowColor = "#00ff41";
          ctx.shadowBlur = 12;
        } else if (brightness > 0.4) {
          ctx.fillStyle = `rgba(0, 255, 65, ${0.3 + brightness * 0.4})`;
          ctx.shadowBlur = 5;
        } else {
          ctx.fillStyle = `rgba(0, 255, 65, ${0.1 + brightness * 0.3})`;
          ctx.shadowBlur = 0;
        }
        
        ctx.fillText(char, x, y);
        ctx.shadowBlur = 0;
        
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        
        drops[i] += speeds[i];
      }
    };
    
    setInterval(draw, 35);
  };
  
  const initParticles = () => {
    if (prefersReducedMotion || isMobile) return;
    
    const canvas = document.createElement("canvas");
    canvas.id = "particles-canvas";
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext("2d");
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resize();
    window.addEventListener("resize", resize);
    
    const particles = [];
    const particleCount = 50;
    
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
        this.hue = Math.random() > 0.5 ? 140 : 180;
      }
      
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        
        if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
        if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
      }
      
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, 100%, 50%, ${this.opacity})`;
        ctx.fill();
        
        ctx.shadowColor = `hsl(${this.hue}, 100%, 50%)`;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
    
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }
    
    const connectParticles = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 150) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(0, 255, 65, ${0.1 * (1 - distance / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      
      connectParticles();
      requestAnimationFrame(animate);
    };
    
    animate();
  };
  
  const initCursorGlow = () => {
    if (prefersReducedMotion || isMobile) return;
    
    const glow = document.querySelector(".cursor-glow");
    if (!glow) return;
    
    let mouseX = 0, mouseY = 0;
    let glowX = 0, glowY = 0;
    
    document.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });
    
    const animate = () => {
      glowX += (mouseX - glowX) * 0.08;
      glowY += (mouseY - glowY) * 0.08;
      
      glow.style.left = glowX + "px";
      glow.style.top = glowY + "px";
      
      requestAnimationFrame(animate);
    };
    
    animate();
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
        
        const headerHeight = 80;
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
    
    menuBtn.addEventListener("click", () => {
      menuBtn.classList.toggle("active");
      nav.classList.toggle("open");
      document.body.style.overflow = nav.classList.contains("open") ? "hidden" : "";
    });
    
    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        menuBtn.classList.remove("active");
        nav.classList.remove("open");
        document.body.style.overflow = "";
      });
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
    });
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
    
    items.forEach((item) => {
      const question = item.querySelector(".faq-question");
      
      question.addEventListener("click", () => {
        const isActive = item.classList.contains("active");
        
        items.forEach((i) => i.classList.remove("active"));
        
        if (!isActive) {
          item.classList.add("active");
        }
      });
    });
  };

  const initBackToTop = () => {
    const btn = document.querySelector(".back-to-top");
    if (!btn) return;
    
    window.addEventListener("scroll", () => {
      if (window.scrollY > 500) {
        btn.classList.add("visible");
      } else {
        btn.classList.remove("visible");
      }
    });
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
    
    glitchElements.forEach((el) => {
      setInterval(() => {
        el.style.animation = "none";
        void el.offsetWidth;
        el.style.animation = "";
      }, 5000);
    });
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
      background: linear-gradient(90deg, #00ff41, #00f0ff, #ff00ff);
      z-index: 10001;
      transform-origin: left;
      transform: scaleX(0);
      transition: transform 0.1s;
      box-shadow: 0 0 10px #00ff41, 0 0 20px rgba(0, 255, 65, 0.5);
    `;
    document.body.appendChild(progressBar);
    
    window.addEventListener("scroll", () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollTop / docHeight;
      progressBar.style.transform = `scaleX(${progress})`;
    });
  };
  
  const initParallaxBadges = () => {
    if (prefersReducedMotion || isMobile) return;
    
    const badges = document.querySelectorAll("[data-float]");
    
    if (!badges.length) return;
    
    let scrollY = 0;
    let ticking = false;
    
    const update = () => {
      badges.forEach((badge, index) => {
        const speed = 0.02 + index * 0.01;
        const yPos = scrollY * speed;
        badge.style.transform = `translateY(${yPos}px)`;
      });
      ticking = false;
    };
    
    window.addEventListener("scroll", () => {
      scrollY = window.scrollY;
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    });
  };
  
  const initMagneticButtons = () => {
    if (prefersReducedMotion || isMobile) return;
    
    const buttons = document.querySelectorAll(".btn-neon, .btn-ghost");
    
    buttons.forEach((btn) => {
      btn.addEventListener("mousemove", (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
      });
      
      btn.addEventListener("mouseleave", () => {
        btn.style.transform = "";
      });
    });
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
    
    const tiltElements = document.querySelectorAll(".code-window, .about-terminal, .stat-card");
    
    tiltElements.forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / 20;
        const rotateY = (centerX - x) / 20;
        
        el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
      });
      
      el.addEventListener("mouseleave", () => {
        el.style.transform = "";
      });
    });
  };
  
  const initKonamiCode = () => {
    const konamiCode = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];
    let konamiIndex = 0;
    
    document.addEventListener("keydown", (e) => {
      if (e.keyCode === konamiCode[konamiIndex]) {
        konamiIndex++;
        
        if (konamiIndex === konamiCode.length) {
          activateEasterEgg();
          konamiIndex = 0;
        }
      } else {
        konamiIndex = 0;
      }
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
        color: #00ff41;
        text-shadow: 0 0 20px #00ff41, 0 0 40px #00ff41;
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
    
    const style = document.createElement("style");
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
        background: rgba(0, 255, 65, 0.5);
        border-radius: 50%;
        pointer-events: none;
        z-index: 99999;
        transform: translate(-50%, -50%);
        animation: click-ripple 0.6s ease-out forwards;
      `;
      
      document.body.appendChild(ripple);
      
      setTimeout(() => ripple.remove(), 600);
    });
    
    const style = document.createElement("style");
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
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      });
    }
  };
  
  const initPreloader = () => {
    window.addEventListener("load", () => {
      document.body.classList.add("loaded");
    });
  };
  
  const init = () => {
    initMatrixRain();
    initParticles();
    initCursorGlow();
    initScrollAnimations();
    initMarquee();
    initSmoothScroll();
    initMobileMenu();
    initHeaderHide();
    initActiveNav();
    initProjectHover();
    initFAQ();
    initBackToTop();
    initTypingEffect();
    initGlitchEffect();
    initSkillHover();
    initScrollProgress();
    initParallaxBadges();
    initMagneticButtons();
    initContactLinkCopy();
    initHeroTextAnimation();
    initAchievementHover();
    initLeetCodeAnimation();
    init3DTilt();
    initKonamiCode();
    initTextReveal();
    initImageHover();
    initRingDots();
    initDataStream();
    initClickRipple();
    initNoiseOverlay();
    initServiceWorker();
    initPreloader();
  };
  
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
