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

  const halfWidth = floatingWidth / 2;
  const unclampedX = buttonRect.left + buttonRect.width / 2;
  const minX = viewportPadding + halfWidth;
  const maxX = viewport.width - viewportPadding - halfWidth;
  const x = Math.min(Math.max(unclampedX, minX), maxX);
  const y = Math.max(buttonRect.bottom + floatingGap, viewportPadding);

  return {
    width: Math.round(floatingWidth),
    x: Math.round(x),
    y: Math.round(y),
  };
}

export function initAuthAltchaFloatingAnchor(root: Document = document) {
  const body = root.body;
  const form = root.getElementById("login-form") as HTMLFormElement | null;
  const submitButton = form?.querySelector<HTMLButtonElement>("[data-hydro-login-submit], button[type='submit']");
  if (!body.classList.contains("hydro-auth-page") || !form || !submitButton) {
    return;
  }

  let rafId = 0;

  const syncAnchor = () => {
    const anchor = computeAuthAltchaFloatingAnchor(submitButton.getBoundingClientRect(), {
      width: window.innerWidth,
    });
    if (!anchor) {
      return;
    }

    body.style.setProperty("--hydro-auth-altcha-x", `${anchor.x}px`);
    body.style.setProperty("--hydro-auth-altcha-y", `${anchor.y}px`);
    body.style.setProperty("--hydro-auth-altcha-width", `${anchor.width}px`);
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

  scheduleSync();
  submitButton.addEventListener("pointerdown", scheduleSync);
  submitButton.addEventListener("click", scheduleSync);
  form.addEventListener("submit", scheduleSync);
  window.addEventListener("load", scheduleSync, { once: true });
  window.addEventListener("resize", scheduleSync, { passive: true });
  window.addEventListener("scroll", scheduleSync, { passive: true });

  if ("ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(scheduleSync);
    resizeObserver.observe(form);
    resizeObserver.observe(submitButton);
  }

  if ("MutationObserver" in window) {
    const mutationObserver = new MutationObserver(scheduleSync);
    mutationObserver.observe(form, {
      attributeFilter: ["class", "data-floating", "hidden", "style"],
      attributes: true,
      childList: true,
      subtree: true,
    });
    mutationObserver.observe(body, {
      attributeFilter: ["class", "style"],
      attributes: true,
      childList: true,
    });
  }
}
