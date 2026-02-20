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
  console.error('ERROR: UNSPLASH_ACCESS_KEY environment variable is not set.');
  process.exit(1);
}

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
  console.log(`Fetching Unsplash images for ${CITIES.length} cities…`);
  const results = {};
  const errors = [];

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
    console.warn(`Failed cities: ${errors.join(', ')}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
