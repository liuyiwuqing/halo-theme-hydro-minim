export type HydroFabActionContext = {
  action: string;
  closeMenu: () => void;
  element: HTMLElement;
  event: MouseEvent;
  payload: unknown;
};

export type HydroMinimActionHandler = (context: HydroFabActionContext) => void | Promise<void>;

export type HydroFabActionDependencies = {
  copyText: (text: string) => Promise<void>;
  getWindow: () => Window;
  navigateTo?: (url: string) => void;
  notify?: (message: string, options?: HydroFabNoticeOptions) => void;
  root: ParentNode;
  scrollToElement: (element: HTMLElement) => void;
  scrollToPosition: (top: number) => void;
  warn?: (message: string) => void;
};

type HydroFabNoticeOptions = {
  id?: string;
  title?: string;
  variant?: "info" | "success" | "warning" | "error";
};

type HydroMemberSignInStatus = {
  authenticated?: boolean;
  continuousDays?: number;
  loginUrl?: string;
  message?: string;
  signed?: boolean;
};

type HydroMemberSignInConfig = {
  enabled?: boolean;
  ucUrl?: string;
};

type HydroMemberSignInApi = {
  getLoginUrl?: () => string;
  getMergedConfig?: () => Promise<HydroMemberSignInConfig>;
  getStatus: () => Promise<HydroMemberSignInStatus>;
  signIn: () => Promise<HydroMemberSignInStatus>;
};

type HydroMemberFavoriteSubject = {
  subjectType: "POST";
  subjectName: string;
  subjectTitle: string;
  permalink: string;
  cover: string;
};

type HydroMemberFavoriteStatus = {
  authenticated?: boolean;
  count?: number;
  favorited?: boolean;
  loginUrl?: string;
};

type HydroMemberFavoriteApi = {
  getLoginUrl?: () => string;
  getStatus: (subject: HydroMemberFavoriteSubject) => Promise<HydroMemberFavoriteStatus>;
  toggle: (subject: HydroMemberFavoriteSubject) => Promise<HydroMemberFavoriteStatus>;
};

type HydroFabBuiltinAction =
  | "back-to-top"
  | "copy-current-url"
  | "member-favorite"
  | "member-sign-in"
  | "open-menu"
  | "print"
  | "scroll-comment"
  | "search"
  | "theme-toggle";

const hydroFabBuiltinActions = new Set<string>([
  "back-to-top",
  "copy-current-url",
  "member-favorite",
  "member-sign-in",
  "open-menu",
  "print",
  "scroll-comment",
  "search",
  "theme-toggle",
]);

declare global {
  interface Window {
    HydroMinimActions?: Record<string, HydroMinimActionHandler>;
    memberFavorite?: HydroMemberFavoriteApi;
    memberSignIn?: HydroMemberSignInApi;
    SearchWidget?: {
      open?: () => void;
    };
  }
}

export function parseHydroFabPayload(raw: string | undefined): unknown {
  const value = raw?.trim();
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function findClickable(root: ParentNode, selector: string): HTMLElement | null {
  return (
    Array.from(root.querySelectorAll<HTMLElement>(selector)).find((element) => {
      if (element.hidden || element.getAttribute("aria-hidden") === "true") {
        return false;
      }

      if (element instanceof HTMLButtonElement && element.disabled) {
        return false;
      }

      return true;
    }) ?? null
  );
}

function warn(dependencies: HydroFabActionDependencies, message: string): void {
  dependencies.warn?.(message);
}

function isHydroFabBuiltinAction(value: string | undefined): value is HydroFabBuiltinAction {
  return typeof value === "string" && hydroFabBuiltinActions.has(value);
}

function normalizeHydroFabHandlerName(handlerName: string): string {
  const trimmed = handlerName.trim();
  const withoutInvocation = trimmed.endsWith("()") ? trimmed.slice(0, -2).trim() : trimmed;
  return withoutInvocation.startsWith("window.") ? withoutInvocation.slice("window.".length) : withoutInvocation;
}

function resolveHydroFabCustomHandler(
  handlerName: string,
  dependencies: HydroFabActionDependencies,
): HydroMinimActionHandler | null {
  const win = dependencies.getWindow();
  const normalizedHandlerName = normalizeHydroFabHandlerName(handlerName);

  if (!normalizedHandlerName) {
    return null;
  }

  const registryHandler = win.HydroMinimActions?.[normalizedHandlerName];
  if (typeof registryHandler === "function") {
    return registryHandler;
  }

  const segments = normalizedHandlerName.split(".").filter(Boolean);
  if (segments.length === 0) {
    return null;
  }

  let current: unknown = win;
  for (let index = 0; index < segments.length - 1; index += 1) {
    if (current == null || (typeof current !== "object" && typeof current !== "function")) {
      return null;
    }

    current = (current as Record<string, unknown>)[segments[index]];
  }

  if (current == null || (typeof current !== "object" && typeof current !== "function")) {
    return null;
  }

  const handler = (current as Record<string, unknown>)[segments[segments.length - 1]];
  if (typeof handler !== "function") {
    return null;
  }

  return handler.bind(current) as HydroMinimActionHandler;
}

function markCopied(element: HTMLElement, win: Window): void {
  element.classList.add("is-copied");
  win.setTimeout(() => {
    element.classList.remove("is-copied");
  }, 1400);
}

function showActionNotice(
  dependencies: HydroFabActionDependencies,
  message: string,
  options: HydroFabNoticeOptions = {},
): void {
  const text = message.trim();
  if (!text) {
    return;
  }
  dependencies.notify?.(text, { id: "hydro-fab-action", title: "快捷", variant: "success", ...options });
}

function navigateTo(url: string | undefined, dependencies: HydroFabActionDependencies, win: Window): void {
  if (!url) {
    return;
  }

  if (dependencies.navigateTo) {
    dependencies.navigateTo(url);
    return;
  }

  win.location.href = url;
}

function markBusy(element: HTMLElement, busy: boolean): void {
  element.classList.toggle("is-loading", busy);
  element.setAttribute("aria-busy", String(busy));

  if (element instanceof HTMLButtonElement) {
    element.disabled = busy;
  }
}

function waitForMemberApi<T extends "memberFavorite" | "memberSignIn">(
  win: Window,
  name: T,
  timeout = 3000,
): Promise<Window[T] | null> {
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const check = () => {
      const api = win[name];
      if (api) {
        resolve(api);
        return;
      }

      if (Date.now() - startedAt >= timeout) {
        resolve(null);
        return;
      }

      win.setTimeout(check, 50);
    };

    check();
  });
}

function syncSignInElement(element: HTMLElement, status: HydroMemberSignInStatus): void {
  const signed = Boolean(status.signed);
  element.classList.toggle("is-signed", signed);
  element.dataset.hydroMemberSigned = String(signed);
  element.dataset.hydroMemberContinuousDays = String(status.continuousDays || 0);

  if (signed) {
    element.setAttribute("aria-label", `今日已签到，连续 ${status.continuousDays || 0} 天`);
  }
}

async function runMemberSignInAction(
  element: HTMLElement,
  dependencies: HydroFabActionDependencies,
  win: Window,
): Promise<void> {
  const memberSignIn = await waitForMemberApi(win, "memberSignIn");
  if (!memberSignIn) {
    element.hidden = true;
    warn(dependencies, "Hydro-Minim FAB member sign-in API is unavailable.");
    return;
  }

  const config = memberSignIn.getMergedConfig ? await memberSignIn.getMergedConfig() : { enabled: true };
  if (config.enabled === false) {
    element.hidden = true;
    return;
  }

  const status = await memberSignIn.getStatus();
  if (status.authenticated === false) {
    navigateTo(status.loginUrl || memberSignIn.getLoginUrl?.(), dependencies, win);
    return;
  }

  if (status.signed) {
    syncSignInElement(element, status);
    navigateTo(config.ucUrl || "/uc/member?tab=signIn", dependencies, win);
    return;
  }

  markBusy(element, true);
  try {
    const result = await memberSignIn.signIn();
    if (result.authenticated === false) {
      navigateTo(result.loginUrl || memberSignIn.getLoginUrl?.(), dependencies, win);
      return;
    }
    syncSignInElement(element, result);
    showActionNotice(dependencies, result.message || "签到成功", { id: "hydro-member-sign-in" });
  } finally {
    markBusy(element, false);
  }
}

function readCurrentPostSubject(root: ParentNode, win: Window): HydroMemberFavoriteSubject | null {
  const post = root.querySelector<HTMLElement>(".hydro-post-page[data-post-name]");
  const subjectName = post?.dataset.postName?.trim();
  if (!post || !subjectName) {
    return null;
  }

  return {
    subjectType: "POST",
    subjectName,
    subjectTitle: post.dataset.postTitle?.trim() || win.document.title || subjectName,
    permalink: post.dataset.postPermalink?.trim() || win.location.href,
    cover: post.dataset.postCover?.trim() || "",
  };
}

function syncFavoriteElement(element: HTMLElement, status: HydroMemberFavoriteStatus): void {
  const favorited = Boolean(status.favorited);
  const count = Number(status.count || 0);
  element.classList.toggle("is-favorited", favorited);
  element.dataset.hydroMemberFavorited = String(favorited);
  element.dataset.hydroMemberFavoriteCount = String(count);
  element.setAttribute("aria-label", favorited ? `已收藏 ${count}` : `收藏 ${count}`);
}

async function runMemberFavoriteAction(
  element: HTMLElement,
  dependencies: HydroFabActionDependencies,
  win: Window,
): Promise<void> {
  const memberFavorite = await waitForMemberApi(win, "memberFavorite");
  const subject = readCurrentPostSubject(dependencies.root, win);
  if (!memberFavorite || !subject) {
    element.hidden = true;
    warn(dependencies, "Hydro-Minim FAB member favorite API or post subject is unavailable.");
    return;
  }

  const status = await memberFavorite.getStatus(subject);
  syncFavoriteElement(element, status);

  if (status.authenticated === false) {
    navigateTo(status.loginUrl || memberFavorite.getLoginUrl?.(), dependencies, win);
    return;
  }

  markBusy(element, true);
  try {
    const result = await memberFavorite.toggle(subject);
    if (result.authenticated === false) {
      navigateTo(result.loginUrl || memberFavorite.getLoginUrl?.(), dependencies, win);
      return;
    }
    syncFavoriteElement(element, result);
    showActionNotice(
      dependencies,
      result.favorited ? `已收藏 · ${Number(result.count || 0)}` : `已取消收藏 · ${Number(result.count || 0)}`,
      {
        id: "hydro-member-favorite",
      },
    );
  } finally {
    markBusy(element, false);
  }
}

async function runBuiltinAction(
  action: HydroFabBuiltinAction,
  element: HTMLElement,
  dependencies: HydroFabActionDependencies,
): Promise<void> {
  const win = dependencies.getWindow();

  switch (action) {
    case "back-to-top":
      dependencies.scrollToPosition(0);
      showActionNotice(dependencies, "已回到顶部", { id: "hydro-back-to-top", variant: "info" });
      return;
    case "copy-current-url":
      await dependencies.copyText(win.location.href);
      markCopied(element, win);
      showActionNotice(dependencies, "当前链接已复制", { id: "hydro-copy-current-url" });
      return;
    case "member-favorite":
      await runMemberFavoriteAction(element, dependencies, win);
      return;
    case "member-sign-in":
      await runMemberSignInAction(element, dependencies, win);
      return;
    case "open-menu": {
      const mobileMenu = dependencies.root.querySelector<HTMLElement>("[data-hydro-mobile-menu]");
      if (mobileMenu?.classList.contains("is-open")) {
        return;
      }
      findClickable(dependencies.root, "[data-hydro-mobile-toggle]")?.click();
      showActionNotice(dependencies, "菜单已打开", { id: "hydro-open-menu", variant: "info" });
      return;
    }
    case "print":
      win.print();
      showActionNotice(dependencies, "打印面板已打开", { id: "hydro-print", variant: "info" });
      return;
    case "scroll-comment": {
      const comment = dependencies.root.querySelector<HTMLElement>("#comment");
      if (comment) {
        dependencies.scrollToElement(comment);
        showActionNotice(dependencies, "已到评论区", { id: "hydro-scroll-comment", variant: "info" });
      } else {
        showActionNotice(dependencies, "当前页没有评论区", {
          id: "hydro-scroll-comment",
          variant: "warning",
        });
      }
      return;
    }
    case "search": {
      const searchEntry = findClickable(dependencies.root, "[data-hydro-search-entry]");
      if (searchEntry) {
        searchEntry.click();
        showActionNotice(dependencies, "搜索面板已打开", { id: "hydro-search", variant: "info" });
        return;
      }
      if (typeof win.SearchWidget?.open === "function") {
        win.SearchWidget.open();
        showActionNotice(dependencies, "搜索面板已打开", { id: "hydro-search", variant: "info" });
        return;
      }
      showActionNotice(dependencies, "搜索插件未就绪", { id: "hydro-search", variant: "warning" });
      return;
    }
    case "theme-toggle":
      findClickable(dependencies.root, "[data-hydro-theme-toggle]")?.click();
      return;
  }
}

async function runCustomAction(
  handlerName: string,
  context: HydroFabActionContext,
  dependencies: HydroFabActionDependencies,
): Promise<void> {
  const handler = resolveHydroFabCustomHandler(handlerName, dependencies);

  if (typeof handler !== "function") {
    warn(dependencies, `Hydro-Minim FAB custom handler "${handlerName}" is not registered or resolvable.`);
    return;
  }

  await handler(context);
}

export async function runHydroFabAction(
  element: HTMLElement,
  event: MouseEvent,
  dependencies: HydroFabActionDependencies,
  closeMenu: () => void,
): Promise<void> {
  const action = element.dataset.hydroFabAction?.trim() || "link";
  if (action === "link") {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  closeMenu();

  if (action === "builtin") {
    const builtinAction = element.dataset.hydroFabBuiltin?.trim();
    if (!builtinAction) {
      warn(dependencies, "Hydro-Minim FAB built-in action is empty.");
      return;
    }

    if (!isHydroFabBuiltinAction(builtinAction)) {
      warn(dependencies, `Hydro-Minim FAB built-in action "${builtinAction}" is not supported.`);
      return;
    }

    await runBuiltinAction(builtinAction, element, dependencies);
    return;
  }

  if (action === "custom") {
    const handlerName = element.dataset.hydroFabHandler?.trim();
    if (!handlerName) {
      warn(dependencies, "Hydro-Minim FAB custom handler name is empty.");
      return;
    }

    await runCustomAction(
      handlerName,
      {
        action,
        closeMenu,
        element,
        event,
        payload: parseHydroFabPayload(element.dataset.hydroFabPayload),
      },
      dependencies,
    );
    return;
  }

  warn(dependencies, `Hydro-Minim FAB action "${action}" is not supported.`);
}
