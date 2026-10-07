# Restaurant finder setup

Local feature: `/#/eat-out`, reachable from Food and Home protein help. No deployment is performed automatically.

## Google-first integration

Enable **Places API (New)** and billing on a Google Cloud project. Add `GOOGLE_PLACES_API_KEY` as a server environment variable in Vercel (never `VITE_...` or localStorage), restricted to Places API. Set API quotas and billing alerts before enabling this public endpoint. Alerts alone are not a hard spending cap. For a larger public launch, add a durable per-user/IP rate limiter or authenticated gateway; an unauthenticated endpoint can consume quota.

`POST /api/nearby-restaurants` accepts coordinates OR a Malaysian area plus radius 1–50 km, rating threshold, minimum review count, price and open-now filter. Area resolution uses Text Search, then Nearby Search. It fetches at most 20 popular candidates and returns up to ten after filtering and weighted review ranking. This is not exhaustive coverage. Rating, opening hours and price fields affect billing.

No location, reviews or restaurant responses are stored in FitCore localStorage. Responses are no-store. Location permission is requested only after a tap. Google data must keep provider attribution and comply with Places policies. Before public deployment, publish the required privacy policy and terms describing location sent to Google, and review Google's current attribution rules.

Vite now serves `/api/food-catalog` and `/api/nearby-restaurants` locally through `scripts/local-food-api.mjs`; legacy APIs retain their deployed proxy. Put server-only keys in `.env.local` and restart Vite. Browser tests intercept restaurant search with explicitly synthetic fixtures; they do not prove live Google credentials work.

## Tripadvisor

Version one only links to external Tripadvisor searches. It does not display a Tripadvisor rating or claim to have matched the same business. A licensed API integration and access agreement are required before showing its content. No scraping or fake fallback ratings.

## Food / Muslim suitability

Google ratings do not certify halal. Per the user's clarification, exclude obvious pork/alcohol names, bars, and places explicitly marked as serving beer, wine or cocktails. Cuisine or ownership alone does not exclude a restaurant. Unknown halal status remains visible without a mandatory certification gate. All returned places initially enter the wheel; the user can remove any choice. Roulette draws uniformly from included candidates only, never logs food or changes dietary targets. Nutrition search is a separate review step, not a claim about the restaurant's actual menu. Google alcohol-service fields increase the requested data tier; unknown fields are not treated as proof of halal.
