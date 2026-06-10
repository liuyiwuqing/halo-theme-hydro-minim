export type HydroNoticeVariant = "info" | "success" | "warning" | "error";

export type HydroNoticeOptions = {
  id?: string;
  title?: string;
  message?: string;
  variant?: HydroNoticeVariant;
  duration?: number;
  dismissible?: boolean;
};

export type HydroNoticeInput = string | HydroNoticeOptions;

export type HydroNoticeHandle = {
  id: string;
  close: () => void;
};

export type HydroNoticeApi = {
  show: (input: HydroNoticeInput, options?: HydroNoticeOptions) => HydroNoticeHandle;
  info: (message: string, options?: HydroNoticeOptions) => HydroNoticeHandle;
  success: (message: string, options?: HydroNoticeOptions) => HydroNoticeHandle;
  warning: (message: string, options?: HydroNoticeOptions) => HydroNoticeHandle;
  error: (message: string, options?: HydroNoticeOptions) => HydroNoticeHandle;
  clear: (id?: string) => void;
};

type ActiveNotice = {
  id: string;
  element: HTMLElement;
  timer?: number;
};

declare global {
  interface Window {
    HydroNotice?: HydroNoticeApi;
  }
}

const defaultDuration = 4200;
const variantDuration: Record<HydroNoticeVariant, number> = {
  info: defaultDuration,
  success: 3200,
  warning: 5200,
  error: 6400,
};
const maxVisibleNotices = 4;
let noticeSequence = 0;
let activeNotices: ActiveNotice[] = [];
let region: HTMLElement | null = null;

function normalizeNotice(input: HydroNoticeInput, options: HydroNoticeOptions = {}) {
  const base = typeof input === "string" ? { message: input } : input;
  const notice = { ...base, ...options };
  const variant = notice.variant || "info";

  return {
    id: notice.id || `hydro-notice-${Date.now()}-${++noticeSequence}`,
    title: notice.title?.trim() || "",
    message: notice.message?.trim() || "",
    variant,
    dismissible: notice.dismissible !== false,
    duration: typeof notice.duration === "number" ? Math.max(0, notice.duration) : variantDuration[variant],
  };
}

function getRegion() {
  if (region?.isConnected) {
    return region;
  }

  const existing = document.querySelector<HTMLElement>("[data-hydro-notice-region]");
  if (existing) {
    region = existing;
    return region;
  }

  region = document.createElement("section");
  region.className = "hydro-notice-region";
  region.dataset.hydroNoticeRegion = "";
  region.setAttribute("aria-label", "全局提示");
  region.setAttribute("aria-live", "polite");
  region.setAttribute("aria-atomic", "false");
  document.body.append(region);
  return region;
}

function createNoticeElement(notice: ReturnType<typeof normalizeNotice>) {
  const element = document.createElement("article");
  element.className = `hydro-notice hydro-notice--${notice.variant} ${notice.title ? "has-title" : "no-title"}`;
  element.dataset.hydroNotice = notice.id;
  element.setAttribute("role", notice.variant === "error" ? "alert" : "status");

  const marker = document.createElement("span");
  marker.className = "hydro-notice__marker";
  marker.setAttribute("aria-hidden", "true");

  const content = document.createElement("div");
  content.className = "hydro-notice__content";

  if (notice.title) {
    const title = document.createElement("strong");
    title.className = "hydro-notice__title";
    title.textContent = notice.title;
    content.append(title);
  }

  const message = document.createElement("p");
  message.className = "hydro-notice__message";
  message.textContent = notice.message || notice.title || "提示";
  content.append(message);

  element.append(marker, content);

  if (notice.dismissible) {
    const button = document.createElement("button");
    button.className = "hydro-notice__close";
    button.type = "button";
    button.setAttribute("aria-label", "关闭提示");
    button.textContent = "×";
    element.append(button);
  }

  return element;
}

function removeNotice(id: string) {
  const notice = activeNotices.find((item) => item.id === id);
  if (!notice) return;

  window.clearTimeout(notice.timer);
  activeNotices = activeNotices.filter((item) => item.id !== id);
  notice.element.classList.add("is-leaving");
  window.setTimeout(() => notice.element.remove(), 180);
}

function showNotice(input: HydroNoticeInput, options?: HydroNoticeOptions) {
  const notice = normalizeNotice(input, options);
  removeNotice(notice.id);

  const element = createNoticeElement(notice);
  const host = getRegion();
  host.append(element);

  const active: ActiveNotice = { id: notice.id, element };
  activeNotices.push(active);

  element.querySelector(".hydro-notice__close")?.addEventListener("click", () => removeNotice(notice.id));

  if (notice.duration > 0) {
    active.timer = window.setTimeout(() => removeNotice(notice.id), notice.duration);
  }

  while (activeNotices.length > maxVisibleNotices) {
    removeNotice(activeNotices[0]?.id || "");
  }

  return {
    id: notice.id,
    close: () => removeNotice(notice.id),
  };
}

function createHydroNoticeApi(): HydroNoticeApi {
  return {
    show: showNotice,
    info: (message, options) => showNotice(message, { ...options, variant: "info" }),
    success: (message, options) => showNotice(message, { ...options, variant: "success" }),
    warning: (message, options) => showNotice(message, { ...options, variant: "warning" }),
    error: (message, options) => showNotice(message, { ...options, variant: "error" }),
    clear: (id) => {
      if (id) {
        removeNotice(id);
        return;
      }
      activeNotices.map((item) => item.id).forEach(removeNotice);
    },
  };
}

export function initHydroNotice() {
  window.HydroNotice = createHydroNoticeApi();
  getRegion();
  return window.HydroNotice;
}
