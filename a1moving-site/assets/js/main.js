/* Allan Moving Co. — interactions & scroll craft (no dependencies) */
(() => {
  const root = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const desktop = window.matchMedia("(min-width: 960px)");

  root.classList.add("js");

  /* ---------- Header: solid after scroll, hide on scroll down ---------- */
  const header = document.querySelector(".header");
  const fab = document.querySelector(".fab-call");
  const hero = document.querySelector(".hero, .page-hero");
  let lastY = window.scrollY;

  function updateHeader() {
    const y = window.scrollY;
    if (!header) return;
    header.classList.toggle("is-solid", y > 24);
    const goingDown = y > lastY + 4;
    const goingUp = y < lastY - 4;
    if (y > 560 && goingDown && !body.classList.contains("menu-open")) header.classList.add("is-hidden");
    else if (goingUp || y < 560) header.classList.remove("is-hidden");
    if (fab && hero) fab.classList.toggle("is-visible", y > hero.offsetHeight * 0.6);
    lastY = y;
  }

  /* ---------- Mobile menu ---------- */
  const menuBtn = document.querySelector(".menu-btn");
  const menu = document.getElementById("mobile-menu");
  function setMenu(open) {
    body.classList.toggle("menu-open", open);
    menuBtn?.setAttribute("aria-expanded", String(open));
    menuBtn?.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu?.toggleAttribute("inert", !open);
    if (open) header?.classList.remove("is-hidden");
  }
  if (menu) menu.setAttribute("inert", "");
  menuBtn?.addEventListener("click", () => setMenu(!body.classList.contains("menu-open")));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && body.classList.contains("menu-open")) { setMenu(false); menuBtn?.focus(); }
  });
  menu?.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  desktop.addEventListener("change", (e) => { if (e.matches) setMenu(false); });

  /* ---------- Reveal on scroll ---------- */
  const revealTargets = document.querySelectorAll("[data-reveal], .reveal-lines, .map, .bars, [data-count], .stars-pop");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        if (entry.target.hasAttribute("data-count")) countUp(entry.target);
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("is-in"));
  }
  // Above-the-fold heroes reveal immediately on load
  requestAnimationFrame(() => {
    document.querySelector(".hero")?.classList.add("is-ready");
    document.querySelectorAll(".hero .reveal-lines, .hero [data-reveal], .page-hero .reveal-lines, .page-hero [data-reveal]")
      .forEach((el) => el.classList.add("is-in"));
  });

  /* ---------- Count up ---------- */
  function countUp(el) {
    const target = parseFloat(el.dataset.count);
    const decimals = (el.dataset.count.split(".")[1] || "").length;
    const suffix = el.dataset.suffix || "";
    if (reduceMotion) { el.textContent = target.toFixed(decimals) + suffix; return; }
    const duration = 1400;
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 4);
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      el.textContent = (target * ease(t)).toFixed(decimals) + suffix;
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- Parallax + hero fade ---------- */
  const parallaxEls = [...document.querySelectorAll("[data-parallax]")];

  function updateParallax() {
    if (reduceMotion) return;
    const vh = window.innerHeight;
    parallaxEls.forEach((el) => {
      const box = el.parentElement.getBoundingClientRect();
      if (box.bottom < -100 || box.top > vh + 100) return;
      const speed = parseFloat(el.dataset.parallax) || 0.15;
      const offset = (box.top + box.height / 2 - vh / 2) * -speed;
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    });
  }

  /* ---------- Reviews carousel: vertical scroll drives the track sideways (tablet+) ---------- */
  const reviewsScene = document.querySelector(".reviews-scene");
  const reviewsTrack = reviewsScene?.querySelector(".reviews-track");
  const reviewsBar = reviewsScene?.querySelector(".reviews-progress span");
  const pinQuery = window.matchMedia("(min-width: 768px)");
  let reviewsDist = 0;

  function layoutReviews() {
    if (!reviewsScene || !reviewsTrack) return;
    const pin = pinQuery.matches && !reduceMotion;
    reviewsScene.classList.toggle("is-pinned", pin);
    if (!pin) {
      reviewsScene.style.height = "";
      reviewsTrack.style.transform = "";
      return;
    }
    reviewsDist = Math.max(0, reviewsTrack.scrollWidth - document.documentElement.clientWidth);
    // Scene is one screen tall plus however far the track needs to travel
    reviewsScene.style.height = `${window.innerHeight + reviewsDist}px`;
  }

  function updateReviews() {
    if (!reviewsScene || !reviewsScene.classList.contains("is-pinned")) {
      if (reviewsBar && reviewsScene) {
        const vp = reviewsScene.querySelector(".reviews-viewport");
        const max = vp.scrollWidth - vp.clientWidth;
        reviewsBar.style.transform = `scaleX(${max > 0 ? (vp.scrollLeft / max).toFixed(3) : 1})`;
      }
      return;
    }
    const run = reviewsScene.offsetHeight - window.innerHeight;
    const p = run > 0 ? Math.min(1, Math.max(0, -reviewsScene.getBoundingClientRect().top / run)) : 0;
    reviewsTrack.style.transform = `translate3d(${(-p * reviewsDist).toFixed(1)}px, 0, 0)`;
    if (reviewsBar) reviewsBar.style.transform = `scaleX(${p.toFixed(3)})`;
  }

  if (reviewsScene) {
    layoutReviews();
    pinQuery.addEventListener("change", () => { layoutReviews(); updateReviews(); });
    window.addEventListener("resize", () => { layoutReviews(); updateReviews(); }, { passive: true });
    if (document.fonts) document.fonts.ready.then(() => { layoutReviews(); updateReviews(); });
    reviewsScene.querySelector(".reviews-viewport")?.addEventListener("scroll", updateReviews, { passive: true });
  }

  /* ---------- Process steps (sticky storytelling) ---------- */
  const steps = [...document.querySelectorAll(".step")];
  const reel = document.querySelector(".process__counter-reel");
  const procBar = document.querySelector(".process__bar span");
  const stepsFill = document.querySelector(".steps__fill");
  const stepsWrap = document.querySelector(".steps");
  let activeStep = -1;

  function updateSteps() {
    if (!steps.length) return;
    const vh = window.innerHeight;
    const focus = vh * 0.55;
    let idx = 0;
    steps.forEach((s, i) => { if (s.getBoundingClientRect().top < focus) idx = i; });
    if (idx !== activeStep) {
      activeStep = idx;
      steps.forEach((s, i) => {
        s.classList.toggle("is-active", i === idx);
        s.classList.toggle("is-done", i < idx);
      });
      if (reel) reel.style.transform = `translateY(${-idx}em)`;
    }
    if (stepsWrap) {
      const r = stepsWrap.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (focus - r.top) / r.height));
      if (procBar) procBar.style.transform = `scaleX(${p.toFixed(3)})`;
      if (stepsFill) stepsFill.style.transform = `scaleY(${p.toFixed(3)})`;
    }
  }

  /* ---------- Scroll loop ---------- */
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateHeader();
      updateParallax();
      updateSteps();
      updateReviews();
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  onScroll();

  /* ---------- Hero video (progressive) ---------- */
  const video = document.querySelector(".hero__media video");
  const saveData = navigator.connection && navigator.connection.saveData;
  if (video && !reduceMotion && !saveData) {
    const src = window.matchMedia("(max-width: 767px)").matches && video.dataset.srcMobile ? video.dataset.srcMobile : video.dataset.src;
    if (src) {
      video.src = src;
      video.addEventListener("playing", () => video.classList.add("is-playing"), { once: true });
      video.play().catch(() => {});
      document.addEventListener("visibilitychange", () => { document.hidden ? video.pause() : video.play().catch(() => {}); });
    }
  }

  /* ---------- Reviews rail controls ---------- */
  document.querySelectorAll("[data-rail]").forEach((wrap) => {
    const rail = wrap.querySelector(".reviews-rail");
    wrap.querySelectorAll("[data-rail-dir]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const card = rail.querySelector(".review");
        const step = card ? card.getBoundingClientRect().width + 16 : 320;
        rail.scrollBy({ left: step * Number(btn.dataset.railDir), behavior: reduceMotion ? "auto" : "smooth" });
      });
    });
  });

  /* ---------- Review filters ---------- */
  const filterBar = document.querySelector(".filters");
  if (filterBar) {
    const pill = filterBar.querySelector(".filter-pill");
    const buttons = [...filterBar.querySelectorAll(".filter")];
    const cards = [...document.querySelectorAll(".reviews-grid .review")];
    const movePill = (btn) => {
      if (!pill) return;
      pill.style.width = `${btn.offsetWidth}px`;
      pill.style.transform = `translateX(${btn.offsetLeft}px)`;
    };
    const apply = (btn) => {
      buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      movePill(btn);
      const cat = btn.dataset.filter;
      cards.forEach((c) => {
        const show = cat === "all" || c.dataset.cat === cat;
        if (show) {
          c.hidden = false;
          requestAnimationFrame(() => c.classList.remove("is-hiding"));
        } else {
          c.classList.add("is-hiding");
          setTimeout(() => { if (c.classList.contains("is-hiding")) c.hidden = true; }, reduceMotion ? 0 : 220);
        }
      });
      const live = document.getElementById("filter-status");
      if (live) {
        const n = cards.filter((c) => cat === "all" || c.dataset.cat === cat).length;
        live.textContent = `Showing ${n} review${n === 1 ? "" : "s"}`;
      }
    };
    buttons.forEach((b) => b.addEventListener("click", () => apply(b)));
    const initial = buttons.find((b) => b.getAttribute("aria-pressed") === "true") || buttons[0];
    requestAnimationFrame(() => movePill(initial));
    window.addEventListener("resize", () => movePill(buttons.find((b) => b.getAttribute("aria-pressed") === "true")));
    if (document.fonts) document.fonts.ready.then(() => movePill(buttons.find((b) => b.getAttribute("aria-pressed") === "true")));
  }

  /* ---------- Back to top ---------- */
  document.querySelectorAll("[data-top]").forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }));

  /* ---------- Scrollspy: highlight the nav link for the section in view ---------- */
  const navLinks = [...document.querySelectorAll('.nav__link[href^="#"]')];
  const spyMap = new Map(); // observed element -> nav hash
  navLinks.forEach((a) => {
    const hash = a.getAttribute("href");
    let el = document.querySelector(hash);
    if (el && el.classList.contains("anchor")) el = el.nextElementSibling; // zero-height marker before a section
    if (el) spyMap.set(el, hash);
  });
  if ("IntersectionObserver" in window && spyMap.size) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const hash = spyMap.get(entry.target);
        navLinks.forEach((a) => {
          const on = a.getAttribute("href") === hash;
          a.classList.toggle("is-current", on);
          if (on) a.setAttribute("aria-current", "location"); else a.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    spyMap.forEach((_, el) => spy.observe(el));
  }

  /* ---------- Year ---------- */
  document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });
})();

/* ===== Gallery lightbox ===== */
(() => {
  const box = document.querySelector(".lightbox");
  if (!box || typeof box.showModal !== "function") return;
  const img = box.querySelector(".lightbox__img");
  document.querySelectorAll(".gallery__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const thumb = btn.querySelector("img");
      img.src = btn.dataset.full; img.alt = thumb.alt;
      box.showModal();
    });
  });
  box.querySelector(".lightbox__close").addEventListener("click", () => box.close());
  box.addEventListener("click", (e) => { if (e.target === box) box.close(); });
})();
