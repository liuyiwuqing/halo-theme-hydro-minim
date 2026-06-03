type AuthAltchaRect = Pick<DOMRectReadOnly, "bottom" | "height" | "left" | "width">;

type AuthAltchaViewport = {
  width: number;
};

type AuthAltchaAnchorOptions = {
  floatingGap?: number;
  floatingMaxWidth?: number;
  viewportPadding?: number;
};

type AuthAltchaAnchor = {
  width: number;
  x: number;
  y: number;
};

type AuthAltchaStylePriority = "" | "important";

const defaultAuthAltchaAnchorOptions = {
  floatingGap: 8,
  floatingMaxWidth: 224,
  viewportPadding: 16,
} satisfies Required<AuthAltchaAnchorOptions>;

export function computeAuthAltchaFloatingAnchor(
  buttonRect: AuthAltchaRect,
  viewport: AuthAltchaViewport,
  options: AuthAltchaAnchorOptions = {},
): AuthAltchaAnchor | null {
  if (buttonRect.width <= 0 || buttonRect.height <= 0 || viewport.width <= 0) {
    return null;
  }

  const viewportPadding = options.viewportPadding ?? defaultAuthAltchaAnchorOptions.viewportPadding;
  const floatingGap = options.floatingGap ?? defaultAuthAltchaAnchorOptions.floatingGap;
  const floatingMaxWidth = options.floatingMaxWidth ?? defaultAuthAltchaAnchorOptions.floatingMaxWidth;
  const usableWidth = Math.max(0, viewport.width - viewportPadding * 2);
  const floatingWidth = Math.min(floatingMaxWidth, usableWidth);

  if (floatingWidth <= 0) {
    return null;
  }

  const unclampedX = buttonRect.left + buttonRect.width / 2;
  const x = Math.min(
    Math.max(unclampedX - floatingWidth / 2, viewportPadding),
    viewport.width - viewportPadding - floatingWidth,
  );
  const y = Math.max(buttonRect.bottom + floatingGap, viewportPadding);

  return {
    width: Math.round(floatingWidth),
    x: Math.round(x),
    y: Math.round(y),
  };
}

function setAuthAltchaStyle(
  element: HTMLElement,
  property: string,
  value: string,
  priority: AuthAltchaStylePriority = "important",
) {
  if (element.style.getPropertyValue(property) === value && element.style.getPropertyPriority(property) === priority) {
    return;
  }

  element.style.setProperty(property, value, priority);
}

function applyAuthAltchaFloatingAnchor(root: Document, anchor: AuthAltchaAnchor) {
  const body = root.body;
  setAuthAltchaStyle(body, "--hydro-auth-altcha-x", `${anchor.x}px`, "");
  setAuthAltchaStyle(body, "--hydro-auth-altcha-y", `${anchor.y}px`, "");
  setAuthAltchaStyle(body, "--hydro-auth-altcha-width", `${anchor.width}px`, "");

  root.querySelectorAll<HTMLElement>(".altcha[data-floating]").forEach((floating) => {
    if (floating.closest("#login-form .hydro-auth-captcha")) {
      setAuthAltchaStyle(floating, "position", "static");
      setAuthAltchaStyle(floating, "inset", "auto");
      setAuthAltchaStyle(floating, "width", "100%");
      setAuthAltchaStyle(floating, "max-width", "100%");
      setAuthAltchaStyle(floating, "transform", "none");
      setAuthAltchaStyle(floating, "margin", "0");
      return;
    }

    setAuthAltchaStyle(floating, "position", "fixed");
    setAuthAltchaStyle(floating, "inset", `${anchor.y}px auto auto ${anchor.x}px`);
    setAuthAltchaStyle(floating, "width", `${anchor.width}px`);
    setAuthAltchaStyle(floating, "max-width", `${anchor.width}px`);
    setAuthAltchaStyle(floating, "transform", "none");
  });
}

export function initAuthAltchaFloatingAnchor(root: Document = document) {
  const body = root.body;
  const form = root.getElementById("login-form") as HTMLFormElement | null;
  const submitButton = form?.querySelector<HTMLButtonElement>("[data-hydro-login-submit], button[type='submit']");
  if (!body.classList.contains("hydro-auth-page") || !form || !submitButton) {
    return;
  }

  let rafId = 0;
  let followTimer = 0;

  const syncAnchor = () => {
    const anchor = computeAuthAltchaFloatingAnchor(submitButton.getBoundingClientRect(), {
      width: window.innerWidth,
    });
    if (!anchor) {
      return;
    }

    applyAuthAltchaFloatingAnchor(root, anchor);
  };

  const scheduleSync = () => {
    if (rafId !== 0) {
      return;
    }

    rafId = window.requestAnimationFrame(() => {
      rafId = 0;
      syncAnchor();
    });
  };

  const followFloatingDuringChallenge = () => {
    window.clearInterval(followTimer);
    syncAnchor();
    followTimer = window.setInterval(syncAnchor, 80);
    window.setTimeout(() => {
      window.clearInterval(followTimer);
      followTimer = 0;
    }, 8000);
  };

  const followFloatingFromInteraction = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest("#login-form, altcha-widget, .altcha[data-floating]")) {
      followFloatingDuringChallenge();
    }
  };

  scheduleSync();
  submitButton.addEventListener("pointerdown", followFloatingDuringChallenge);
  submitButton.addEventListener("click", followFloatingDuringChallenge);
  form.addEventListener("submit", followFloatingDuringChallenge);
  root.addEventListener("pointerdown", followFloatingFromInteraction, true);
  root.addEventListener("click", followFloatingFromInteraction, true);
  window.addEventListener("load", scheduleSync, { once: true });
  window.addEventListener("resize", scheduleSync, { passive: true });
  window.addEventListener("scroll", scheduleSync, { passive: true });

  if ("ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(scheduleSync);
    resizeObserver.observe(form);
    resizeObserver.observe(submitButton);
  }

  if ("MutationObserver" in window) {
    const formMutationObserver = new MutationObserver(scheduleSync);
    formMutationObserver.observe(form, {
      attributeFilter: ["class", "data-floating", "hidden", "style"],
      attributes: true,
      childList: true,
      subtree: true,
    });

    const floatingMutationObserver = new MutationObserver(scheduleSync);
    floatingMutationObserver.observe(body, {
      attributeFilter: ["class", "data-floating", "style"],
      attributes: true,
      childList: true,
      subtree: true,
    });
  }
}
