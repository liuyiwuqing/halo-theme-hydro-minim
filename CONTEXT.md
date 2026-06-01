# Hydro-Minim Context

## Domain Language

- Hydro-Minim, or 氢·简, is a restrained Halo theme with grey-white surfaces, Space Mono typography, thin black line work, light grain, and low-saturation accents.
- Hydro Content Surface is the shared visual baseline for non-home content pages. It keeps pages related without forcing every route into the same card grid.
- The tags index uses a tag-sky metaphor: tags are lightweight keywords floating in an abstract sky, not generic chips on a flat board.
- Tag sky means an inline abstract SVG atmosphere with pale blue-grey gradients, sparse contour cloud lines, horizon marks, and grain-compatible opacity. It must feel unbounded, with blurred fading edges instead of a visible rectangular panel or card frame.
- Cloud tag means each tag link is shaped as a small cloud, with an inline SVG cloud glyph, thin outlines, soft paper fill, post count, and gentle transform-only floating motion.
- Cloud tags use stable pseudo-random placement derived from label text, loop index, display-name length, and post count. Their size should respond to display-name length and post count so short labels stay light while longer labels get larger cloud bodies.
- Desktop tag clouds use a percentage-based sky coordinate system (`--tag-x`, `--tag-y`) with lightweight collision scoring for scattered floating placement. Small screens fall back to readable flow layout.
- Dark mode for tag sky remains low contrast and misty. It must not turn into pure black, neon weather UI, or a decorative illustrated scene.

## Current Decisions

- The tags page background is implemented as an abstract minimal SVG layer in the page template so it can scale without extra static assets and inherit CSS color tokens.
- Tag data remains sourced from Halo's `tags` route variable. Visual changes must not alter Finder/API semantics, routes, or taxonomy settings.
- The tag sky must not use a visible border, rectangular card background, or rectangular focus/hover block around individual clouds.
- Tag cloud motion uses `transform` and `opacity` only. Ambient sky drift and cloud floating must respect `prefers-reduced-motion`.
- Cloud motion layers include a soft arrival, inner SVG cloud mist reveal, cloud outline drawing, delayed text/count reveal, and slow orbital drifting. Avoid bounce or elastic motion; the material is mist, not rubber.
- The `src/assets/tag-cloud.ts` module owns desktop cloud placement. Thymeleaf still outputs semantic tag links and CSS sizing variables; JavaScript refines coordinates after real styles are available.
- Cloud tag hover and focus feedback must keep the outer link hit area stable. Do not move the anchor itself on hover; emphasize the inner SVG cloud, text color, stroke, and shadow instead.
