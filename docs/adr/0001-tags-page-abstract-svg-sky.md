# ADR 0001: Tags Page Uses Abstract SVG Sky

## Status

Accepted

## Context

The tags index needs to communicate a tag cloud metaphor while staying aligned with Hydro-Minim's restrained visual identity: grey-white surfaces, Space Mono typography, thin line work, light texture, and low-saturation color. A photographic sky or high-detail illustration would compete with the content and push the theme away from the existing Hydro language.

## Decision

Use an inline abstract minimal SVG as the tags page sky background, and render each tag as a small cloud-shaped link with an inline SVG cloud glyph.

The SVG sky should use pale blue-grey gradients, sparse line clouds, subtle horizon strokes, low-opacity details, and blurred fading edges so the sky reads as unbounded rather than as a rectangular card. Tag items should keep Halo's existing tag data and route semantics, while adding a cloud silhouette, post count, content-aware sizing, stable pseudo-random percentage coordinates, and gentle transform-only floating motion.

Desktop placement is refined by `src/assets/tag-cloud.ts`. The module hashes label text, loop index, display-name length, and post count into stable sky coordinates, then scores candidate positions to reduce obvious overlap. Thymeleaf remains responsible for rendering semantic tag links and initial CSS variables, while CSS remains responsible for cloud shape, size, and motion.

Hover and focus feedback must not move the outer tag anchor. The anchor remains responsible for the stable hit area and ambient floating path; the inner SVG cloud handles emphasis through scale, stroke, fill, and shadow. This avoids hover churn where the element moves away from the cursor and repeatedly enters and leaves hover state.

Cloud entry motion is layered inside the tag: the cloud silhouette emerges from blur, the SVG outline draws in, then the label and count fade upward. This keeps the arrival visible while preserving the stable anchor position required for hover and focus.

## Consequences

- The page gets a distinct tag-cloud identity without adding image assets or new configuration fields.
- The design can adapt to light and dark mode through CSS variables and currentColor.
- Cloud positions are deterministic, derived from tag identity and template order, so the page feels organic without changing layout unpredictably on each refresh.
- Desktop uses a coordinate-based sky field for scattered cloud placement, while small screens use flow layout to preserve readability and avoid overlap.
- The frontend asset graph gains a small `tag-cloud` module and focused tests for deterministic layout behavior.
- The template gains a decorative SVG layer, so it must remain `aria-hidden` and pointer-events free.
- The tags sky container must avoid visible borders, card backgrounds, and rectangular focus or hover blocks around cloud tags.
- Hover and focus states should feel closer and clearer without changing the anchor's position in the sky field.
- Entry motion should remain visible in normal motion environments but must be disabled by `prefers-reduced-motion: reduce`.
- Future changes to the tags page should preserve the tag-sky and cloud-tag domain language unless a new ADR supersedes this decision.
