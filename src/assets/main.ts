import Lenis from "@studio-freight/lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import "./styles/main.css";

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const motionEnabled = document.body.dataset.enableMotion !== "false";
const colorSchemeStorageKey = "hydro-color-scheme";
const momentUpvoteStorageKey = "halo.upvoted.moment.names";
const postUpvoteStorageKey = "halo.upvoted.post.names";
type ColorSchemeMode = "auto" | "dark" | "light";
type HydroLenis = {
  scrollTo?: (target: number) => void;
  start?: () => void;
  stop?: () => void;
};

function isColorSchemeMode(value: string | null): value is ColorSchemeMode {
  return value === "auto" || value === "dark" || value === "light";
}

function readStoredColorScheme() {
  try {
    const value = window.localStorage.getItem(colorSchemeStorageKey);
    return isColorSchemeMode(value) ? value : null;
  } catch {
    return null;
  }
}

function writeStoredColorScheme(mode: ColorSchemeMode) {
  try {
    window.localStorage.setItem(colorSchemeStorageKey, mode);
  } catch {
    // Ignore storage failures so private browsing still gets a working toggle.
  }
}

function readJsonArray(key: string) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeJsonArray(key: string, value: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures; the action itself can still complete.
  }
}

function getHydroLenis() {
  return (window as unknown as { __lenis?: HydroLenis }).__lenis;
}

function readBooleanData(value: string | undefined, fallback = true) {
  if (value == null || value === "") {
    return fallback;
  }
  return value !== "false";
}

function scrollToPosition(top: number) {
  const safeTop = Math.max(0, top);
  const lenis = getHydroLenis();
  if (lenis?.scrollTo) {
    lenis.scrollTo(safeTop);
    return;
  }
  window.scrollTo({ top: safeTop, behavior: "smooth" });
}

function scrollToElement(element: HTMLElement, offset = -92) {
  const top = window.scrollY + element.getBoundingClientRect().top + offset;
  scrollToPosition(top);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function initLenis() {
  if (!motionEnabled || document.body.dataset.smoothScroll === "false") {
    return;
  }

  const lenis = new Lenis({
    duration: 1.2,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    gestureOrientation: "vertical",
    orientation: "vertical",
    smoothWheel: true,
    touchMultiplier: 2,
    wheelMultiplier: 1,
  });

  (window as unknown as { __lenis?: typeof lenis }).__lenis = lenis;
  lenis.on("scroll", () => ScrollTrigger.update());
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

function initColorScheme() {
  const root = document.documentElement;
  const toggles = document.querySelectorAll<HTMLButtonElement>("[data-hydro-theme-toggle]");
  const configuredMode = root.dataset.themeDefault ?? null;
  const defaultMode: ColorSchemeMode = isColorSchemeMode(configuredMode) ? configuredMode : "auto";
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let isTransitioning = false;

  const resolveMode = (mode: ColorSchemeMode) =>
    mode === "dark" || (mode === "auto" && mediaQuery.matches) ? "dark" : "light";
  const getTransitionOrigin = (trigger?: HTMLElement) => {
    const rect = trigger?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : 64;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    return { radius, x, y };
  };

  const applyMode = (mode: ColorSchemeMode) => {
    const resolvedMode = resolveMode(mode);
    root.dataset.hydroTheme = resolvedMode;
    root.dataset.colorScheme = mode;
    root.classList.toggle("dark", mode === "dark");
    root.classList.toggle("light", mode === "light");
    root.classList.toggle("color-scheme-dark", mode === "dark");
    root.classList.toggle("color-scheme-light", mode === "light");
    root.classList.toggle("color-scheme-auto", mode === "auto");
    root.style.colorScheme = resolvedMode;

    toggles.forEach((toggle) => {
      const nextLabel = resolvedMode === "dark" ? "切换为浅色模式" : "切换为深色模式";
      toggle.setAttribute("aria-label", nextLabel);
      toggle.setAttribute("title", nextLabel);
      toggle.setAttribute("aria-pressed", String(resolvedMode === "dark"));
    });
  };
  const setTransitionVars = (origin: ReturnType<typeof getTransitionOrigin>) => {
    root.style.setProperty("--hydro-theme-transition-x", `${origin.x}px`);
    root.style.setProperty("--hydro-theme-transition-y", `${origin.y}px`);
    root.style.setProperty("--hydro-theme-transition-radius", `${origin.radius}px`);
  };
  const runThemeTransition = (mode: ColorSchemeMode, origin: ReturnType<typeof getTransitionOrigin>) => {
    const resolvedMode = resolveMode(mode);
    const styles = window.getComputedStyle(root);
    const targetBackground =
      styles.getPropertyValue(resolvedMode === "dark" ? "--hydro-dark-bg" : "--hydro-light-bg").trim() ||
      styles.getPropertyValue("--hydro-bg").trim();
    const overlay = document.createElement("div");

    overlay.className = "hydro-theme-wipe";
    overlay.style.setProperty("--hydro-theme-wipe-bg", targetBackground);
    overlay.style.setProperty("--hydro-theme-transition-x", `${origin.x}px`);
    overlay.style.setProperty("--hydro-theme-transition-y", `${origin.y}px`);
    overlay.style.setProperty("--hydro-theme-transition-radius", `${origin.radius}px`);
    document.body.append(overlay);

    window.requestAnimationFrame(() => {
      overlay.classList.add("is-expanding");
    });
    // 提前应用主题，让颜色过渡与遮罩扩散同步，创造循序渐进的渐变感
    window.setTimeout(() => {
      applyMode(mode);
    }, 280);
    window.setTimeout(() => {
      overlay.classList.add("is-leaving");
    }, 1000);
    window.setTimeout(() => {
      overlay.remove();
      root.classList.remove("is-theme-transitioning");
      isTransitioning = false;
    }, 2000);
  };
  const transitionToMode = (mode: ColorSchemeMode, trigger?: HTMLElement, forceAnimation = false) => {
    if (isTransitioning) {
      return;
    }
    if (!motionEnabled || (!forceAnimation && reduceMotion.matches)) {
      applyMode(mode);
      return;
    }

    isTransitioning = true;
    root.classList.add("is-theme-transitioning");
    const origin = getTransitionOrigin(trigger);
    setTransitionVars(origin);
    runThemeTransition(mode, origin);
  };

  const getActiveMode = () => readStoredColorScheme() ?? defaultMode;

  applyMode(getActiveMode());

  toggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const nextMode: ColorSchemeMode = root.dataset.hydroTheme === "dark" ? "light" : "dark";
      writeStoredColorScheme(nextMode);
      transitionToMode(nextMode, toggle, true);
    });
  });

  mediaQuery.addEventListener("change", () => {
    if (!readStoredColorScheme() && defaultMode === "auto") {
      transitionToMode("auto");
    }
  });
}

function initNavigation() {
  const nav = document.querySelector<HTMLElement>("[data-hydro-nav]");
  const searchToggle = document.querySelector<HTMLButtonElement>("[data-hydro-search-toggle]");
  const searchPanel = document.querySelector<HTMLElement>("[data-hydro-search-panel]");
  const mobileToggle = document.querySelector<HTMLButtonElement>("[data-hydro-mobile-toggle]");
  const mobileMenu = document.querySelector<HTMLElement>("[data-hydro-mobile-menu]");
  let navMode: "top" | "pill" = window.scrollY > 100 ? "pill" : "top";
  let navTimers: number[] = [];
  let lastScrollY = window.scrollY;
  let lastTime = performance.now();
  let scrollVelocity = 0;
  let rafId: number | null = null;

  const clearNavTimers = () => {
    navTimers.forEach((timer) => window.clearTimeout(timer));
    navTimers = [];
  };

  const resetNavTransitionClasses = () => {
    nav?.classList.remove(
      "is-nav-transitioning",
      "is-exiting-top",
      "is-entering-pill",
      "is-leaving-pill",
      "is-entering-top",
    );
  };

  if (navMode === "pill") {
    nav?.classList.add("is-scrolled");
  }

  const updateVelocity = () => {
    const currentTime = performance.now();
    const currentScrollY = window.scrollY;
    const deltaTime = currentTime - lastTime;
    const deltaY = Math.abs(currentScrollY - lastScrollY);

    if (deltaTime > 0) {
      // 像素/毫秒，然后平滑处理
      const instantVelocity = deltaY / deltaTime;
      scrollVelocity = scrollVelocity * 0.6 + instantVelocity * 0.4;
    }

    lastScrollY = currentScrollY;
    lastTime = currentTime;
  };

  const syncNav = () => {
    if (!nav) return;

    updateVelocity();

    const shouldBePill = window.scrollY > 100;

    // 速度越快，倍数越小；速度越慢，倍数越大
    // scrollVelocity: 0 px/ms (很慢) → 倍数 5.0
    // scrollVelocity: 2.5 px/ms (快) → 倍数 0.2
    const speedMultiplier = Math.max(0.2, Math.min(5.0, 5.0 - scrollVelocity * 1.92));

    if (shouldBePill && navMode !== "pill") {
      clearNavTimers();
      resetNavTransitionClasses();
      navMode = "pill";

      const exitDuration = Math.round(70 * speedMultiplier);
      const enterDuration = Math.round(600 * speedMultiplier);

      nav.style.setProperty("--nav-exit-duration", `${exitDuration}ms`);
      nav.style.setProperty("--nav-enter-duration", `${enterDuration}ms`);

      nav.classList.add("is-nav-transitioning", "is-exiting-top");
      navTimers.push(
        window.setTimeout(() => {
          nav.classList.remove("is-exiting-top");
          nav.classList.add("is-scrolled", "is-entering-pill");
        }, exitDuration),
        window.setTimeout(() => {
          nav.classList.remove("is-entering-pill", "is-nav-transitioning");
        }, exitDuration + enterDuration),
      );
      return;
    }

    if (!shouldBePill && navMode !== "top") {
      clearNavTimers();
      resetNavTransitionClasses();
      navMode = "top";

      const exitDuration = Math.round(160 * speedMultiplier);
      const enterDuration = Math.round(100 * speedMultiplier);

      nav.style.setProperty("--nav-exit-duration", `${exitDuration}ms`);
      nav.style.setProperty("--nav-enter-duration", `${enterDuration}ms`);

      nav.classList.add("is-nav-transitioning", "is-leaving-pill");
      navTimers.push(
        window.setTimeout(() => {
          nav.classList.remove("is-scrolled", "is-leaving-pill");
          nav.classList.add("is-entering-top");
        }, exitDuration),
        window.setTimeout(() => {
          nav.classList.remove("is-entering-top", "is-nav-transitioning");
        }, exitDuration + enterDuration),
      );
    }
  };

  const onScroll = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      syncNav();
      rafId = null;
    });
  };

  syncNav();
  window.addEventListener("scroll", onScroll, { passive: true });

  searchToggle?.addEventListener("click", () => {
    const isOpen = searchPanel?.classList.toggle("is-open");
    if (isOpen) {
      searchPanel?.querySelector<HTMLInputElement>("input")?.focus();
    }
  });

  mobileToggle?.addEventListener("click", () => {
    mobileToggle.classList.toggle("is-open");
    mobileMenu?.classList.toggle("is-open");
    document.body.classList.toggle("hydro-menu-lock", mobileMenu?.classList.contains("is-open"));
  });

  mobileMenu?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mobileToggle?.classList.remove("is-open");
      mobileMenu.classList.remove("is-open");
      document.body.classList.remove("hydro-menu-lock");
    });
  });

  // Desktop dropdowns
  document.querySelectorAll<HTMLElement>("[data-hydro-dropdown]").forEach((dropdown) => {
    const menu = dropdown.querySelector<HTMLElement>(".hydro-dropdown__menu");
    if (!menu) return;

    let hideTimer: number | undefined;

    const show = () => {
      if (hideTimer) window.clearTimeout(hideTimer);
      menu.classList.add("is-visible");
    };

    const hide = () => {
      hideTimer = window.setTimeout(() => {
        menu.classList.remove("is-visible");
      }, 150);
    };

    dropdown.addEventListener("mouseenter", show);
    dropdown.addEventListener("mouseleave", hide);
    menu.addEventListener("mouseenter", show);
    menu.addEventListener("mouseleave", hide);
  });
}

function initScrambleLinks() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

  document.querySelectorAll<HTMLAnchorElement>("[data-scramble]").forEach((link) => {
    if (link.closest(".hydro-nav__links")) {
      return;
    }

    const label = link.textContent ?? "";
    link.addEventListener("mouseenter", () => {
      let iterations = 0;
      const maxIterations = 10;
      const interval = window.setInterval(() => {
        link.textContent = Array.from(label)
          .map((char, index) => {
            if (char.trim() === "") {
              return char;
            }
            if (index < iterations / 2) {
              return char;
            }
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("");

        iterations += 1;
        if (iterations > maxIterations) {
          window.clearInterval(interval);
          link.textContent = label;
        }
      }, 30);
    });
  });
}

function initHero() {
  const hero = document.querySelector<HTMLElement>("[data-hydro-hero]");
  const image = document.querySelector<HTMLElement>("[data-hydro-hero-image]");
  const imageMotion = document.querySelector<HTMLElement>("[data-hydro-hero-motion]");
  const title = document.querySelector<HTMLElement>("[data-split-title]");

  if (!hero || !motionEnabled) {
    return;
  }

  if (title?.textContent) {
    title.innerHTML = Array.from(title.textContent)
      .map((char) => {
        const content = char === " " ? "&nbsp;" : escapeHtml(char);
        return `<span class="split-char"><span>${content}</span></span>`;
      })
      .join("");
  }

  const setHeroImageY = image ? gsap.quickTo(image, "y", { duration: 0.12, ease: "power1.out" }) : undefined;

  const ctx = gsap.context(() => {
    gsap.fromTo(
      image,
      { clipPath: "inset(100% 0 0 0)", scale: 1.1 },
      { clipPath: "inset(0% 0 0 0)", duration: 1.5, ease: "expo.out", scale: 1, delay: 0.3 },
    );
    gsap.fromTo(
      ".split-char span",
      { y: "100%" },
      { y: "0%", duration: 1, ease: "expo.out", stagger: 0.05, delay: 0.6 },
    );
    gsap.fromTo(
      ".hydro-list-item",
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 0.8, ease: "expo.out", stagger: 0.1, delay: 0.9 },
    );

    ScrollTrigger.create({
      trigger: hero,
      start: "top top",
      end: "bottom top",
      scrub: true,
      onUpdate: (self) => {
        setHeroImageY?.(self.progress * -50);
      },
    });
  }, hero);

  const setImageX = imageMotion ? gsap.quickTo(imageMotion, "x", { duration: 0.35, ease: "power3.out" }) : undefined;
  const setImageY = imageMotion ? gsap.quickTo(imageMotion, "y", { duration: 0.35, ease: "power3.out" }) : undefined;

  hero.addEventListener("mousemove", (event) => {
    const rect = hero.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    hero.style.setProperty("--hero-mouse-x", `${x * 100}%`);
    hero.style.setProperty("--hero-mouse-y", `${y * 100}%`);
    setImageX?.((x - 0.5) * 22);
    setImageY?.((y - 0.5) * 22);
  });

  hero.addEventListener("mouseleave", () => {
    setImageX?.(0);
    setImageY?.(0);
  });

  window.addEventListener("pagehide", () => ctx.revert(), { once: true });
}

function initRevealAnimations() {
  if (!motionEnabled) {
    return;
  }

  document.querySelectorAll<HTMLElement>("[data-reveal-section]").forEach((section) => {
    const title = section.querySelector("[data-reveal-title]");
    const cards = Array.from(section.querySelectorAll("[data-tilt-card]"));
    const targets = [title, ...cards].filter(Boolean);

    if (targets.length === 0) {
      return;
    }

    gsap.set(title, { opacity: 0, y: 50, force3D: true });
    gsap.set(cards, {
      opacity: prefersReducedMotion.matches ? 0.2 : 0.08,
      rotateX: prefersReducedMotion.matches ? 0 : 10,
      scale: prefersReducedMotion.matches ? 1 : 0.965,
      transformPerspective: 1000,
      transformOrigin: "50% 70%",
      willChange: "transform, opacity",
      y: prefersReducedMotion.matches ? 12 : 56,
      force3D: true,
    });
    gsap
      .timeline({
        scrollTrigger: {
          trigger: section,
          start: "top 78%",
          once: true,
        },
      })
      .to(title, { opacity: 1, duration: prefersReducedMotion.matches ? 0.35 : 0.68, ease: "expo.out", y: 0 })
      .to(
        cards,
        {
          opacity: 1,
          rotateX: 0,
          scale: 1,
          duration: prefersReducedMotion.matches ? 0.65 : 1.75,
          ease: "power2.out",
          stagger: prefersReducedMotion.matches ? 0.1 : 0.24,
          y: 0,
          onComplete: () => gsap.set(cards, { clearProps: "willChange" }),
        },
        "-=0.08",
      );
  });

  const about = document.querySelector<HTMLElement>("[data-about-section]");
  if (about) {
    gsap.fromTo(
      ".about-text-line",
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "expo.out",
        stagger: 0.1,
        scrollTrigger: { trigger: about, start: "top 70%", toggleActions: "play none none reverse" },
      },
    );
  }
}

function scheduleIdleWork(callback: () => void, timeout = 900) {
  const idleWindow = window as typeof window & {
    requestIdleCallback?: (handler: () => void, options?: { timeout: number }) => number;
  };

  if (idleWindow.requestIdleCallback) {
    idleWindow.requestIdleCallback(callback, { timeout });
    return;
  }

  window.setTimeout(callback, 120);
}

function decodeWhenReady(image: HTMLImageElement) {
  const decode = () => {
    if (typeof image.decode !== "function") {
      return;
    }
    image.decode().catch(() => {
      // Browsers may reject decode() for cross-origin or cancelled images; the normal load path still works.
    });
  };

  if (image.complete && image.naturalWidth > 0) {
    decode();
    return;
  }

  image.addEventListener("load", decode, { once: true });
}

function initArticleMediaPrewarm() {
  const section = document.querySelector<HTMLElement>("#articles");
  if (!section) {
    return;
  }

  const images = Array.from(section.querySelectorAll<HTMLImageElement>("[data-prewarm-image]"));
  if (images.length === 0) {
    return;
  }

  let warmed = false;
  const warmImages = () => {
    if (warmed) {
      return;
    }
    warmed = true;

    images.forEach((image) => {
      image.loading = "eager";
      image.decoding = "async";
      decodeWhenReady(image);
    });
  };

  scheduleIdleWork(warmImages, 1200);

  if (!("IntersectionObserver" in window)) {
    warmImages();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) {
        return;
      }
      warmImages();
      observer.disconnect();
    },
    { rootMargin: "1100px 0px" },
  );

  observer.observe(section);
}

function initTiltCards() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    return;
  }

  document.querySelectorAll<HTMLElement>("[data-tilt-card]").forEach((card) => {
    card.addEventListener("mousemove", (event) => {
      if (!motionEnabled) {
        return;
      }
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const rotateX = (y - rect.height / 2) / 20;
      const rotateY = (rect.width / 2 - x) / 20;
      gsap.to(card, { duration: 0.3, ease: "power2.out", rotateX, rotateY });
    });

    card.addEventListener("mouseleave", () => {
      if (motionEnabled) {
        gsap.to(card, { duration: 0.5, ease: "expo.out", rotateX: 0, rotateY: 0 });
      }
    });
  });
}

function initCategoryCursor() {
  const section = document.querySelector<HTMLElement>("[data-categories-section]");
  const cursor = document.querySelector<HTMLElement>("[data-hydro-cursor]");
  if (!section || !cursor) {
    return;
  }

  const positionCursor = (event: MouseEvent) => {
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;
  };

  section.querySelectorAll(".hydro-category-slice").forEach((slice) => {
    slice.addEventListener("mouseenter", (event) => {
      positionCursor(event as MouseEvent);
      cursor.classList.add("is-visible");
    });
    slice.addEventListener("mouseleave", () => cursor.classList.remove("is-visible"));
  });

  section.addEventListener("mousemove", positionCursor);
  section.addEventListener("mouseleave", () => cursor.classList.remove("is-visible"));
}

function initScrollTilt() {
  if (!motionEnabled || prefersReducedMotion.matches) {
    return;
  }

  const tiltTargets = gsap.utils.toArray<HTMLElement>(".tilt-on-scroll");
  if (tiltTargets.length === 0) {
    return;
  }

  let lastScrollY = window.scrollY;
  let settleTimer: number | undefined;
  let ticking = false;
  const setters = tiltTargets.map((target) =>
    gsap.quickTo(target, "rotateX", {
      duration: 0.18,
      ease: "power2.out",
    }),
  );

  const setTilt = (rotateX: number) => {
    setters.forEach((setter) => setter(rotateX));
  };

  window.addEventListener(
    "scroll",
    () => {
      if (ticking) {
        return;
      }
      window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const velocity = currentScrollY - lastScrollY;
        const rotateX = Math.max(-0.8, Math.min(0.8, velocity * 0.018));
        tiltTargets.forEach((target) => target.classList.add("is-scroll-tilting"));
        setTilt(rotateX);
        if (settleTimer) {
          window.clearTimeout(settleTimer);
        }
        settleTimer = window.setTimeout(() => {
          setTilt(0);
          window.setTimeout(() => {
            tiltTargets.forEach((target) => target.classList.remove("is-scroll-tilting"));
          }, 220);
        }, 140);
        lastScrollY = currentScrollY;
        ticking = false;
      });
      ticking = true;
    },
    { passive: true },
  );
}

function initFooterMarquee() {
  if (!motionEnabled) {
    return;
  }

  const track = document.querySelector<HTMLElement>(".hydro-marquee-track");
  const footer = document.querySelector<HTMLElement>(".hydro-footer");
  if (!track || !footer) {
    return;
  }

  const tween = gsap.to(track, { duration: 20, ease: "none", repeat: -1, x: "-50%" });
  ScrollTrigger.create({
    trigger: footer,
    start: "top bottom",
    end: "bottom bottom",
    onUpdate: (self) => tween.timeScale(Math.max(0.5, 1 + self.getVelocity() / 5000)),
  });
}

function initAuthorPage() {
  const page = document.querySelector<HTMLElement>(".hydro-author-page");
  if (!page) {
    return;
  }

  const hero = page.querySelector<HTMLElement>("[data-hydro-author-hero]");
  const portrait = page.querySelector<HTMLElement>("[data-hydro-author-portrait]");
  const work = page.querySelector<HTMLElement>("[data-hydro-author-work]");
  const rail = page.querySelector<HTMLElement>(".hydro-author-hero__rail");
  const intro = page.querySelector<HTMLElement>(".hydro-author-hero__copy");
  const card = page.querySelector<HTMLElement>(".hydro-author-card");
  const pieces = Array.from(page.querySelectorAll<HTMLElement>(".hydro-author-piece"));

  page.classList.add("is-author-ready");

  if (!motionEnabled || prefersReducedMotion.matches) {
    return;
  }

  const entranceTargets = [rail, intro, card].filter(Boolean);
  gsap.fromTo(
    entranceTargets,
    { autoAlpha: 0, y: 28, filter: "blur(8px)" },
    {
      autoAlpha: 1,
      duration: 0.8,
      ease: "expo.out",
      filter: "blur(0px)",
      stagger: 0.08,
      y: 0,
    },
  );

  if (hero && portrait) {
    gsap.to(portrait, {
      ease: "none",
      rotate: 1.4,
      scrollTrigger: {
        trigger: hero,
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
      yPercent: -5,
    });
  }

  if (work && pieces.length > 0) {
    gsap.fromTo(
      pieces,
      { autoAlpha: 0, x: -18 },
      {
        autoAlpha: 1,
        duration: 0.72,
        ease: "expo.out",
        scrollTrigger: {
          trigger: work,
          start: "top 82%",
          once: true,
        },
        stagger: 0.06,
        x: 0,
      },
    );
  }
}

function slugifyHeading(text: string, index: number) {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^\u4e00-\u9fa5\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return base ? `post-${base}` : `post-section-${index + 1}`;
}

function initPostToc() {
  const page = document.querySelector<HTMLElement>(".hydro-post-page");
  if (!page || !readBooleanData(page.dataset.postEnableToc)) {
    return;
  }

  const content = page.querySelector<HTMLElement>("#post-content");
  const tocPanel = page.querySelector<HTMLElement>("[data-post-toc-panel]");
  const tocContainer = page.querySelector<HTMLElement>("[data-post-toc]");
  const tocState = page.querySelector<HTMLElement>("[data-post-toc-state]");
  if (!content || !tocPanel || !tocContainer || !tocState) {
    return;
  }

  const headings = Array.from(content.querySelectorAll<HTMLElement>("h1, h2, h3, h4")).filter((heading) => {
    return (heading.textContent ?? "").trim().length > 0;
  });

  if (headings.length === 0) {
    tocPanel.classList.add("is-empty");
    tocState.textContent = "无目录";
    return;
  }

  tocContainer.innerHTML = "";
  tocState.textContent = `${headings.length} 节`;

  const usedIds = new Set<string>();
  const linkMap = new Map<string, HTMLAnchorElement>();

  headings.forEach((heading, index) => {
    const fallbackId = slugifyHeading(heading.textContent ?? "", index);
    const seed = heading.id || fallbackId;
    let resolvedId = seed;
    let suffix = 2;

    while (usedIds.has(resolvedId)) {
      resolvedId = `${seed}-${suffix}`;
      suffix += 1;
    }

    usedIds.add(resolvedId);
    heading.id = resolvedId;

    const link = document.createElement("a");
    link.className = "hydro-post-toc__link";
    link.href = `#${resolvedId}`;
    link.dataset.depth = heading.tagName.replace("H", "");
    link.textContent = (heading.textContent ?? "").trim();
    link.addEventListener("click", (event) => {
      event.preventDefault();
      scrollToElement(heading);
    });

    tocContainer.append(link);
    linkMap.set(resolvedId, link);
  });

  const activateLink = (id: string) => {
    linkMap.forEach((link, key) => {
      link.classList.toggle("is-active", key === id);
    });
  };

  const firstId = headings[0].id;
  if (firstId) {
    activateLink(firstId);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      const activeTarget = visible[0]?.target as HTMLElement | undefined;
      const activeId = activeTarget?.id;
      if (activeId) {
        activateLink(activeId);
      }
    },
    {
      rootMargin: "-18% 0px -62% 0px",
      threshold: [0, 1],
    },
  );

  headings.forEach((heading) => observer.observe(heading));
}

function initPostReadingProgress() {
  const page = document.querySelector<HTMLElement>(".hydro-post-page");
  if (!page || !readBooleanData(page.dataset.postEnableReadingProgress)) {
    return;
  }

  const progressBar = page.querySelector<HTMLElement>("[data-post-reading-progress]");
  const content = page.querySelector<HTMLElement>("#post-content");
  if (!progressBar || !content) {
    return;
  }

  const updateProgress = () => {
    const rect = content.getBoundingClientRect();
    const viewportHeight = Math.max(window.innerHeight, 1);
    const total = rect.height + viewportHeight * 0.35;
    const passed = Math.max(0, Math.min(total, viewportHeight * 0.35 - rect.top));
    const progress = total <= 0 ? 0 : (passed / total) * 100;
    progressBar.style.width = `${Math.max(0, Math.min(100, progress)).toFixed(2)}%`;
  };

  updateProgress();
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
}

function initPostShare() {
  const page = document.querySelector<HTMLElement>(".hydro-post-page");
  if (!page || !readBooleanData(page.dataset.postEnableShare)) {
    return;
  }

  const shareButtons = Array.from(page.querySelectorAll<HTMLButtonElement>("[data-post-action='share']"));
  if (shareButtons.length === 0) {
    return;
  }

  const postTitle = (page.querySelector("h1")?.textContent ?? document.title).trim();
  const postExcerpt = (page.querySelector(".hydro-post-hero p")?.textContent ?? "").trim();

  const copyLink = async (button: HTMLButtonElement, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      button.classList.add("is-copied");
      const originalLabel = button.querySelector("strong");
      const previous = originalLabel?.textContent;
      if (originalLabel) {
        originalLabel.textContent = "已复制";
      }
      window.setTimeout(() => {
        button.classList.remove("is-copied");
        if (originalLabel && previous) {
          originalLabel.textContent = previous;
        }
      }, 1200);
    } catch {
      window.prompt("复制链接", url);
    }
  };

  shareButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const url = window.location.href;
      if (typeof navigator.share === "function") {
        try {
          await navigator.share({
            title: postTitle,
            text: postExcerpt || undefined,
            url,
          });
          return;
        } catch (error) {
          if ((error as DOMException).name === "AbortError") {
            return;
          }
        }
      }
      await copyLink(button, url);
    });
  });
}

function initPostUpvote() {
  const page = document.querySelector<HTMLElement>(".hydro-post-page");
  if (!page || !readBooleanData(page.dataset.postEnableUpvote)) {
    return;
  }

  const postName = page.dataset.postName;
  if (!postName) {
    return;
  }

  const upvoteButtons = Array.from(page.querySelectorAll<HTMLButtonElement>("[data-post-action='upvote']"));
  const upvoteCount = page.querySelector<HTMLElement>("[data-post-upvote-count]");
  if (upvoteButtons.length === 0 || !upvoteCount) {
    return;
  }

  const upvotedNames = new Set(readJsonArray(postUpvoteStorageKey));

  const syncState = () => {
    const active = upvotedNames.has(postName);
    upvoteButtons.forEach((button) => {
      button.classList.toggle("is-upvoted", active);
      button.disabled = active;
    });
  };

  syncState();

  upvoteButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.disabled || upvotedNames.has(postName)) {
        return;
      }

      button.disabled = true;
      try {
        const response = await window.fetch("/apis/api.halo.run/v1alpha1/trackers/upvote", {
          body: JSON.stringify({ group: "content.halo.run", name: postName, plural: "posts" }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        if (!response.ok) {
          throw new Error(`Post upvote failed with ${response.status}`);
        }

        upvotedNames.add(postName);
        writeJsonArray(postUpvoteStorageKey, Array.from(upvotedNames));
        const countValue = Number.parseInt(upvoteCount.textContent || "0", 10);
        upvoteCount.textContent = String(Number.isNaN(countValue) ? 1 : countValue + 1);
        syncState();
      } catch {
        button.disabled = false;
        window.alert("点赞失败，请稍后再试");
      }
    });
  });
}

function initPostActions() {
  const page = document.querySelector<HTMLElement>(".hydro-post-page");
  if (!page || !readBooleanData(page.dataset.postEnableActionRail)) {
    return;
  }

  const topButtons = Array.from(page.querySelectorAll<HTMLButtonElement>("[data-post-action='top']"));
  const commentButtons = Array.from(page.querySelectorAll<HTMLButtonElement>("[data-post-action='comment']"));
  const commentSection = page.querySelector<HTMLElement>("#comment");

  topButtons.forEach((button) => {
    button.addEventListener("click", () => {
      scrollToPosition(0);
    });
  });

  commentButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!commentSection) {
        return;
      }
      scrollToElement(commentSection);
    });
  });
}

function initPostRelatedCards() {
  const page = document.querySelector<HTMLElement>(".hydro-post-page");
  if (!page) {
    return;
  }

  const grid = page.querySelector<HTMLElement>(".hydro-post-related__grid");
  if (!grid) {
    return;
  }

  const limit = Number.parseInt(grid.dataset.relatedLimit || "0", 10);
  const cards = Array.from(grid.querySelectorAll<HTMLElement>(".hydro-post-related-card"));
  const seenPermalinks = new Set<string>();
  let visibleCount = 0;

  cards.forEach((card) => {
    const link = card.querySelector<HTMLAnchorElement>("a");
    const permalink = link?.getAttribute("href") || "";
    const duplicated = permalink.length > 0 && seenPermalinks.has(permalink);
    const overLimit = limit > 0 && visibleCount >= limit;

    if (!link || duplicated || overLimit) {
      card.remove();
      return;
    }

    if (permalink.length > 0) {
      seenPermalinks.add(permalink);
    }
    visibleCount += 1;
  });

  if (visibleCount === 0) {
    grid.closest<HTMLElement>(".hydro-post-related")?.remove();
  }
}

initColorScheme();
initNavigation();
initScrambleLinks();
initLenis();
initHero();
initArticleMediaPrewarm();
initRevealAnimations();
initTiltCards();
initCategoryCursor();
initScrollTilt();
initFooterMarquee();
initAuthorPage();
initPostToc();
initPostActions();
initPostUpvote();
initPostShare();
initPostReadingProgress();
initPostRelatedCards();

function initLinkCards() {
  if (!motionEnabled) {
    return;
  }

  document.querySelectorAll<HTMLElement>(".hydro-links-grid").forEach((grid) => {
    const cards = Array.from(grid.querySelectorAll<HTMLElement>(".hydro-link-card"));
    if (cards.length === 0) {
      return;
    }

    gsap.set(cards, {
      "--hydro-link-reveal-y": "1.4rem",
      autoAlpha: 0,
      clipPath: "inset(12% 0% 0% 0% round 0.5rem)",
      filter: "blur(10px)",
    });

    const revealCards = (velocity: number) => {
      const speed = Math.abs(velocity);
      const duration = gsap.utils.clamp(0.38, 0.9, 0.88 - speed / 3600);
      const stagger = gsap.utils.clamp(0.035, 0.13, 0.13 - speed / 18000);

      gsap.killTweensOf(cards);
      gsap.to(cards, {
        "--hydro-link-reveal-y": "0rem",
        autoAlpha: 1,
        clipPath: "inset(0% 0% 0% 0% round 0.5rem)",
        duration,
        ease: "expo.out",
        filter: "blur(0px)",
        stagger: { each: stagger, from: "start" },
      });
    };

    const resetCards = () => {
      gsap.killTweensOf(cards);
      gsap.set(cards, {
        "--hydro-link-reveal-y": "1.4rem",
        autoAlpha: 0,
        clipPath: "inset(12% 0% 0% 0% round 0.5rem)",
        filter: "blur(10px)",
      });
    };

    ScrollTrigger.create({
      trigger: grid,
      start: "top 84%",
      onEnter: (self) => revealCards(self.getVelocity()),
      onEnterBack: (self) => revealCards(self.getVelocity()),
      onLeaveBack: resetCards,
    });
  });

  document.querySelectorAll<HTMLElement>(".hydro-link-card").forEach((card) => {
    card.addEventListener("mousemove", (event) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--hydro-link-glow-x", `${event.clientX - rect.left}px`);
      card.style.setProperty("--hydro-link-glow-y", `${event.clientY - rect.top}px`);
    });
  });
}

function initMomentsReveal() {
  document.querySelectorAll<HTMLElement>("[data-moment]").forEach((moment, index) => {
    if (!motionEnabled) {
      moment.classList.add("is-visible");
      return;
    }
    ScrollTrigger.create({
      trigger: moment,
      start: "top 88%",
      onEnter: () => {
        gsap.to(moment, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "expo.out",
          delay: (index % 5) * 0.05,
          onStart: () => moment.classList.add("is-visible"),
        });
      },
    });
  });
}

function initMomentsContent() {
  document.querySelectorAll<HTMLElement>(".hydro-moment__content").forEach((content) => {
    content.querySelectorAll<HTMLAnchorElement>("a.tag").forEach((tag) => tag.remove());
    content.querySelectorAll<HTMLElement>("p").forEach((paragraph) => {
      if (paragraph.textContent?.trim() === "" && paragraph.children.length === 0) {
        paragraph.remove();
      }
    });
  });
}

function initMomentActions() {
  const upvotedNames = new Set(readJsonArray(momentUpvoteStorageKey));

  document.querySelectorAll<HTMLButtonElement>("[data-moment-upvote]").forEach((button) => {
    const name = button.dataset.momentUpvote;
    if (!name) return;

    button.classList.toggle("is-upvoted", upvotedNames.has(name));
    button.disabled = upvotedNames.has(name);
    button.addEventListener("click", async () => {
      if (upvotedNames.has(name) || button.disabled) return;

      button.disabled = true;
      try {
        const response = await window.fetch("/apis/api.halo.run/v1alpha1/trackers/upvote", {
          body: JSON.stringify({ group: "moment.halo.run", name, plural: "moments" }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        if (!response.ok) throw new Error(`Upvote failed with ${response.status}`);

        upvotedNames.add(name);
        writeJsonArray(momentUpvoteStorageKey, Array.from(upvotedNames));
        button.classList.add("is-upvoted");

        const count = document.querySelector<HTMLElement>(`[data-upvote-moment-name="${CSS.escape(name)}"]`);
        if (count) count.textContent = String(Number.parseInt(count.textContent || "0", 10) + 1);
      } catch {
        button.disabled = false;
        window.alert("点赞失败，请稍后再试");
      }
    });
  });

  document.querySelectorAll<HTMLButtonElement>("[data-moment-comment-toggle]").forEach((button) => {
    const name = button.dataset.momentCommentToggle;
    const panel = name ? document.querySelector<HTMLElement>(`[data-moment-comment="${CSS.escape(name)}"]`) : null;
    if (!panel) return;

    button.addEventListener("click", () => {
      const nextExpanded = panel.hidden === true;
      panel.hidden = !nextExpanded;
      button.classList.toggle("is-active", nextExpanded);
      button.setAttribute("aria-expanded", String(nextExpanded));
    });
  });
}

function initLightbox() {
  const lightbox = document.querySelector<HTMLElement>("[data-lightbox]");
  if (!lightbox) return;
  document.body.append(lightbox);

  const img = lightbox.querySelector<HTMLImageElement>("[data-lightbox-img]");
  const closeBtn = lightbox.querySelector<HTMLButtonElement>("[data-lightbox-close]");
  const prevBtn = lightbox.querySelector<HTMLButtonElement>("[data-lightbox-prev]");
  const nextBtn = lightbox.querySelector<HTMLButtonElement>("[data-lightbox-next]");
  const counter = lightbox.querySelector<HTMLElement>("[data-lightbox-counter]");

  const triggers = Array.from(document.querySelectorAll<HTMLElement>("[data-lightbox-trigger]"));
  let currentIndex = 0;

  const open = (index: number) => {
    currentIndex = index;
    const src = triggers[index].dataset.src ?? "";
    const alt = triggers[index].dataset.alt ?? "";
    if (!img) return;
    img.classList.add("is-loading");
    img.src = src;
    img.alt = alt;
    img.onload = () => img.classList.remove("is-loading");
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("hydro-menu-lock");
    getHydroLenis()?.stop?.();
    if (counter) counter.textContent = `${index + 1} / ${triggers.length}`;
    if (prevBtn) prevBtn.style.display = triggers.length > 1 ? "" : "none";
    if (nextBtn) nextBtn.style.display = triggers.length > 1 ? "" : "none";
  };

  const close = () => {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("hydro-menu-lock");
    getHydroLenis()?.start?.();
  };

  triggers.forEach((trigger, index) => {
    trigger.addEventListener("click", () => open(index));
  });

  closeBtn?.addEventListener("click", close);
  prevBtn?.addEventListener("click", () => open((currentIndex - 1 + triggers.length) % triggers.length));
  nextBtn?.addEventListener("click", () => open((currentIndex + 1) % triggers.length));

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) close();
  });

  document.addEventListener("keydown", (e) => {
    if (!lightbox.classList.contains("is-open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") prevBtn?.click();
    if (e.key === "ArrowRight") nextBtn?.click();
  });
}

initLinkCards();
initMomentsContent();
initMomentActions();
initMomentsReveal();
initLightbox();

function initBackToTop() {
  const btn = document.querySelector<HTMLButtonElement>("[data-hydro-back-to-top]");
  if (!btn) return;

  const sync = () => btn.classList.toggle("is-visible", window.scrollY > 100);

  sync(); // 刷新时立即同步
  window.addEventListener("scroll", sync, { passive: true });

  btn.addEventListener("click", () => {
    scrollToPosition(0);
  });
}

function initFab() {
  const trigger = document.querySelector<HTMLButtonElement>("[data-hydro-fab-trigger]");
  const menu = document.querySelector<HTMLElement>("[data-hydro-fab]");
  if (!trigger || !menu) return;

  const items = Array.from(menu.querySelectorAll<HTMLElement>(".hydro-fab-item"));
  if (items.length === 0) return;

  // 扇形：固定间隔 25°，以 225°（左上）为中心，向两侧展开
  const RADIUS = 80;
  const BTN_SIZE = 40;
  const GAP = 8;
  const MIN_STEP = Math.ceil(((BTN_SIZE + GAP) / RADIUS) * (180 / Math.PI));
  const STEP = Math.max(MIN_STEP, 25);
  const halfSpan = ((items.length - 1) / 2) * STEP;
  // 优先约束在 180°~270° 内；总跨度超过 90° 时以 225° 为中心对称展开（逆时针偏移最小）
  // 约束：最逆时针按钮不超正上方(270°)，即 CENTER + halfSpan ≤ 270
  // 理想中心 225°，按需逆时针旋转（减小 CENTER）
  const CENTER = Math.min(225, 270 - halfSpan);

  items.forEach((item, i) => {
    const deg = CENTER + (i - (items.length - 1) / 2) * STEP;
    const rad = (deg * Math.PI) / 180;
    item.style.setProperty("--fab-x", `${Math.round(Math.cos(rad) * RADIUS)}px`);
    item.style.setProperty("--fab-y", `${Math.round(Math.sin(rad) * RADIUS)}px`);
  });

  let closeTimer: number | undefined;

  const open = () => {
    window.clearTimeout(closeTimer);
    menu.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
  };

  const scheduleClose = () => {
    closeTimer = window.setTimeout(() => {
      menu.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
    }, 300);
  };

  // trigger hover
  trigger.addEventListener("mouseenter", open);
  trigger.addEventListener("mouseleave", scheduleClose);

  // 每个 item 独立绑定，鼠标进入时取消关闭计时器
  items.forEach((item) => {
    item.addEventListener("mouseenter", open);
    item.addEventListener("mouseleave", scheduleClose);
  });

  // 移动端点击
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    if (menu.classList.contains("is-open")) {
      window.clearTimeout(closeTimer);
      menu.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
      return;
    }
    open();
  });

  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target as Node) && e.target !== trigger) {
      window.clearTimeout(closeTimer);
      menu.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
    }
  });
}

initBackToTop();
initFab();
