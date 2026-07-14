import { readFileSync } from "node:fs";
import { join } from "node:path";

import postcss from "postcss";
import { afterEach, describe, expect, it } from "vitest";

const mainStyles = readFileSync(join(process.cwd(), "src/assets/styles/main.css"), "utf8");

function extractRules(selectors: string[]) {
  const root = postcss.parse(mainStyles);
  return selectors
    .map((selector) => {
      const rule = root.nodes.find((node) => node.type === "rule" && node.selector === selector);
      if (!rule) {
        throw new Error(`Missing CSS rule: ${selector}`);
      }
      return rule.toString();
    })
    .join("\n");
}

describe("post table of contents layout", () => {
  afterEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("keeps the title in the same row when a spacing plugin inserts an element", () => {
    const style = document.createElement("style");
    style.textContent = extractRules([".hydro-post-toc__row", ".hydro-post-toc__toggle", ".hydro-post-toc__link"]);
    document.head.append(style);
    document.body.innerHTML = `
      <div class="hydro-post-toc__row">
        <button class="hydro-post-toc__toggle" type="button"></button>
        <pangu> </pangu>
        <a class="hydro-post-toc__link" href="#heading">三、在线建立 AOSC 与 VIOS 的 vSCSI 连接</a>
      </div>
    `;

    const row = document.querySelector<HTMLElement>(".hydro-post-toc__row");
    const toggle = document.querySelector<HTMLElement>(".hydro-post-toc__toggle");
    const link = document.querySelector<HTMLElement>(".hydro-post-toc__link");

    expect(row).not.toBeNull();
    expect(toggle).not.toBeNull();
    expect(link).not.toBeNull();
    expect(getComputedStyle(row!).display).toBe("flex");
    expect(getComputedStyle(toggle!).flexShrink).toBe("0");
    expect(getComputedStyle(link!).flexGrow).toBe("1");
    expect(getComputedStyle(link!).minWidth).toBe("0px");
  });
});
