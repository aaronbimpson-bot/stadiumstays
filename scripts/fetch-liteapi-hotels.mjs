/**
 * Fetches hotel listings from LiteAPI for each club stadium and writes results
 * to src/data/liteapi-hotels.json for use at build time.
 *
 * Uses the /v3.0/data/hotels endpoint to search within 5 km of each stadium's
 * coordinates, returning the top 10 results sorted by distance.
 *
 * Required environment variables:
 *   LITEAPI_API_KEY      — Private API key (server-side / build-time use only)
 *   LITEAPI_SUBDOMAIN    — Your LiteAPI white-label subdomain (e.g. "stadiumstays")
 *
 * Run via: node scripts/fetch-liteapi-hotels.mjs
 * Or automatically via the "build" npm script.
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env file for local development (no dotenv dependency needed).
// On Vercel / Netlify env vars are already injected into process.env.
const envPath = join(__dirname, '../.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key && key.trim() && !key.trim().startsWith('#') && rest.length) {
      process.env[key.trim()] ??= rest.join('=').trim();
    }
  }
}
const OUTPUT_PATH = join(__dirname, '../src/data/liteapi-hotels.json');

const API_KEY = process.env.LITEAPI_API_KEY;
const SUBDOMAIN = process.env.LITEAPI_SUBDOMAIN || '';

if (!API_KEY) {
  console.warn(
    'Warning: LITEAPI_API_KEY not set — skipping hotel fetch, pages will build with fallback UI.',
  );
  process.exit(0);
}

const LITEAPI_BASE = 'https://api.liteapi.travel/v3.0';
const SEARCH_RADIUS_KM = 5;
const SEARCH_RADIUS_M = SEARCH_RADIUS_KM * 1000;
const MAX_RESULTS = 10;
/** Delay between API requests (ms) — keeps us well within rate limits */
const REQUEST_DELAY_MS = 600;

// ---------------------------------------------------------------------------
// Load club data
// ---------------------------------------------------------------------------
const clubs = JSON.parse(
  readFileSync(join(__dirname, '../src/data/clubs.json'), 'utf8'),
);
const clubsEurope = JSON.parse(
  readFileSync(join(__dirname, '../src/data/clubs-europe.json'), 'utf8'),
);

/**
 * Build a flat list of clubs to fetch, normalising coordinate field names.
 * UK clubs use lat/lng; European clubs use latitude/longitude.
 * We only generate pages for La Liga and Serie A European clubs (mirrors
 * the getStaticPaths filter in [club].astro).
 */
const allClubs = [
  ...clubs.map((c) => ({
    slug: c.slug,
    name: c.name,
    stadium: c.stadium,
    city: c.city,
    lat: c.lat,
    lng: c.lng,
  })),
  ...clubsEurope
    .filter(
      (c) => c.leagueSlug === 'la-liga' || c.leagueSlug === 'serie-a',
    )
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      stadium: c.stadium,
      city: c.city,
      lat: c.latitude,
      lng: c.longitude,
    })),
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Haversine distance in km between two lat/lng points */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Fetch hotels near a stadium from LiteAPI.
 * Returns an array of normalised hotel objects, sorted by distance ascending.
 */
async function fetchHotelsForClub(club) {
  const params = new URLSearchParams({
    latitude: String(club.lat),
    longitude: String(club.lng),
    radius: String(SEARCH_RADIUS_M),
    limit: String(MAX_RESULTS),
  });

  const url = `${LITEAPI_BASE}/data/hotels?${params}`;
  const curlOut = execSync(
    `curl -sf -H "X-API-Key: ${API_KEY}" -H "Accept: application/json" "${url}"`,
    { encoding: 'utf8', timeout: 15000 },
  );
  const json = JSON.parse(curlOut);
  const raw = json.data ?? [];

  if (!Array.isArray(raw) || raw.length === 0) {
    return [];
  }

  return raw
    .map((h) => {
      const hotelLat = h.location?.lat ?? h.latitude ?? null;
      const hotelLng = h.location?.lng ?? h.longitude ?? null;
      const distanceKm =
        hotelLat !== null && hotelLng !== null
          ? haversineKm(club.lat, club.lng, hotelLat, hotelLng)
          : null;

      return {
        id: h.id,
        name: h.name,
        stars: h.starRating ?? null,
        photo: h.main_photo ?? h.thumbnail ?? null,
        distanceKm: distanceKm !== null ? Math.round(distanceKm * 100) / 100 : null,
        latitude: hotelLat,
        longitude: hotelLng,
      };
    })
    .filter((h) => h.distanceKm !== null)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, MAX_RESULTS);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const results = {};
  const errors = [];

  console.log(
    `Fetching LiteAPI hotels for ${allClubs.length} clubs (radius ${SEARCH_RADIUS_KM} km)…`,
  );

  for (const club of allClubs) {
    try {
      const hotels = await fetchHotelsForClub(club);
      results[club.slug] = hotels;
      console.log(
        `  ✓ ${club.slug} — ${hotels.length} hotel${hotels.length !== 1 ? 's' : ''} found`,
      );
    } catch (err) {
      errors.push(club.slug);
      results[club.slug] = [];
      console.warn(`  ✗ ${club.slug}: ${err.message}`);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
  console.log(
    `\nWrote hotel data for ${Object.keys(results).length} clubs to src/data/liteapi-hotels.json`,
  );
  if (errors.length) {
    console.warn(`Failed to fetch: ${errors.join(', ')}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
