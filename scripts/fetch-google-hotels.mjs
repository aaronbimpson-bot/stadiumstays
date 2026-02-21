/**
 * Fetches hotel listings from the Google Places API (New) for each club stadium
 * and writes results to src/data/hotels.json for use at build time.
 *
 * Uses the Places API Nearby Search endpoint with includedTypes: ["hotel"] to
 * return only traditional hotels (no serviced apartments or short-term lets).
 *
 * Required environment variable:
 *   GOOGLE_PLACES_API_KEY — Google Cloud API key with Places API (New) enabled
 *
 * Run via: node scripts/fetch-google-hotels.mjs
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env for local development
const envPath = join(__dirname, '../.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key && key.trim() && !key.trim().startsWith('#') && rest.length) {
      process.env[key.trim()] ??= rest.join('=').trim();
    }
  }
}

const OUTPUT_PATH = join(__dirname, '../src/data/hotels.json');
const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!API_KEY) {
  console.warn('Warning: GOOGLE_PLACES_API_KEY not set — skipping hotel fetch.');
  process.exit(0);
}

const SEARCH_RADIUS_M = 5000;
const MAX_RESULTS = 20;
const MAX_PHOTOS = 3;
const REQUEST_DELAY_MS = 200;

const INCLUDED_TYPES = ['hotel'];

// Preferred-tier fields (formattedAddress, websiteUri) needed for detail pages
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.websiteUri',
  'places.editorialSummary',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.location',
  'places.photos',
].join(',');

// ---------------------------------------------------------------------------
// Load club data
// ---------------------------------------------------------------------------
const clubs = JSON.parse(readFileSync(join(__dirname, '../src/data/clubs.json'), 'utf8'));
const clubsEurope = JSON.parse(readFileSync(join(__dirname, '../src/data/clubs-europe.json'), 'utf8'));

const allClubs = [
  ...clubs.map((c) => ({
    slug: c.slug,
    name: c.name,
    stadium: c.stadium,
    lat: c.lat,
    lng: c.lng,
  })),
  ...clubsEurope
    .filter((c) => c.leagueSlug === 'la-liga' || c.leagueSlug === 'serie-a')
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      stadium: c.stadium,
      lat: c.latitude,
      lng: c.longitude,
    })),
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

function priceLevelToInt(priceLevel) {
  const map = {
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };
  return map[priceLevel] ?? null;
}

/** Follow the redirect to get a stable CDN photo URL (no API key in final JSON). */
function fetchPhotoUrl(photoName) {
  try {
    const mediaUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&key=${API_KEY}`;
    const response = execSync(
      `curl -sf -L -o /dev/null -w "%{url_effective}" "${mediaUrl}"`,
      { encoding: 'utf8', timeout: 10000 },
    ).trim();
    return response && !response.includes('places.googleapis.com') ? response : null;
  } catch {
    return null;
  }
}

async function fetchHotelsForClub(club) {
  const body = JSON.stringify({
    includedTypes: INCLUDED_TYPES,
    maxResultCount: MAX_RESULTS,
    locationRestriction: {
      circle: {
        center: { latitude: club.lat, longitude: club.lng },
        radius: SEARCH_RADIUS_M,
      },
    },
  });

  const raw = execSync(
    `curl -sf -X POST \
      -H "Content-Type: application/json" \
      -H "X-Goog-Api-Key: ${API_KEY}" \
      -H "X-Goog-FieldMask: ${FIELD_MASK}" \
      -d '${body}' \
      "https://places.googleapis.com/v1/places:searchNearby"`,
    { encoding: 'utf8', timeout: 15000 },
  );

  const json = JSON.parse(raw);
  const places = json.places ?? [];

  if (!Array.isArray(places) || places.length === 0) return [];

  return places
    .map((p) => {
      const lat = p.location?.latitude ?? null;
      const lng = p.location?.longitude ?? null;
      const distanceKm =
        lat !== null && lng !== null
          ? Math.round(haversineKm(club.lat, club.lng, lat, lng) * 100) / 100
          : null;

      // Fetch up to MAX_PHOTOS photo CDN URLs at build time
      const photoNames = (p.photos ?? []).slice(0, MAX_PHOTOS).map((ph) => ph.name);
      const photos = photoNames.map(fetchPhotoUrl).filter(Boolean);

      return {
        id: p.id,
        name: p.displayName?.text ?? 'Unknown',
        address: p.formattedAddress ?? null,
        website: p.websiteUri ?? null,
        description: p.editorialSummary?.text ?? null,
        clubSlug: club.slug,
        clubName: club.name,
        stadiumName: club.stadium,
        priceLevel: priceLevelToInt(p.priceLevel),
        rating: p.rating ?? null,
        reviewCount: p.userRatingCount ?? null,
        photos,
        distanceKm,
        latitude: lat,
        longitude: lng,
      };
    })
    .filter((h) => h.distanceKm !== null)
    .sort((a, b) => {
      const ra = a.rating ?? 0;
      const rb = b.rating ?? 0;
      if (rb !== ra) return rb - ra;
      return (a.distanceKm ?? 99) - (b.distanceKm ?? 99);
    });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const results = {};
  const errors = [];

  console.log(`Fetching Google Places hotels for ${allClubs.length} clubs (up to ${MAX_PHOTOS} photos each)…`);

  for (const club of allClubs) {
    try {
      const hotels = await fetchHotelsForClub(club);
      results[club.slug] = hotels;
      console.log(`  ✓ ${club.slug} — ${hotels.length} hotels`);
    } catch (err) {
      errors.push(club.slug);
      results[club.slug] = [];
      console.warn(`  ✗ ${club.slug}: ${err.message}`);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
  console.log(`\nWrote hotel data for ${Object.keys(results).length} clubs to src/data/hotels.json`);
  if (errors.length) console.warn(`Failed clubs: ${errors.join(', ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
