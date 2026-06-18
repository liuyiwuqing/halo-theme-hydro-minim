const hydroLenisScrollableOverflowPattern = /\b(auto|scroll|overlay)\b/;
const hydroLenisBoundaryStyleAttribute = "data-hydro-lenis-boundaries";
const hydroLenisBoundaryObservedRoots = new WeakSet<ParentNode>();
const hydroLenisBoundaryRefreshQueued = new WeakSet<ParentNode>();
const hydroLenisBoundaryCss = `
  :where([data-lenis-prevent], [data-lenis-prevent-wheel], [data-lenis-prevent-touch]) {
    overscroll-behavior: contain !important;
  }
`;

function injectHydroLenisBoundaryStyle(root: Document | ShadowRoot) {
  if (root.querySelector(`style[${hydroLenisBoundaryStyleAttribute}]`)) {
    return;
  }

  const style = document.createElement("style");
  style.setAttribute(hydroLenisBoundaryStyleAttribute, "");
  style.textContent = hydroLenisBoundaryCss;

  if (root instanceof Document) {
    root.head.append(style);
    return;
  }

  root.append(style);
}

function isHydroLenisRoot(root: ParentNode): root is Document | ShadowRoot {
  return root instanceof Document || root instanceof ShadowRoot;
}

function isHydroLenisPageRootElement(element: HTMLElement) {
  return element === document.documentElement || element === document.body;
}

function isHydroLenisScrollableArea(element: HTMLElement) {
  if (isHydroLenisPageRootElement(element)) {
    return false;
  }

  const styles = window.getComputedStyle(element);
  const canScrollY =
    element.scrollHeight > element.clientHeight + 1 && hydroLenisScrollableOverflowPattern.test(styles.overflowY);
  const canScrollX =
    element.scrollWidth > element.clientWidth + 1 && hydroLenisScrollableOverflowPattern.test(styles.overflowX);

  return canScrollY || canScrollX;
}

function markHydroLenisBoundaryElement(element: HTMLElement) {
  if (
    element.hasAttribute("data-lenis-prevent") ||
    element.hasAttribute("data-lenis-prevent-wheel") ||
    element.hasAttribute("data-lenis-prevent-touch")
  ) {
    return;
  }

  element.setAttribute("data-lenis-prevent-wheel", "");
}

function queueHydroLenisBoundaryRefresh(root: ParentNode) {
  if (typeof window === "undefined") {
    return;
  }

  if (hydroLenisBoundaryRefreshQueued.has(root)) {
    return;
  }

  hydroLenisBoundaryRefreshQueued.add(root);
  window.requestAnimationFrame(() => {
    hydroLenisBoundaryRefreshQueued.delete(root);
    markHydroLenisScrollBoundaries(root);
  });
}

function observeHydroLenisBoundaryRoot(root: ParentNode) {
  if (hydroLenisBoundaryObservedRoots.has(root)) {
    return;
  }

  hydroLenisBoundaryObservedRoots.add(root);
  const observer = new MutationObserver(() => {
    queueHydroLenisBoundaryRefresh(root);
  });
  observer.observe(root, {
    attributeFilter: ["class", "style", "hidden", "open"],
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true,
  });
}

export function markHydroLenisScrollBoundaries(root: ParentNode = document) {
  if (isHydroLenisRoot(root)) {
    injectHydroLenisBoundaryStyle(root);
  }

  root.querySelectorAll<HTMLElement>("*").forEach((element) => {
    if (isHydroLenisScrollableArea(element)) {
      markHydroLenisBoundaryElement(element);
    }

    const shadowRoot = element.shadowRoot;
    if (shadowRoot) {
      markHydroLenisScrollBoundaries(shadowRoot);
      observeHydroLenisBoundaryRoot(shadowRoot);
    }
  });
}

export function initLenisScrollBoundaries(root: ParentNode = document) {
  markHydroLenisScrollBoundaries(root);
  observeHydroLenisBoundaryRoot(root);
  window.requestAnimationFrame(() => markHydroLenisScrollBoundaries(root));
}
