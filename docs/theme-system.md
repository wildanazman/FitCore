# FitCore themes

Settings → Preferences provides FitCore Blue, Midnight Volt, Rose Studio, Daydream and Deep Ocean. Blue remains the default. Choice is stored on this device and clearing app data restores Blue.

All themes use the same routes, React components, typography, layout and behaviour. Do not fork a screen or add theme-specific copy. Product changes apply once, to every palette.

`src/store/themes.css` defines semantic roles: canvas, surface, ink, muted text, accent, accent foreground, borders, selection, strong surface, strong foreground and feedback colours. `ThemeContext` selects the palette. Tailwind colours and local component aliases refer to these roles.

New components must use the palette roles or established aliases, never hard-coded brand colours. Text on an accent uses `--palette-on-accent`; text on a strong surface uses `--palette-on-strong`. Neither assumes white. Charts retain labelled categories and use themed grid, text and measurement colours. Media, camera content and colour-preview swatches intentionally retain their actual colours.

After a change, check both a light and dark palette, including fields, selected controls, popups, charts and disabled states. A passing build does not establish visual or accessibility conformance.
