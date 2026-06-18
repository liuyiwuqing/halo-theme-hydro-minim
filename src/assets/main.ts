import Lenis from "@studio-freight/lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { initAuthAltchaFloatingAnchor } from "./auth-altcha";
import { initCommentWidgetSkin } from "./comment-widget-skin";
import { runHydroFabAction, type HydroFabActionDependencies } from "./fab-actions";
import { initHydroNotice, type HydroNoticeApi } from "./hydro-notice";
import { initLenisScrollBoundaries } from "./lenis-scroll-boundaries";
import { createMediaLoadController } from "./media-loading";
import { createHydroQrSvg, createHydroQrSvgDataUrl } from "./poster-qr";
import { initSearchWidgetSkin } from "./search-widget-skin";
import { initHydroTagCloud } from "./tag-cloud";

import "./styles/main.css";

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const motionEnabled = document.body.dataset.enableMotion !== "false";
const themeTransitionEnabled = document.body.dataset.themeTransition !== "false";
const heroMotionEnabled = document.body.dataset.enableHeroMotion !== "false";
const cardHoverEnabled = document.body.dataset.enableCardHover !== "false";
const lightboxEnabled = document.body.dataset.enableLightbox !== "false";
const smoothScrollEnabled = document.body.dataset.smoothScroll !== "false";
const mobilePostQuery = window.matchMedia("(max-width: 48rem)");
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
type MemberFavoriteSubject = {
  subjectType: "POST";
  subjectName: string;
  subjectTitle: string;
  permalink: string;
  cover: string;
};
type MemberFavoriteStatus = {
  authenticated?: boolean;
  count?: number;
  favorited?: boolean;
  loginUrl?: string;
};
type MemberFavoriteApi = {
  getLoginUrl?: () => string;
  getStatus: (subject: MemberFavoriteSubject) => Promise<MemberFavoriteStatus>;
  toggle: (subject: MemberFavoriteSubject) => Promise<MemberFavoriteStatus>;
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
    memberFavorite?: MemberFavoriteApi;
    SearchWidget?: {
      open?: () => void;
    };
    HydroNotice?: HydroNoticeApi;
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
  root.dataset.hydroLightbox = lightboxEnabled ? "true" : "false";

  root.style.setProperty("--hydro-coral-light", lightAccent);
  root.style.setProperty("--hydro-coral-dark", darkAccent);
  if (lightRgb) {
    root.style.setProperty("--hydro-coral-light-rgb", lightRgb);
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

function showHydroNotice(
  message: string,
  options: {
    duration?: number;
    id?: string;
    title?: string;
    variant?: "info" | "success" | "warning" | "error";
  } = {},
) {
  window.HydroNotice?.show({ message, ...options });
}

function isMemberPluginAvailable() {
  const value = document.body.dataset.memberPluginAvailable;
  return value == null ? true : value === "true";
}

function isMemberAuthenticated() {
  const value = document.body.dataset.memberAuthenticated;
  return value == null ? true : value === "true";
}

function showMemberPluginUnavailableNotice(id: string, title = "会员功能") {
  showHydroNotice("请先安装并启用会员插件", { id, title, variant: "warning" });
}

function showMemberLoginRequiredNotice(id: string, title = "会员功能") {
  showHydroNotice("请先登录后再使用会员功能", { id, title, variant: "warning" });
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
      root.style.setProperty("--hydro-accent", activeAccent);
    }
    if (activeAccentRgb) {
      root.style.setProperty("--hydro-coral-rgb", activeAccentRgb);
      root.style.setProperty("--hydro-accent-rgb", activeAccentRgb);
    }

    toggles.forEach((toggle) => {
      const nextLabel =
        resolvedMode === "dark"
          ? document.body.dataset.themeToLightLabel || "切换为浅色模式"
          : document.body.dataset.themeToDarkLabel || "切换为深色模式";
      const nextShortLabel = resolvedMode === "dark" ? "浅色模式" : "深色模式";
      toggle.setAttribute("aria-label", nextLabel);
      toggle.setAttribute("title", nextLabel);
      toggle.setAttribute("aria-pressed", String(resolvedMode === "dark"));
      toggle.dataset.hydroThemeNext = resolvedMode === "dark" ? "light" : "dark";

      const mobileLabel = toggle.querySelector<HTMLElement>("[data-hydro-theme-toggle-label]");
      if (mobileLabel) {
        mobileLabel.textContent = nextShortLabel;
      }
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

  const notifyModeChanged = (mode: ColorSchemeMode) => {
    const resolvedMode = resolveMode(mode);
    showHydroNotice(resolvedMode === "dark" ? "深色模式已开启" : "浅色模式已开启", {
      id: "hydro-theme-mode",
      title: "外观",
      variant: "success",
    });
  };

  const getActiveMode = () => readStoredColorScheme() ?? defaultMode;

  applyMode(getActiveMode());

  toggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const nextMode: ColorSchemeMode = root.dataset.hydroTheme === "dark" ? "light" : "dark";
      writeStoredColorScheme(nextMode);
      transitionToMode(nextMode, toggle, true);
      notifyModeChanged(nextMode);
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
  const searchToggles = document.querySelectorAll<HTMLButtonElement>("[data-hydro-plugin-search-toggle]");
  const mobileToggle = document.querySelector<HTMLButtonElement>("[data-hydro-mobile-toggle]");
  const mobileMenu = document.querySelector<HTMLElement>("[data-hydro-mobile-menu]");
  type NavMode = "top" | "pill";
  type NavVisual = {
    backgroundAlpha: number;
    borderAlpha: number;
    borderRadius: number;
  };
  type NavSnapshot = NavVisual & {
    actionsGap: number;
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
            borderAlpha: 0,
            borderRadius: 0,
          }
        : {
            backgroundAlpha: 34,
            borderAlpha: 5,
            borderRadius: 999,
          };
    }

    return mobile
      ? {
          backgroundAlpha: 98,
          borderAlpha: 8,
          borderRadius: 999,
        }
      : {
          backgroundAlpha: 84,
          borderAlpha: 7,
          borderRadius: 999,
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
      "transform",
    ].forEach((property) => nav.style.removeProperty(property));

    [
      "--hydro-nav-progress",
      "--hydro-nav-background-alpha",
      "--hydro-nav-border-alpha",
      "--hydro-nav-radius",
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
    nav.classList.add("is-nav-morphing");
    nav.classList.remove("is-scrolled");
    nav.style.transform = `translate3d(${left.toFixed(3)}px, ${top.toFixed(3)}px, 0)`;
    nav.style.width = `${width.toFixed(3)}px`;

    nav.style.setProperty("--hydro-nav-progress", progress.toFixed(4));
    setNavVar("--hydro-nav-background-alpha", backgroundAlpha, "%");
    setNavVar("--hydro-nav-border-alpha", borderAlpha, "%");
    setNavVar("--hydro-nav-radius", borderRadius);
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

  searchToggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      window.SearchWidget?.open?.();
    });
  });

  mobileToggle?.addEventListener("click", () => {
    mobileToggle.classList.toggle("is-open");
    mobileMenu?.classList.toggle("is-open");
    document.body.classList.toggle("hydro-menu-lock", mobileMenu?.classList.contains("is-open"));
  });

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

  const setImageX = imageMotion ? gsap.quickTo(imageMotion, "x", { duration: 0.35, ease: "power3.out" }) : undefined;
  const setImageY = imageMotion ? gsap.quickTo(imageMotion, "y", { duration: 0.18, ease: "power1.out" }) : undefined;
  let heroScrollY = 0;
  let heroPointerX = 0;
  let heroPointerY = 0;
  const updateHeroMediaTransform = () => {
    setImageX?.(heroPointerX);
    setImageY?.(heroScrollY + heroPointerY);
  };

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
        heroScrollY = self.progress * -50;
        updateHeroMediaTransform();
      },
    });
  }, hero);

  if (!heroMotionEnabled) {
    window.addEventListener("pagehide", () => ctx.revert(), { once: true });
    return;
  }

  const motionTarget = imageFrame ?? imageMotion ?? image;

  let motionRect: DOMRect | null = null;
  let motionPointerX = 0;
  let motionPointerY = 0;
  let motionRaf = 0;
  const readMotionRect = () => {
    if (!motionTarget) return null;
    motionRect = motionTarget.getBoundingClientRect();
    return motionRect;
  };
  const flushMotion = () => {
    motionRaf = 0;
    const rect = motionRect ?? readMotionRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      return;
    }
    const x = Math.max(0, Math.min(1, (motionPointerX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (motionPointerY - rect.top) / rect.height));
    heroPointerX = (x - 0.5) * 22;
    heroPointerY = (y - 0.5) * 22;
    updateHeroMediaTransform();
  };
  const scheduleMotion = (event: PointerEvent) => {
    motionPointerX = event.clientX;
    motionPointerY = event.clientY;
    if (motionRaf) {
      return;
    }
    motionRaf = window.requestAnimationFrame(flushMotion);
  };

  motionTarget?.addEventListener("pointerenter", () => {
    readMotionRect();
  });
  motionTarget?.addEventListener("pointermove", scheduleMotion, { passive: true });

  motionTarget?.addEventListener("pointerleave", () => {
    motionRect = null;
    if (motionRaf) {
      window.cancelAnimationFrame(motionRaf);
      motionRaf = 0;
    }
    heroPointerX = 0;
    heroPointerY = 0;
    updateHeroMediaTransform();
  });
  window.addEventListener(
    "resize",
    () => {
      motionRect = null;
    },
    { passive: true },
  );

  window.addEventListener("pagehide", () => ctx.revert(), { once: true });
}

function initMediaLoadingExperience() {
  const controller = createMediaLoadController(document, {
    fallbackErrorText: "图片暂时不可见",
  });

  controller.initProgressiveImages();
  controller.initDeferredHeroVideo();
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
          onComplete: () => gsap.set(cards, { clearProps: "transform,willChange" }),
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

function initFallbackCoverImages() {
  document
    .querySelectorAll<HTMLImageElement>("img[data-fallback-cover]:not([data-progressive-image])")
    .forEach((image) => {
      const fallbackCover = image.dataset.fallbackCover;
      if (!fallbackCover) {
        return;
      }

      const applyFallbackCover = () => {
        if (image.dataset.fallbackCoverApplied === "true") {
          return;
        }

        image.dataset.fallbackCoverApplied = "true";
        image.src = fallbackCover;
      };

      image.addEventListener("error", applyFallbackCover);

      if (image.complete && image.naturalWidth === 0) {
        applyFallbackCover();
      }
    });
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

  const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-tilt-card]"));
  if (cards.length === 0) {
    return;
  }

  const invalidateCardRects: Array<() => void> = [];

  cards.forEach((card) => {
    let cardRect: DOMRect | null = null;
    let pointerX = 0;
    let pointerY = 0;
    let tiltRaf = 0;
    gsap.set(card, {
      "--hydro-card-lift": "0px",
      "--hydro-card-scale": "1",
      "--hydro-card-tilt-x": "0deg",
      "--hydro-card-tilt-y": "0deg",
      transformPerspective: 1100,
      transformStyle: "preserve-3d",
    });

    const readCardRect = () => {
      cardRect = card.getBoundingClientRect();
      return cardRect;
    };
    const flushTilt = () => {
      tiltRaf = 0;
      const rect = cardRect ?? readCardRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }
      const x = pointerX - rect.left;
      const y = pointerY - rect.top;
      const rotateX = gsap.utils.clamp(-9, 9, (rect.height / 2 - y) / 14);
      const rotateY = gsap.utils.clamp(-9, 9, (x - rect.width / 2) / 14);
      card.style.setProperty("--hydro-card-tilt-x", `${rotateX}deg`);
      card.style.setProperty("--hydro-card-tilt-y", `${rotateY}deg`);
    };
    const scheduleTilt = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (tiltRaf) {
        return;
      }
      tiltRaf = window.requestAnimationFrame(flushTilt);
    };

    card.addEventListener("pointerenter", (event) => {
      readCardRect();
      card.classList.add("is-hydro-card-hovered");
      card.style.setProperty("--hydro-card-lift", "-10px");
      card.style.setProperty("--hydro-card-scale", "1.024");
      scheduleTilt(event);
    });
    card.addEventListener("pointermove", scheduleTilt, { passive: true });

    card.addEventListener("pointerleave", () => {
      cardRect = null;
      if (tiltRaf) {
        window.cancelAnimationFrame(tiltRaf);
        tiltRaf = 0;
      }
      card.classList.remove("is-hydro-card-hovered");
      card.style.setProperty("--hydro-card-lift", "0px");
      card.style.setProperty("--hydro-card-scale", "1");
      card.style.setProperty("--hydro-card-tilt-x", "0deg");
      card.style.setProperty("--hydro-card-tilt-y", "0deg");
    });

    invalidateCardRects.push(() => {
      cardRect = null;
    });
  });

  window.addEventListener(
    "resize",
    () => {
      invalidateCardRects.forEach((invalidate) => invalidate());
    },
    { passive: true },
  );
}

function initCategoryCursor() {
  const section = document.querySelector<HTMLElement>("[data-categories-section]");
  const cursor = document.querySelector<HTMLElement>("[data-hydro-cursor]");
  if (!section || !cursor || !motionEnabled || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    return;
  }

  let cursorX = 0;
  let cursorY = 0;
  let cursorRaf = 0;
  const flushCursorPosition = () => {
    cursorRaf = 0;
    cursor.style.setProperty("--hydro-cursor-x", `${cursorX}px`);
    cursor.style.setProperty("--hydro-cursor-y", `${cursorY}px`);
  };
  const positionCursor = (event: PointerEvent) => {
    cursorX = event.clientX;
    cursorY = event.clientY;
    if (cursorRaf) {
      return;
    }
    cursorRaf = window.requestAnimationFrame(flushCursorPosition);
  };

  section.querySelectorAll<HTMLElement>(".hydro-category-slice").forEach((slice) => {
    slice.addEventListener("pointerenter", (event) => {
      positionCursor(event);
      cursor.classList.add("is-visible");
    });
    slice.addEventListener("pointerleave", () => cursor.classList.remove("is-visible"));
  });

  section.addEventListener("pointermove", positionCursor, { passive: true });
  section.addEventListener("pointerleave", () => {
    cursor.classList.remove("is-visible");
    if (cursorRaf) {
      window.cancelAnimationFrame(cursorRaf);
      cursorRaf = 0;
    }
  });
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

type PostTocNode = {
  children: PostTocNode[];
  depth: number;
  heading: HTMLElement;
  id: string;
  title: string;
};

function createPostHeadingAnchor(heading: HTMLElement, id: string) {
  if (heading.querySelector(":scope > .hydro-post-heading-anchor")) {
    return;
  }

  const anchor = document.createElement("a");
  anchor.className = "hydro-post-heading-anchor";
  anchor.href = `#${id}`;
  anchor.setAttribute("aria-label", "复制此段落链接");
  anchor.textContent = "#";
  anchor.addEventListener("click", async (event) => {
    event.preventDefault();
    scrollToElement(heading);
    const url = new URL(window.location.href);
    url.hash = id;
    history.replaceState(null, "", url);
    try {
      await navigator.clipboard.writeText(url.href);
      anchor.classList.add("is-copied");
      window.setTimeout(() => anchor.classList.remove("is-copied"), 900);
    } catch {
      // Hash navigation still works when clipboard access is blocked.
    }
  });

  heading.append(anchor);
}

function buildPostTocTree(headings: HTMLElement[]): PostTocNode[] {
  const roots: PostTocNode[] = [];
  const stack: PostTocNode[] = [];

  headings.forEach((heading) => {
    const anchor = heading.querySelector(".hydro-post-heading-anchor");
    const title = Array.from(heading.childNodes)
      .filter((node) => node !== anchor)
      .map((node) => node.textContent ?? "")
      .join("")
      .trim();
    const depth = Number.parseInt(heading.tagName.replace("H", ""), 10);
    const node: PostTocNode = {
      children: [],
      depth,
      heading,
      id: heading.id,
      title,
    };

    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }

    stack.push(node);
  });

  return roots;
}

function setPostTocActive(container: HTMLElement, id: string) {
  container.querySelectorAll<HTMLElement>(".hydro-post-toc__item").forEach((item) => {
    item.classList.remove("is-active", "has-active");
  });

  const activeItem = container.querySelector<HTMLElement>(`.hydro-post-toc__item[data-target-id="${CSS.escape(id)}"]`);
  if (!activeItem) {
    return;
  }

  activeItem.classList.add("is-active");
  let parent = activeItem.parentElement?.closest<HTMLElement>(".hydro-post-toc__item");
  while (parent) {
    parent.classList.add("has-active", "is-expanded");
    const toggle = parent.querySelector<HTMLButtonElement>(":scope > .hydro-post-toc__row > .hydro-post-toc__toggle");
    toggle?.setAttribute("aria-expanded", "true");
    parent = parent.parentElement?.closest<HTMLElement>(".hydro-post-toc__item") ?? null;
  }

  activeItem.scrollIntoView({ block: "nearest" });
}

function renderPostTocNodes(nodes: PostTocNode[], linkMap: Map<string, HTMLAnchorElement>) {
  const list = document.createElement("ol");
  list.className = "hydro-post-toc__list";

  nodes.forEach((node) => {
    const item = document.createElement("li");
    item.className = "hydro-post-toc__item";
    item.dataset.depth = String(node.depth);
    item.dataset.targetId = node.id;

    const row = document.createElement("div");
    row.className = "hydro-post-toc__row";

    const toggle = document.createElement("button");
    toggle.className = "hydro-post-toc__toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-label", `展开 ${node.title}`);
    toggle.setAttribute("aria-expanded", node.children.length > 0 ? "true" : "false");
    toggle.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3.5 4.5 4.5L6 12.5"></path></svg>';

    if (node.children.length === 0) {
      toggle.hidden = true;
      toggle.disabled = true;
    } else {
      item.classList.add("is-expanded");
      toggle.addEventListener("click", () => {
        const expanded = !item.classList.contains("is-expanded");
        item.classList.toggle("is-expanded", expanded);
        toggle.setAttribute("aria-expanded", String(expanded));
      });
    }

    const link = document.createElement("a");
    link.className = "hydro-post-toc__link";
    link.href = `#${node.id}`;
    link.dataset.depth = String(node.depth);
    link.textContent = node.title;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      scrollToElement(node.heading);
      history.replaceState(null, "", `#${node.id}`);
      node.heading.classList.add("toc-highlight");
      window.setTimeout(() => node.heading.classList.remove("toc-highlight"), 1400);
    });

    row.append(toggle, link);
    item.append(row);
    linkMap.set(node.id, link);

    if (node.children.length > 0) {
      item.append(renderPostTocNodes(node.children, linkMap));
    }

    list.append(item);
  });

  return list;
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

  const headings = Array.from(content.querySelectorAll<HTMLElement>("h2, h3, h4, h5")).filter((heading) => {
    return (heading.textContent ?? "").trim().length > 0;
  });

  if (headings.length === 0) {
    tocPanel.classList.add("is-empty");
    tocState.textContent = tocState.dataset.emptyText || "无目录";
    tocContainer.dataset.emptyLabel = tocState.textContent;
    return;
  }

  tocContainer.innerHTML = "";
  delete tocContainer.dataset.emptyLabel;
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
    createPostHeadingAnchor(heading, resolvedId);
  });

  tocContainer.append(renderPostTocNodes(buildPostTocTree(headings), linkMap));

  const activateLink = (id: string) => {
    linkMap.forEach((link, key) => {
      link.classList.toggle("is-active", key === id);
    });
    setPostTocActive(tocContainer, id);
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

function initPostContentEnhancements() {
  const page = document.querySelector<HTMLElement>(".hydro-post-page");
  const content = page?.querySelector<HTMLElement>("[data-post-content]");
  if (!page || !content) {
    return;
  }

  enhanceContentBasics(content);

  if (!readBooleanData(page.dataset.postEnableLightbox, lightboxEnabled)) {
    return;
  }

  const lightboxImages = Array.from(content.querySelectorAll<HTMLImageElement>("img")).filter((image) => {
    return !image.closest("a") && !image.classList.contains("icon") && !image.classList.contains("no-lightbox");
  });

  lightboxImages.forEach((image) => {
    image.dataset.lightboxTrigger = "";
    image.dataset.src = image.currentSrc || image.src;
    image.dataset.alt = image.alt || "";
    const caption = image.closest("figure")?.querySelector("figcaption")?.textContent?.trim();
    if (caption) {
      image.dataset.caption = caption;
    }
    image.setAttribute("role", "button");
    image.setAttribute("tabindex", "0");
    image.setAttribute("aria-label", image.alt ? `查看图片：${image.alt}` : "查看图片");
    image.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        image.click();
      }
    });
  });
}

function enhanceContentBasics(content: HTMLElement, tableWrapClass = "hydro-post-table-wrap") {
  content.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
    if (!image.hasAttribute("loading")) {
      image.loading = "lazy";
    }
    if (!image.hasAttribute("decoding")) {
      image.decoding = "async";
    }
    if (!image.classList.contains("icon") && !image.classList.contains("no-progressive-image")) {
      image.dataset.progressiveImage = "";
      image.closest<HTMLElement>("figure")?.setAttribute("data-progressive-media", "");
    }
  });

  content.querySelectorAll<HTMLPreElement>("pre").forEach((pre) => {
    const code = pre.querySelector<HTMLElement>("code");
    const languageClass = Array.from(code?.classList ?? []).find((className) => className.startsWith("language-"));
    const language = pre.dataset.language || languageClass?.replace("language-", "");
    if (language && !pre.dataset.language) {
      pre.dataset.language = language;
    }
    pre.setAttribute("tabindex", "0");
  });

  content.querySelectorAll<HTMLTableElement>("table").forEach((table) => {
    if (table.parentElement?.classList.contains("hydro-post-table-wrap")) {
      return;
    }
    const wrapper = document.createElement("div");
    wrapper.className = tableWrapClass;
    table.parentNode?.insertBefore(wrapper, table);
    wrapper.append(table);
  });

  content.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((link) => {
    const href = link.getAttribute("href") || "";
    const isExternal =
      /^https?:\/\//i.test(href) && new URL(href, window.location.href).origin !== window.location.origin;
    if (isExternal) {
      link.target = link.target || "_blank";
      link.rel = link.rel || "noopener noreferrer";
    }
  });
}

function initHydroDocContentEnhancements() {
  document.querySelectorAll<HTMLElement>("[data-hydro-doc-content]").forEach((content) => {
    enhanceContentBasics(content, "hydro-post-table-wrap hydro-doc-table-wrap");
  });
}

function initPostReadingProgress() {
  const page = document.querySelector<HTMLElement>(".hydro-post-page");
  if (!page || !readBooleanData(page.dataset.postEnableReadingProgress)) {
    return;
  }

  const progressBars = Array.from(
    page.querySelectorAll<HTMLElement>("[data-post-reading-progress], [data-post-mobile-reading-progress]"),
  );
  const progressPercents = Array.from(
    page.querySelectorAll<HTMLElement>("[data-post-reading-percent], [data-post-mobile-reading-percent]"),
  );
  const content = page.querySelector<HTMLElement>("#post-content");
  if (progressBars.length === 0 || !content) {
    return;
  }

  const updateProgress = () => {
    const rect = content.getBoundingClientRect();
    const viewportHeight = Math.max(window.innerHeight, 1);
    const total = rect.height + viewportHeight * 0.35;
    const passed = Math.max(0, Math.min(total, viewportHeight * 0.35 - rect.top));
    const progress = total <= 0 ? 0 : (passed / total) * 100;
    const safeProgress = Math.max(0, Math.min(100, progress));
    progressBars.forEach((bar) => {
      bar.style.width = `${safeProgress.toFixed(2)}%`;
    });
    progressPercents.forEach((percent) => {
      percent.textContent = `${Math.round(safeProgress)}%`;
    });
  };

  updateProgress();
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
}

function initPostMobileReadingControls() {
  const page = document.querySelector<HTMLElement>(".hydro-post-page");
  if (!page) {
    return;
  }

  const drawer = page.querySelector<HTMLElement>("[data-post-mobile-drawer]");
  const bar = page.querySelector<HTMLElement>("[data-post-mobile-bar]");
  if (!drawer && !bar) {
    return;
  }

  document.body.classList.add("hydro-post-reading-page");

  const toggle = page.querySelector<HTMLButtonElement>("[data-post-mobile-toc-toggle]");
  const closeButtons = Array.from(page.querySelectorAll<HTMLButtonElement>("[data-post-mobile-toc-close]"));
  const topButton = page.querySelector<HTMLButtonElement>("[data-post-mobile-top]");
  let restoreFocus = false;

  const syncMobileA11y = () => {
    if (!drawer) {
      return;
    }
    const open = drawer.classList.contains("is-open");
    drawer.setAttribute("aria-hidden", String(mobilePostQuery.matches && !open));
  };

  const closeDrawer = (focusToggle = restoreFocus) => {
    if (!drawer) {
      return;
    }

    drawer.classList.remove("is-open");
    toggle?.classList.remove("is-active");
    toggle?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("hydro-post-drawer-lock");
    if (!document.querySelector(".hydro-moment-poster.is-open, .hydro-mobile-menu.is-open")) {
      document.body.classList.remove("hydro-menu-lock");
      getHydroLenis()?.start?.();
    }
    syncMobileA11y();

    if (focusToggle) {
      toggle?.focus({ preventScroll: true });
    }
    restoreFocus = false;
  };

  const openDrawer = () => {
    if (!drawer || !mobilePostQuery.matches) {
      return;
    }
    if (document.querySelector(".hydro-moment-poster.is-open")) {
      return;
    }

    drawer.classList.add("is-open");
    toggle?.classList.add("is-active");
    toggle?.setAttribute("aria-expanded", "true");
    document.body.classList.add("hydro-post-drawer-lock", "hydro-menu-lock");
    getHydroLenis()?.stop?.();
    restoreFocus = true;
    syncMobileA11y();

    window.requestAnimationFrame(() => {
      const activeLink = drawer.querySelector<HTMLElement>(".hydro-post-toc__link.is-active");
      activeLink?.scrollIntoView({ block: "nearest" });
    });
  };

  toggle?.addEventListener("click", () => {
    if (drawer?.classList.contains("is-open")) {
      closeDrawer();
      return;
    }
    openDrawer();
  });

  closeButtons.forEach((button) => {
    button.addEventListener("click", () => closeDrawer());
  });

  drawer?.querySelectorAll<HTMLButtonElement>("[data-hydro-poster-open]").forEach((button) => {
    button.addEventListener("click", () => {
      if (mobilePostQuery.matches) {
        closeDrawer(false);
      }
    });
  });

  drawer?.querySelectorAll<HTMLAnchorElement>(".hydro-post-toc__link").forEach((link) => {
    link.addEventListener(
      "click",
      (event) => {
        if (!mobilePostQuery.matches) {
          return;
        }

        const targetId = link.closest<HTMLElement>(".hydro-post-toc__item")?.dataset.targetId;
        const target = targetId ? document.getElementById(targetId) : null;
        if (!target) {
          closeDrawer(false);
          return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();
        closeDrawer(false);
        window.requestAnimationFrame(() => {
          scrollToElement(target);
          history.replaceState(null, "", `#${target.id}`);
          target.classList.add("toc-highlight");
          window.setTimeout(() => target.classList.remove("toc-highlight"), 1400);
        });
      },
      { capture: true },
    );
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && drawer?.classList.contains("is-open")) {
      closeDrawer();
    }
  });

  const syncTopButton = () => {
    topButton?.classList.toggle("is-visible", window.scrollY > window.innerHeight * 0.9);
  };

  syncMobileA11y();
  syncTopButton();
  mobilePostQuery.addEventListener("change", () => {
    if (!mobilePostQuery.matches) {
      closeDrawer(false);
      drawer?.setAttribute("aria-hidden", "false");
    } else {
      syncMobileA11y();
    }
  });
  window.addEventListener("scroll", syncTopButton, { passive: true });
  window.addEventListener("resize", syncTopButton);
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

  const linkShareButtons = shareButtons.filter((button) => !button.hasAttribute("data-hydro-poster-open"));
  if (linkShareButtons.length === 0) {
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
      showHydroNotice("链接已复制", { id: "hydro-post-share", title: "分享", variant: "success" });
    } catch {
      window.prompt(button.querySelector<HTMLElement>("strong")?.dataset.copyPromptTitle || copyPromptTitle, url);
    }
  };

  linkShareButtons.forEach((button) => {
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

function initPosterDialogs() {
  const dialogs = Array.from(
    document.querySelectorAll<HTMLElement>("[data-hydro-poster-dialog], [data-hydro-moment-poster]"),
  );
  if (dialogs.length === 0) {
    return;
  }

  dialogs.forEach((dialog) => {
    if (dialog.parentElement !== document.body) {
      document.body.append(dialog);
    }
  });

  const focusableSelector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
  ].join(",");
  const closeDelay = prefersReducedMotion.matches || !motionEnabled ? 0 : 240;
  let activeDialog: HTMLElement | null = null;
  let activeTrigger: HTMLButtonElement | null = null;
  const closeTimers = new WeakMap<HTMLElement, number>();

  const getDialogById = (id: string | undefined) => {
    if (!id) {
      return dialogs.length === 1 ? dialogs[0] : null;
    }
    return dialogs.find((dialog) => dialog.id === id) ?? null;
  };

  const getOpenButtons = (dialog: HTMLElement) =>
    Array.from(
      document.querySelectorAll<HTMLButtonElement>("[data-hydro-poster-open], [data-hydro-moment-poster-open]"),
    ).filter(
      (button) => getDialogById(button.getAttribute("aria-controls") || button.dataset.hydroPosterTarget) === dialog,
    );

  const getCloseButtons = (dialog: HTMLElement) =>
    Array.from(
      dialog.querySelectorAll<HTMLButtonElement>("[data-hydro-poster-close], [data-hydro-moment-poster-close]"),
    );

  const getFocusable = (dialog: HTMLElement) =>
    Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(
      (element) => element.getClientRects().length > 0,
    );

  const setOpenButtonState = (dialog: HTMLElement, expanded: boolean) => {
    getOpenButtons(dialog).forEach((button) => {
      button.classList.toggle("is-active", expanded);
      button.setAttribute("aria-expanded", String(expanded));
    });
  };

  const closeDialog = (dialog: HTMLElement, restoreFocus = true) => {
    const timer = closeTimers.get(dialog);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      closeTimers.delete(dialog);
    }

    dialog.classList.remove("is-open");
    dialog.setAttribute("aria-hidden", "true");
    setOpenButtonState(dialog, false);
    if (activeDialog === dialog) {
      activeDialog = null;
      document.body.classList.remove("hydro-menu-lock");
      getHydroLenis()?.start?.();
    }

    const nextTimer = window.setTimeout(() => {
      dialog.hidden = true;
      closeTimers.delete(dialog);
    }, closeDelay);
    closeTimers.set(dialog, nextTimer);

    if (restoreFocus) {
      activeTrigger?.focus({ preventScroll: true });
    }
  };

  const openDialog = (dialog: HTMLElement, trigger: HTMLButtonElement) => {
    if (activeDialog && activeDialog !== dialog) {
      closeDialog(activeDialog, false);
    }

    const timer = closeTimers.get(dialog);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      closeTimers.delete(dialog);
    }

    activeDialog = dialog;
    activeTrigger = trigger;
    dialog.hidden = false;
    dialog.setAttribute("aria-hidden", "false");
    document.body.classList.add("hydro-menu-lock");
    getHydroLenis()?.stop?.();
    setOpenButtonState(dialog, true);

    const initialFocus = dialog.querySelector<HTMLButtonElement>("[data-hydro-poster-download]");
    window.requestAnimationFrame(() => {
      dialog.classList.add("is-open");
      initialFocus?.focus({ preventScroll: true });
    });
  };

  dialogs.forEach((dialog) => {
    getCloseButtons(dialog).forEach((button) => {
      button.addEventListener("click", () => closeDialog(dialog));
    });
  });

  Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-hydro-poster-open], [data-hydro-moment-poster-open]"),
  ).forEach((button) => {
    const dialog = getDialogById(button.getAttribute("aria-controls") || button.dataset.hydroPosterTarget);
    if (!dialog) {
      return;
    }
    button.addEventListener("click", () => {
      if (dialog.hidden === false) {
        closeDialog(dialog);
        return;
      }
      openDialog(dialog, button);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (!activeDialog || activeDialog.hidden !== false) {
      return;
    }
    if (event.key === "Escape") {
      closeDialog(activeDialog);
      return;
    }
    if (event.key !== "Tab") {
      return;
    }

    const focusable = getFocusable(activeDialog);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
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
  const upvoteCounts = Array.from(page.querySelectorAll<HTMLElement>("[data-post-upvote-count]"));
  if (upvoteButtons.length === 0 || upvoteCounts.length === 0) {
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
        const countValue = Number.parseInt(upvoteCounts[0]?.textContent || "0", 10);
        const nextCount = String(Number.isNaN(countValue) ? 1 : countValue + 1);
        upvoteCounts.forEach((count) => {
          count.textContent = nextCount;
        });
        syncState();
        showHydroNotice("点赞成功", { id: "hydro-post-upvote", title: "文章", variant: "success" });
      } catch {
        button.disabled = false;
        showHydroNotice(readPageLabel(page, "postUpvoteErrorText", "点赞失败，请稍后再试"), {
          id: "hydro-post-upvote",
          title: "文章",
          variant: "error",
        });
      }
    });
  });
}

function readPostFavoriteSubject(page: HTMLElement): MemberFavoriteSubject | null {
  const subjectName = page.dataset.postName?.trim();
  if (!subjectName) {
    return null;
  }

  return {
    subjectType: "POST",
    subjectName,
    subjectTitle: page.dataset.postTitle?.trim() || document.title || subjectName,
    permalink: page.dataset.postPermalink?.trim() || window.location.href,
    cover: page.dataset.postCover?.trim() || "",
  };
}

function syncPostFavoriteButtons(buttons: HTMLButtonElement[], status: MemberFavoriteStatus) {
  const favorited = Boolean(status.favorited);
  const count = Number(status.count || 0);

  buttons.forEach((button) => {
    const label = button.querySelector<HTMLElement>("span");
    const value = button.querySelector<HTMLElement>("strong");
    button.classList.toggle("is-favorited", favorited);
    button.dataset.postFavorited = String(favorited);
    button.setAttribute("aria-pressed", String(favorited));

    if (label) {
      label.textContent = favorited
        ? button.dataset.favoritedLabel || "已收藏"
        : button.dataset.favoriteLabel || "收藏";
    }

    if (value) {
      value.textContent = String(count);
    }
  });
}

function waitForMemberFavorite(timeout = 3000): Promise<MemberFavoriteApi | null> {
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const check = () => {
      if (window.memberFavorite) {
        resolve(window.memberFavorite);
        return;
      }

      if (Date.now() - startedAt >= timeout) {
        resolve(null);
        return;
      }

      window.setTimeout(check, 50);
    };

    check();
  });
}

function initPostFavoriteAction(page: HTMLElement) {
  const favoriteButtons = Array.from(page.querySelectorAll<HTMLButtonElement>("[data-post-action='favorite']"));
  const subject = readPostFavoriteSubject(page);
  if (favoriteButtons.length === 0 || !subject) {
    return;
  }

  favoriteButtons.forEach((button) => {
    const label = button.querySelector<HTMLElement>("span");
    button.dataset.favoriteLabel = label?.textContent?.trim() || "收藏";
    button.dataset.favoritedLabel = page.dataset.postFavoritedLabel || "已收藏";
  });

  void (async () => {
    if (!isMemberPluginAvailable()) {
      favoriteButtons.forEach((button) => {
        button.addEventListener("click", () => {
          showMemberPluginUnavailableNotice("hydro-post-favorite", "文章收藏");
        });
      });
      return;
    }

    if (!isMemberAuthenticated()) {
      favoriteButtons.forEach((button) => {
        button.addEventListener("click", () => {
          showMemberLoginRequiredNotice("hydro-post-favorite", "文章收藏");
        });
      });
      return;
    }

    favoriteButtons.forEach((button) => {
      button.disabled = true;
    });

    const memberFavorite = await waitForMemberFavorite();
    if (!memberFavorite) {
      favoriteButtons.forEach((button) => {
        button.disabled = false;
        button.addEventListener("click", () => {
          showMemberPluginUnavailableNotice("hydro-post-favorite", "文章收藏");
        });
      });
      return;
    }

    let currentStatus: MemberFavoriteStatus | null = null;
    try {
      const status = await memberFavorite.getStatus(subject);
      currentStatus = status;
      syncPostFavoriteButtons(favoriteButtons, status);
    } finally {
      favoriteButtons.forEach((button) => {
        button.disabled = false;
      });
    }

    favoriteButtons.forEach((button) => {
      button.addEventListener("click", async () => {
        if (button.disabled) {
          return;
        }

        if (currentStatus?.authenticated === false) {
          showMemberLoginRequiredNotice("hydro-post-favorite", "文章收藏");
          return;
        }

        button.disabled = true;
        try {
          const result = await memberFavorite.toggle(subject);
          if (result.authenticated === false) {
            showMemberLoginRequiredNotice("hydro-post-favorite", "文章收藏");
            return;
          }
          currentStatus = result;
          syncPostFavoriteButtons(favoriteButtons, result);
          showHydroNotice(
            result.favorited ? `已收藏 · ${Number(result.count || 0)}` : `已取消收藏 · ${Number(result.count || 0)}`,
            {
              id: "hydro-post-favorite",
              title: "文章收藏",
              variant: "success",
            },
          );
        } catch {
          showHydroNotice("收藏操作失败，请稍后再试", {
            id: "hydro-post-favorite",
            title: "文章收藏",
            variant: "error",
          });
        } finally {
          button.disabled = false;
        }
      });
    });
  })();
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

  initPostFavoriteAction(page);
}

function initPostRewardDialog() {
  const dialog = document.querySelector<HTMLElement>("[data-hydro-reward-dialog]");
  const openButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-hydro-reward-open]"));
  if (!dialog || openButtons.length === 0) {
    return;
  }

  if (dialog.parentElement !== document.body) {
    document.body.append(dialog);
  }

  const closeButtons = Array.from(dialog.querySelectorAll<HTMLButtonElement>("[data-hydro-reward-close]"));
  let activeTrigger: HTMLButtonElement | null = null;

  const open = (trigger: HTMLButtonElement) => {
    activeTrigger = trigger;
    dialog.classList.add("is-open");
    dialog.setAttribute("aria-hidden", "false");
    trigger.setAttribute("aria-expanded", "true");
    document.body.classList.add("hydro-reward-lock");
    window.setTimeout(() => dialog.querySelector<HTMLButtonElement>("[data-hydro-reward-close]")?.focus(), 30);
  };

  const close = () => {
    dialog.classList.remove("is-open");
    dialog.setAttribute("aria-hidden", "true");
    document.body.classList.remove("hydro-reward-lock");
    openButtons.forEach((button) => button.setAttribute("aria-expanded", "false"));
    activeTrigger?.focus();
    activeTrigger = null;
  };

  openButtons.forEach((button) => {
    button.addEventListener("click", () => open(button));
  });

  closeButtons.forEach((button) => {
    button.addEventListener("click", close);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && dialog.classList.contains("is-open")) {
      close();
    }
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
  const linksPage = document.querySelector<HTMLElement>(".hydro-site-info, .hydro-links-section");
  const linksSection = document.querySelector<HTMLElement>(".hydro-links-section");
  if (!linksPage) {
    return;
  }

  const copyHandlers = document.querySelectorAll<HTMLButtonElement>(
    ".hydro-site-info [data-copy], .hydro-links-section [data-copy]",
  );
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
        showHydroNotice("已复制到剪贴板", {
          id: "hydro-links-copy-success",
          variant: "success",
        });
        window.setTimeout(() => {
          button.classList.remove("is-copied");
        }, 1500);
      } catch {
        window.prompt(button.getAttribute("title") || "复制内容", text);
        showHydroNotice("浏览器限制了自动复制，请手动复制弹窗内容", {
          id: "hydro-links-copy-fallback",
          variant: "warning",
        });
      }
    });
  });

  linksSection?.querySelectorAll<HTMLButtonElement>("[data-random-link]").forEach((button) => {
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
    const isUpdateMessage = container === updateMessageEl;
    showHydroNotice(message, {
      id: `${isUpdateMessage ? "hydro-link-update" : "hydro-link-submit"}-${type}`,
      title: isUpdateMessage ? "友链修改" : "友链申请",
      variant: type === "success" ? "success" : "error",
    });
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
    showHydroNotice("正在获取站点信息...", {
      id: `${mode === "update" ? "hydro-link-update" : "hydro-link-submit"}-auto-fetch`,
      title: mode === "update" ? "友链修改" : "友链申请",
      variant: "info",
    });
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

    showHydroNotice("正在发送验证码...", {
      id: `${mode === "update" ? "hydro-link-update" : "hydro-link-submit"}-send-code`,
      title: mode === "update" ? "友链修改" : "友链申请",
      variant: "info",
    });
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
    showHydroNotice("正在提交友链申请...", {
      id: "hydro-link-submit-pending",
      title: "友链申请",
      variant: "info",
    });
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
    showHydroNotice("正在提交友链修改...", {
      id: "hydro-link-update-pending",
      title: "友链修改",
      variant: "info",
    });
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
initHydroNotice();
initAuthAltchaFloatingAnchor();
initColorScheme();
initNavigation();
initLenis();
initLenisScrollBoundaries();
initHero();
initFallbackCoverImages();
initArticleMediaPrewarm();
initRevealAnimations();
initTiltCards();
initCategoryCursor();
initFooterMarquee();
initAuthorPage();
initPostContentEnhancements();
initMediaLoadingExperience();
initPostToc();
initPostMobileReadingControls();
initPostActions();
initPostUpvote();
initPostShare();
initPosterDialogs();
initPostRewardDialog();
initPostReadingProgress();
initPostRelatedCards();
initHydroTagCloud();
initCommentWidgetSkin();
initSearchWidgetSkin();

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

  const linkCards = Array.from(document.querySelectorAll<HTMLElement>(".hydro-link-card"));
  if (linkCards.length === 0) {
    return;
  }

  const invalidateGlowRects: Array<() => void> = [];

  linkCards.forEach((card) => {
    let glowRect: DOMRect | null = null;
    let glowX = 0;
    let glowY = 0;
    let glowRaf = 0;
    const readGlowRect = () => {
      glowRect = card.getBoundingClientRect();
      return glowRect;
    };
    const flushGlow = () => {
      glowRaf = 0;
      card.style.setProperty("--hydro-link-glow-x", `${glowX}px`);
      card.style.setProperty("--hydro-link-glow-y", `${glowY}px`);
    };
    const scheduleGlow = (event: PointerEvent) => {
      const rect = glowRect ?? readGlowRect();
      glowX = event.clientX - rect.left;
      glowY = event.clientY - rect.top;
      if (glowRaf) {
        return;
      }
      glowRaf = window.requestAnimationFrame(flushGlow);
    };

    card.addEventListener("pointerenter", () => {
      readGlowRect();
    });
    card.addEventListener("pointermove", scheduleGlow, { passive: true });
    card.addEventListener("pointerleave", () => {
      glowRect = null;
      if (glowRaf) {
        window.cancelAnimationFrame(glowRaf);
        glowRaf = 0;
      }
    });

    invalidateGlowRects.push(() => {
      glowRect = null;
    });
  });

  window.addEventListener(
    "resize",
    () => {
      invalidateGlowRects.forEach((invalidate) => invalidate());
    },
    { passive: true },
  );
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
        showHydroNotice("点赞成功", { id: "hydro-moment-upvote", title: "瞬间", variant: "success" });
      } catch {
        button.disabled = false;
        showHydroNotice(upvoteErrorText, { id: "hydro-moment-upvote", title: "瞬间", variant: "error" });
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
  const caption = lightbox.querySelector<HTMLElement>("[data-lightbox-caption]");

  const triggers = Array.from(document.querySelectorAll<HTMLElement>("[data-lightbox-trigger]"));
  let currentIndex = 0;

  const open = (index: number) => {
    const trigger = triggers[index];
    if (
      !trigger ||
      trigger.dataset.lightboxDisabled === "true" ||
      trigger.dataset.mediaState === "error" ||
      trigger.closest<HTMLElement>("[data-media-state='error']")
    ) {
      return;
    }

    currentIndex = index;
    const src = trigger.dataset.src ?? "";
    const alt = trigger.dataset.alt ?? "";
    const captionText = trigger.dataset.caption ?? alt;
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
    if (caption) {
      caption.textContent = captionText;
      caption.hidden = captionText.length === 0;
    }
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

function getPosterQrColor(element: HTMLElement, property: "backgroundColor" | "color", fallback: string) {
  const value = window.getComputedStyle(element)[property];
  return value && value !== "rgba(0, 0, 0, 0)" ? value : fallback;
}

function readPosterQrUrl(card: HTMLElement, qrElement?: HTMLElement | null) {
  return toAbsoluteShareUrl(qrElement?.dataset.url || card.dataset.shareUrl || window.location.href);
}

function createPosterQrSvgForElement(value: string, element: HTMLElement) {
  return createHydroQrSvg(value, {
    background: getPosterQrColor(element, "backgroundColor", "#f8f5ed"),
    foreground: getPosterQrColor(element, "color", "#181714"),
  });
}

function createPosterQrDataUrlForElement(value: string, element: HTMLElement) {
  return createHydroQrSvgDataUrl(value, {
    background: getPosterQrColor(element, "backgroundColor", "#f8f5ed"),
    foreground: getPosterQrColor(element, "color", "#181714"),
  });
}

function normalizePosterFilename(value: string | undefined) {
  const filename = (value || "hydro-moment-poster.png")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-");
  return filename.toLowerCase().endsWith(".png") ? filename : `${filename}.png`;
}

function inlinePosterComputedStyles(source: Element, target: Element) {
  const computed = window.getComputedStyle(source);
  const targetElement = target as HTMLElement;
  for (let index = 0; index < computed.length; index += 1) {
    const property = computed.item(index);
    const value = computed.getPropertyValue(property);
    if (value.includes("url(")) {
      continue;
    }
    targetElement.style.setProperty(property, value, computed.getPropertyPriority(property));
  }

  Array.from(source.children).forEach((sourceChild, index) => {
    const targetChild = target.children.item(index);
    if (targetChild) {
      inlinePosterComputedStyles(sourceChild, targetChild);
    }
  });
}

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Poster image reader returned no data URL"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Poster image reader failed"));
    reader.readAsDataURL(blob);
  });
}

async function imageToDataUrl(image: HTMLImageElement) {
  const source = image.currentSrc || image.src || image.getAttribute("src") || "";
  if (!source) {
    throw new Error("Poster image has no source");
  }
  if (source.startsWith("data:")) {
    return source;
  }

  const absoluteUrl = new URL(source, window.location.href).href;
  const response = await fetch(absoluteUrl, {
    credentials: new URL(absoluteUrl).origin === window.location.origin ? "same-origin" : "omit",
    mode: "cors",
  });
  if (!response.ok) {
    throw new Error(`Poster image fetch failed with ${response.status}`);
  }
  return readBlobAsDataUrl(await response.blob());
}

function normalizePosterText(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function htmlToPosterText(value: string) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = value;
  return normalizePosterText(wrapper.textContent || "");
}

function createPosterFallbackParagraph(text: string) {
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  return paragraph;
}

function isMomentTagLink(element: Element) {
  if (!(element instanceof HTMLAnchorElement)) {
    return false;
  }
  const href = element.getAttribute("href") || "";
  return element.classList.contains("tag") || href.includes("/moments?tag=");
}

function removeEmptyPosterContentBlocks(root: HTMLElement) {
  Array.from(root.querySelectorAll<HTMLElement>("p, div, section, article, blockquote, li")).forEach((element) => {
    const hasMedia = Boolean(element.querySelector("img, video, audio, iframe, canvas, svg"));
    if (!hasMedia && normalizePosterText(element.textContent || "") === "") {
      element.remove();
    }
  });
}

function buildPosterContentFragment(source: HTMLElement | null, rawText: string, fallbackText: string) {
  const wrapper = document.createElement("div");
  if (source) {
    wrapper.innerHTML = source.innerHTML;
  }

  wrapper
    .querySelectorAll(
      "audio, button, canvas, embed, figure, iframe, img, object, picture, script, source, style, svg, video",
    )
    .forEach((node) => {
      node.remove();
    });

  Array.from(wrapper.querySelectorAll("a")).forEach((link) => {
    if (isMomentTagLink(link)) {
      link.remove();
      return;
    }
    link.removeAttribute("href");
    link.removeAttribute("target");
    link.removeAttribute("rel");
  });

  removeEmptyPosterContentBlocks(wrapper);

  if (normalizePosterText(wrapper.textContent || "")) {
    return wrapper;
  }

  const rawTextContent = htmlToPosterText(rawText);
  wrapper.append(createPosterFallbackParagraph(rawTextContent || fallbackText || "一条被认真保存的瞬间"));
  return wrapper;
}

function syncPosterCardMediaState(card: HTMLElement) {
  const images = Array.from(card.querySelectorAll<HTMLImageElement>("[data-hydro-poster-image]"));
  const firstImage = images.find((image) => Boolean(image.currentSrc || image.src || image.getAttribute("src")));
  const media = card.querySelector<HTMLElement>(".hydro-poster-card__media");

  images.forEach((image) => {
    const isActive = image === firstImage;
    image.hidden = !isActive;
    image.toggleAttribute("aria-hidden", !isActive);
  });

  if (media) {
    media.hidden = !firstImage;
    media.toggleAttribute("aria-hidden", !firstImage);
  }

  card.classList.toggle("has-poster-image", Boolean(firstImage));
  return firstImage ?? null;
}

function syncPosterCardCopyState(card: HTMLElement) {
  const target = card.querySelector<HTMLElement>("[data-hydro-poster-copy-content]");
  if (!target) {
    return;
  }

  const source = card.querySelector<HTMLElement>("[data-hydro-poster-copy-source]");
  const fallbackText = normalizePosterText(target.dataset.hydroPosterCopyFallback || target.textContent || "");
  const content = buildPosterContentFragment(source, target.dataset.hydroPosterCopyRaw || "", fallbackText);

  target.innerHTML = "";
  Array.from(content.children).forEach((child) => {
    target.append(child.cloneNode(true));
  });

  if (target.children.length === 0) {
    target.append(createPosterFallbackParagraph(normalizePosterText(content.textContent || "") || fallbackText));
  }
}

function syncPosterCardCaptionState(card: HTMLElement) {
  const caption = card.querySelector<HTMLElement>("[data-hydro-poster-caption]");
  if (!caption) {
    return;
  }

  const tags = Array.from(card.querySelectorAll<HTMLElement>("[data-hydro-poster-tag]"))
    .map((tag) => normalizePosterText(tag.textContent || ""))
    .filter(Boolean);
  caption.textContent =
    tags.slice(0, 2).join(" / ") ||
    normalizePosterText(caption.dataset.hydroPosterCaptionFallback || caption.textContent || "");
}

function syncPosterCardQrState(card: HTMLElement) {
  card.querySelectorAll<HTMLElement>("[data-hydro-poster-qr]").forEach((element) => {
    const shareUrl = readPosterQrUrl(card, element);
    element.dataset.hydroPosterQrUrl = shareUrl;
    element.innerHTML = createPosterQrSvgForElement(shareUrl, element);
  });
}

function syncPosterCardState(card: HTMLElement) {
  syncPosterCardCopyState(card);
  syncPosterCardCaptionState(card);
  syncPosterCardQrState(card);
  return syncPosterCardMediaState(card);
}

async function getPosterExportImageDataUrls(card: HTMLElement) {
  const dataUrls = new Map<string, string>();
  const images = Array.from(card.querySelectorAll<HTMLImageElement>("[data-hydro-poster-export-image]"));

  await Promise.all(
    images.map(async (image, index) => {
      try {
        dataUrls.set(String(index), await imageToDataUrl(image));
      } catch (error) {
        console.warn("[Hydro] Poster image export failed, using local render fallback.", error);
      }
    }),
  );

  return dataUrls;
}

async function createPosterExportClone(card: HTMLElement, width: number, height: number) {
  const posterImage = syncPosterCardState(card);
  const posterImageDataUrls = await getPosterExportImageDataUrls(card);

  const clone = card.cloneNode(true) as HTMLElement;
  inlinePosterComputedStyles(card, clone);
  clone
    .querySelectorAll("audio, canvas, embed, iframe, object, picture, script, source, style, video")
    .forEach((node) => {
      node.remove();
    });

  const cloneImages = Array.from(clone.querySelectorAll<HTMLImageElement>("[data-hydro-poster-image]"));
  cloneImages.forEach((image, index) => {
    const dataUrl = posterImageDataUrls.get(String(index));
    if (posterImage && dataUrl && index === 0) {
      image.src = dataUrl;
      image.hidden = false;
      image.removeAttribute("aria-hidden");
      image.style.display = "block";
      return;
    }
    image.remove();
  });

  Array.from(
    clone.querySelectorAll<HTMLImageElement>("[data-hydro-poster-export-image]:not([data-hydro-poster-image])"),
  ).forEach((image, index) => {
    const dataUrl = posterImageDataUrls.get(String(cloneImages.length + index));
    if (dataUrl) {
      image.src = dataUrl;
      return;
    }
    const fallback = image.nextElementSibling;
    image.remove();
    if (fallback instanceof HTMLElement && fallback.classList.contains("hydro-poster-card__seal-fallback")) {
      fallback.style.removeProperty("display");
    }
  });

  const cloneMedia = clone.querySelector<HTMLElement>(".hydro-poster-card__media");
  const cloneNoMedia = clone.querySelector<HTMLElement>(".hydro-poster-card__no-media");
  if (posterImage && posterImageDataUrls.get("0")) {
    clone.classList.add("has-poster-image");
    if (cloneMedia) cloneMedia.style.display = "block";
    if (cloneNoMedia) cloneNoMedia.style.display = "none";
  } else {
    clone.classList.remove("has-poster-image");
    if (cloneMedia) cloneMedia.style.display = "none";
    if (cloneNoMedia) cloneNoMedia.style.display = "grid";
  }

  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  clone.style.width = `${width}px`;
  clone.style.height = `${height}px`;
  clone.style.maxWidth = "none";
  clone.style.margin = "0";
  clone.style.transform = "none";
  clone.style.animation = "none";
  clone.style.transition = "none";
  clone.querySelectorAll<HTMLElement>("*").forEach((element) => {
    element.style.animation = "none";
    element.style.transition = "none";
  });
  return clone;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function loadImageFromUrl(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Poster image failed to load"));
    image.src = url;
  });
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error("Poster canvas export failed"));
    }, "image/png");
  });
}

type PosterCanvasRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type PosterRgb = [number, number, number];

function parsePosterPixels(value: string | null | undefined, fallback: number) {
  const parsed = Number.parseFloat(value || "");
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getPosterCssRgb(element: HTMLElement, property: string, fallback: PosterRgb): PosterRgb {
  const raw = window.getComputedStyle(element).getPropertyValue(property);
  const values = raw
    .match(/[\d.]+/g)
    ?.slice(0, 3)
    .map((value) => Number.parseFloat(value));
  if (!values || values.length < 3 || values.some((value) => !Number.isFinite(value))) {
    return fallback;
  }
  return [values[0], values[1], values[2]];
}

function posterRgba(rgb: PosterRgb, alpha: number) {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

function getPosterCanvasScale() {
  return Math.min(3, Math.max(2, window.devicePixelRatio || 2));
}

function getPosterRelativeRect(root: HTMLElement, element: Element | null): PosterCanvasRect | null {
  if (!element) {
    return null;
  }
  const rootRect = root.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  return {
    x: rect.left - rootRect.left,
    y: rect.top - rootRect.top,
    width: rect.width,
    height: rect.height,
  };
}

function getPosterSelectorRect(root: HTMLElement, selector: string): PosterCanvasRect | null {
  return getPosterRelativeRect(root, root.querySelector(selector));
}

function drawPosterRoundedPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function strokePosterRoundedRect(
  context: CanvasRenderingContext2D,
  rect: PosterCanvasRect,
  radius: number,
  strokeStyle: string,
  lineWidth = 1,
) {
  drawPosterRoundedPath(context, rect.x, rect.y, rect.width, rect.height, radius);
  context.strokeStyle = strokeStyle;
  context.lineWidth = lineWidth;
  context.stroke();
}

function drawPosterGrid(
  context: CanvasRenderingContext2D,
  rect: PosterCanvasRect,
  step: number,
  strokeStyle: string,
  radius = 0,
) {
  context.save();
  drawPosterRoundedPath(context, rect.x, rect.y, rect.width, rect.height, radius);
  context.clip();
  context.strokeStyle = strokeStyle;
  context.lineWidth = 1;
  for (let y = rect.y; y <= rect.y + rect.height; y += step) {
    context.beginPath();
    context.moveTo(rect.x, y);
    context.lineTo(rect.x + rect.width, y);
    context.stroke();
  }
  for (let x = rect.x; x <= rect.x + rect.width; x += step) {
    context.beginPath();
    context.moveTo(x, rect.y);
    context.lineTo(x, rect.y + rect.height);
    context.stroke();
  }
  context.restore();
}

function drawPosterImageCover(context: CanvasRenderingContext2D, image: HTMLImageElement, rect: PosterCanvasRect) {
  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;
  if (imageWidth <= 0 || imageHeight <= 0) {
    return;
  }

  const scale = Math.max(rect.width / imageWidth, rect.height / imageHeight);
  const sourceWidth = rect.width / scale;
  const sourceHeight = rect.height / scale;
  const sourceX = (imageWidth - sourceWidth) / 2;
  const sourceY = (imageHeight - sourceHeight) / 2;
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, rect.x, rect.y, rect.width, rect.height);
}

function getPosterComputedFont(element: Element | null, fallback: string) {
  if (!element) {
    return fallback;
  }
  const font = window.getComputedStyle(element).font;
  return font || fallback;
}

function getPosterComputedColor(element: Element | null, fallback: string) {
  if (!element) {
    return fallback;
  }
  const color = window.getComputedStyle(element).color;
  return color || fallback;
}

function getPosterLineHeight(element: Element | null, fallback: number) {
  if (!element) {
    return fallback;
  }
  return parsePosterPixels(window.getComputedStyle(element).lineHeight, fallback);
}

function ellipsizePosterLine(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  const ellipsis = "...";
  if (context.measureText(value).width <= maxWidth) {
    return value;
  }
  const chars = Array.from(value);
  while (chars.length > 0 && context.measureText(`${chars.join("")}${ellipsis}`).width > maxWidth) {
    chars.pop();
  }
  return `${chars.join("").trimEnd()}${ellipsis}`;
}

function wrapPosterText(context: CanvasRenderingContext2D, value: string, maxWidth: number, maxLines: number) {
  const normalized = normalizePosterText(value);
  if (!normalized || maxLines <= 0) {
    return [];
  }

  const chars = Array.from(normalized);
  const lines: string[] = [];
  let index = 0;
  while (index < chars.length && lines.length < maxLines) {
    let line = "";
    while (index < chars.length) {
      const next = `${line}${chars[index]}`;
      if (!line || context.measureText(next).width <= maxWidth) {
        line = next;
        index += 1;
        continue;
      }
      break;
    }
    lines.push(line.trimStart());
  }

  if (index < chars.length && lines.length > 0) {
    lines[lines.length - 1] = ellipsizePosterLine(context, lines[lines.length - 1], maxWidth);
  }
  return lines;
}

function drawPosterSingleLine(
  context: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  align: CanvasTextAlign = "left",
) {
  const text = ellipsizePosterLine(context, normalizePosterText(value), maxWidth);
  context.textAlign = align;
  context.textBaseline = "top";
  context.fillText(text, x, y);
}

function drawPosterWrappedText(
  context: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const lines = wrapPosterText(context, value, maxWidth, maxLines);
  lines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });
  return lines.length * lineHeight;
}

function readPosterContentBlocks(content: HTMLElement | null) {
  if (!content) {
    return [];
  }

  const blocks: string[] = [];
  Array.from(content.children).forEach((child) => {
    if (!(child instanceof HTMLElement)) {
      return;
    }
    if (child.matches("ul, ol")) {
      const ordered = child.matches("ol");
      Array.from(child.querySelectorAll("li")).forEach((item, index) => {
        const text = normalizePosterText(item.textContent || "");
        if (text) {
          blocks.push(`${ordered ? `${index + 1}.` : "-"} ${text}`);
        }
      });
      return;
    }
    const text = normalizePosterText(child.textContent || "");
    if (text) {
      blocks.push(text);
    }
  });

  if (blocks.length === 0) {
    const text = normalizePosterText(content.textContent || "");
    if (text) {
      blocks.push(text);
    }
  }
  return blocks;
}

async function loadPosterCanvasImage(image: HTMLImageElement | null) {
  if (!image) {
    return null;
  }
  try {
    return loadImageFromUrl(await imageToDataUrl(image));
  } catch (error) {
    console.debug("[Hydro] Poster image skipped in canvas renderer.", error);
    return null;
  }
}

function drawPosterCardBackground(context: CanvasRenderingContext2D, card: HTMLElement, width: number, height: number) {
  const cardStyle = window.getComputedStyle(card);
  const paper = getPosterCssRgb(card, "--hydro-paper-rgb", [245, 243, 237]);
  const bg = getPosterCssRgb(card, "--hydro-bg-rgb", paper);
  const ink = getPosterCssRgb(card, "--hydro-ink-rgb", [22, 22, 20]);
  const accent = getPosterCssRgb(card, "--hydro-accent-rgb", [129, 160, 150]);
  const teal = getPosterCssRgb(card, "--hydro-teal-rgb", [80, 139, 126]);
  const radius = parsePosterPixels(cardStyle.borderRadius, 14);
  const cardRect = { x: 0, y: 0, width, height };

  context.save();
  drawPosterRoundedPath(context, 0, 0, width, height, radius);
  context.clip();

  const base = context.createLinearGradient(0, 0, width, height);
  base.addColorStop(0, posterRgba(paper, 0.98));
  base.addColorStop(0.64, posterRgba(paper, 0.9));
  base.addColorStop(1, posterRgba(bg, 1));
  context.fillStyle = base;
  context.fillRect(0, 0, width, height);

  const accentGlow = context.createRadialGradient(
    width * 0.9,
    height * 0.14,
    0,
    width * 0.9,
    height * 0.14,
    width * 0.26,
  );
  accentGlow.addColorStop(0, posterRgba(accent, 0.18));
  accentGlow.addColorStop(1, posterRgba(accent, 0));
  context.fillStyle = accentGlow;
  context.fillRect(0, 0, width, height);

  const tealGlow = context.createRadialGradient(
    width * 0.1,
    height * 0.84,
    0,
    width * 0.1,
    height * 0.84,
    width * 0.28,
  );
  tealGlow.addColorStop(0, posterRgba(teal, 0.12));
  tealGlow.addColorStop(1, posterRgba(teal, 0));
  context.fillStyle = tealGlow;
  context.fillRect(0, 0, width, height);

  drawPosterGrid(context, { x: 18, y: 18, width: width - 36, height: height - 36 }, 19, posterRgba(ink, 0.035));
  context.strokeStyle = posterRgba(ink, 0.12);
  context.lineWidth = 1;
  context.strokeRect(17.5, 17.5, Math.max(0, width - 35), Math.max(0, height - 35));

  context.save();
  context.translate(width - 23, height - 125);
  context.rotate(-Math.PI / 2);
  context.fillStyle = posterRgba(ink, 0.07);
  context.font = "700 45px Space Mono, monospace";
  context.textBaseline = "top";
  context.fillText("HYDRO", 0, 0);
  context.globalAlpha = 0.6;
  context.fillText("MOMENT", 0, 39);
  context.restore();

  strokePosterRoundedRect(context, cardRect, radius, posterRgba(ink, 0.16));
  context.restore();
}

async function drawPosterHero(
  context: CanvasRenderingContext2D,
  card: HTMLElement,
  rect: PosterCanvasRect,
  posterImage: HTMLImageElement | null,
) {
  const paper = getPosterCssRgb(card, "--hydro-paper-rgb", [245, 243, 237]);
  const ink = getPosterCssRgb(card, "--hydro-ink-rgb", [22, 22, 20]);
  const accent = getPosterCssRgb(card, "--hydro-accent-rgb", [129, 160, 150]);
  const radius = parsePosterPixels(
    window.getComputedStyle(card.querySelector(".hydro-poster-card__hero") || card).borderRadius,
    10,
  );
  const image = await loadPosterCanvasImage(posterImage);

  context.save();
  drawPosterRoundedPath(context, rect.x, rect.y, rect.width, rect.height, radius);
  context.clip();

  const background = context.createLinearGradient(rect.x, rect.y, rect.x + rect.width, rect.y + rect.height);
  background.addColorStop(0, posterRgba(accent, 0.18));
  background.addColorStop(0.55, posterRgba(ink, 0.08));
  background.addColorStop(1, posterRgba(paper, 0.4));
  context.fillStyle = background;
  context.fillRect(rect.x, rect.y, rect.width, rect.height);

  if (image) {
    drawPosterImageCover(context, image, rect);
    const shade = context.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.height);
    shade.addColorStop(0, posterRgba(ink, 0.04));
    shade.addColorStop(1, posterRgba(ink, 0.55));
    context.fillStyle = shade;
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
  } else {
    drawPosterGrid(context, rect, 17, posterRgba(ink, 0.06), radius);
    context.fillStyle = posterRgba(ink, 0.82);
    context.font = `400 ${Math.min(138, rect.height * 0.64)}px ui-serif, Georgia, serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("氢", rect.x + rect.width / 2, rect.y + rect.height / 2);
    context.fillStyle = posterRgba(ink, 0.28);
    context.font = "700 12px Space Mono, monospace";
    context.textAlign = "right";
    context.textBaseline = "top";
    context.fillText("MINIM", rect.x + rect.width - 16, rect.y + rect.height - 27);
  }

  context.restore();

  strokePosterRoundedRect(context, rect, radius, posterRgba(ink, 0.14));
  context.strokeStyle = posterRgba(paper, 0.42);
  context.lineWidth = 1;
  context.strokeRect(rect.x + 10.5, rect.y + 10.5, Math.max(0, rect.width - 21), Math.max(0, rect.height - 21));

  const caption = card.querySelector<HTMLElement>("[data-hydro-poster-caption]");
  if (caption) {
    context.fillStyle = image ? posterRgba(paper, 0.92) : posterRgba(ink, 0.68);
    context.font = getPosterComputedFont(caption, "700 10px Space Mono, monospace");
    drawPosterSingleLine(
      context,
      caption.textContent || "",
      rect.x + 16,
      rect.y + rect.height - 29,
      Math.max(0, rect.width - 32),
    );
  }
}

function drawPosterCopy(context: CanvasRenderingContext2D, card: HTMLElement) {
  const copyRect = getPosterSelectorRect(card, ".hydro-poster-card__copy");
  const content = card.querySelector<HTMLElement>("[data-hydro-poster-copy-content]");
  const contentRect = getPosterRelativeRect(card, content);
  const kicker = card.querySelector<HTMLElement>(".hydro-poster-card__kicker");
  const kickerRect = getPosterRelativeRect(card, kicker);
  if (!copyRect || !content || !contentRect) {
    return;
  }

  const ink = getPosterCssRgb(card, "--hydro-ink-rgb", [22, 22, 20]);
  context.strokeStyle = posterRgba(ink, 0.13);
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(copyRect.x, copyRect.y + 0.5);
  context.lineTo(copyRect.x + copyRect.width, copyRect.y + 0.5);
  context.stroke();

  if (kicker && kickerRect) {
    context.fillStyle = getPosterComputedColor(kicker, posterRgba(ink, 0.44));
    context.font = getPosterComputedFont(kicker, "700 11px Space Mono, monospace");
    drawPosterSingleLine(context, kicker.textContent || "", kickerRect.x, kickerRect.y, kickerRect.width);
  }

  const blocks = readPosterContentBlocks(content);
  const firstChild = content.firstElementChild;
  const contentStyle = window.getComputedStyle(content);
  const fallbackColor = contentStyle.color || posterRgba(ink, 0.72);
  let y = contentRect.y;
  const bottom = contentRect.y + contentRect.height;

  blocks.forEach((block, index) => {
    if (y >= bottom - 6) {
      return;
    }
    const sourceElement = index === 0 ? firstChild : content;
    const font =
      index === 0
        ? getPosterComputedFont(sourceElement, "650 25px system-ui, sans-serif")
        : getPosterComputedFont(content, "400 14px system-ui, sans-serif");
    const lineHeight = index === 0 ? getPosterLineHeight(sourceElement, 29) : getPosterLineHeight(content, 23);
    const maxLines = Math.max(1, Math.min(index === 0 ? 3 : 2, Math.floor((bottom - y) / lineHeight)));
    context.fillStyle = index === 0 ? getPosterComputedColor(sourceElement, posterRgba(ink, 0.94)) : fallbackColor;
    context.font = font;
    context.textAlign = "left";
    context.textBaseline = "top";
    const used = drawPosterWrappedText(context, block, contentRect.x, y, contentRect.width, lineHeight, maxLines);
    y += used + (index === 0 ? 8 : 7);
  });
}

async function drawPosterFooter(context: CanvasRenderingContext2D, card: HTMLElement) {
  const footerRect = getPosterSelectorRect(card, ".hydro-poster-card__footer");
  const sealRect = getPosterSelectorRect(card, ".hydro-poster-card__seal");
  const siteRect = getPosterSelectorRect(card, ".hydro-poster-site");
  const qrElement = card.querySelector<HTMLElement>("[data-hydro-poster-qr]");
  const qrRect = getPosterRelativeRect(card, qrElement);
  if (!footerRect || !sealRect || !siteRect) {
    return;
  }

  const ink = getPosterCssRgb(card, "--hydro-ink-rgb", [22, 22, 20]);
  context.strokeStyle = posterRgba(ink, 0.1);
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(footerRect.x, footerRect.y + 0.5);
  context.lineTo(footerRect.x + footerRect.width, footerRect.y + 0.5);
  context.stroke();

  const avatar = await loadPosterCanvasImage(card.querySelector<HTMLImageElement>("[data-hydro-poster-avatar]"));
  const sealCenterX = sealRect.x + sealRect.width / 2;
  const sealCenterY = sealRect.y + sealRect.height / 2;
  const sealRadius = Math.min(sealRect.width, sealRect.height) / 2;

  context.save();
  context.beginPath();
  context.arc(sealCenterX, sealCenterY, sealRadius, 0, Math.PI * 2);
  context.clip();
  context.fillStyle = posterRgba(ink, 0.05);
  context.fillRect(sealRect.x, sealRect.y, sealRect.width, sealRect.height);
  if (avatar) {
    drawPosterImageCover(context, avatar, sealRect);
  }
  context.restore();

  context.beginPath();
  context.arc(sealCenterX, sealCenterY, sealRadius - 0.5, 0, Math.PI * 2);
  context.strokeStyle = posterRgba(ink, 0.18);
  context.stroke();

  if (!avatar) {
    const fallback = card.querySelector<HTMLElement>(".hydro-poster-card__seal-fallback");
    context.fillStyle = getPosterComputedColor(fallback, posterRgba(ink, 0.78));
    context.font = getPosterComputedFont(fallback, "700 16px system-ui, sans-serif");
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(normalizePosterText(fallback?.textContent || "H"), sealCenterX, sealCenterY);
  }

  context.strokeStyle = posterRgba(ink, 0.12);
  context.beginPath();
  context.moveTo(siteRect.x + 0.5, siteRect.y);
  context.lineTo(siteRect.x + 0.5, siteRect.y + siteRect.height);
  context.stroke();

  const siteName = card.querySelector<HTMLElement>(".hydro-poster-site strong");
  const siteSubtitle = card.querySelector<HTMLElement>(".hydro-poster-site span");
  const siteHint = card.querySelector<HTMLElement>(".hydro-poster-site em");
  const siteNameRect = getPosterRelativeRect(card, siteName);
  const siteSubtitleRect = getPosterRelativeRect(card, siteSubtitle);
  const siteHintRect = getPosterRelativeRect(card, siteHint);
  if (siteName && siteNameRect) {
    context.fillStyle = getPosterComputedColor(siteName, posterRgba(ink, 0.95));
    context.font = getPosterComputedFont(siteName, "700 14px system-ui, sans-serif");
    drawPosterSingleLine(context, siteName.textContent || "", siteNameRect.x, siteNameRect.y, siteNameRect.width);
  }
  if (siteSubtitle && siteSubtitleRect) {
    context.fillStyle = getPosterComputedColor(siteSubtitle, posterRgba(ink, 0.46));
    context.font = getPosterComputedFont(siteSubtitle, "400 11px system-ui, sans-serif");
    drawPosterSingleLine(
      context,
      siteSubtitle.textContent || "",
      siteSubtitleRect.x,
      siteSubtitleRect.y,
      siteSubtitleRect.width,
    );
  }
  if (siteHint && siteHintRect) {
    context.fillStyle = getPosterComputedColor(siteHint, posterRgba(ink, 0.62));
    context.font = getPosterComputedFont(siteHint, "700 10px Space Mono, monospace");
    drawPosterSingleLine(context, siteHint.textContent || "", siteHintRect.x, siteHintRect.y, siteHintRect.width);
  }

  if (qrElement && qrRect) {
    try {
      const qrImage = await loadImageFromUrl(
        createPosterQrDataUrlForElement(
          qrElement.dataset.hydroPosterQrUrl || readPosterQrUrl(card, qrElement),
          qrElement,
        ),
      );
      context.drawImage(qrImage, qrRect.x, qrRect.y, qrRect.width, qrRect.height);
    } catch (error) {
      console.debug("[Hydro] Poster QR skipped in canvas renderer.", error);
    }
  }
}

async function renderPosterCardCanvasBlob(card: HTMLElement, width: number, height: number) {
  syncPosterCardState(card);
  try {
    await document.fonts?.ready;
  } catch {
    // Font readiness is a polish concern; the PNG renderer can still proceed.
  }

  const scale = getPosterCanvasScale();
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Poster canvas context is unavailable");
  }

  context.scale(scale, scale);
  drawPosterCardBackground(context, card, width, height);

  const header = card.querySelector<HTMLElement>(".hydro-poster-card__header");
  const eyebrow = card.querySelector<HTMLElement>(".hydro-poster-card__eyebrow");
  const time = card.querySelector<HTMLElement>(".hydro-poster-card__header time");
  const headerRect = getPosterRelativeRect(card, header);
  const eyebrowRect = getPosterRelativeRect(card, eyebrow);
  const timeRect = getPosterRelativeRect(card, time);
  if (headerRect && eyebrow && eyebrowRect) {
    context.fillStyle = getPosterComputedColor(eyebrow, "rgba(22, 22, 20, 0.58)");
    context.font = getPosterComputedFont(eyebrow, "700 12px Space Mono, monospace");
    drawPosterSingleLine(context, eyebrow.textContent || "", eyebrowRect.x, eyebrowRect.y, eyebrowRect.width);
  }
  if (headerRect && time && timeRect) {
    context.fillStyle = getPosterComputedColor(time, "rgba(22, 22, 20, 0.46)");
    context.font = getPosterComputedFont(time, "400 10px Space Mono, monospace");
    drawPosterSingleLine(
      context,
      time.textContent || "",
      timeRect.x + timeRect.width,
      timeRect.y,
      timeRect.width,
      "right",
    );
  }

  const posterImage = syncPosterCardState(card);
  const heroRect = getPosterSelectorRect(card, ".hydro-poster-card__hero");
  if (heroRect) {
    await drawPosterHero(context, card, heroRect, posterImage);
  }
  drawPosterCopy(context, card);
  await drawPosterFooter(context, card);

  return canvasToPngBlob(canvas);
}

async function renderPosterDomToPngBlob(card: HTMLElement, width: number, height: number) {
  const clone = await createPosterExportClone(card, width, height);
  const serialized = new XMLSerializer().serializeToString(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject width="100%" height="100%">${serialized}</foreignObject></svg>`;
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImageFromUrl(svgUrl);
    const scale = Math.min(3, Math.max(2, window.devicePixelRatio || 2));
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Poster canvas context is unavailable");
    }
    context.scale(scale, scale);
    context.drawImage(image, 0, 0, width, height);
    return await canvasToPngBlob(canvas);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

async function downloadPosterCard(card: HTMLElement, filename: string) {
  const rect = card.getBoundingClientRect();
  const width = Math.ceil(rect.width || card.offsetWidth);
  const height = Math.ceil(rect.height || card.offsetHeight);
  if (width <= 0 || height <= 0) {
    throw new Error("Poster card has no exportable size");
  }

  const normalizedFilename = normalizePosterFilename(filename);
  try {
    downloadBlob(await renderPosterDomToPngBlob(card, width, height), normalizedFilename);
    return;
  } catch (error) {
    console.debug("[Hydro] Poster DOM export failed, using canvas renderer.", error);
  }

  downloadBlob(await renderPosterCardCanvasBlob(card, width, height), normalizedFilename);
}

function initPosterShareScope(scope: HTMLElement) {
  scope.querySelectorAll<HTMLElement>("[data-hydro-poster-card]").forEach((card) => {
    syncPosterCardState(card);
  });

  scope.querySelectorAll<HTMLButtonElement>("[data-hydro-poster-download]").forEach((button) => {
    button.addEventListener("click", async () => {
      const card = scope.querySelector<HTMLElement>("[data-hydro-poster-card]");
      if (!card) {
        return;
      }

      button.disabled = true;
      button.classList.add("is-downloading");
      button.setAttribute("aria-busy", "true");
      try {
        await downloadPosterCard(card, normalizePosterFilename(button.dataset.filename));
      } catch (error) {
        console.warn("[Hydro] Poster PNG export failed.", error);
        showHydroNotice("海报 PNG 生成失败，请稍后再试", {
          id: "hydro-poster-download",
          title: "分享海报",
          variant: "error",
        });
      } finally {
        button.disabled = false;
        button.classList.remove("is-downloading");
        button.removeAttribute("aria-busy");
      }
    });
  });
}

function initPosterShare() {
  const scopes = new Set<HTMLElement>(Array.from(document.querySelectorAll<HTMLElement>("[data-hydro-poster-scope]")));
  scopes.forEach((scope) => initPosterShareScope(scope));
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
  const content =
    document.querySelector<HTMLElement>("[data-hydro-doc-content]") ||
    document.querySelector<HTMLElement>("[data-toc-content]") ||
    document.querySelector<HTMLElement>("#content");
  const toc = document.querySelector<HTMLElement>("[data-hydro-doc-toc]");
  if (!content || !toc) {
    return;
  }
  const tocPanel = toc.closest<HTMLElement>(".hydro-doc-toc");

  const getOrCreateMeta = () => {
    if (!tocPanel) {
      return null;
    }
    let meta = tocPanel.querySelector<HTMLElement>(".hydro-doc-toc__meta");
    if (!meta) {
      meta = document.createElement("div");
      meta.className = "hydro-doc-toc__meta";
      tocPanel.insertBefore(meta, toc);
    }
    return meta;
  };

  const updateMeta = (count: number, activeNumber = "0", activeTitle = "") => {
    const meta = getOrCreateMeta();
    if (!meta) {
      return;
    }

    meta.innerHTML = "";

    const summary = document.createElement("span");
    summary.className = "hydro-doc-toc__meta-summary";
    summary.textContent = count > 0 ? `${activeNumber} / ${String(count).padStart(2, "0")}` : "0 / 00";

    const current = document.createElement("strong");
    current.className = "hydro-doc-toc__meta-current";
    current.textContent = activeTitle || "暂无章节";

    meta.append(summary, current);
  };

  const headings = Array.from(content.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5")).filter((heading) => {
    return (heading.textContent || "").trim().length > 0;
  });
  tocPanel?.style.setProperty("--hydro-doc-toc-progress", "0%");
  tocPanel?.setAttribute("data-toc-count", String(headings.length));
  if (headings.length === 0) {
    updateMeta(0);
    toc.innerHTML = `<span class="hydro-doc-toc__empty">${escapeHtml(document.body.dataset.docTocEmptyText || "无目录")}</span>`;
    return;
  }

  const usedIds = new Set<string>();
  toc.innerHTML = "";
  const links: HTMLAnchorElement[] = [];
  const headingDepths = headings.map((heading) => {
    return Number.parseInt(heading.tagName.replace("H", ""), 10) || 1;
  });
  const baseDepth = Math.min(...headingDepths);
  const maxDepth = Math.max(...headingDepths);
  const headingCounters = Array.from({ length: 7 }, () => 0);
  const headingNumbers: string[] = [];

  tocPanel?.setAttribute("data-toc-depth-min", String(baseDepth));
  tocPanel?.setAttribute("data-toc-depth-max", String(maxDepth));

  const getHeadingNumber = (depth: number) => {
    const normalizedDepth = Math.min(5, Math.max(baseDepth, depth));
    for (let level = baseDepth; level < normalizedDepth; level += 1) {
      if (headingCounters[level] === 0) {
        headingCounters[level] = 1;
      }
    }
    headingCounters[normalizedDepth] += 1;
    for (let level = normalizedDepth + 1; level < headingCounters.length; level += 1) {
      headingCounters[level] = 0;
    }
    return headingCounters.slice(baseDepth, normalizedDepth + 1).join(".");
  };

  headings.forEach((heading, index) => {
    const depth = headingDepths[index] || baseDepth;
    const headingNumber = getHeadingNumber(depth);
    const rank = Math.min(5, Math.max(1, depth - baseDepth + 1));
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
    link.dataset.depth = String(depth);
    link.dataset.rank = String(rank);
    link.dataset.number = headingNumber;
    link.dataset.index = String(index + 1).padStart(2, "0");

    const indexNode = document.createElement("span");
    indexNode.className = "hydro-doc-toc__link-index";
    indexNode.textContent = headingNumber;

    const labelNode = document.createElement("span");
    labelNode.className = "hydro-doc-toc__link-label";
    labelNode.textContent = (heading.textContent || "").trim();

    link.append(indexNode, labelNode);
    link.addEventListener("click", (event) => {
      event.preventDefault();
      links.forEach((item) => item.classList.toggle("is-active", item === link));
      updateMeta(headings.length, headingNumber, labelNode.textContent || "");
      scrollToElement(heading);
    });
    toc.append(link);
    links.push(link);
    headingNumbers.push(headingNumber);
  });

  let activeLinkIndex = -1;
  let updateScheduled = false;

  const syncTocScroll = (link: HTMLAnchorElement) => {
    const tocRect = toc.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    if (linkRect.top < tocRect.top + 12 || linkRect.bottom > tocRect.bottom - 12) {
      link.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  };

  const setActiveLink = () => {
    const viewportAnchor = window.scrollY + Math.round(window.innerHeight * 0.24);
    const activeIndex = headings.reduce((current, heading, index) => {
      return heading.offsetTop <= viewportAnchor ? index : current;
    }, 0);

    const firstHeadingTop = headings[0]?.offsetTop ?? 0;
    const lastHeadingTop = headings[headings.length - 1]?.offsetTop ?? firstHeadingTop;
    const progressRange = Math.max(1, lastHeadingTop - firstHeadingTop);
    const progress = Math.min(1, Math.max(0, (viewportAnchor - firstHeadingTop) / progressRange));
    tocPanel?.style.setProperty("--hydro-doc-toc-progress", `${Math.round(progress * 100)}%`);

    links.forEach((link, index) => link.classList.toggle("is-active", index === activeIndex));
    if (activeLinkIndex !== activeIndex) {
      activeLinkIndex = activeIndex;
      const activeLink = links[activeIndex];
      const activeTitle = headings[activeIndex]?.textContent?.trim() || "";
      updateMeta(headings.length, headingNumbers[activeIndex] || "0", activeTitle);
      if (activeLink) {
        syncTocScroll(activeLink);
      }
    }
  };

  const scheduleActiveLinkUpdate = () => {
    if (updateScheduled) {
      return;
    }
    updateScheduled = true;
    window.requestAnimationFrame(() => {
      updateScheduled = false;
      setActiveLink();
    });
  };

  setActiveLink();
  window.addEventListener("scroll", scheduleActiveLinkUpdate, { passive: true });
  window.addEventListener("resize", scheduleActiveLinkUpdate);
}

function initHydroDocTreeLevels() {
  document.querySelectorAll<HTMLElement>(".hydro-doc-tree li").forEach((item) => {
    const link = item.querySelector<HTMLAnchorElement>(":scope > a, :scope > details > summary > a");
    if (!link) {
      return;
    }

    let depth = 0;
    let currentList = link.closest("ul");
    while (currentList?.parentElement?.closest(".hydro-doc-tree ul")) {
      depth += 1;
      currentList = currentList.parentElement.closest(".hydro-doc-tree ul");
    }

    link.dataset.docNodeType = item.querySelector(":scope > details") ? "tree" : "doc";
    link.dataset.docTreeDepth = String(depth);
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
initHydroDocTreeLevels();
initHydroDocContentEnhancements();
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
    isMemberAuthenticated,
    isMemberPluginAvailable,
    notify: (message, options) => showHydroNotice(message, options),
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
