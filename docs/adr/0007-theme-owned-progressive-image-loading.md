# ADR 0007: Theme-Owned Progressive Image Loading

## Status

Accepted

## Context

Hydro-Minim targets Halo 2.25 and later. Halo supports generated image thumbnails from 2.19, and Halo 2.22 can automatically add responsive image attributes, but the theme still should not rely on platform-generated attributes as the only loading strategy for every image-heavy surface. We decided that image-heavy theme surfaces should use a progressive image shell and Halo's thumbnail ladder first, while avoiding a mandatory external image proxy or CDN layer.

## Considered Options

- Require users to configure an external CDN or image proxy. This could improve delivery for large libraries, but it adds operational burden and makes a visual theme depend on infrastructure outside Halo.
- Rely entirely on Halo automatic responsive image handling. This is clean for simple content images, but it gives the theme less control over custom surfaces such as galleries, moments and plugin pages.
- Let the theme explicitly shape critical image surfaces with stable layout, loading and failure states, and Halo thumbnail candidates. This keeps the experience consistent across the supported Halo range while still allowing operators to add CDN-level optimization later.
