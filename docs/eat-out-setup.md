# Makan luar: Google Places with a conservative budget gate

`/#/eat-out` uses Google Places (New) when the server-only `GOOGLE_PLACES_API_KEY` is configured. Without that variable it falls back to OpenStreetMap/Overpass and Photon. The key is never sent to the browser. Google still requires billing to be enabled even when usage stays inside its free allowance.

## What users get

Location or area → radius 1–50 km → up to ten food places → optional inclusion toggles → fair roulette → external Maps/review links or dated food-search handoff. Google results are ranked using rating, review count and distance among returned candidates, not treated as exhaustive. The fallback free data does not supply Google/Tripadvisor ratings.

Explicit pork/alcohol name, cuisine or description evidence, alcohol/drink tags, non-halal tags and bar/pub entries are excluded. Cuisine/ownership and missing halal tags alone are not grounds to exclude a business. A `diet:halal=yes` map tag is explicitly unverified, not certified. Missing tags and stale map data can let unsuitable businesses through; users must check.

## Hosting and limits

Vite serves the same server endpoint locally via `scripts/local-food-api.mjs`; Vercel runs `api/nearby-restaurants.js`. Set `GOOGLE_PLACES_API_KEY` only in Vercel/server environment settings. Optional `GOOGLE_PLACES_MONTHLY_REQUEST_LIMIT` defaults to `250` billable Google requests per process/month and `GOOGLE_PLACES_DAILY_REQUEST_LIMIT` defaults to `10` per process/day. These are deliberate stop gates with a large buffer below Google's 1,000-request Enterprise free allowance; they are not a billing guarantee because serverless counters are process-local and other Google services or projects can share billing. `OVERPASS_API_URL` and `PHOTON_API_URL` remain optional server-only overrides for the fallback provider.

Searches run only on explicit submission; no autocomplete, background polling, mass import or review scraping. Google calls use a minimal field mask (identity, location, rating, review count and Maps link), a 15-minute/50-entry process cache, one uncached search at a time, a minimum three-second interval and the monthly/daily stop gates above. Area searches consume two Google calls (area resolution + nearby search); coordinate searches consume one. Cached search coordinates/results are transient server memory, not user profile or persistent database records. Responses are `no-store`; browser logs never store restaurant/location data. Google or shared fallback services can throttle or fail, and the UI provides retry/external Maps recovery without fabricated candidates.

The Google gates are **not a distributed billing limiter**. Public serverless deployments can have multiple processes, and Google billing budgets are alerts unless a supported spend-cap service is used. Set a Google Cloud API quota for Places and monitor the project billing dashboard; keep the key restricted to Places API and the deployed server origins. At growing traffic, add a durable shared counter/rate limiter or use the free fallback. Review these policies before scaling:

- [Photon demo policy](https://github.com/komoot/photon#demo-server): reasonable project usage permitted; extensive use can be throttled/banned; no availability guarantee.
- [Overpass public-instance guidance](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html): shared capacity, load shedding; public app backends should sustainably run their own instance at scale.
- [OpenStreetMap attribution and ODbL](https://www.openstreetmap.org/copyright): visible contributor attribution and individual map-source links remain in the UI.

No public Nominatim endpoint is used. Tripadvisor links merely open an external search; Google ratings are returned by Places and can change. Nutrition remains a separate food portion review, never a restaurant-menu calorie claim.

## Verification

`scripts/check-eat-out.mjs` tests normalization, distance, malformed/out-of-radius and prohibited tags, max ten, caching/throttling, Malaysian geocoding, provider failures and no Google API calls. Browser fixtures cover 320/390/469/1440, reduced motion, inclusion/spin, no auto logging, dated handoff, permission denial and unavailable/empty states. Local live checks use public KL landmark coordinates, not the user's location.
