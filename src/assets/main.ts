import Lenis from "@studio-freight/lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { initCommentWidgetSkin } from "./comment-widget-skin";
import { runHydroFabAction, type HydroFabActionDependencies } from "./fab-actions";

import "./styles/main.css";

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const motionEnabled = document.body.dataset.enableMotion !== "false";
const themeTransitionEnabled = document.body.dataset.themeTransition !== "false";
const heroMotionEnabled = document.body.dataset.enableHeroMotion !== "false";
const cardHoverEnabled = document.body.dataset.enableCardHover !== "false";
const scrollTiltEnabled = document.body.dataset.enableScrollTilt !== "false";
const textScrambleEnabled = document.body.dataset.enableTextScramble !== "false";
const lightboxEnabled = document.body.dataset.enableLightbox !== "false";
const smoothScrollEnabled = document.body.dataset.smoothScroll !== "false";
const colorSchemeStorageKey = "hydro-color-scheme";
const momentUpvoteStorageKey = "halo.upvoted.moment.names";
const postUpvoteStorageKey = "halo.upvoted.post.names";
type ColorSchemeMode = "auto" | "dark" | "light";
type HydroLenis = {
  animatedScroll?: number;
  scroll?: number;
  scrollTo?: (target: number) => void;
  start?: () => void;
  stop?: () => void;
  targetScroll?: number;
};
type LinkSubmitVerifyType = "email" | "captcha" | "none";
type LinkSubmitGroup = {
  groupId?: string;
  groupName?: string;
};
type LinkSubmitResult<T = unknown> = {
  code?: number;
  msg?: string;
  data?: T;
};
type LinksSubmitApi = {
  submit: (
    data: Record<string, unknown>,
    verifyCode: string,
    verifyType?: "email" | "captcha",
  ) => Promise<LinkSubmitResult>;
  update?: (
    data: Record<string, unknown>,
    verifyCode: string,
    verifyType?: "email" | "captcha",
  ) => Promise<LinkSubmitResult>;
  getLinkGroups?: () => Promise<LinkSubmitGroup[]>;
  sendVerifyCode?: (email: string) => Promise<LinkSubmitResult>;
  getLinkDetail?: (url: string) => Promise<LinkSubmitResult<Record<string, string>>>;
  getCaptchaUrl?: () => string;
};
type SteamProfile = {
  playing?: boolean;
  statusText?: string;
  steamLevel?: number;
  summary?: {
    avatarfull?: string;
    gameid?: string;
    personaname?: string;
    personastate?: number;
  };
};
type SteamStats = {
  recentPlaytimeMinutes?: number;
  totalGames?: number;
  totalPlaytimeMinutes?: number;
};
type SteamBadges = {
  playerLevel?: number;
};
type SteamGame = {
  appId?: number | string;
  appid?: number | string;
  headerImageUrl?: string;
  lastPlayedFormatted?: string;
  name?: string;
  playtime2WeeksFormatted?: string;
  playtimeFormatted?: string;
};
type SteamGamesResult = {
  items?: SteamGame[];
  page?: number;
  totalPages?: number;
};

declare global {
  interface Window {
    LinksSubmit?: LinksSubmitApi;
  }
}

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

function readPageLabel(element: HTMLElement | null, key: string, fallback: string) {
  return element?.dataset[key] || document.body.dataset[key] || fallback;
}

function readNumberData(value: string | undefined, fallback: number) {
  if (value == null || value.trim() === "") {
    return fallback;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cssColorToRgb(value: string) {
  const color = value.trim();
  const shortHexMatch = /^#([\da-f])([\da-f])([\da-f])$/i.exec(color);
  if (shortHexMatch) {
    return shortHexMatch
      .slice(1)
      .map((part) => Number.parseInt(part + part, 16))
      .join(" ");
  }

  const hexMatch = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color);
  if (hexMatch) {
    return hexMatch
      .slice(1)
      .map((part) => Number.parseInt(part, 16))
      .join(" ");
  }

  const rgbMatch = /^rgba?\(\s*([\d.]+)(?:\s+|,\s*)([\d.]+)(?:\s+|,\s*)([\d.]+)/i.exec(color);
  if (rgbMatch) {
    return rgbMatch
      .slice(1, 4)
      .map((part) => Math.max(0, Math.min(255, Math.round(Number.parseFloat(part)))))
      .join(" ");
  }

  return "";
}

function initAppearanceState() {
  const root = document.documentElement;
  const rootStyles = window.getComputedStyle(root);
  const lightAccent =
    rootStyles.getPropertyValue("--hydro-coral-light").trim() ||
    rootStyles.getPropertyValue("--hydro-coral").trim() ||
    "#ff6b6b";
  const darkAccent = rootStyles.getPropertyValue("--hydro-coral-dark").trim() || lightAccent || "#ff8a8a";
  const lightRgb = cssColorToRgb(lightAccent);
  const darkRgb = cssColorToRgb(darkAccent);

  root.dataset.hydroSmoothScroll = smoothScrollEnabled ? "true" : "false";
  root.dataset.hydroMotion = motionEnabled ? "on" : "off";
  root.dataset.hydroThemeTransition = themeTransitionEnabled ? "true" : "false";
  root.dataset.hydroHeroMotion = heroMotionEnabled ? "true" : "false";
  root.dataset.hydroCardHover = cardHoverEnabled ? "true" : "false";
  root.dataset.hydroScrollTilt = scrollTiltEnabled ? "true" : "false";
  root.dataset.hydroTextScramble = textScrambleEnabled ? "true" : "false";
  root.dataset.hydroLightbox = lightboxEnabled ? "true" : "false";

  root.style.setProperty("--hydro-coral-light", lightAccent);
  root.style.setProperty("--hydro-coral-dark", darkAccent);
  if (lightRgb) {
    root.style.setProperty("--hydro-coral-light-rgb", lightRgb);
    root.style.setProperty("--hydro-coral-rgb", lightRgb);
  }
  if (darkRgb) {
    root.style.setProperty("--hydro-coral-dark-rgb", darkRgb);
  }
}

function scrollToPosition(top: number) {
  const safeTop = Math.max(0, top);
  const lenis = getHydroLenis();
  if (lenis?.scrollTo) {
    lenis.scrollTo(safeTop);
    return;
  }
  window.scrollTo({ top: safeTop, behavior: smoothScrollEnabled && motionEnabled ? "smooth" : "auto" });
}

function scrollToElement(element: HTMLElement, offset = -92) {
  const top = window.scrollY + element.getBoundingClientRect().top + offset;
  scrollToPosition(top);
}

async function copyTextToClipboard(text: string, promptTitle = "复制链接") {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    window.prompt(promptTitle, text);
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatHours(minutes: number | undefined) {
  const safeMinutes = typeof minutes === "number" && Number.isFinite(minutes) ? minutes : 0;
  return `${(safeMinutes / 60).toFixed(1)}h`;
}

function createSteamFallbackImage(label = "Hydro") {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 215"><rect width="460" height="215" fill="#f3f3f3"/><path d="M0 214h460" stroke="#111" stroke-opacity=".18"/><text x="28" y="118" fill="#111" fill-opacity=".58" font-family="monospace" font-size="24">${escapeHtml(label)}</text></svg>`,
  )}`;
}

function initLenis() {
  if (!motionEnabled || !smoothScrollEnabled) {
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
  lenis.on("scroll", () => {
    ScrollTrigger.update();
    window.dispatchEvent(new Event("hydro:scroll"));
  });
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

function initColorScheme() {
  const root = document.documentElement;
  const toggles = document.querySelectorAll<HTMLButtonElement>("[data-hydro-theme-toggle]");
  if (document.body.dataset.allowColorSwitch === "false") {
    toggles.forEach((toggle) => {
      toggle.hidden = true;
    });
  }
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
    const styles = window.getComputedStyle(root);
    const activeAccent =
      styles.getPropertyValue(resolvedMode === "dark" ? "--hydro-coral-dark" : "--hydro-coral-light").trim() ||
      styles.getPropertyValue("--hydro-coral").trim();
    const activeAccentRgb =
      styles.getPropertyValue(resolvedMode === "dark" ? "--hydro-coral-dark-rgb" : "--hydro-coral-light-rgb").trim() ||
      cssColorToRgb(activeAccent);
    if (activeAccent) {
      root.style.setProperty("--hydro-coral", activeAccent);
    }
    if (activeAccentRgb) {
      root.style.setProperty("--hydro-coral-rgb", activeAccentRgb);
    }

    toggles.forEach((toggle) => {
      const nextLabel =
        resolvedMode === "dark"
          ? document.body.dataset.themeToLightLabel || "切换为浅色模式"
          : document.body.dataset.themeToDarkLabel || "切换为深色模式";
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
    if (!motionEnabled || !themeTransitionEnabled || (!forceAnimation && reduceMotion.matches)) {
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
  type NavMode = "top" | "pill";
  type NavVisual = {
    backgroundAlpha: number;
    backdropBlur: number;
    borderAlpha: number;
    borderRadius: number;
    shadowAlpha: number;
    shadowBlur: number;
    shadowY: number;
  };
  type NavSnapshot = NavVisual & {
    actionsGap: number;
    iconBackdropBlur: number;
    iconBackgroundAlpha: number;
    iconBorderAlpha: number;
    iconSize: number;
    iconSvgSize: number;
    innerGap: number;
    innerPaddingBottom: number;
    innerPaddingLeft: number;
    innerPaddingRight: number;
    innerPaddingTop: number;
    left: number;
    logoMinHeight: number;
    logoWidth: number;
    textFontSize: number;
    textMaxWidth: number;
    top: number;
    width: number;
  };

  const NAV_MORPH_DISTANCE = 100;
  const NAV_PROGRESS_EPSILON = 0.001;
  const MOBILE_NAV_QUERY = "(max-width: 720px)";
  const NAV_SLOW_DURATION = 1.65;
  const NAV_FAST_DURATION = 0.14;
  const NAV_SLOW_VELOCITY = 0.8;
  const NAV_FAST_VELOCITY = 4.2;
  const NAV_WHEEL_VELOCITY_TTL = 260;
  const NAV_SCROLL_IDLE_GAP = 180;

  const inner = nav?.querySelector<HTMLElement>(".hydro-nav__inner") ?? null;
  const logo = nav?.querySelector<HTMLElement>(".hydro-logo") ?? null;
  const logoText = nav?.querySelector<HTMLElement>(".hydro-logo__text") ?? null;
  const actions = nav?.querySelector<HTMLElement>(".hydro-nav__actions") ?? null;
  const getMeasuredIcon = () =>
    Array.from(nav?.querySelectorAll<HTMLElement>(".hydro-icon-button") ?? []).find(
      (icon) => icon.getClientRects().length > 0,
    ) ?? null;

  let navMode: NavMode = window.scrollY >= NAV_MORPH_DISTANCE ? "pill" : "top";
  let navTopSnapshot: NavSnapshot | null = null;
  let navPillSnapshot: NavSnapshot | null = null;
  let navProgress = navMode === "pill" ? 1 : 0;
  let rafId: number | null = null;
  let morphRafId: number | null = null;
  let morphFrameTime = performance.now();
  let navTargetProgress = navProgress;
  let lastScrollY = window.scrollY;
  let lastScrollTime = performance.now();
  let scrollVelocity = 0;
  let wheelVelocity = 0;
  let lastWheelTime = 0;
  let lastWheelSampleTime = 0;

  if (navMode === "pill") {
    nav?.classList.add("is-scrolled");
  }

  function canMorphNav(): boolean {
    return motionEnabled;
  }

  function clampProgress(value: number): number {
    if (value <= 0) return 0;
    if (value >= 1) return 1;
    return value;
  }

  function mix(from: number, to: number, progress: number): number {
    return from + (to - from) * progress;
  }

  function cssNumber(styles: CSSStyleDeclaration, property: string, fallback = 0): number {
    const value = Number.parseFloat(styles.getPropertyValue(property));
    return Number.isFinite(value) ? value : fallback;
  }

  function normalizeWheelDelta(event: WheelEvent): number {
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
      return event.deltaY * 16;
    }

    if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
      return event.deltaY * window.innerHeight;
    }

    return event.deltaY;
  }

  function recordWheelVelocity(event: WheelEvent): void {
    const now = performance.now();
    const elapsed = lastWheelTime > 0 ? now - lastWheelTime : NAV_SCROLL_IDLE_GAP * 2;
    const safeElapsed = Math.max(16, elapsed > NAV_SCROLL_IDLE_GAP ? NAV_SCROLL_IDLE_GAP * 2 : elapsed);
    const instantVelocity = Math.abs(normalizeWheelDelta(event)) / safeElapsed;

    wheelVelocity =
      wheelVelocity === 0 || elapsed > NAV_SCROLL_IDLE_GAP
        ? instantVelocity
        : wheelVelocity * 0.45 + instantVelocity * 0.55;
    lastWheelTime = now;
    lastWheelSampleTime = now;
  }

  function recordScrollVelocity(): void {
    const now = performance.now();
    const currentY = window.scrollY;
    const elapsed = now - lastScrollTime;
    const dy = Math.abs(currentY - lastScrollY);

    if (elapsed > NAV_SCROLL_IDLE_GAP) {
      scrollVelocity = 0;
    } else if (dy > 0) {
      const instantVelocity = dy / Math.max(16, elapsed);
      scrollVelocity = scrollVelocity === 0 ? instantVelocity : scrollVelocity * 0.65 + instantVelocity * 0.35;
    }

    lastScrollY = currentY;
    lastScrollTime = now;
  }

  function getNavInputVelocity(): number {
    const now = performance.now();

    if (now - lastWheelSampleTime <= NAV_WHEEL_VELOCITY_TTL) {
      return wheelVelocity;
    }

    return scrollVelocity;
  }

  function getNavMorphDuration(): number {
    const velocity = getNavInputVelocity();

    if (velocity <= NAV_SLOW_VELOCITY) {
      return NAV_SLOW_DURATION;
    }

    if (velocity >= NAV_FAST_VELOCITY) {
      return NAV_FAST_DURATION;
    }

    const progress = (velocity - NAV_SLOW_VELOCITY) / (NAV_FAST_VELOCITY - NAV_SLOW_VELOCITY);
    const easedProgress = 1 - Math.pow(1 - progress, 2.2);
    return NAV_SLOW_DURATION - easedProgress * (NAV_SLOW_DURATION - NAV_FAST_DURATION);
  }

  function viewportIsMobile(): boolean {
    return window.matchMedia(MOBILE_NAV_QUERY).matches;
  }

  function getNavVisual(mode: NavMode): NavVisual {
    const mobile = viewportIsMobile();

    if (mode === "top") {
      return mobile
        ? {
            backgroundAlpha: 0,
            backdropBlur: 0,
            borderAlpha: 0,
            borderRadius: 0,
            shadowAlpha: 0,
            shadowBlur: 0,
            shadowY: 0,
          }
        : {
            backgroundAlpha: 34,
            backdropBlur: 18,
            borderAlpha: 5,
            borderRadius: 999,
            shadowAlpha: 0,
            shadowBlur: 0,
            shadowY: 0,
          };
    }

    return mobile
      ? {
          backgroundAlpha: 98,
          backdropBlur: 0,
          borderAlpha: 8,
          borderRadius: 999,
          shadowAlpha: 14,
          shadowBlur: 30,
          shadowY: 10,
        }
      : {
          backgroundAlpha: 84,
          backdropBlur: 22,
          borderAlpha: 7,
          borderRadius: 999,
          shadowAlpha: 9,
          shadowBlur: 34,
          shadowY: 12,
        };
  }

  function clearNavMorphStyles(): void {
    if (!nav) return;

    [
      "top",
      "left",
      "right",
      "width",
      "min-width",
      "padding",
      "border",
      "border-radius",
      "background",
      "box-shadow",
      "backdrop-filter",
      "-webkit-backdrop-filter",
    ].forEach((property) => nav.style.removeProperty(property));

    [
      "--hydro-nav-progress",
      "--hydro-nav-inner-padding",
      "--hydro-nav-inner-gap",
      "--hydro-nav-logo-width",
      "--hydro-nav-logo-min-height",
      "--hydro-nav-lockup-opacity",
      "--hydro-nav-lockup-scale",
      "--hydro-nav-mark-opacity",
      "--hydro-nav-mark-scale",
      "--hydro-nav-text-max-width",
      "--hydro-nav-text-font-size",
      "--hydro-nav-actions-gap",
      "--hydro-nav-icon-size",
      "--hydro-nav-icon-background-alpha",
      "--hydro-nav-icon-border-alpha",
      "--hydro-nav-icon-backdrop-blur",
      "--hydro-nav-icon-svg-size",
    ].forEach((property) => nav.style.removeProperty(property));
  }

  function captureNavSnapshot(mode: NavMode): NavSnapshot | null {
    if (!nav || !inner) return null;

    nav.classList.toggle("is-scrolled", mode === "pill");
    const navRect = nav.getBoundingClientRect();
    const innerRect = inner.getBoundingClientRect();
    const sourceRect = mode === "top" && !viewportIsMobile() ? innerRect : navRect;
    const navStyles = window.getComputedStyle(nav);
    const innerStyles = window.getComputedStyle(inner);
    const paddingStyles = mode === "top" && !viewportIsMobile() ? innerStyles : navStyles;
    const logoStyles = logo ? window.getComputedStyle(logo) : null;
    const logoRect = logo?.getBoundingClientRect();
    const textStyles = logoText ? window.getComputedStyle(logoText) : null;
    const textRect = logoText?.getBoundingClientRect();
    const actionsStyles = actions ? window.getComputedStyle(actions) : null;
    const measuredIcon = getMeasuredIcon();
    const measuredIconSvg = measuredIcon?.querySelector<SVGElement>("svg") ?? null;
    const iconRect = measuredIcon?.getBoundingClientRect();
    const iconSvgStyles = measuredIconSvg ? window.getComputedStyle(measuredIconSvg) : null;
    const visual = getNavVisual(mode);

    return {
      ...visual,
      actionsGap: actionsStyles ? cssNumber(actionsStyles, "gap") : 0,
      iconBackdropBlur: mode === "top" && viewportIsMobile() ? 18 : 0,
      iconBackgroundAlpha: mode === "top" && viewportIsMobile() ? 58 : 0,
      iconBorderAlpha: mode === "top" && viewportIsMobile() ? 7 : 0,
      iconSize: iconRect?.width ?? 0,
      iconSvgSize: iconSvgStyles ? cssNumber(iconSvgStyles, "width") : 0,
      innerGap: cssNumber(innerStyles, "gap"),
      innerPaddingBottom: cssNumber(paddingStyles, "padding-bottom"),
      innerPaddingLeft: cssNumber(paddingStyles, "padding-left"),
      innerPaddingRight: cssNumber(paddingStyles, "padding-right"),
      innerPaddingTop: cssNumber(paddingStyles, "padding-top"),
      left: sourceRect.left,
      logoMinHeight: logoStyles ? cssNumber(logoStyles, "min-height", logoRect?.height ?? 0) : 0,
      logoWidth: logoRect?.width ?? 0,
      textFontSize: textStyles ? cssNumber(textStyles, "font-size") : 0,
      textMaxWidth: textStyles ? cssNumber(textStyles, "max-width", textRect?.width ?? 0) : 0,
      top: sourceRect.top,
      width: sourceRect.width,
    };
  }

  function measureNavSnapshots(): void {
    if (!nav || !inner) return;

    const targetMode = navProgress >= 1 - NAV_PROGRESS_EPSILON ? "pill" : "top";
    nav.classList.remove("is-nav-morphing");
    clearNavMorphStyles();

    navTopSnapshot = captureNavSnapshot("top");
    navPillSnapshot = captureNavSnapshot("pill");

    nav.classList.toggle("is-scrolled", targetMode === "pill");
    applyNavProgress(navProgress, false);
  }

  function setNavVar(name: string, value: number, unit = "px"): void {
    nav?.style.setProperty(name, `${Number(value.toFixed(3))}${unit}`);
  }

  function applyNavProgress(rawProgress: number, allowMeasure = true): void {
    if (!nav) return;

    const progress = clampProgress(rawProgress);
    navProgress = progress;
    const targetMode: NavMode = progress >= 1 - NAV_PROGRESS_EPSILON ? "pill" : "top";
    navMode = targetMode;

    if (!canMorphNav()) {
      nav.classList.remove("is-nav-morphing");
      clearNavMorphStyles();
      nav.classList.toggle("is-scrolled", targetMode === "pill");
      return;
    }

    if (!navTopSnapshot || !navPillSnapshot) {
      if (allowMeasure) {
        measureNavSnapshots();
      }
      return;
    }

    if (progress <= NAV_PROGRESS_EPSILON || progress >= 1 - NAV_PROGRESS_EPSILON) {
      nav.classList.remove("is-nav-morphing");
      nav.style.setProperty("--hydro-nav-logo-duration", "0ms");
      clearNavMorphStyles();
      nav.classList.toggle("is-scrolled", targetMode === "pill");
      return;
    }

    const from = navTopSnapshot;
    const to = navPillSnapshot;
    const top = mix(from.top, to.top, progress);
    const left = mix(from.left, to.left, progress);
    const width = mix(from.width, to.width, progress);
    const backgroundAlpha = mix(from.backgroundAlpha, to.backgroundAlpha, progress);
    const borderAlpha = mix(from.borderAlpha, to.borderAlpha, progress);
    const borderRadius = mix(from.borderRadius, to.borderRadius, progress);
    const shadowY = mix(from.shadowY, to.shadowY, progress);
    const shadowBlur = mix(from.shadowBlur, to.shadowBlur, progress);
    const shadowAlpha = mix(from.shadowAlpha, to.shadowAlpha, progress);
    const backdropBlur = mix(from.backdropBlur, to.backdropBlur, progress);

    nav.classList.add("is-nav-morphing");
    nav.classList.remove("is-scrolled");
    nav.style.top = `${top.toFixed(3)}px`;
    nav.style.left = `${left.toFixed(3)}px`;
    nav.style.right = "auto";
    nav.style.width = `${width.toFixed(3)}px`;
    nav.style.minWidth = "0";
    nav.style.padding = "0";
    nav.style.border = `1px solid rgb(var(--hydro-ink-rgb) / ${borderAlpha.toFixed(3)}%)`;
    nav.style.borderRadius = `${borderRadius.toFixed(3)}px`;
    nav.style.background = `rgb(var(--hydro-paper-rgb) / ${backgroundAlpha.toFixed(3)}%)`;
    nav.style.boxShadow = `0 ${shadowY.toFixed(3)}px ${shadowBlur.toFixed(3)}px rgb(var(--hydro-shadow-rgb) / ${shadowAlpha.toFixed(3)}%)`;

    const backdropValue = backdropBlur > 0.01 ? `blur(${backdropBlur.toFixed(3)}px)` : "none";
    nav.style.backdropFilter = backdropValue;
    nav.style.setProperty("-webkit-backdrop-filter", backdropValue);

    nav.style.setProperty("--hydro-nav-progress", progress.toFixed(4));
    nav.style.setProperty(
      "--hydro-nav-inner-padding",
      `${mix(from.innerPaddingTop, to.innerPaddingTop, progress).toFixed(3)}px ${mix(
        from.innerPaddingRight,
        to.innerPaddingRight,
        progress,
      ).toFixed(3)}px ${mix(from.innerPaddingBottom, to.innerPaddingBottom, progress).toFixed(3)}px ${mix(
        from.innerPaddingLeft,
        to.innerPaddingLeft,
        progress,
      ).toFixed(3)}px`,
    );
    setNavVar("--hydro-nav-inner-gap", mix(from.innerGap, to.innerGap, progress));
    setNavVar("--hydro-nav-logo-width", mix(from.logoWidth, to.logoWidth, progress));
    setNavVar("--hydro-nav-logo-min-height", mix(from.logoMinHeight, to.logoMinHeight, progress));
    nav.style.setProperty("--hydro-nav-lockup-opacity", (1 - progress).toFixed(4));
    nav.style.setProperty("--hydro-nav-lockup-scale", mix(1, 0.86, progress).toFixed(4));
    nav.style.setProperty("--hydro-nav-mark-opacity", progress.toFixed(4));
    nav.style.setProperty("--hydro-nav-mark-scale", mix(0.78, 1, progress).toFixed(4));

    if (from.textMaxWidth > 0 || to.textMaxWidth > 0) {
      setNavVar("--hydro-nav-text-max-width", mix(from.textMaxWidth, to.textMaxWidth, progress));
    }
    if (from.textFontSize > 0 || to.textFontSize > 0) {
      setNavVar("--hydro-nav-text-font-size", mix(from.textFontSize, to.textFontSize, progress));
    }

    setNavVar("--hydro-nav-actions-gap", mix(from.actionsGap, to.actionsGap, progress));
    setNavVar("--hydro-nav-icon-size", mix(from.iconSize, to.iconSize, progress));
    setNavVar(
      "--hydro-nav-icon-background-alpha",
      mix(from.iconBackgroundAlpha, to.iconBackgroundAlpha, progress),
      "%",
    );
    setNavVar("--hydro-nav-icon-border-alpha", mix(from.iconBorderAlpha, to.iconBorderAlpha, progress), "%");
    setNavVar("--hydro-nav-icon-backdrop-blur", mix(from.iconBackdropBlur, to.iconBackdropBlur, progress));
    setNavVar("--hydro-nav-icon-svg-size", mix(from.iconSvgSize, to.iconSvgSize, progress));
  }

  function getNavScrollPosition(): number {
    const lenis = getHydroLenis();
    const targetScroll = lenis?.targetScroll;

    if (typeof targetScroll === "number" && Number.isFinite(targetScroll)) {
      return targetScroll;
    }

    return window.scrollY;
  }

  function getScrollProgress(): number {
    return clampProgress(getNavScrollPosition() / NAV_MORPH_DISTANCE);
  }

  function stopMorphLoop(): void {
    if (morphRafId === null) return;
    window.cancelAnimationFrame(morphRafId);
    morphRafId = null;
  }

  function stepNavMorph(now: number): void {
    morphRafId = null;
    const deltaTime = Math.min(64, Math.max(16, now - morphFrameTime));
    morphFrameTime = now;

    const distance = navTargetProgress - navProgress;
    if (Math.abs(distance) <= NAV_PROGRESS_EPSILON) {
      applyNavProgress(navTargetProgress, false);
      return;
    }

    const duration = getNavMorphDuration();
    const maxStep = Math.max(NAV_PROGRESS_EPSILON, deltaTime / (duration * 1000));
    const nextProgress =
      Math.abs(distance) <= maxStep ? navTargetProgress : navProgress + Math.sign(distance) * maxStep;

    applyNavProgress(nextProgress, false);

    if (Math.abs(navTargetProgress - navProgress) > NAV_PROGRESS_EPSILON) {
      morphRafId = window.requestAnimationFrame(stepNavMorph);
    }
  }

  function startMorphLoop(): void {
    if (morphRafId !== null) return;
    morphFrameTime = performance.now();
    morphRafId = window.requestAnimationFrame(stepNavMorph);
  }

  function setNavTargetProgress(targetProgress: number, immediate = false): void {
    navTargetProgress = clampProgress(targetProgress);

    if (immediate || !canMorphNav()) {
      stopMorphLoop();
      applyNavProgress(navTargetProgress, false);
      return;
    }

    startMorphLoop();
  }

  function syncNav(immediate = false): void {
    if (!nav) return;
    recordScrollVelocity();
    setNavTargetProgress(getScrollProgress(), immediate);
  }

  const onScroll = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      syncNav();
      rafId = null;
    });
  };

  measureNavSnapshots();
  syncNav(true);
  window.addEventListener("wheel", recordWheelVelocity, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("hydro:scroll", onScroll);

  window.addEventListener("resize", () => {
    measureNavSnapshots();
    syncNav(true);
  });

  window.addEventListener(
    "load",
    () => {
      measureNavSnapshots();
      syncNav(true);
    },
    { once: true },
  );

  prefersReducedMotion.addEventListener("change", () => {
    measureNavSnapshots();
    syncNav(true);
  });

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

  const firstMobileBranch = mobileMenu?.querySelector<HTMLElement>(
    ".hydro-mobile-menu__tree > .hydro-mobile-menu__item--branch",
  );
  firstMobileBranch?.classList.add("is-expanded");
  firstMobileBranch
    ?.querySelector<HTMLButtonElement>(":scope > .hydro-mobile-menu__row [data-hydro-mobile-submenu-toggle]")
    ?.setAttribute("aria-expanded", "true");

  const currentUrl = new URL(window.location.href);
  const scoreMobileMenuLink = (link: HTMLAnchorElement) => {
    try {
      const linkUrl = new URL(link.href, window.location.origin);
      if (linkUrl.pathname !== currentUrl.pathname || linkUrl.search !== currentUrl.search) {
        return -1;
      }

      const rawHref = link.getAttribute("href")?.trim() ?? "";
      const isPlaceholderHref = rawHref === "#" || rawHref.endsWith("#") || rawHref.startsWith("javascript:");
      const level = link.classList.contains("hydro-mobile-menu__link--level-3")
        ? 3
        : link.classList.contains("hydro-mobile-menu__link--level-2")
          ? 2
          : 1;

      return level * 10 - (isPlaceholderHref ? 40 : 0);
    } catch {
      return -1;
    }
  };
  const currentMobileLink = Array.from(
    mobileMenu?.querySelectorAll<HTMLAnchorElement>(".hydro-mobile-menu__link") ?? [],
  )
    .map((link) => ({ link, score: scoreMobileMenuLink(link) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score)[0]?.link;
  currentMobileLink?.closest<HTMLElement>(".hydro-mobile-menu__item")?.classList.add("is-current");
  currentMobileLink?.closest<HTMLElement>(".hydro-mobile-menu__item--branch")?.classList.add("is-expanded");
  currentMobileLink
    ?.closest<HTMLElement>(".hydro-mobile-menu__children")
    ?.closest<HTMLElement>(".hydro-mobile-menu__item--branch")
    ?.classList.add("is-current-parent", "is-expanded");
  currentMobileLink
    ?.closest<HTMLElement>(".hydro-mobile-menu__item--branch")
    ?.querySelector<HTMLButtonElement>(":scope > .hydro-mobile-menu__row [data-hydro-mobile-submenu-toggle]")
    ?.setAttribute("aria-expanded", "true");
  currentMobileLink
    ?.closest<HTMLElement>(".hydro-mobile-menu__children")
    ?.closest<HTMLElement>(".hydro-mobile-menu__item--branch")
    ?.querySelector<HTMLButtonElement>(":scope > .hydro-mobile-menu__row [data-hydro-mobile-submenu-toggle]")
    ?.setAttribute("aria-expanded", "true");

  mobileMenu?.querySelectorAll<HTMLButtonElement>("[data-hydro-mobile-submenu-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = button.closest<HTMLElement>(".hydro-mobile-menu__item--branch");
      if (!item) return;

      const expanded = item.classList.toggle("is-expanded");
      button.setAttribute("aria-expanded", expanded ? "true" : "false");
    });
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
  if (!motionEnabled || !textScrambleEnabled) {
    return;
  }

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

  if (!hero || !motionEnabled) {
    return;
  }

  const image = hero.querySelector<HTMLElement>("[data-hydro-hero-image]");
  const imageMotion = hero.querySelector<HTMLElement>("[data-hydro-hero-motion]");
  const imageFrame = image?.closest<HTMLElement>(".hydro-hero__image") ?? null;
  const title = hero.querySelector<HTMLElement>("[data-split-title]");

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

  if (!heroMotionEnabled) {
    window.addEventListener("pagehide", () => ctx.revert(), { once: true });
    return;
  }

  const setImageX = imageMotion ? gsap.quickTo(imageMotion, "x", { duration: 0.35, ease: "power3.out" }) : undefined;
  const setImageY = imageMotion ? gsap.quickTo(imageMotion, "y", { duration: 0.35, ease: "power3.out" }) : undefined;

  const motionTarget = imageFrame ?? imageMotion ?? image;

  motionTarget?.addEventListener("mousemove", (event) => {
    const rect = motionTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    setImageX?.((x - 0.5) * 22);
    setImageY?.((y - 0.5) * 22);
  });

  motionTarget?.addEventListener("mouseleave", () => {
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
  if (!motionEnabled || !cardHoverEnabled || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
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
  if (!motionEnabled || !scrollTiltEnabled || prefersReducedMotion.matches) {
    return;
  }

  const tiltTargets = gsap.utils
    .toArray<HTMLElement>(".tilt-on-scroll, [data-hydro-scroll-tilt-target]")
    .filter(
      (target) =>
        target.tagName.toLowerCase() !== "main" &&
        !target.matches("[data-hydro-hero], [data-hydro-nav], .hydro-fab-group, .hydro-mobile-menu") &&
        !target.closest("[data-hydro-hero], [data-hydro-nav], .hydro-fab-group, .hydro-mobile-menu"),
    );
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
        if (Math.abs(velocity) < 1) {
          ticking = false;
          return;
        }
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
    tocState.textContent = tocState.dataset.emptyText || "无目录";
    return;
  }

  tocContainer.innerHTML = "";
  tocState.textContent = `${headings.length} ${tocState.dataset.countSuffix || "节"}`;

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
  const copiedText = readPageLabel(page, "postShareCopiedText", "已复制");
  const copyPromptTitle = readPageLabel(page, "postShareCopyPromptTitle", "复制链接");

  const copyLink = async (button: HTMLButtonElement, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      button.classList.add("is-copied");
      const originalLabel = button.querySelector("strong");
      const previous = originalLabel?.textContent;
      if (originalLabel) {
        originalLabel.textContent = originalLabel.dataset.copiedText || copiedText;
      }
      window.setTimeout(() => {
        button.classList.remove("is-copied");
        if (originalLabel && previous) {
          originalLabel.textContent = previous;
        }
      }, 1200);
    } catch {
      window.prompt(button.querySelector<HTMLElement>("strong")?.dataset.copyPromptTitle || copyPromptTitle, url);
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
        window.alert(readPageLabel(page, "postUpvoteErrorText", "点赞失败，请稍后再试"));
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

function initLinksPage() {
  const linksSection = document.querySelector<HTMLElement>(".hydro-links-section");
  if (!linksSection) {
    return;
  }

  const copyHandlers = linksSection.querySelectorAll<HTMLButtonElement>("[data-copy]");
  copyHandlers.forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const text = button.dataset.copyText;
      if (!text) {
        return;
      }

      try {
        await navigator.clipboard.writeText(text);
        button.classList.add("is-copied");
        window.setTimeout(() => {
          button.classList.remove("is-copied");
        }, 1500);
      } catch {
        // Ignore clipboard failures silently.
      }
    });
  });

  linksSection.querySelectorAll<HTMLButtonElement>("[data-random-link]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const links = (button.dataset.links || "").split(",").filter(Boolean);
      if (links.length === 0) {
        return;
      }
      const pick = links[Math.floor(Math.random() * links.length)];
      window.open(pick, "_blank", "noreferrer");
    });
  });

  const config = document.getElementById("hydro-link-submit-config");
  if (!config || config.dataset.enableSubmit !== "true") {
    return;
  }

  const enableUpdate = config.dataset.enableUpdate === "true";
  const verifyType = (config.dataset.verifyType || "email") as LinkSubmitVerifyType;
  const submitText = {
    submitError: config.dataset.submitErrorText || "提交失败，请稍后重试。",
    submitSuccess: config.dataset.submitSuccessText || "提交成功，请等待审核。",
    unavailable: config.dataset.unavailableText || "未检测到 LinksSubmit 插件，请稍后重试。",
    updateError: config.dataset.updateErrorText || "修改失败，请稍后重试。",
    updateSuccess: config.dataset.updateSuccessText || "修改成功。",
  };
  const submitModal = document.getElementById("hydro-link-submit-modal");
  const submitEntry = document.getElementById("hydro-link-submit-entry");
  const updateEntry = document.getElementById("hydro-link-update-entry");
  const unavailableEntry = document.getElementById("hydro-link-submit-unavailable");
  const submitForm = document.getElementById("hydro-link-submit-form") as HTMLFormElement | null;
  const submitMessageEl = document.getElementById("hydro-link-submit-message");
  const autoFetchBtn = document.getElementById("hydro-link-auto-fetch-btn") as HTMLButtonElement | null;
  const sendCodeBtn = document.getElementById("hydro-link-send-code-btn") as HTMLButtonElement | null;
  const captchaImg = document.getElementById("hydro-link-captcha-img") as HTMLImageElement | null;
  const groupSelect = document.getElementById("hydro-link-group") as HTMLSelectElement | null;
  const groupWrapper = document.getElementById("hydro-link-group-wrapper");

  const updateModal = document.getElementById("hydro-link-update-modal");
  const updateForm = document.getElementById("hydro-link-update-form") as HTMLFormElement | null;
  const updateMessageEl = document.getElementById("hydro-link-update-message");
  const updateAutoFetchBtn = document.getElementById("hydro-link-update-auto-fetch-btn") as HTMLButtonElement | null;
  const updateSendCodeBtn = document.getElementById("hydro-link-update-send-code-btn") as HTMLButtonElement | null;
  const updateCaptchaImg = document.getElementById("hydro-link-update-captcha-img") as HTMLImageElement | null;
  const updateGroupSelect = document.getElementById("hydro-link-update-group") as HTMLSelectElement | null;
  const updateGroupWrapper = document.getElementById("hydro-link-update-group-wrapper");

  const mountModalToBody = (modal: HTMLElement | null) => {
    if (!modal || modal.parentElement === document.body) {
      return;
    }
    document.body.append(modal);
  };

  mountModalToBody(submitModal);
  mountModalToBody(updateModal);

  if (!submitModal || !submitForm || !submitMessageEl) {
    return;
  }

  let submitReady = false;
  let submitCodeCountdown = 0;
  let updateCodeCountdown = 0;

  const getLinksSubmitApi = () => window.LinksSubmit;
  const showMessage = (container: HTMLElement | null, message: string, type: "success" | "error") => {
    if (!container) {
      return;
    }
    container.textContent = message;
    container.className = `hydro-link-submit-message is-${type}`;
    container.style.display = "block";
  };
  const setButtonLoading = (
    button: HTMLButtonElement | null,
    loading: boolean,
    pendingText: string,
    fallbackText: string,
  ) => {
    if (!button) {
      return;
    }
    if (!button.dataset.defaultText) {
      button.dataset.defaultText = button.textContent?.trim() || fallbackText;
    }
    button.disabled = loading;
    button.textContent = loading ? pendingText : button.dataset.defaultText;
  };
  const openModal = (modal: HTMLElement) => {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("hydro-menu-lock");
    document.body.style.overflow = "hidden";
    getHydroLenis()?.stop?.();
  };
  const closeModal = (modal: HTMLElement) => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("hydro-menu-lock");
    document.body.style.overflow = "";
    getHydroLenis()?.start?.();
  };
  const openSubmitModal = () => {
    if (!submitReady) {
      showMessage(submitMessageEl, submitText.unavailable, "error");
      return;
    }
    openModal(submitModal);
    loadLinkGroups("submit");
    if (verifyType === "captcha") {
      refreshCaptcha("submit");
    }
  };
  const openUpdateModal = () => {
    if (!enableUpdate || !updateModal || !updateForm || !updateMessageEl) {
      return;
    }
    if (!submitReady) {
      showMessage(updateMessageEl, submitText.unavailable, "error");
      return;
    }
    openModal(updateModal);
    loadLinkGroups("update");
    if (verifyType === "captcha") {
      refreshCaptcha("update");
    }
  };
  const refreshCaptcha = (mode: "submit" | "update") => {
    const api = getLinksSubmitApi();
    const targetImg = mode === "update" ? updateCaptchaImg : captchaImg;
    if (!targetImg || !api || typeof api.getCaptchaUrl !== "function") {
      return;
    }
    targetImg.src = api.getCaptchaUrl();
  };
  const loadLinkGroups = (mode: "submit" | "update") => {
    const api = getLinksSubmitApi();
    const select = mode === "update" ? updateGroupSelect : groupSelect;
    const wrapper = mode === "update" ? updateGroupWrapper : groupWrapper;
    if (!select || !wrapper || !api || typeof api.getLinkGroups !== "function") {
      return;
    }

    api
      .getLinkGroups()
      .then((groups) => {
        if (!Array.isArray(groups) || groups.length === 0) {
          return;
        }
        select.innerHTML = "";
        select.append(new Option("默认分组", ""));
        groups.forEach((group) => {
          select.append(new Option(group.groupName || "未命名分组", group.groupId || group.groupName || ""));
        });
        wrapper.style.display = "";
      })
      .catch(() => {
        // Ignore group loading failures.
      });
  };
  const initEntries = () => {
    window.setTimeout(() => {
      const api = getLinksSubmitApi();
      if (api) {
        submitReady = true;
        if (submitEntry) {
          submitEntry.style.display = "";
        }
        if (enableUpdate && updateEntry) {
          updateEntry.style.display = "";
        }
        if (unavailableEntry) {
          unavailableEntry.style.display = "none";
        }
        if (window.location.hash === "#add") {
          openSubmitModal();
        } else if (window.location.hash === "#edit") {
          openUpdateModal();
        }
        return;
      }

      submitReady = false;
      if (submitEntry) {
        submitEntry.style.display = "none";
      }
      if (updateEntry) {
        updateEntry.style.display = "none";
      }
      if (unavailableEntry) {
        unavailableEntry.style.display = "";
      }
    }, 500);
  };
  const autoFetchSiteInfo = (mode: "submit" | "update") => {
    const api = getLinksSubmitApi();
    if (!api || typeof api.getLinkDetail !== "function") {
      return;
    }
    const urlInputId = mode === "update" ? "hydro-update-url" : "hydro-link-url";
    const nameInputId = mode === "update" ? "hydro-update-name" : "hydro-link-name";
    const logoInputId = mode === "update" ? "hydro-update-logo" : "hydro-link-logo";
    const descriptionInputId = mode === "update" ? "hydro-update-description" : "hydro-link-description";
    const messageContainer = mode === "update" ? updateMessageEl : submitMessageEl;
    const button = mode === "update" ? updateAutoFetchBtn : autoFetchBtn;
    const url = (document.getElementById(urlInputId) as HTMLInputElement | null)?.value.trim() || "";
    if (!url) {
      showMessage(messageContainer, "请先输入网站地址。", "error");
      return;
    }
    setButtonLoading(button, true, "获取中...", "自动填充");

    api
      .getLinkDetail(url)
      .then((res) => {
        if (res.code !== 200 || !res.data) {
          showMessage(messageContainer, res.msg || "自动填充失败，请手动填写。", "error");
          return;
        }

        const data = res.data;
        const nameInput = document.getElementById(nameInputId) as HTMLInputElement | null;
        const logoInput = document.getElementById(logoInputId) as HTMLInputElement | null;
        const descriptionInput = document.getElementById(descriptionInputId) as HTMLTextAreaElement | null;

        if (nameInput && data.title) {
          nameInput.value = data.title;
        }
        if (logoInput && (data.image || data.icon)) {
          logoInput.value = data.image || data.icon;
        }
        if (descriptionInput && data.description) {
          descriptionInput.value = data.description;
        }
        showMessage(messageContainer, "已自动填充，请检查后提交。", "success");
      })
      .catch(() => {
        showMessage(messageContainer, "自动填充失败，请手动填写。", "error");
      })
      .finally(() => {
        setButtonLoading(button, false, "", "自动填充");
      });
  };
  const sendVerifyCode = (mode: "submit" | "update") => {
    const api = getLinksSubmitApi();
    const isCountingDown = mode === "update" ? updateCodeCountdown > 0 : submitCodeCountdown > 0;
    if (!api || typeof api.sendVerifyCode !== "function" || isCountingDown) {
      return;
    }
    const emailInputId = mode === "update" ? "hydro-update-email" : "hydro-link-email";
    const email = (document.getElementById(emailInputId) as HTMLInputElement | null)?.value.trim() || "";
    const messageContainer = mode === "update" ? updateMessageEl : submitMessageEl;
    const button = mode === "update" ? updateSendCodeBtn : sendCodeBtn;
    if (!email) {
      showMessage(messageContainer, "请先输入联系邮箱。", "error");
      return;
    }

    setButtonLoading(button, true, "发送中...", "发送验证码");
    api
      .sendVerifyCode(email)
      .then((res) => {
        if (res.code !== 200) {
          throw new Error(res.msg || "发送失败");
        }
        showMessage(messageContainer, "验证码已发送，请注意查收邮箱。", "success");
        if (mode === "update") {
          updateCodeCountdown = 60;
        } else {
          submitCodeCountdown = 60;
        }
        const timer = window.setInterval(() => {
          if (mode === "update") {
            updateCodeCountdown -= 1;
          } else {
            submitCodeCountdown -= 1;
          }
          const currentCountdown = mode === "update" ? updateCodeCountdown : submitCodeCountdown;
          if (button) {
            button.textContent = `${currentCountdown}s`;
          }
          if (currentCountdown <= 0) {
            window.clearInterval(timer);
            setButtonLoading(button, false, "", "发送验证码");
          }
        }, 1000);
      })
      .catch((error: unknown) => {
        const msg = error instanceof Error ? error.message : "发送失败，请稍后重试。";
        showMessage(messageContainer, msg, "error");
        setButtonLoading(button, false, "", "发送验证码");
      });
  };
  const parseVerifyCode = (formData: FormData, mode: "submit" | "update") => {
    const messageContainer = mode === "update" ? updateMessageEl : submitMessageEl;
    let verifyCode = "";

    if (verifyType === "email") {
      const emailVerifyValue = formData.get("verifyCode");
      verifyCode = typeof emailVerifyValue === "string" ? emailVerifyValue.trim() : "";
      if (!verifyCode) {
        showMessage(messageContainer, "请输入邮箱验证码。", "error");
        return null;
      }
    }

    if (verifyType === "captcha") {
      const captchaVerifyValue = formData.get("captcha");
      verifyCode = typeof captchaVerifyValue === "string" ? captchaVerifyValue.trim() : "";
      if (!verifyCode) {
        showMessage(messageContainer, "请输入图形验证码。", "error");
        return null;
      }
    }

    return verifyCode;
  };
  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    const api = getLinksSubmitApi();
    if (!api) {
      return;
    }

    const formData = new FormData(submitForm);
    const verifyCode = parseVerifyCode(formData, "submit");
    if (verifyCode == null) {
      return;
    }

    const payload: Record<string, unknown> = {
      displayName: formData.get("displayName"),
      url: formData.get("url"),
      logo: formData.get("logo") || undefined,
      email: formData.get("email"),
      description: formData.get("description") || undefined,
      linkPageUrl: formData.get("linkPageUrl") || undefined,
      groupName: formData.get("groupName") || undefined,
      rssUrl: formData.get("rssUrl") || undefined,
    };

    const submitBtn = document.getElementById("hydro-link-submit-btn") as HTMLButtonElement | null;
    setButtonLoading(submitBtn, true, "提交中...", "提交申请");

    api
      .submit(payload, verifyCode, verifyType === "none" ? undefined : verifyType)
      .then((res) => {
        if (res.code === 200) {
          showMessage(submitMessageEl, res.msg || submitText.submitSuccess, "success");
          submitForm.reset();
          window.setTimeout(() => {
            closeModal(submitModal);
          }, 1500);
          return;
        }
        showMessage(submitMessageEl, res.msg || submitText.submitError, "error");
      })
      .catch(() => {
        showMessage(submitMessageEl, submitText.submitError, "error");
      })
      .finally(() => {
        if (verifyType === "captcha") {
          refreshCaptcha("submit");
        }
        setButtonLoading(submitBtn, false, "", "提交申请");
      });
  };
  const handleUpdateSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    const api = getLinksSubmitApi();
    if (!api || typeof api.update !== "function" || !updateForm) {
      showMessage(updateMessageEl, "当前插件不支持在线修改。", "error");
      return;
    }

    const formData = new FormData(updateForm);
    const verifyCode = parseVerifyCode(formData, "update");
    if (verifyCode == null) {
      return;
    }

    const payload: Record<string, unknown> = {
      oldUrl: formData.get("oldUrl"),
      displayName: formData.get("displayName"),
      url: formData.get("url"),
      logo: formData.get("logo") || undefined,
      email: formData.get("email"),
      description: formData.get("description") || undefined,
      linkPageUrl: formData.get("linkPageUrl") || undefined,
      groupName: formData.get("groupName") || undefined,
      rssUrl: formData.get("rssUrl") || undefined,
    };

    const updateSubmitBtn = document.getElementById("hydro-link-update-submit-btn") as HTMLButtonElement | null;
    setButtonLoading(updateSubmitBtn, true, "提交中...", "提交修改");

    api
      .update(payload, verifyCode, verifyType === "none" ? undefined : verifyType)
      .then((res) => {
        if (res.code === 200) {
          showMessage(updateMessageEl, res.msg || submitText.updateSuccess, "success");
          updateForm.reset();
          window.setTimeout(() => {
            if (updateModal) {
              closeModal(updateModal);
            }
          }, 1500);
          return;
        }
        showMessage(updateMessageEl, res.msg || submitText.updateError, "error");
      })
      .catch(() => {
        showMessage(updateMessageEl, submitText.updateError, "error");
      })
      .finally(() => {
        if (verifyType === "captcha") {
          refreshCaptcha("update");
        }
        setButtonLoading(updateSubmitBtn, false, "", "提交修改");
      });
  };

  document.querySelectorAll<HTMLElement>("[data-link-submit-open]").forEach((button) => {
    button.addEventListener("click", openSubmitModal);
  });
  document.querySelectorAll<HTMLElement>("[data-link-submit-close]").forEach((button) => {
    button.addEventListener("click", () => closeModal(submitModal));
  });
  document.querySelectorAll<HTMLElement>("[data-link-update-open]").forEach((button) => {
    button.addEventListener("click", openUpdateModal);
  });
  document.querySelectorAll<HTMLElement>("[data-link-update-close]").forEach((button) => {
    if (!updateModal) {
      return;
    }
    button.addEventListener("click", () => closeModal(updateModal));
  });
  autoFetchBtn?.addEventListener("click", () => autoFetchSiteInfo("submit"));
  updateAutoFetchBtn?.addEventListener("click", () => autoFetchSiteInfo("update"));
  sendCodeBtn?.addEventListener("click", () => sendVerifyCode("submit"));
  updateSendCodeBtn?.addEventListener("click", () => sendVerifyCode("update"));
  captchaImg?.addEventListener("click", () => refreshCaptcha("submit"));
  updateCaptchaImg?.addEventListener("click", () => refreshCaptcha("update"));
  submitForm.addEventListener("submit", handleSubmit);
  updateForm?.addEventListener("submit", handleUpdateSubmit);

  window.addEventListener("hashchange", () => {
    if (window.location.hash === "#add") {
      openSubmitModal();
    } else if (window.location.hash === "#edit") {
      openUpdateModal();
    }
  });

  initEntries();
}

initAppearanceState();
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
initCommentWidgetSkin();

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
  const upvoteErrorText = document.body.dataset.momentUpvoteErrorText || "点赞失败，请稍后再试";

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
        window.alert(upvoteErrorText);
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
  if (!lightboxEnabled) {
    document.querySelectorAll<HTMLElement>("[data-lightbox-trigger]").forEach((trigger) => {
      trigger.removeAttribute("data-lightbox-trigger");
      trigger.removeAttribute("data-src");
      trigger.removeAttribute("data-alt");
      if (trigger instanceof HTMLButtonElement) {
        trigger.type = "button";
        trigger.disabled = true;
        trigger.setAttribute("aria-disabled", "true");
      }
    });
    return;
  }

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

function toAbsoluteShareUrl(value: string | undefined) {
  try {
    return new URL(value || window.location.href, window.location.origin).href;
  } catch {
    return window.location.href;
  }
}

function initPosterShare() {
  const page = document.querySelector<HTMLElement>("[data-hydro-poster-page]");
  if (!page) return;
  const copiedText = page.dataset.copiedText || document.body.dataset.shareCopiedText || "已复制";
  const copyPromptTitle = page.dataset.copyPromptTitle || document.body.dataset.shareCopyPromptTitle || "复制链接";
  const qrServiceUrl = document.body.dataset.qrServiceUrl || "https://api.qrserver.com/v1/create-qr-code/";

  page.querySelectorAll<HTMLImageElement>("[data-hydro-poster-qr]").forEach((img) => {
    const shareUrl = toAbsoluteShareUrl(img.dataset.url);
    const encoded = encodeURIComponent(shareUrl);
    const separator = qrServiceUrl.includes("?") ? "&" : "?";
    img.src = `${qrServiceUrl}${separator}size=220x220&margin=12&data=${encoded}`;
  });

  page.querySelectorAll<HTMLAnchorElement>("[data-hydro-poster-url]").forEach((anchor) => {
    const shareUrl = toAbsoluteShareUrl(anchor.getAttribute("href") || anchor.textContent || "");
    anchor.href = shareUrl;
    anchor.textContent = shareUrl;
  });

  page.querySelectorAll<HTMLButtonElement>("[data-hydro-poster-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const shareUrl = toAbsoluteShareUrl(button.dataset.url);
      try {
        await navigator.clipboard.writeText(shareUrl);
        const label = button.textContent || "复制链接";
        button.textContent = copiedText;
        button.classList.add("is-copied");
        window.setTimeout(() => {
          button.textContent = label;
          button.classList.remove("is-copied");
        }, 1400);
      } catch {
        window.prompt(copyPromptTitle, shareUrl);
      }
    });
  });

  page.querySelectorAll<HTMLButtonElement>("[data-hydro-poster-print]").forEach((button) => {
    button.addEventListener("click", () => window.print());
  });

  page.querySelectorAll<HTMLButtonElement>("[data-hydro-poster-back]").forEach((button) => {
    button.addEventListener("click", () => {
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
      window.location.href = "/";
    });
  });
}

function initHydroPluginFilters() {
  document.querySelectorAll<HTMLElement>("[data-hydro-filter-root]").forEach((root) => {
    const filters = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-hydro-plugin-filter]"));
    const groups = Array.from(root.querySelectorAll<HTMLElement>("[data-hydro-filter-group]"));
    if (filters.length === 0 || groups.length === 0) {
      return;
    }

    filters.forEach((filter) => {
      filter.addEventListener("click", () => {
        const target = filter.dataset.hydroPluginFilter || "all";
        filters.forEach((item) => item.classList.toggle("is-active", item === filter));
        groups.forEach((group) => {
          const visible = target === "all" || group.dataset.hydroFilterGroup === target;
          group.toggleAttribute("hidden", !visible);
        });
      });
    });
  });
}

function initHydroDocsToc() {
  const content = document.querySelector<HTMLElement>("#hydro-doc-content");
  const toc = document.querySelector<HTMLElement>("[data-hydro-doc-toc]");
  if (!content || !toc) {
    return;
  }

  const headings = Array.from(content.querySelectorAll<HTMLElement>("h2, h3, h4")).filter((heading) => {
    return (heading.textContent || "").trim().length > 0;
  });
  if (headings.length === 0) {
    toc.innerHTML = `<span class="hydro-doc-toc__empty">${escapeHtml(document.body.dataset.docTocEmptyText || "无目录")}</span>`;
    return;
  }

  const usedIds = new Set<string>();
  toc.innerHTML = "";

  headings.forEach((heading, index) => {
    const fallbackId = slugifyHeading(heading.textContent || "", index).replace(/^post-/, "doc-");
    let id = heading.id || fallbackId;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${fallbackId}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);
    heading.id = id;

    const link = document.createElement("a");
    link.href = `#${id}`;
    link.dataset.depth = heading.tagName.replace("H", "");
    link.textContent = (heading.textContent || "").trim();
    link.addEventListener("click", (event) => {
      event.preventDefault();
      scrollToElement(heading);
    });
    toc.append(link);
  });
}

function initHydroSteamPage() {
  const page = document.querySelector<HTMLElement>("[data-hydro-steam]");
  if (!page) {
    return;
  }

  const cachePrefix = "hydro-steam-cache";
  const cacheTtl = Math.max(0, readNumberData(page.dataset.cacheTtlMinutes, 3)) * 60 * 1000;
  const recentLimit = Number.parseInt(page.dataset.recentLimit || "8", 10);
  const pageSize = Number.parseInt(page.dataset.pageSize || "18", 10);
  const enableGameLink = page.dataset.enableGameLink !== "false";
  const emptyText = page.dataset.emptyText || "暂无 Steam 游戏数据";
  const errorText = page.dataset.errorText || "Steam 数据暂时不可用";
  const syncHintText = page.dataset.syncHintText || "请确认 plugin-steam 已同步账号数据。";
  const configHintText = page.dataset.configHintText || "请确认 plugin-steam 已启用，并已填写 Steam ID/API 配置。";
  const libraryLoadingText = page.dataset.libraryLoadingText || "正在加载游戏库。";
  const errorNotice = page.querySelector<HTMLElement>("[data-steam-error]");
  const profileAvatar = page.querySelector<HTMLElement>("[data-steam-avatar]");
  const profileName = page.querySelector<HTMLElement>("[data-steam-name]");
  const profileStatus = page.querySelector<HTMLElement>("[data-steam-status]");
  const profileLevel = page.querySelector<HTMLElement>("[data-steam-level]");
  const recentGrid = page.querySelector<HTMLElement>("[data-steam-recent]");
  const gamesGrid = page.querySelector<HTMLElement>("[data-steam-games]");
  const pagination = page.querySelector<HTMLElement>("[data-steam-pagination]");
  const prevButton = page.querySelector<HTMLButtonElement>("[data-steam-prev]");
  const nextButton = page.querySelector<HTMLButtonElement>("[data-steam-next]");
  const pageLabel = page.querySelector<HTMLElement>("[data-steam-page]");

  const readCache = <T>(key: string): T | null => {
    try {
      const raw = window.localStorage.getItem(`${cachePrefix}:${key}`);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as { expires: number; value: T };
      if (parsed.expires < Date.now()) {
        window.localStorage.removeItem(`${cachePrefix}:${key}`);
        return null;
      }
      return parsed.value;
    } catch {
      return null;
    }
  };
  const writeCache = <T>(key: string, value: T) => {
    if (cacheTtl <= 0) {
      return;
    }
    try {
      window.localStorage.setItem(`${cachePrefix}:${key}`, JSON.stringify({ expires: Date.now() + cacheTtl, value }));
    } catch {
      // Ignore cache quota failures.
    }
  };
  const fetchSteam = async <T>(endpoint: string, useCache = true): Promise<T> => {
    const cacheKey = endpoint.replace(/[^a-z0-9]/gi, "_");
    const cached = useCache ? readCache<T>(cacheKey) : null;
    if (cached) {
      return cached;
    }

    const response = await window.fetch(`/apis/api.steam.timxs.com/v1alpha1${endpoint}`);
    if (!response.ok) {
      throw new Error(`Steam API ${endpoint} failed with ${response.status}`);
    }
    const data = (await response.json()) as T;
    if (useCache) {
      writeCache(cacheKey, data);
    }
    return data;
  };
  const renderEmpty = (target: HTMLElement | null, title: string, description = "") => {
    if (!target) {
      return;
    }
    target.innerHTML = `<div class="hydro-plugin-empty hydro-plugin-empty--small">
      <span>Steam</span>
      <strong>${escapeHtml(title)}</strong>
      ${description ? `<p>${escapeHtml(description)}</p>` : ""}
    </div>`;
  };
  const gameIdOf = (game: SteamGame) => game.appid || game.appId || "";
  const renderGames = (target: HTMLElement | null, games: SteamGame[], emptyMessage: string, recent = false) => {
    if (!target) {
      return;
    }
    const visibleGames = games.filter((game) => gameIdOf(game) || game.headerImageUrl || game.name);
    if (visibleGames.length === 0) {
      renderEmpty(target, emptyMessage || emptyText, syncHintText);
      return;
    }

    target.innerHTML = visibleGames
      .map((game) => {
        const appId = gameIdOf(game);
        const image =
          game.headerImageUrl || (appId ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg` : "");
        const title = escapeHtml(game.name || "Untitled Game");
        const meta = escapeHtml(
          (recent ? game.playtime2WeeksFormatted : game.playtimeFormatted) ||
            game.lastPlayedFormatted ||
            "No time data",
        );
        const href = enableGameLink && appId ? `https://store.steampowered.com/app/${appId}` : "#";
        const targetAttr = enableGameLink && appId ? ' target="_blank" rel="noreferrer noopener"' : "";
        return `<a class="hydro-game-card" href="${href}"${targetAttr}>
          <span class="hydro-game-card__media">
            <img src="${escapeHtml(image || createSteamFallbackImage(title))}" alt="${title}" loading="lazy" />
          </span>
          <strong>${title}</strong>
          <span>${meta}</span>
        </a>`;
      })
      .join("");

    target.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
      image.addEventListener(
        "error",
        () => {
          image.src = createSteamFallbackImage(image.alt || "Steam");
        },
        { once: true },
      );
    });
  };
  const syncPagination = (result: SteamGamesResult) => {
    const currentPage = result.page || 1;
    const totalPages = result.totalPages || 1;
    if (pageLabel) {
      pageLabel.textContent = `${currentPage} / ${totalPages}`;
    }
    if (prevButton) {
      prevButton.disabled = currentPage <= 1;
    }
    if (nextButton) {
      nextButton.disabled = currentPage >= totalPages;
    }
    if (pagination) {
      pagination.hidden = totalPages <= 1;
    }
  };
  const loadGames = async (targetPage: number) => {
    if (gamesGrid) {
      renderEmpty(gamesGrid, libraryLoadingText);
    }
    try {
      const games = await fetchSteam<SteamGamesResult>(`/games?page=${targetPage}&size=${pageSize}`, false);
      renderGames(gamesGrid, games.items || [], emptyText);
      syncPagination(games);
    } catch {
      renderEmpty(gamesGrid, errorText, configHintText);
      errorNotice?.removeAttribute("hidden");
    }
  };

  void Promise.allSettled([
    fetchSteam<SteamProfile>("/profile"),
    fetchSteam<SteamStats>("/stats"),
    fetchSteam<SteamBadges>("/badges"),
    fetchSteam<SteamGame[]>(`/recent?limit=${recentLimit}`),
  ]).then(([profileResult, statsResult, badgesResult, recentResult]) => {
    if (profileResult.status === "fulfilled") {
      const profile = profileResult.value;
      const avatarUrl = profile.summary?.avatarfull;
      if (profileAvatar) {
        profileAvatar.innerHTML = avatarUrl
          ? `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(profile.summary?.personaname || "Steam")}" />`
          : "<span>ST</span>";
      }
      if (profileName) {
        profileName.textContent = profile.summary?.personaname || "Steam User";
      }
      if (profileStatus) {
        profileStatus.textContent = profile.statusText || (profile.playing ? "Playing" : "Steam profile");
      }
    } else {
      errorNotice?.removeAttribute("hidden");
    }

    if (statsResult.status === "fulfilled") {
      const stats = statsResult.value;
      const games = page.querySelector<HTMLElement>("[data-steam-stat='games']");
      const total = page.querySelector<HTMLElement>("[data-steam-stat='total']");
      const recent = page.querySelector<HTMLElement>("[data-steam-stat='recent']");
      if (games) games.textContent = String(stats.totalGames || 0);
      if (total) total.textContent = formatHours(stats.totalPlaytimeMinutes);
      if (recent) recent.textContent = formatHours(stats.recentPlaytimeMinutes);
    }

    if (badgesResult.status === "fulfilled" && profileLevel) {
      profileLevel.textContent = `Lv. ${badgesResult.value.playerLevel || 0}`;
    }

    if (recentResult.status === "fulfilled") {
      renderGames(recentGrid, recentResult.value, emptyText, true);
    } else {
      renderEmpty(recentGrid, errorText, configHintText);
    }
  });

  prevButton?.addEventListener("click", () => {
    const current = Number.parseInt(pageLabel?.textContent?.split("/")[0]?.trim() || "1", 10);
    if (current > 1) {
      void loadGames(current - 1);
    }
  });
  nextButton?.addEventListener("click", () => {
    const [currentText, totalText] = pageLabel?.textContent?.split("/") || ["1", "1"];
    const current = Number.parseInt(currentText.trim(), 10);
    const total = Number.parseInt(totalText.trim(), 10);
    if (current < total) {
      void loadGames(current + 1);
    }
  });

  void loadGames(1);
}

initLinkCards();
initLinksPage();
initMomentsContent();
initMomentActions();
initMomentsReveal();
initLightbox();
initPosterShare();
initHydroPluginFilters();
initHydroDocsToc();
initHydroSteamPage();

function initBackToTop() {
  const btn = document.querySelector<HTMLButtonElement>("[data-hydro-back-to-top]");
  if (!btn) return;
  const threshold = readNumberData(document.body.dataset.backToTopThreshold, 100);

  const sync = () => btn.classList.toggle("is-visible", window.scrollY > threshold);

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
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

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

  const close = () => {
    window.clearTimeout(closeTimer);
    menu.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
  };

  const scheduleClose = () => {
    closeTimer = window.setTimeout(() => {
      close();
    }, 300);
  };

  const fabActionDependencies: HydroFabActionDependencies = {
    copyText: (text) => copyTextToClipboard(text),
    getWindow: () => window,
    root: document,
    scrollToElement,
    scrollToPosition,
    warn: (message) => console.warn(message),
  };

  if (canHover) {
    // trigger hover
    trigger.addEventListener("mouseenter", open);
    trigger.addEventListener("mouseleave", scheduleClose);

    // 每个 item 独立绑定，鼠标进入时取消关闭计时器
    items.forEach((item) => {
      item.addEventListener("mouseenter", open);
      item.addEventListener("mouseleave", scheduleClose);
    });
  }

  items.forEach((item) => {
    item.addEventListener("click", (event) => {
      void runHydroFabAction(item, event, fabActionDependencies, close);
    });
  });

  // 移动端点击
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    if (menu.classList.contains("is-open")) {
      close();
      return;
    }
    open();
  });

  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target as Node) && e.target !== trigger) {
      close();
    }
  });
}

initBackToTop();
initFab();
