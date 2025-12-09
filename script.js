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
      if (!root.dataset.lowperf) {
        const hc = navigator.hardwareConcurrency || 0;
        const dm = navigator.deviceMemory || 0;
        const isMobile = Math.max(screen.width, screen.height) <= 900;
        if ((hc && hc <= 2) || (dm && dm <= 2 && isMobile)) {
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

  function initTypingRotation() {
    const el = document.querySelector(".code-line .typing");
    if (!el) return;
    const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lines = [
      "system.hack() // ACCESS GRANTED",
      "kernel.exploit(0x41414141);",
      "memcpy(shellcode, payload, 0x100);",
      "decrypt(key, cipher) -> plaintext",
      "buffer_overflow(target, sizeof(ret));",
      "root@localhost:~$ sudo ./pwn",
      "stack.smash() // ROP chain ready",
      "firewall.bypass(port=443);",
      "crypto::aes256_decrypt(data);",
      "reverse_shell.connect(\"0.0.0.0\");"
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

  function initCursorRing() {
    const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || document.documentElement.dataset.lowperf === "1") return;

    const ring = document.createElement("div");
    ring.className = "cursor-ring";
    (document.documentElement || document.body).appendChild(ring);

    const trail = document.createElement("div");
    trail.className = "cursor-trail";
    trail.style.cssText = "position:fixed;left:0;top:0;width:8px;height:8px;background:rgba(0,255,65,0.6);border-radius:50%;pointer-events:none;z-index:9997;mix-blend-mode:screen;box-shadow:0 0 10px rgba(0,255,65,0.8);transition:opacity 0.3s;";
    (document.documentElement || document.body).appendChild(trail);

    let x = window.innerWidth * 0.5;
    let y = window.innerHeight * 0.5;
    let tx = x, ty = y;
    let trailX = x, trailY = y;
    let scale = 1, tScale = 1;
    let raf = 0;

    const update = () => {
      x += (tx - x) * 0.15;
      y += (ty - y) * 0.15;
      trailX += (tx - trailX) * 0.08;
      trailY += (ty - trailY) * 0.08;
      scale += (tScale - scale) * 0.2;
      ring.style.transform = `translate3d(${(x - 12)}px, ${(y - 12)}px, 0) scale(${scale})`;
      trail.style.transform = `translate3d(${(trailX - 4)}px, ${(trailY - 4)}px, 0)`;
      raf = requestAnimationFrame(update);
    };

    const isInteractive = (el) => !!(el && el.closest('a, button, .btn, .menu-toggle, .theme-toggle, .fx-toggle, .nav a, .card, .copy-btn, .swiper-button-prev, .swiper-button-next, .chip'));
    const move = (e) => { tx = e.clientX; ty = e.clientY; if (!raf) raf = requestAnimationFrame(update); };
    const over = (e) => { 
      const interactive = isInteractive(e.target);
      tScale = interactive ? 1.5 : 1.0;
      ring.style.borderColor = interactive ? "#00f0ff" : "#00ff41";
    };
    const down = () => { tScale = Math.max(0.7, tScale - 0.3); };
    const up = () => { tScale = isInteractive(document.elementFromPoint(tx, ty)) ? 1.5 : 1.0; };

    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("mousemove", move, { passive: true });
    document.addEventListener("pointerover", over, { passive: true });
    document.addEventListener("pointerdown", down, { passive: true });
    document.addEventListener("pointerup", up, { passive: true });
    window.addEventListener("blur", () => { tScale = 1; }, { passive: true });

    let scrollTimer = 0;
    const hideWhileScroll = () => {
      ring.style.opacity = "0";
      trail.style.opacity = "0";
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => { ring.style.opacity = "0.8"; trail.style.opacity = "0.6"; }, 140);
    };
    window.addEventListener("scroll", hideWhileScroll, { passive: true });
    window.addEventListener("wheel", hideWhileScroll, { passive: true });
    document.addEventListener("mouseleave", () => { ring.style.opacity = "0"; trail.style.opacity = "0"; }, { passive: true });
    document.addEventListener("mouseenter", () => { ring.style.opacity = "0.8"; trail.style.opacity = "0.6"; }, { passive: true });

    if (!raf) raf = requestAnimationFrame(update);
  }

  function initButtonEffects() {
    const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.addEventListener("pointerdown", (e) => {
      const btn = e.target && e.target.closest && e.target.closest('.btn.primary');
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const ripple = document.createElement("span");
      ripple.className = "ripple";
      ripple.style.left = x + "px";
      ripple.style.top = y + "px";
      btn.appendChild(ripple);
      requestAnimationFrame(() => ripple.classList.add("animate"));
      setTimeout(() => { try { btn.removeChild(ripple); } catch(_) {} }, 650);
      if (!prefersReduced) {
        btn.classList.add("click-shine");
        setTimeout(() => btn.classList.remove("click-shine"), 620);
      }
    }, { passive: true });
  }

  function initSpotlightsOverlay() {
    const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || document.documentElement.dataset.lowperf === "1") return;
    const root = document.documentElement;
    let raf = 0;
    const step = () => {
      const y = window.scrollY || 0;
      root.style.setProperty("--sp1y", `calc(18% + ${Math.round(y * 0.06)}px)`);
      root.style.setProperty("--sp2y", `calc(32% + ${Math.round(-y * 0.04)}px)`);
      raf = 0;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(step); };
    const onMove = (e) => {
      const nx = e.clientX / Math.max(1, window.innerWidth);
      root.style.setProperty("--sp1x", `${Math.round(10 + nx * 30)}%`);
      root.style.setProperty("--sp2x", `${Math.round(60 + nx * 30)}%`);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    step();
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

  function initLeetCodeStats() {
    const card = document.querySelector("[data-leetcode-root]");
    if (!card) return;
    const username = (card.dataset.username || "").trim();
    if (!username) return;
    const number = new Intl.NumberFormat("ru-RU");
    const percent = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
    const toNumber = (value) => {
      if (value === undefined || value === null || value === "") return Number.NaN;
      if (typeof value === "number") return Number.isNaN(value) ? Number.NaN : value;
      const cleaned = String(value).replace(/%/g, "").replace(/,/g, ".").replace(/\s+/g, "");
      const parsed = Number(cleaned);
      return Number.isNaN(parsed) ? Number.NaN : parsed;
    };
    const seed = {
      contestRating: 1576,
      globalRanking: 205833,
      contestAttended: 2,
      topPercent: 26.76,
      solved: 1742,
      total: 3735,
      easySolved: 478,
      easyTotal: 910,
      mediumSolved: 937,
      mediumTotal: 1944,
      hardSolved: 327,
      hardTotal: 881,
      attempting: 56,
      submissionsYear: 1327,
      activeDays: 72,
      maxStreak: 3,
      badges: 7,
      acceptance: 61.59
    };
    const assign = (field, value, mode) => {
      const node = card.querySelector(`[data-lc-field="${field}"]`);
      if (!node) return;
      let next = value;
      if (next === undefined || next === null || next === "") next = seed[field];
      if (next === undefined || next === null || next === "") return;
      if (mode === "percent") {
        const raw = toNumber(next);
        if (!Number.isNaN(raw)) {
          node.textContent = percent.format(raw);
          return;
        }
        node.textContent = String(next);
        return;
      }
      if (typeof next === "number" && !Number.isNaN(next)) {
        node.textContent = number.format(next);
        return;
      }
      const parsed = toNumber(next);
      if (!Number.isNaN(parsed)) node.textContent = number.format(parsed);
      else node.textContent = String(next);
    };
    const setDifficulty = (key, snapshot) => {
      const row = card.querySelector(`[data-lc-bar="${key}"]`);
      if (!row) return;
      const solvedNode = row.querySelector(`[data-lc-bar-solved="${key}"]`);
      const totalNode = row.querySelector(`[data-lc-bar-total="${key}"]`);
      const solvedVal = toNumber(snapshot[`${key}Solved`]);
      const totalVal = toNumber(snapshot[`${key}Total`]);
      if (solvedNode) solvedNode.textContent = number.format(Number.isNaN(solvedVal) ? 0 : Math.max(0, solvedVal));
      if (totalNode) totalNode.textContent = number.format(Number.isNaN(totalVal) ? 0 : Math.max(0, totalVal));
    };
    const updateWheel = (snapshot) => {
      const chart = card.querySelector("[data-lc-wheel-chart]");
      if (!chart) return;
      const solvedVal = toNumber(snapshot.solved);
      const easyVal = toNumber(snapshot.easySolved);
      const mediumVal = toNumber(snapshot.mediumSolved);
      const hardVal = toNumber(snapshot.hardSolved);
      let totalSolved = solvedVal;
      if (!totalSolved || Number.isNaN(totalSolved) || totalSolved <= 0) {
        let sum = 0;
        if (!Number.isNaN(easyVal) && easyVal > 0) sum += easyVal;
        if (!Number.isNaN(mediumVal) && mediumVal > 0) sum += mediumVal;
        if (!Number.isNaN(hardVal) && hardVal > 0) sum += hardVal;
        totalSolved = sum;
      }
      if (!totalSolved || Number.isNaN(totalSolved) || totalSolved <= 0) {
        chart.style.setProperty("--easy", "0%");
        chart.style.setProperty("--medium", "0%");
        chart.style.setProperty("--hard", "0%");
        return;
      }
      const ratio = (value) => {
        if (Number.isNaN(value) || !Number.isFinite(value) || value <= 0) return 0;
        return Math.max(0, value) / totalSolved;
      };
      const clamp = (value) => Math.max(0, Math.min(1, value));
      const easyPortion = clamp(ratio(easyVal));
      const mediumPortion = clamp(ratio(mediumVal));
      const hardPortion = clamp(ratio(hardVal));
      const cumulativeEasy = clamp(easyPortion);
      const cumulativeMedium = clamp(cumulativeEasy + mediumPortion);
      const cumulativeHard = clamp(cumulativeMedium + hardPortion);
      chart.style.setProperty("--easy", `${(cumulativeEasy * 100).toFixed(2)}%`);
      chart.style.setProperty("--medium", `${(cumulativeMedium * 100).toFixed(2)}%`);
      chart.style.setProperty("--hard", `${(cumulativeHard * 100).toFixed(2)}%`);
    };
    const computeAcceptance = (snapshot) => {
      const provided = toNumber(snapshot.acceptance);
      if (!Number.isNaN(provided)) return provided;
      const solvedVal = toNumber(snapshot.solved);
      const totalVal = toNumber(snapshot.total);
      if (Number.isNaN(solvedVal) || Number.isNaN(totalVal) || totalVal <= 0) return Number.NaN;
      return (solvedVal / totalVal) * 100;
    };
    const applyAll = (data) => {
      const snapshot = Object.assign({}, seed, data);
      assign("contestRating", snapshot.contestRating);
      assign("globalRanking", snapshot.globalRanking);
      assign("contestAttended", snapshot.contestAttended);
      assign("topPercent", snapshot.topPercent, "percent");
      assign("solved", snapshot.solved);
      assign("total", snapshot.total);
      assign("attempting", snapshot.attempting);
      assign("submissionsYear", snapshot.submissionsYear);
      assign("activeDays", snapshot.activeDays);
      assign("maxStreak", snapshot.maxStreak);
      assign("badges", snapshot.badges);
      const acceptanceValue = computeAcceptance(snapshot);
      assign("acceptance", Number.isNaN(acceptanceValue) ? snapshot.acceptance : acceptanceValue, "percent");
      setDifficulty("easy", snapshot);
      setDifficulty("medium", snapshot);
      setDifficulty("hard", snapshot);
      updateWheel(snapshot);
    };
    const merge = (target, source) => {
      if (!source) return;
      Object.keys(source).forEach((key) => {
        const val = source[key];
        if (val === undefined || val === null || val === "") return;
        if (typeof val === "number" && Number.isNaN(val)) return;
        target[key] = val;
      });
    };
    const fetchAlpha = () => {
      const url = `https://alfa-leetcode-api.onrender.com/${encodeURIComponent(username)}`;
      return fetch(url).then((res) => {
        if (!res.ok) throw new Error("alpha");
        return res.json();
      }).then((json) => {
        if (!json) return null;
        const data = json.data || json.user || json;
        if (!data || typeof data !== "object") return null;
        const pool = [];
        if (data.userContestRanking) pool.push(data.userContestRanking);
        if (data.contestRanking) pool.push(data.contestRanking);
        if (data.contest) pool.push(data.contest);
        if (data.profile && data.profile.userContestRanking) pool.push(data.profile.userContestRanking);
        if (data.profile && data.profile.contestRanking) pool.push(data.profile.contestRanking);
        if (Array.isArray(data.contestRankingHistory) && data.contestRankingHistory.length) {
          pool.push(data.contestRankingHistory[data.contestRankingHistory.length - 1]);
        }
        let info = null;
        pool.forEach((item) => {
          if (item && typeof item === "object") info = Object.assign({}, info || {}, item);
        });
        if (!info) return null;
        const pick = (...keys) => {
          for (const key of keys) {
            if (info[key] !== undefined && info[key] !== null) return info[key];
          }
          return undefined;
        };
        const result = {};
        const rating = pick("rating", "contestRating", "currentRating");
        const top = pick("topPercentage", "topPercent", "percentile", "topPercentile");
        const rank = pick("globalRanking", "ranking", "globalRank", "rank");
        const attended = pick("attendedContestsCount", "contestAttended", "contestCount", "attended");
        if (rating !== undefined) result.contestRating = Number(rating);
        if (top !== undefined) result.topPercent = Number(top);
        if (rank !== undefined) result.globalRanking = Number(rank);
        if (attended !== undefined) result.contestAttended = Number(attended);
        return Object.keys(result).length ? result : null;
      }).catch(() => null);
    };
    const fetchStats = () => {
      const url = `https://leetcode-stats-api.herokuapp.com/${encodeURIComponent(username)}`;
      return fetch(url).then((res) => {
        if (!res.ok) throw new Error("stats");
        return res.json();
      }).then((json) => {
        if (!json || json.status !== "success") return null;
        const result = {};
        const parse = (value) => {
          if (value === undefined || value === null || value === "") return undefined;
          if (typeof value === "number") return Number.isNaN(value) ? undefined : value;
          const num = Number(String(value).replace(/%/g, "").replace(/,/g, "").trim());
          return Number.isNaN(num) ? undefined : num;
        };
        const set = (key, value) => {
          const parsed = parse(value);
          if (parsed !== undefined) result[key] = parsed;
        };
        set("solved", json.totalSolved);
        set("total", json.totalQuestions);
        set("easySolved", json.easySolved);
        set("easyTotal", json.totalEasy);
        set("mediumSolved", json.mediumSolved);
        set("mediumTotal", json.totalMedium);
        set("hardSolved", json.hardSolved);
        set("hardTotal", json.totalHard);
        set("globalRanking", json.ranking);
        set("contestRating", json.contestRating);
        set("contestAttended", json.contestAttended);
        set("topPercent", json.topPercentile || json.topPercentage);
        set("acceptance", json.acceptanceRate);
        return Object.keys(result).length ? result : null;
      }).catch(() => null);
    };
    const CACHE_KEY = "leetcode_stats_cache";
    const CACHE_TTL = 30 * 60 * 1000;
    const loadCache = () => {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const { data, timestamp } = JSON.parse(raw);
        if (Date.now() - timestamp > CACHE_TTL) {
          localStorage.removeItem(CACHE_KEY);
          return null;
        }
        return data;
      } catch { return null; }
    };
    const saveCache = (data) => {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
      } catch {}
    };
    const cached = loadCache();
    if (cached) {
      applyAll(cached);
      return;
    }
    applyAll(seed);
    Promise.allSettled([fetchAlpha(), fetchStats()]).then((results) => {
      const merged = Object.assign({}, seed);
      results.forEach((res) => {
        if (res.status === "fulfilled") merge(merged, res.value);
      });
      saveCache(merged);
      if (typeof merged.solved !== "number" || Number.isNaN(merged.solved)) {
        const easy = typeof merged.easySolved === "number" ? merged.easySolved : undefined;
        const medium = typeof merged.mediumSolved === "number" ? merged.mediumSolved : undefined;
        const hard = typeof merged.hardSolved === "number" ? merged.hardSolved : undefined;
        if (easy !== undefined && medium !== undefined && hard !== undefined) merged.solved = easy + medium + hard;
      }
      if (typeof merged.total !== "number" || Number.isNaN(merged.total)) {
        const easyT = typeof merged.easyTotal === "number" ? merged.easyTotal : undefined;
        const mediumT = typeof merged.mediumTotal === "number" ? merged.mediumTotal : undefined;
        const hardT = typeof merged.hardTotal === "number" ? merged.hardTotal : undefined;
        if (easyT !== undefined && mediumT !== undefined && hardT !== undefined) merged.total = easyT + mediumT + hardT;
      }
      const acceptanceValue = computeAcceptance(merged);
      if (!Number.isNaN(acceptanceValue)) merged.acceptance = acceptanceValue;
      applyAll(merged);
    });
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

  function initFxToggle() {
    const btn = document.querySelector(".fx-toggle");
    if (!btn) return;
    const root = document.documentElement;
    const icon = btn.querySelector("i");
    const storeKey = "lowperf";
    const apply = (low) => {
      if (low) {
        root.dataset.lowperf = "1";
        if (icon) icon.className = "ri-magic-line";
        btn.title = "Эффекты: выключены";
        btn.setAttribute("aria-label", "Сменить эффекты (выключены)");
      } else {
        delete root.dataset.lowperf;
        if (icon) icon.className = "ri-magic-line";
        btn.title = "Эффекты: включены";
        btn.setAttribute("aria-label", "Сменить эффекты (включены)");
        try { initCodeRain(); } catch(_) {}
      }
    };
    const read = () => {
      try { return localStorage.getItem(storeKey) === "1"; } catch(_) { return false; }
    };
    let low = read();
    apply(low);
    btn.addEventListener("click", () => {
      low = !low;
      try { if (low) localStorage.setItem(storeKey, "1"); else localStorage.removeItem(storeKey); } catch(_) {}
      apply(low);
    });
  }

  function initCodeRain() {
    const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    class CodeRain {
      constructor(canvas, options) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.opts = Object.assign({
          fontSize: 16,
          speed: 1.2,
          backgroundAlpha: 0.05,
          glowIntensity: 1
        }, options || {});
        let dpr = window.devicePixelRatio || 1;
        if (document.documentElement.dataset.lowperf === "1") dpr = 1;
        this.scale = Math.max(1, Math.min(2, dpr));
        this.chars = "01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン{}[]()<>;=+-*/%#&|^~!?$@\\/:".split("");
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
        this.fadeColor = "rgba(10, 10, 15, " + this.opts.backgroundAlpha + ")";
        this.primaryColor = "#00ff41";
        this.secondaryColor = "#00f0ff";
        this.brightColor = "#ffffff";
        this.shadowBlur = this.low ? 0 : 8;
        this.step = this.low ? 2 : 1;
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
        this.drops = Array.from({length: this.columns}, () => ({
          y: -Math.random() * 40,
          speed: 0.5 + Math.random() * 1.5,
          brightness: Math.random()
        }));
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

        ctx.fillStyle = this.fadeColor;
        ctx.fillRect(0, 0, w, h);

        for (let i = 0; i < this.columns; i += this.step) {
          const drop = this.drops[i];
          const ch = this.chars[(Math.random() * this.chars.length) | 0];
          const x = i * fontSize;
          const y = drop.y * fontSize;
          
          const isHead = Math.random() > 0.7;
          if (isHead) {
            ctx.fillStyle = this.brightColor;
            ctx.shadowColor = this.primaryColor;
            ctx.shadowBlur = this.shadowBlur * 2;
          } else {
            const alpha = 0.3 + drop.brightness * 0.7;
            ctx.fillStyle = `rgba(0, 255, 65, ${alpha})`;
            ctx.shadowColor = this.primaryColor;
            ctx.shadowBlur = this.shadowBlur;
          }
          
          ctx.fillText(ch, x, y);
          
          if (y > h && Math.random() > 0.98) {
            drop.y = -Math.random() * 20;
            drop.speed = 0.5 + Math.random() * 1.5;
            drop.brightness = Math.random();
          } else {
            drop.y += drop.speed * speed;
          }
        }
        
        ctx.shadowBlur = 0;
        this.raf = requestAnimationFrame(this._tick);
      }
      dispose() { this.stop(); }
    }

    const disposers = [];

    // Hero canvas sized to hero section
    const heroCanvas = document.getElementById("code-rain");
    if (heroCanvas) {
      if (heroCanvas._rain) {
        return;
      }
      const hero = document.getElementById("hero");
      const low = document.documentElement.dataset.lowperf === "1";
      let heroRain = null;

      const create = () => {
        if (heroRain) return;
        heroRain = new CodeRain(heroCanvas, { fontSize: low ? 20 : 18, speed: low ? 0.5 : 0.7, backgroundAlpha: low ? 0.08 : 0.06 });
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
        if (!low) {
          hero.addEventListener("pointerenter", create, { once: true });
          setTimeout(create, 0);
        }
      } else {
        if (!low) setTimeout(create, 0);
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
    const root = document.documentElement;
    try { localStorage.removeItem("lowperf"); } catch(_) {}
    try { delete root.dataset.lowperf; } catch(_) {}

    // Essential, low-cost inits first
    try {
      initThemeToggle();
      initFxToggle();
      initTypewriterVars();
      initH2Anchors();
      initContactCopyButtons();
      initLeetCodeStats();
      initCursorRing();
      initButtonEffects();
    } catch(_) {}

    const low = false;
    const hydrate = () => {
      scheduleNonCritical(() => {
        try {
          if (!low) initTypingRotation();
          if (!low) initScrollProgressBar();
          if (!low) initAutoHideHeader();
          initCardTilt();
          initHeroParallaxAndRainBoost();
          if (!low) initSpotlightsOverlay();
        } catch(_) {}

        try {
          if (window.AOS && !low) {
            window.AOS.init({
              once: true,
              duration: 600,
              offset: 80,
              easing: "ease-out-quart"
            });
          }
        } catch(_) {}

        try {
          if (window.Lenis && !low) {
            const lenis = new window.Lenis({
              duration: 1.1,
              smoothWheel: true,
              smoothTouch: false
            });
            const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
            requestAnimationFrame(raf);
          }
        } catch(_) {}

        try {
          if (window.Swiper && !low) {
            const el = document.querySelector(".projects-swiper");
            if (el) {
              const pagination = el.querySelector(".swiper-pagination");
              const next = el.querySelector(".swiper-button-next");
              const prev = el.querySelector(".swiper-button-prev");
              new window.Swiper(el, {
                slidesPerView: 1.1,
                spaceBetween: 14,
                loop: false,
                keyboard: { enabled: true },
                pagination: pagination ? { el: pagination, clickable: true } : undefined,
                navigation: next && prev ? { nextEl: next, prevEl: prev } : undefined,
                breakpoints: {
                  640: { slidesPerView: 1.2, spaceBetween: 16 },
                  768: { slidesPerView: 2, spaceBetween: 16 },
                  1024: { slidesPerView: 3, spaceBetween: 18 }
                }
              });
            }
          }
        } catch(_) {}

        if (!low) {
          try { rain = initCodeRain(); } catch(_) {}
        }
      });
    };

    hydrate();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();

  window.addEventListener("pagehide", () => { try { rain && rain.dispose(); } catch(_) {} });

  

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
  try {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
      });
    }
  } catch(_) {}
})();
