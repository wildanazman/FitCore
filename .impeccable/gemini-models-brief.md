# Gemini photo model selection

Mode: Operate. Preserve existing Settings and Camera typography, palette tokens and native controls. One shared labelled select offers Gemini 2.5 Flash, 3.8 Flash and 3.5 Flash-Lite. Keep 2.5 Flash as the default; user selection persists in profile and backups, including migration of backups without this preference.

Settings > Connections and Camera > Analysis options expose the same preference. Result > Analysis details shows the resolved server model, requested model and successful response input/output/thinking token counts; earlier retries and search costs are explicitly excluded. Changing selection never modifies an already returned estimate. Retry uses the next selected model. No accuracy ranking or free-tier claim is made.

Claude selection and browser-key entry are removed. Photo endpoint accepts only the shared Gemini model allowlist and never falls back to Claude or silently switches models. Existing legacy secret field remains for old profile schema compatibility and is still stripped from backups.

Verification: TypeScript and production build passed. Mock API tests validate model routing, defaults, invalid-model and Claude rejection and metadata. Browser verified selection persists from Settings through reload to Camera. No live paid-provider request or accuracy benchmark has been performed.
