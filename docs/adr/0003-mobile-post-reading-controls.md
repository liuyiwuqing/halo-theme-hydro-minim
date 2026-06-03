# ADR 0003: Mobile Post Reading Controls Use Bottom Bar And TOC Drawer

## Status

Accepted

## Context

The article detail page has a desktop reader side panel with reading progress, table of contents, comments, upvote, share, and top actions. On smaller screens the same `.hydro-post-aside` was placed after article content as a normal block. That preserved the markup but lost the practical value of a reading control surface: the TOC and actions were no longer reachable while reading.

Mobile readers need thumb-reachable controls, stable safe-area spacing, and a short path back to the article structure. The TOC should remain generated from article headings by the existing frontend logic, and actions should keep the existing Halo post semantics.

## Decision

Use two layouts for article reading controls.

Desktop and wider tablet layouts keep the sticky `.hydro-post-aside` reader panel.

Phone layouts convert the same reader panel into a bottom TOC drawer source and add a fixed mobile reading bar. The bar exposes the core actions: TOC, comments, upvote, and share. The bar also shows a thin reading progress line. The TOC drawer opens as a half-height bottom sheet with progress summary, publish/category/visit metadata, and the existing `.hydro-post-toc` tree.

The mobile controls extend the article page DOM contract with `data-post-mobile-*` attributes and ARIA state. They do not add Finder APIs, backend semantics, or theme settings. JavaScript broadcasts reading progress and upvote counts to all matching elements so desktop panel and mobile bar stay synchronized.

Previous/next navigation uses static pill buttons on phones, because there are at most two destinations and swipe interaction adds unnecessary friction. Related posts keep a compact horizontal reading flow so recommendation cards do not stretch the article end into a long stack.

## Consequences

- Phone readers can reach TOC and actions without scrolling to the end of the article.
- PC behavior remains anchored to the existing sticky reader side panel.
- The article template carries a little more DOM for mobile controls, and the frontend owns a small drawer state machine.
- Upvote count and reading progress must always be treated as multi-target state on the article page.
- Future mobile article actions should attach to the reading bar or TOC drawer instead of adding another independent floating panel.
