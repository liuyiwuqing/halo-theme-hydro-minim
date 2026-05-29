type HydroCommentWidgetElement = HTMLElement & {
  ua?: string;
  updateComplete?: Promise<unknown>;
};

const hydroCommentSkinElementNames = [
  "comment-widget",
  "comment-form",
  "base-form",
  "comment-list",
  "comment-item",
  "comment-replies",
  "reply-item",
  "base-comment-item",
  "reply-form",
  "comment-pagination",
  "comment-content",
  "comment-editor",
  "commenter-ua-bar",
  "user-avatar",
];
const hydroCommentSkinSelector = hydroCommentSkinElementNames.join(",");
const hydroCommentObservedRoots = new WeakSet<ShadowRoot>();
const hydroCommentUpdateQueued = new WeakSet<HydroCommentWidgetElement>();

function getHydroCommentShadowCss(localName: string) {
  switch (localName) {
    case "comment-widget":
      return `
        :host {
          display: block !important;
          width: 100% !important;
        }

        comment-form {
          display: block !important;
          margin-bottom: clamp(1.25rem, 2.8vw, 1.9rem) !important;
          padding-bottom: clamp(1.1rem, 2.4vw, 1.55rem) !important;
          border-bottom: 1px solid rgb(var(--hydro-ink-rgb) / 10%) !important;
        }

        comment-list {
          display: block !important;
        }
      `;
    case "comment-form":
    case "reply-form":
      return `
        :host {
          display: block !important;
          width: 100% !important;
        }

        base-form {
          display: block !important;
        }
      `;
    case "base-form":
      return `
        :host {
          display: block !important;
          width: 100% !important;
        }

        .form {
          gap: 0.78rem !important;
        }

        .form__footer {
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 0.75rem !important;
        }

        .form-actions {
          gap: 0.55rem !important;
        }

        .input {
          height: 2.48rem !important;
          border: 1px solid rgb(var(--hydro-ink-rgb) / 12%) !important;
          border-radius: 0.48rem !important;
          background: rgb(var(--hydro-paper-rgb) / 28%) !important;
          box-shadow: none !important;
          color: rgb(var(--hydro-ink-rgb) / 82%) !important;
          font-family: "Space Mono", monospace !important;
          transition:
            border-color 0.2s ease,
            background-color 0.2s ease,
            box-shadow 0.2s ease !important;
        }

        .input:focus {
          border-color: rgb(var(--hydro-ink-rgb) / 24%) !important;
          background: rgb(var(--hydro-paper-rgb) / 42%) !important;
          box-shadow: 0 0 0 2px rgb(var(--hydro-ink-rgb) / 4%) !important;
          outline: none !important;
        }

        .form-login,
        .form-logout {
          border-color: rgb(var(--hydro-ink-rgb) / 10%) !important;
          border-radius: 999px !important;
          background: transparent !important;
          color: rgb(var(--hydro-ink-rgb) / 54%) !important;
          font-family: "Space Mono", monospace !important;
        }

        .form-submit {
          height: 2.48rem !important;
          border-color: var(--hydro-solid) !important;
          border-radius: 0.48rem !important;
          background: var(--hydro-solid) !important;
          color: var(--hydro-solid-contrast) !important;
          font-family: "Space Mono", monospace !important;
          font-weight: 800 !important;
          transition:
            transform 0.18s ease,
            opacity 0.18s ease !important;
        }

        .form-submit:active {
          transform: translateY(1px) !important;
        }
      `;
    case "comment-list":
      return `
        :host {
          display: block !important;
          width: 100% !important;
        }

        .comment-list-main {
          margin-top: clamp(0.65rem, 1.6vw, 1rem) !important;
        }

        .comment-stats {
          display: inline-flex !important;
          width: fit-content !important;
          align-items: center !important;
          gap: 0.5rem !important;
          margin: 0 0 clamp(0.45rem, 1.4vw, 0.7rem) !important;
          padding: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          color: rgb(var(--hydro-ink-rgb) / 50%) !important;
          font-size: 0.72rem !important;
          font-weight: 700 !important;
          letter-spacing: 0.03em !important;
          line-height: 1 !important;
        }

        .comment-stats::before {
          width: 1.15rem !important;
          height: 1px !important;
          background: rgb(var(--hydro-ink-rgb) / 26%) !important;
          content: "" !important;
        }

        .comment-list {
          display: block !important;
          border-bottom: 1px solid rgb(var(--hydro-ink-rgb) / 9%) !important;
        }

        comment-item {
          display: block !important;
        }
      `;
    case "comment-item":
      return `
        :host {
          display: block !important;
        }

        base-comment-item {
          --hydro-cw-avatar-offset: 0.12rem;
          --hydro-cw-item-bg: transparent;
          --hydro-cw-item-gap: clamp(0.72rem, 1.8vw, 0.95rem);
          --hydro-cw-item-padding: clamp(1rem, 2.6vw, 1.35rem) 0;
          --hydro-cw-item-radius: 0;
          --hydro-cw-item-separator: rgb(var(--hydro-ink-rgb) / 10%);
          --hydro-cw-meta-rule: transparent;
          --hydro-cw-content-size: 0.9rem;
        }

        comment-replies {
          display: block !important;
          margin-top: 0.8rem !important;
        }

        .icon-button {
          border: 1px solid transparent !important;
          border-radius: 999px !important;
          background: transparent !important;
          padding: 0.04rem 0.34rem 0.04rem 0.08rem !important;
          transition:
            border-color 0.2s ease,
            background-color 0.2s ease,
            color 0.2s ease !important;
        }

        .icon-button:hover {
          border-color: rgb(var(--hydro-ink-rgb) / 10%) !important;
          background: rgb(var(--hydro-ink-rgb) / 3%) !important;
        }

        .icon-button-icon {
          padding: 0.32em !important;
        }

        .icon-button-text {
          color: rgb(var(--hydro-ink-rgb) / 48%) !important;
          font-size: 0.7em !important;
          font-weight: 700 !important;
        }
      `;
    case "comment-replies":
      return `
        :host {
          display: block !important;
          margin: clamp(0.7rem, 1.8vw, 0.95rem) 0 0 clamp(2.05rem, 5vw, 3.1rem) !important;
          padding-left: clamp(0.75rem, 2vw, 1rem) !important;
          border-left: 1px solid rgb(var(--hydro-ink-rgb) / 18%) !important;
        }

        .replies-main {
          position: relative !important;
          padding-left: 0.2rem !important;
        }

        .replies-main::before {
          position: absolute !important;
          top: 0.9rem !important;
          left: calc(-1rem - 1px) !important;
          width: 0.65rem !important;
          height: 1px !important;
          background: rgb(var(--hydro-ink-rgb) / 18%) !important;
          content: "" !important;
        }

        .replies-list {
          display: grid !important;
          gap: 0.46rem !important;
          margin-top: 0.55rem !important;
        }

        reply-item {
          display: block !important;
        }

        .replies-next {
          margin: 0.65rem 0 0 !important;
        }

        .replies-next-button {
          height: 1.92rem !important;
          border: 1px solid rgb(var(--hydro-ink-rgb) / 9%) !important;
          border-radius: 999px !important;
          background: transparent !important;
          color: rgb(var(--hydro-ink-rgb) / 58%) !important;
          font-size: 0.72rem !important;
        }

        @media (max-width: 640px) {
          :host {
            margin-left: 0.72rem !important;
            padding-left: 0.72rem !important;
          }

          .replies-main {
            padding-left: 0 !important;
          }
        }
      `;
    case "reply-item":
      return `
        :host {
          display: block !important;
        }

        base-comment-item {
          --halo-cw-avatar-size: 2rem;
          --hydro-cw-avatar-offset: 0.02rem;
          --hydro-cw-item-bg: rgb(var(--hydro-ink-rgb) / 2.6%);
          --hydro-cw-item-gap: 0.72rem;
          --hydro-cw-item-padding: 0.72rem 0.82rem;
          --hydro-cw-item-radius: 0.42rem;
          --hydro-cw-item-separator: rgb(var(--hydro-ink-rgb) / 7%);
          --hydro-cw-meta-rule: rgb(var(--hydro-ink-rgb) / 5%);
          --hydro-cw-content-size: 0.86rem;
        }

        .reply-form {
          margin-top: 0.65rem !important;
        }

        .quote-badge {
          border: 1px solid rgb(var(--hydro-ink-rgb) / 8%) !important;
          border-radius: 999px !important;
          background: rgb(var(--hydro-paper-rgb) / 30%) !important;
          color: rgb(var(--hydro-ink-rgb) / 54%) !important;
          font-size: 0.7rem !important;
        }

        .icon-button {
          border: 1px solid transparent !important;
          border-radius: 999px !important;
          background: transparent !important;
          padding: 0.04rem 0.38rem 0.04rem 0.08rem !important;
        }

        .icon-button-icon {
          padding: 0.34em !important;
        }

        .icon-button-text {
          color: rgb(var(--hydro-ink-rgb) / 50%) !important;
          font-size: 0.7em !important;
          font-weight: 700 !important;
        }
      `;
    case "base-comment-item":
      return `
        :host {
          display: block !important;
          width: 100% !important;
        }

        .item {
          position: relative !important;
          align-items: flex-start !important;
          gap: var(--hydro-cw-item-gap, 0.9rem) !important;
          overflow: visible !important;
          padding: var(--hydro-cw-item-padding, 1rem) !important;
          border: 0 !important;
          border-top: 1px solid var(--hydro-cw-item-separator, rgb(var(--hydro-ink-rgb) / 10%)) !important;
          border-radius: var(--hydro-cw-item-radius, 0.85rem) !important;
          background: var(--hydro-cw-item-bg, transparent) !important;
          box-shadow: none !important;
        }

        .item-avatar {
          padding-top: var(--hydro-cw-avatar-offset, 0.08rem) !important;
        }

        .item-main {
          min-width: 0 !important;
        }

        .item-meta {
          gap: 0.34rem 0.5rem !important;
          align-items: center !important;
          padding-bottom: 0.42rem !important;
          border-bottom: 1px solid var(--hydro-cw-meta-rule, transparent) !important;
        }

        .item-author {
          color: rgb(var(--hydro-ink-rgb) / 86%) !important;
          font-size: 0.84rem !important;
          font-weight: 800 !important;
          line-height: 1.15 !important;
          text-decoration: none !important;
        }

        .item-meta-info,
        time.item-meta-info {
          color: rgb(var(--hydro-ink-rgb) / 42%) !important;
          font-size: 0.68rem !important;
          font-weight: 600 !important;
          line-height: 1.15 !important;
        }

        .item-content {
          margin-top: 0.42rem !important;
        }

        .item-actions {
          flex-wrap: wrap !important;
          gap: 0.24rem !important;
          margin-top: 0.48rem !important;
          padding-top: 0 !important;
          border-top: 0 !important;
        }

        slot[name="footer"]::slotted(*) {
          margin-top: 0.62rem !important;
        }

        @media (max-width: 640px) {
          .item {
            gap: 0.68rem !important;
            padding: 0.78rem !important;
          }

          .item-meta {
            gap: 0.36rem 0.45rem !important;
          }
        }
      `;
    case "comment-content":
      return `
        .content {
          color: rgb(var(--hydro-ink-rgb) / 82%) !important;
          font-size: var(--hydro-cw-content-size, 0.9rem) !important;
          line-height: 1.72 !important;
        }

        .content p {
          margin-bottom: 0.58rem !important;
        }

        .content > *:last-child,
        .content p:last-child {
          margin-bottom: 0 !important;
        }

        .content a {
          color: var(--hydro-solid) !important;
          text-decoration-thickness: 0.08em !important;
          text-underline-offset: 0.18em !important;
        }

        .content code {
          border: 1px solid rgb(var(--hydro-ink-rgb) / 8%) !important;
          border-radius: 0.3rem !important;
          background: rgb(var(--hydro-ink-rgb) / 4%) !important;
        }
      `;
    case "comment-editor":
      return `
        :host {
          display: block !important;
          width: 100% !important;
        }

        .border {
          border-color: rgb(var(--hydro-ink-rgb) / 12%) !important;
          border-radius: 0.5rem !important;
          background: rgb(var(--hydro-paper-rgb) / 24%) !important;
          box-shadow: none !important;
          transition:
            border-color 0.2s ease,
            background-color 0.2s ease,
            box-shadow 0.2s ease !important;
        }

        .border:focus-within {
          border-color: rgb(var(--hydro-ink-rgb) / 24%) !important;
          background: rgb(var(--hydro-paper-rgb) / 42%) !important;
          box-shadow: 0 0 0 2px rgb(var(--hydro-ink-rgb) / 4%) !important;
        }

        #editor-container {
          min-height: 5.2rem !important;
          padding: 0.78rem 0.86rem !important;
        }

        ul {
          border-top: 1px solid rgb(var(--hydro-ink-rgb) / 8%) !important;
          padding: 0.42rem 0.5rem !important;
        }

        li [role="button"] {
          border-radius: 0.45rem !important;
        }
      `;
    case "commenter-ua-bar":
      return `
        :host {
          display: inline-flex !important;
          max-width: 100% !important;
          vertical-align: middle !important;
        }

        .inline-flex {
          flex-wrap: wrap !important;
        }

        .bg-muted-3 {
          border: 1px solid rgb(var(--hydro-ink-rgb) / 9%) !important;
          border-radius: 999px !important;
          background: rgb(var(--hydro-ink-rgb) / 4.8%) !important;
          padding: 0.18rem 0.38rem !important;
        }

        .text-xs {
          color: rgb(var(--hydro-ink-rgb) / 54%) !important;
          font-size: 0.63rem !important;
          font-weight: 700 !important;
          line-height: 1 !important;
        }

        i,
        [class*="i-"] {
          opacity: 0.9 !important;
          filter: saturate(0.82) contrast(0.98) !important;
        }
      `;
    case "user-avatar":
      return `
        .avatar {
          border: 1px solid rgb(var(--hydro-ink-rgb) / 12%) !important;
          background: rgb(var(--hydro-paper-rgb) / 56%) !important;
          box-shadow: none !important;
        }

        .avatar-image {
          filter: saturate(0.92) contrast(1.03) !important;
        }
      `;
    case "comment-pagination":
      return `
        :host {
          display: block !important;
          margin-top: 1rem !important;
        }
      `;
    default:
      return "";
  }
}

function ensureHydroCommentDevice(element: HydroCommentWidgetElement) {
  if (element.localName !== "base-comment-item") {
    return;
  }

  const ua = typeof element.ua === "string" ? element.ua.trim() : "";
  const meta = element.shadowRoot?.querySelector<HTMLElement>(".item-meta");
  if (!ua || !meta || meta.querySelector("commenter-ua-bar")) {
    return;
  }

  const device = document.createElement("commenter-ua-bar") as HydroCommentWidgetElement;
  device.dataset.hydroCommentDevice = "true";
  device.ua = ua;
  meta.insertBefore(device, meta.querySelector("time"));
  enhanceHydroCommentElement(device);
}

function observeHydroCommentShadowRoot(element: HydroCommentWidgetElement) {
  const root = element.shadowRoot;
  if (!root) {
    return;
  }

  if (hydroCommentObservedRoots.has(root)) {
    return;
  }

  hydroCommentObservedRoots.add(root);
  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach(scanHydroCommentNode);
    });
    ensureHydroCommentDevice(element);
  });
  observer.observe(root, { childList: true, subtree: true });
}

function injectHydroCommentShadowStyle(element: HydroCommentWidgetElement) {
  const root = element.shadowRoot;
  if (!root) {
    return;
  }

  const css = getHydroCommentShadowCss(element.localName).trim();
  if (css && !root.querySelector("style[data-hydro-comment-skin]")) {
    const style = document.createElement("style");
    style.dataset.hydroCommentSkin = "";
    style.textContent = css;
    root.append(style);
  }

  observeHydroCommentShadowRoot(element);
  scanHydroCommentTree(root);
}

function queueHydroCommentUpdate(element: HydroCommentWidgetElement) {
  const updateComplete = element.updateComplete;
  if (hydroCommentUpdateQueued.has(element) || !updateComplete || typeof updateComplete.then !== "function") {
    return;
  }

  hydroCommentUpdateQueued.add(element);
  updateComplete
    .then(() => {
      injectHydroCommentShadowStyle(element);
      ensureHydroCommentDevice(element);
    })
    .catch(() => undefined);
}

function enhanceHydroCommentElement(element: Element) {
  const commentElement = element as HydroCommentWidgetElement;
  injectHydroCommentShadowStyle(commentElement);
  ensureHydroCommentDevice(commentElement);
  queueHydroCommentUpdate(commentElement);
}

function scanHydroCommentNode(node: Node) {
  if (!(node instanceof Element)) {
    return;
  }

  if (node.matches(hydroCommentSkinSelector)) {
    enhanceHydroCommentElement(node);
  }

  node.querySelectorAll(hydroCommentSkinSelector).forEach(enhanceHydroCommentElement);
}

function scanHydroCommentTree(root: ParentNode) {
  root.querySelectorAll(hydroCommentSkinSelector).forEach((element) => {
    enhanceHydroCommentElement(element);
    const shadowRoot = (element as HTMLElement).shadowRoot;
    if (shadowRoot) {
      scanHydroCommentTree(shadowRoot);
    }
  });
}

export function initCommentWidgetSkin() {
  if (!("customElements" in window)) {
    return;
  }

  scanHydroCommentTree(document);

  hydroCommentSkinElementNames.forEach((elementName) => {
    customElements
      .whenDefined(elementName)
      .then(() => {
        scanHydroCommentTree(document);
      })
      .catch(() => undefined);
  });

  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach(scanHydroCommentNode);
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  ["halo:comment:created", "halo:comment-reply:created"].forEach((eventName) => {
    window.addEventListener(eventName, () => {
      window.requestAnimationFrame(() => scanHydroCommentTree(document));
    });
  });
}
