/**
 * Fetches city hero images from the Unsplash API and writes them to
 * src/data/unsplash-images.json for use at build time.
 *
 * Requires the UNSPLASH_ACCESS_KEY environment variable.
 * Run via: node scripts/fetch-unsplash.mjs
 * Or automatically via the "build" npm script on Vercel.
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, '../src/data/unsplash-images.json');

const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
if (!ACCESS_KEY) {
  console.warn('Warning: UNSPLASH_ACCESS_KEY not set — skipping image fetch, pages will build without hero images.');
  process.exit(0);
}

// Per-club stadium images — searched by stadium name, city skyline as fallback.
// key = club slug from clubs.json
const CLUBS = [
  // Premier League
  { key: 'arsenal',           query: 'Emirates Stadium Arsenal London' },
  { key: 'chelsea',           query: 'Stamford Bridge Chelsea London' },
  { key: 'liverpool',         query: 'Anfield stadium Liverpool' },
  { key: 'manchester-city',   query: 'Etihad Stadium Manchester City' },
  { key: 'manchester-united', query: 'Old Trafford Manchester United stadium' },
  { key: 'tottenham-hotspur', query: 'Tottenham Hotspur Stadium London' },
  { key: 'newcastle-united',  query: "St James Park Newcastle United stadium" },
  { key: 'aston-villa',       query: 'Villa Park Birmingham Aston Villa' },
  { key: 'west-ham-united',   query: 'London Stadium Olympic Park West Ham' },
  { key: 'brighton',          query: 'Amex Stadium Brighton football' },
  { key: 'everton',           query: 'Goodison Park Everton Liverpool stadium' },
  { key: 'fulham',            query: 'Craven Cottage Fulham Thames stadium' },
  // Championship
  { key: 'leeds-united',      query: 'Elland Road Leeds United stadium' },
  { key: 'sunderland',        query: 'Stadium of Light Sunderland football' },
  { key: 'sheffield-united',  query: 'Bramall Lane Sheffield United stadium' },
];

// City fallback queries, used when a stadium search returns no results
const CLUB_CITY_FALLBACKS = {
  'arsenal':           'London city skyline',
  'chelsea':           'London city skyline',
  'tottenham-hotspur': 'London city skyline',
  'west-ham-united':   'London city skyline',
  'fulham':            'London city skyline',
  'liverpool':         'Liverpool city waterfront',
  'everton':           'Liverpool city waterfront',
  'manchester-city':   'Manchester city skyline',
  'manchester-united': 'Manchester city skyline',
  'newcastle-united':  'Newcastle upon Tyne city',
  'aston-villa':       'Birmingham city UK',
  'brighton':          'Brighton seafront',
  'leeds-united':      'Leeds city UK',
  'sunderland':        'Sunderland city UK',
  'sheffield-united':  'Sheffield city UK',
};

// All cities needed across UK city guide pages and European club pages.
// key = slug used in cities.json / citySlug in clubs-europe.json
// query = what we search on Unsplash
const CITIES = [
  // UK (city guide pages + Premier League / Scottish clubs)
  { key: 'london',      query: 'London city skyline' },
  { key: 'manchester',  query: 'Manchester city' },
  { key: 'liverpool',   query: 'Liverpool city' },
  { key: 'birmingham',  query: 'Birmingham city UK' },
  { key: 'newcastle',   query: 'Newcastle upon Tyne city' },
  { key: 'brighton',    query: 'Brighton city seafront' },
  { key: 'glasgow',     query: 'Glasgow city Scotland' },
  { key: 'leeds',       query: 'Leeds city UK' },
  { key: 'sheffield',   query: 'Sheffield city UK' },
  { key: 'sunderland',  query: 'Sunderland city UK' },
  // La Liga
  { key: 'madrid',        query: 'Madrid city Spain' },
  { key: 'barcelona',     query: 'Barcelona city Spain' },
  { key: 'bilbao',        query: 'Bilbao city Spain' },
  { key: 'villarreal',    query: 'Villarreal city Spain' },
  { key: 'seville',       query: 'Seville city Spain' },
  { key: 'san-sebastian', query: 'San Sebastian city Spain' },
  { key: 'vigo',          query: 'Vigo city Spain' },
  { key: 'pamplona',      query: 'Pamplona city Spain' },
  { key: 'getafe',        query: 'Getafe city Spain' },
  { key: 'palma',         query: 'Palma Mallorca city' },
  { key: 'girona',        query: 'Girona city Spain' },
  { key: 'vitoria-gasteiz', query: 'Vitoria-Gasteiz city Spain' },
  { key: 'leganes',       query: 'Leganés city Spain' },
  { key: 'eibar',         query: 'Eibar city Spain' },
  { key: 'zaragoza',      query: 'Zaragoza city Spain' },
  { key: 'gijon',         query: 'Gijón city Spain' },
  // Serie A
  { key: 'milan',         query: 'Milan city Italy' },
  { key: 'turin',         query: 'Turin city Italy' },
  { key: 'naples',        query: 'Naples city Italy' },
  { key: 'bergamo',       query: 'Bergamo city Italy' },
  { key: 'rome',          query: 'Rome city Italy' },
  { key: 'florence',      query: 'Florence city Italy' },
  { key: 'bologna',       query: 'Bologna city Italy' },
  { key: 'udine',         query: 'Udine city Italy' },
  { key: 'genoa',         query: 'Genoa city Italy' },
  { key: 'cagliari',      query: 'Cagliari city Italy' },
  { key: 'empoli',        query: 'Empoli city Italy' },
  { key: 'verona',        query: 'Verona city Italy' },
  { key: 'parma',         query: 'Parma city Italy' },
  { key: 'como',          query: 'Como city Italy lake' },
  { key: 'reggio-emilia', query: 'Reggio Emilia city Italy' },
  { key: 'pisa',          query: 'Pisa city Italy' },
  { key: 'la-spezia',     query: 'La Spezia city Italy' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchCity({ key, query }) {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${key}`);
  }

  const data = await res.json();
  if (!data.results?.length) {
    throw new Error(`No results for "${query}"`);
  }

  const photo = data.results[0];
  return {
    key,
    value: {
      url: photo.urls.raw,
      photographer: photo.user.name,
      photographerUsername: photo.user.username,
      altDescription: photo.alt_description || `${query} photo`,
    },
  };
}

async function main() {
  const results = {};
  const errors = [];

  // Fetch club stadium images first
  console.log(`Fetching Unsplash images for ${CLUBS.length} clubs…`);
  for (const club of CLUBS) {
    try {
      const { key, value } = await fetchCity(club);
      results[key] = value;
      console.log(`  ✓ ${key} — Photo by ${value.photographer}`);
    } catch (err) {
      // Try city fallback query
      const fallbackQuery = CLUB_CITY_FALLBACKS[club.key];
      if (fallbackQuery) {
        try {
          const { value } = await fetchCity({ key: club.key, query: fallbackQuery });
          results[club.key] = value;
          console.log(`  ✓ ${club.key} (fallback) — Photo by ${value.photographer}`);
        } catch (fbErr) {
          errors.push(club.key);
          console.warn(`  ✗ ${club.key}: ${fbErr.message}`);
        }
        await sleep(250);
      } else {
        errors.push(club.key);
        console.warn(`  ✗ ${club.key}: ${err.message}`);
      }
    }
    await sleep(250);
  }

  // Fetch city images
  console.log(`\nFetching Unsplash images for ${CITIES.length} cities…`);
  for (const city of CITIES) {
    try {
      const { key, value } = await fetchCity(city);
      results[key] = value;
      console.log(`  ✓ ${key} — Photo by ${value.photographer}`);
    } catch (err) {
      errors.push(city.key);
      console.warn(`  ✗ ${city.key}: ${err.message}`);
    }
    // Stay well within Unsplash's rate limit (50 req/hr on demo keys)
    await sleep(250);
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
  console.log(`\nWrote ${Object.keys(results).length} images to src/data/unsplash-images.json`);
  if (errors.length) {
    console.warn(`Failed: ${errors.join(', ')}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
