(() => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  
  const initMatrixRain = () => {
    if (prefersReducedMotion) return;
    
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
    
    const draw = () => {
      ctx.fillStyle = "rgba(10, 10, 15, 0.04)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.font = `${fontSize}px "JetBrains Mono", monospace`;
      
      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        
        const brightness = Math.random();
        if (brightness > 0.97) {
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = "#00ff41";
          ctx.shadowBlur = 20;
        } else if (brightness > 0.85) {
          ctx.fillStyle = "#00ff41";
          ctx.shadowColor = "#00ff41";
          ctx.shadowBlur = 15;
        } else if (brightness > 0.6) {
          ctx.fillStyle = `rgba(0, 255, 65, ${0.6 + brightness * 0.4})`;
          ctx.shadowColor = "#00ff41";
          ctx.shadowBlur = 10;
        } else {
          ctx.fillStyle = `rgba(0, 255, 65, ${0.2 + brightness * 0.4})`;
          ctx.shadowBlur = 0;
        }
        
        ctx.fillText(char, x, y);
        ctx.shadowBlur = 0;
        
        if (y > canvas.height && Math.random() > 0.98) {
          drops[i] = 0;
        }
        
        drops[i]++;
      }
    };
    
    setInterval(draw, 40);
  };
  
  const initCursorGlow = () => {
    if (prefersReducedMotion) return;
    
    const glow = document.querySelector(".cursor-glow");
    if (!glow) return;
    
    let mouseX = 0, mouseY = 0;
    let glowX = 0, glowY = 0;
    
    document.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });
    
    const animate = () => {
      glowX += (mouseX - glowX) * 0.1;
      glowY += (mouseY - glowY) * 0.1;
      
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
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
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
    });
    
    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        menuBtn.classList.remove("active");
        nav.classList.remove("open");
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
          }
        });
      });
      
      project.addEventListener("mouseleave", () => {
        projects.forEach((p) => {
          p.style.opacity = "1";
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
          setTimeout(typeChar, 80);
        }
      };
      
      setTimeout(typeChar, 1000);
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
        this.style.transform = "scale(1.05)";
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
      z-index: 10000;
      transform-origin: left;
      transform: scaleX(0);
      transition: transform 0.1s;
      box-shadow: 0 0 10px #00ff41;
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
    if (prefersReducedMotion) return;
    
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
    if (prefersReducedMotion) return;
    
    const buttons = document.querySelectorAll(".btn-neon");
    
    buttons.forEach((btn) => {
      btn.addEventListener("mousemove", (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
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
        
        if (navigator.clipboard && !this.href.startsWith("mailto:")) {
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
          icon.style.transition = "transform 0.3s";
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
            wheel.style.animation = "wheel-fill 1.5s ease-out forwards";
            observer.unobserve(entry.target);
          }
          });
        },
      { threshold: 0.5 }
    );
    
    observer.observe(wheel);
  };
  
  const init = () => {
    initMatrixRain();
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
  };
  
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
