import { enhanceContentTables } from "./content-tables";

type HydroContentAlign = "center" | "left" | "right";

type HydroRichContentOptions = {
  lightboxEnabled?: boolean;
  markEnhanced?: boolean;
  tableWrapClass?: string;
};

type HydroRichContentInitOptions = {
  lightboxEnabled?: boolean;
};

const hydroRichContentSelector =
  ".hydro-prose, .hydro-post-prose, [data-post-content], [data-hydro-doc-content], [data-hydro-moment-content]";

function readBooleanData(value: string | undefined, fallback = true) {
  if (value == null || value === "") {
    return fallback;
  }
  return value !== "false";
}

function parseContentDimensionAttribute(value: string | null) {
  const normalized = value?.trim();
  if (!normalized || !/^\d+(\.\d+)?(?:px|%)?$/i.test(normalized)) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  if (normalized.endsWith("%") || normalized.toLowerCase().endsWith("px")) {
    return normalized;
  }

  return `${parsed}px`;
}

function readContentAlign(element: HTMLElement): HydroContentAlign | null {
  const alignItems = element.style.alignItems?.trim().toLowerCase();
  const textAlign = element.style.textAlign?.trim().toLowerCase();
  const justifyContent = element.style.justifyContent?.trim().toLowerCase();
  const value = alignItems || textAlign || justifyContent;

  if (value === "start" || value === "flex-start" || value === "left") {
    return "left";
  }

  if (value === "end" || value === "flex-end" || value === "right") {
    return "right";
  }

  if (value === "center") {
    return "center";
  }

  return null;
}

function preserveExplicitContentMediaSize(media: HTMLImageElement | HTMLVideoElement) {
  const width = parseContentDimensionAttribute(media.getAttribute("width"));
  const height = parseContentDimensionAttribute(media.getAttribute("height"));

  if (width != null) {
    media.dataset.hydroExplicitWidth = "";
    media.style.setProperty("--hydro-content-media-width", width);
  }

  if (height != null) {
    media.dataset.hydroExplicitHeight = "";
    media.style.setProperty("--hydro-content-media-height", height);
  }
}

function isMomentRichContent(content: HTMLElement) {
  return content.matches("[data-hydro-moment-content], .hydro-moment-rich");
}

function getRichContentTableWrapClass(content: HTMLElement, tableWrapClass?: string) {
  if (tableWrapClass) {
    return tableWrapClass;
  }

  if (content.matches("[data-hydro-doc-content], .hydro-doc-content")) {
    return "hydro-post-table-wrap hydro-doc-table-wrap";
  }

  if (isMomentRichContent(content)) {
    return "hydro-post-table-wrap hydro-moment-table-wrap";
  }

  return "hydro-post-table-wrap";
}

function cleanMomentRichContent(content: HTMLElement) {
  content.querySelectorAll<HTMLAnchorElement>("a.tag").forEach((tag) => tag.remove());
  content.querySelectorAll<HTMLElement>("p").forEach((paragraph) => {
    if (paragraph.textContent?.trim() === "" && paragraph.children.length === 0) {
      paragraph.remove();
    }
  });
}

function resolveLightboxEnabled(content: HTMLElement, lightboxEnabled: boolean) {
  const postPage = content.closest<HTMLElement>(".hydro-post-page");
  if (postPage) {
    return readBooleanData(postPage.dataset.postEnableLightbox, lightboxEnabled);
  }
  return lightboxEnabled;
}

export function enhanceContentLightboxImages(content: HTMLElement) {
  const lightboxImages = Array.from(content.querySelectorAll<HTMLImageElement>("img")).filter((image) => {
    return !image.closest("a") && !image.classList.contains("icon") && !image.classList.contains("no-lightbox");
  });

  lightboxImages.forEach((image) => {
    image.dataset.lightboxTrigger = "";
    image.dataset.src = image.currentSrc || image.src || image.getAttribute("src") || "";
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

export function enhanceContentBasics(content: HTMLElement, tableWrapClass = "hydro-post-table-wrap") {
  content.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
    preserveExplicitContentMediaSize(image);

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

  content.querySelectorAll<HTMLVideoElement>("video").forEach((video) => {
    preserveExplicitContentMediaSize(video);
  });

  content.querySelectorAll<HTMLElement>("[data-aspect-ratio]").forEach((item) => {
    const aspectRatio = Number.parseFloat(item.dataset.aspectRatio || "");
    if (Number.isFinite(aspectRatio) && aspectRatio > 0) {
      item.style.setProperty("--hydro-gallery-aspect-ratio", String(aspectRatio));
    }
  });

  content.querySelectorAll<HTMLElement>("figure").forEach((figure) => {
    const align = readContentAlign(figure);
    if (align) {
      figure.dataset.hydroAlign = align;
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

  enhanceContentTables(content, tableWrapClass);

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

export function lockRichContentTaskListCheckboxes(content: HTMLElement) {
  content
    .querySelectorAll<HTMLInputElement>(
      'ul[data-type="taskList"] input[type="checkbox"], ul.contains-task-list input[type="checkbox"], li[data-type="taskItem"] input[type="checkbox"]',
    )
    .forEach((checkbox) => {
      checkbox.disabled = true;
      checkbox.tabIndex = -1;
      checkbox.dataset.hydroTaskCheckbox = "readonly";
      checkbox.setAttribute("aria-disabled", "true");
    });
}

export function normalizeRichContentColumns(content: HTMLElement) {
  content.querySelectorAll<HTMLElement>(".columns").forEach((columns) => {
    const configuredCount = Number.parseInt(columns.getAttribute("cols") || "", 10);
    const childCount = columns.querySelectorAll(":scope > .column").length;
    const resolvedCount = Number.isFinite(configuredCount) && configuredCount > 0 ? configuredCount : childCount || 2;
    const columnCount = Math.min(Math.max(resolvedCount, 1), 4);

    columns.dataset.hydroColumns = String(columnCount);
    columns.style.setProperty("--hydro-columns-count", String(columnCount));
  });
}

export function enhanceHydroRichContent(content: HTMLElement, options: HydroRichContentOptions = {}) {
  const shouldMarkEnhanced = options.markEnhanced !== false;
  const alreadyEnhanced = shouldMarkEnhanced && content.dataset.hydroRichContentEnhanced === "true";

  if (!alreadyEnhanced) {
    if (isMomentRichContent(content)) {
      cleanMomentRichContent(content);
    }

    enhanceContentBasics(content, getRichContentTableWrapClass(content, options.tableWrapClass));
    lockRichContentTaskListCheckboxes(content);
    normalizeRichContentColumns(content);
  }

  if (options.lightboxEnabled && (!shouldMarkEnhanced || content.dataset.hydroRichContentLightboxEnhanced !== "true")) {
    enhanceContentLightboxImages(content);
    if (shouldMarkEnhanced) {
      content.dataset.hydroRichContentLightboxEnhanced = "true";
    }
  }

  if (shouldMarkEnhanced) {
    content.dataset.hydroRichContentEnhanced = "true";
  }
}

export function initHydroRichContentEnhancements(
  root: ParentNode = document,
  options: HydroRichContentInitOptions = {},
) {
  const lightboxEnabled = options.lightboxEnabled === true && Boolean(root.querySelector("[data-lightbox]"));
  const contents = Array.from(root.querySelectorAll<HTMLElement>(hydroRichContentSelector));
  const uniqueContents = new Set(contents);

  uniqueContents.forEach((content) => {
    enhanceHydroRichContent(content, {
      lightboxEnabled: resolveLightboxEnabled(content, lightboxEnabled),
    });
  });
}
