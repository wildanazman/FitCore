# FitCore install icons

Authored vector source: `fitcore-app-v2.svg`, derived from the existing brand mark in `src/components/FitCoreLogo.tsx` (same cobalt, white F and dot). No third-party artwork or AI-generated image is used.

PNG exports are rendered from this SVG at 192px, 512px and 180px. The background is fully opaque; the operating system applies its own icon shape. The F and dot fit within the maskable icon's central 80%-diameter safe circle. The separately named maskable export intentionally shares the artwork with the standard 512px export.

Versioned filenames avoid reusing old install-icon URLs. Manifest icons cover Android/desktop; the 180px apple-touch-icon covers iOS home-screen shortcuts. This icon pack does not add offline caching or a service worker.
