/**
 * Fetches city hero images from the Unsplash API and writes them to
 * src/data/unsplash-images.json for use at build time.
 *
 * Requires the UNSPLASH_ACCESS_KEY environment variable.
 * Run via: node scripts/fetch-unsplash.mjs
 * Or automatically via the "build" npm script on Vercel.
 *
 * Incremental: existing real Unsplash images are preserved and only missing
 * or placeholder (picsum) entries are re-fetched. This allows the script to
 * be re-run after rate limit resets without losing previously fetched data.
 *
 * Rate limit: Unsplash demo keys allow 50 requests/hr. The script respects
 * the X-Ratelimit-Remaining header and pauses automatically when needed.
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, '../src/data/unsplash-images.json');

const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
if (!ACCESS_KEY) {
  console.warn('Warning: UNSPLASH_ACCESS_KEY not set — skipping image fetch, pages will build without hero images.');
  process.exit(0);
}

// Load existing data so we can preserve already-fetched real images
const existing = existsSync(OUTPUT_PATH)
  ? JSON.parse(readFileSync(OUTPUT_PATH, 'utf8'))
  : {};

/** Returns true if the key already has a real Unsplash image (not a picsum placeholder). */
function alreadyFetched(key) {
  const entry = existing[key];
  return entry && entry.url && entry.url.includes('images.unsplash.com');
}

// Per-club stadium images — stored under "{slug}-stadium" key to avoid collisions
// with city lifestyle images (some clubs share a slug with their city, e.g. "liverpool").
const CLUBS = [
  // Premier League
  { key: 'arsenal-stadium',           query: 'Emirates Stadium Arsenal London' },
  { key: 'chelsea-stadium',           query: 'Stamford Bridge Chelsea London' },
  { key: 'liverpool-stadium',         query: 'Anfield stadium Liverpool' },
  { key: 'manchester-city-stadium',   query: 'Etihad Stadium Manchester City' },
  { key: 'manchester-united-stadium', query: 'Old Trafford Manchester United stadium' },
  { key: 'tottenham-hotspur-stadium', query: 'Tottenham Hotspur Stadium London' },
  { key: 'newcastle-united-stadium',  query: "St James Park Newcastle United stadium" },
  { key: 'aston-villa-stadium',       query: 'Villa Park Birmingham Aston Villa' },
  { key: 'west-ham-united-stadium',   query: 'London Stadium Olympic Park West Ham' },
  { key: 'brighton-stadium',          query: 'Amex Stadium Brighton football' },
  { key: 'everton-stadium',           query: 'Goodison Park Everton Liverpool stadium' },
  { key: 'fulham-stadium',            query: 'Craven Cottage Fulham Thames stadium' },
  // Championship / other UK
  { key: 'leeds-united-stadium',              query: 'Elland Road Leeds United stadium' },
  { key: 'sunderland-stadium',                query: 'Stadium of Light Sunderland football' },
  { key: 'sheffield-united-stadium',          query: 'Bramall Lane Sheffield United stadium' },
  { key: 'brentford-stadium',                 query: 'Gtech Community Stadium Brentford London' },
  { key: 'crystal-palace-stadium',            query: 'Selhurst Park Crystal Palace stadium London' },
  { key: 'nottingham-forest-stadium',         query: 'City Ground Nottingham Forest River Trent' },
  { key: 'burnley-stadium',                   query: 'Turf Moor Burnley FC stadium Lancashire' },
  { key: 'wolverhampton-wanderers-stadium',   query: 'Molineux Stadium Wolverhampton Wanderers' },
  { key: 'afc-bournemouth-stadium',           query: 'Vitality Stadium Bournemouth Dean Court' },
  { key: 'celtic-stadium',                    query: 'Celtic Park stadium Glasgow' },
  { key: 'rangers-stadium',                   query: 'Ibrox Stadium Rangers Glasgow' },
  // La Liga
  { key: 'real-madrid-stadium',       query: 'Santiago Bernabéu stadium Madrid' },
  { key: 'barcelona-stadium',         query: 'Camp Nou Barcelona stadium' },
  { key: 'atletico-madrid-stadium',   query: 'Civitas Metropolitano Atletico Madrid stadium' },
  { key: 'athletic-bilbao-stadium',   query: 'San Mames stadium Bilbao' },
  { key: 'real-sociedad-stadium',     query: 'Reale Arena stadium San Sebastian' },
  { key: 'real-betis-stadium',        query: 'Estadio Benito Villamarin Seville stadium' },
  { key: 'sevilla-stadium',           query: 'Ramon Sanchez-Pizjuan stadium Seville' },
  { key: 'villarreal-stadium',        query: 'Estadio de la Ceramica Villarreal stadium' },
  { key: 'girona-stadium',            query: 'Estadi Montilivi Girona stadium' },
  { key: 'osasuna-stadium',           query: 'El Sadar stadium Pamplona football' },
  { key: 'celta-vigo-stadium',        query: 'Estadio Balaidos Celta Vigo stadium' },
  { key: 'mallorca-stadium',          query: 'Son Moix stadium Mallorca football' },
  { key: 'rayo-vallecano-stadium',    query: 'Estadio Vallecas Madrid football' },
  { key: 'getafe-stadium',            query: 'Coliseum Alfonso Perez Getafe stadium' },
  { key: 'alaves-stadium',            query: 'Mendizorrotza stadium Vitoria-Gasteiz' },
  { key: 'las-palmas-stadium',        query: 'Estadio Gran Canaria Las Palmas football' },
  { key: 'valencia-stadium',          query: 'Mestalla stadium Valencia Spain' },
  { key: 'espanyol-stadium',          query: 'RCDE Stadium Espanyol Barcelona' },
  { key: 'leganes-stadium',           query: 'Estadio Butarque Leganes Madrid' },
  { key: 'real-valladolid-stadium',   query: 'Estadio Zorrilla Valladolid Spain' },
  // Serie A
  { key: 'inter-milan-stadium',       query: 'Giuseppe Meazza San Siro stadium Milan' },
  { key: 'ac-milan-stadium',          query: 'San Siro stadium AC Milan Italy' },
  { key: 'juventus-stadium',          query: 'Allianz Stadium Juventus Turin' },
  { key: 'napoli-stadium',            query: 'Stadio Maradona Napoli Naples stadium' },
  { key: 'roma-stadium',              query: 'Stadio Olimpico Roma football' },
  { key: 'lazio-stadium',             query: 'Stadio Olimpico Lazio Rome football' },
  { key: 'atalanta-stadium',          query: 'Gewiss Stadium Atalanta Bergamo' },
  { key: 'fiorentina-stadium',        query: 'Stadio Franchi Fiorentina Florence' },
  { key: 'bologna-stadium',           query: 'Stadio Dall Ara Bologna football' },
  { key: 'torino-stadium',            query: 'Stadio Olimpico Grande Torino football' },
  { key: 'monza-stadium',             query: 'U-Power Stadium Monza Italy football' },
  { key: 'genoa-stadium',             query: 'Stadio Luigi Ferraris Genoa football' },
  { key: 'cagliari-stadium',          query: 'Unipol Domus Cagliari Sardinia football' },
  { key: 'udinese-stadium',           query: 'Bluenergy Stadium Udinese football' },
  { key: 'empoli-stadium',            query: 'Stadio Castellani Empoli Italy football' },
  { key: 'parma-stadium',             query: 'Stadio Tardini Parma Italy football' },
  { key: 'hellas-verona-stadium',     query: 'Stadio Bentegodi Verona Italy football' },
  { key: 'como-stadium',              query: 'Stadio Sinigaglia Como lake Italy' },
  { key: 'lecce-stadium',             query: 'Stadio Via del Mare Lecce Italy football' },
  { key: 'venezia-stadium',           query: 'Stadio Penzo Venice Italy football' },
];

// City fallback queries for club images, used when a stadium search returns no results.
// Keys now use the "-stadium" suffix to match the CLUBS array above.
const CLUB_CITY_FALLBACKS = {
  'arsenal-stadium':           'London city skyline',
  'chelsea-stadium':           'London city skyline',
  'tottenham-hotspur-stadium': 'London city skyline',
  'west-ham-united-stadium':   'London city skyline',
  'fulham-stadium':            'London west Thames skyline',
  'liverpool-stadium':         'Liverpool city waterfront',
  'everton-stadium':           'Liverpool city waterfront',
  'manchester-city-stadium':   'Manchester city skyline',
  'manchester-united-stadium': 'Manchester city skyline',
  'newcastle-united-stadium':  'Newcastle upon Tyne city',
  'aston-villa-stadium':       'Birmingham city UK',
  'brighton-stadium':          'Brighton seafront',
  'leeds-united-stadium':                'Leeds city UK',
  'sunderland-stadium':                  'Sunderland city UK',
  'sheffield-united-stadium':            'Sheffield city UK',
  'brentford-stadium':                   'London west skyline Thames',
  'crystal-palace-stadium':              'London south Croydon skyline',
  'nottingham-forest-stadium':           'Nottingham city River Trent',
  'burnley-stadium':                     'Burnley Lancashire town',
  'wolverhampton-wanderers-stadium':     'Wolverhampton city West Midlands',
  'afc-bournemouth-stadium':             'Bournemouth beach seafront Dorset',
  'celtic-stadium':                      'Glasgow city Scotland',
  'rangers-stadium':                     'Glasgow city Scotland',
  // La Liga
  'real-madrid-stadium':       'Madrid city Spain',
  'barcelona-stadium':         'Barcelona city Spain',
  'atletico-madrid-stadium':   'Madrid city Spain',
  'athletic-bilbao-stadium':   'Bilbao city Spain',
  'real-sociedad-stadium':     'San Sebastian city Spain',
  'real-betis-stadium':        'Seville city Spain',
  'sevilla-stadium':           'Seville city Spain',
  'villarreal-stadium':        'Villarreal city Spain',
  'girona-stadium':            'Girona city Spain',
  'osasuna-stadium':           'Pamplona city Spain',
  'celta-vigo-stadium':        'Vigo city Spain',
  'mallorca-stadium':          'Palma Mallorca city',
  'rayo-vallecano-stadium':    'Madrid city Spain',
  'getafe-stadium':            'Getafe city Spain',
  'alaves-stadium':            'Vitoria-Gasteiz city Spain',
  'las-palmas-stadium':        'Las Palmas Gran Canaria city',
  'valencia-stadium':          'Valencia city Spain',
  'espanyol-stadium':          'Barcelona city Spain',
  'leganes-stadium':           'Leganés city Spain',
  'real-valladolid-stadium':   'Valladolid city Spain',
  // Serie A
  'inter-milan-stadium':       'Milan city Italy',
  'ac-milan-stadium':          'Milan city Italy',
  'juventus-stadium':          'Turin city Italy',
  'napoli-stadium':            'Naples city Italy',
  'roma-stadium':              'Rome city Italy',
  'lazio-stadium':             'Rome city Italy',
  'atalanta-stadium':          'Bergamo city Italy',
  'fiorentina-stadium':        'Florence city Italy',
  'bologna-stadium':           'Bologna city Italy',
  'torino-stadium':            'Turin city Italy',
  'monza-stadium':             'Monza city Italy',
  'genoa-stadium':             'Genoa city Italy',
  'cagliari-stadium':          'Cagliari Sardinia Italy',
  'udinese-stadium':           'Udine city Italy',
  'empoli-stadium':            'Empoli city Italy',
  'parma-stadium':             'Parma city Italy',
  'hellas-verona-stadium':     'Verona city Italy',
  'como-stadium':              'Como lake city Italy',
  'lecce-stadium':             'Lecce city Italy',
  'venezia-stadium':           'Venice city Italy',
};

// All cities needed across UK city guide pages and European club pages.
// key = slug used in cities.json / citySlug in clubs-europe.json
// query = lifestyle search — street scenes, cafes, markets, culture (NOT stadiums or skylines)
const CITIES = [
  // UK (city guide pages + Premier League / Scottish clubs)
  { key: 'london',      query: 'London street market people lifestyle' },
  { key: 'manchester',  query: 'Manchester Northern Quarter street cafe' },
  { key: 'liverpool',   query: 'Liverpool Albert Dock waterfront people' },
  { key: 'birmingham',  query: 'Birmingham Bullring street market people' },
  { key: 'newcastle',   query: 'Newcastle Grainger Market street life' },
  { key: 'brighton',    query: 'Brighton Lanes street cafe people' },
  { key: 'glasgow',     query: 'Glasgow Merchant City street life cafe' },
  { key: 'leeds',       query: 'Leeds city centre street market people' },
  { key: 'sheffield',   query: 'Sheffield street life cafe people' },
  { key: 'sunderland',      query: 'Sunderland city street life people' },
  { key: 'nottingham',      query: 'Nottingham Lace Market street life cafe' },
  { key: 'wolverhampton',   query: 'Wolverhampton city street market people' },
  { key: 'burnley',         query: 'Burnley Lancashire town street life' },
  { key: 'bournemouth',     query: 'Bournemouth beach promenade people lifestyle' },
  // La Liga
  { key: 'madrid',        query: 'Madrid street cafe tapas bar people lifestyle' },
  { key: 'barcelona',     query: 'Barcelona Las Ramblas street market people' },
  { key: 'bilbao',        query: 'Bilbao pintxos bar old town street life' },
  { key: 'villarreal',    query: 'Villarreal Spain street life people' },
  { key: 'seville',       query: 'Seville tapas bar street market people lifestyle' },
  { key: 'san-sebastian', query: 'San Sebastian pintxos old town street life' },
  { key: 'vigo',          query: 'Vigo Spain street market seafood people' },
  { key: 'pamplona',      query: 'Pamplona old town street cafe people' },
  { key: 'getafe',        query: 'Getafe Spain street life people' },
  { key: 'palma',         query: 'Palma Mallorca street cafe old town people' },
  { key: 'girona',        query: 'Girona old town colourful houses river' },
  { key: 'vitoria-gasteiz', query: 'Vitoria-Gasteiz old town street cafe Spain' },
  { key: 'leganes',       query: 'Leganés Spain street life people' },
  { key: 'eibar',         query: 'Eibar Spain street life people' },
  { key: 'zaragoza',      query: 'Zaragoza Spain street market people' },
  { key: 'gijon',         query: 'Gijón Spain beach promenade people lifestyle' },
  { key: 'las-palmas',    query: 'Las Palmas Gran Canaria street market people' },
  { key: 'valencia',      query: 'Valencia Spain market street paella people' },
  { key: 'valladolid',    query: 'Valladolid Spain street plaza people' },
  // Serie A
  { key: 'milan',         query: 'Milan street fashion cafe Navigli people' },
  { key: 'turin',         query: 'Turin street cafe piazza people lifestyle' },
  { key: 'naples',        query: 'Naples street pizza market Spaccanapoli people' },
  { key: 'bergamo',       query: 'Bergamo old town Città Alta street people' },
  { key: 'rome',          query: 'Rome street piazza cafe people lifestyle' },
  { key: 'florence',      query: 'Florence street market piazza people lifestyle' },
  { key: 'bologna',       query: 'Bologna portico street market food people' },
  { key: 'udine',         query: 'Udine Italy street piazza people' },
  { key: 'genoa',         query: 'Genoa caruggi old town street people' },
  { key: 'cagliari',      query: 'Cagliari Sardinia street market harbour people' },
  { key: 'empoli',        query: 'Empoli Italy street piazza people' },
  { key: 'verona',        query: 'Verona street piazza people lifestyle' },
  { key: 'parma',         query: 'Parma Italy street food market people' },
  { key: 'como',          query: 'Como lakeside promenade cafe people lifestyle' },
  { key: 'reggio-emilia', query: 'Reggio Emilia Italy street piazza people' },
  { key: 'pisa',          query: 'Pisa Italy street cafe people lifestyle' },
  { key: 'la-spezia',     query: 'La Spezia Italy harbour street people' },
  { key: 'monza',         query: 'Monza Italy street piazza people' },
  { key: 'lecce',         query: 'Lecce Baroque street old town people' },
  { key: 'venice',        query: 'Venice canal street gondola people lifestyle' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Tracks remaining requests from the last API response. */
let rateLimitRemaining = 50;
/** Set to true when we hit the rate limit — signals main() to stop and save progress. */
let rateLimitHit = false;

async function unsplashFetch(url) {
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
  });
  // Track rate limit headers
  const remaining = res.headers.get('X-Ratelimit-Remaining');
  if (remaining !== null) rateLimitRemaining = parseInt(remaining, 10);

  if (res.status === 429) {
    // Don't wait — save progress and exit so the build can complete.
    // The next build will pick up remaining images via alreadyFetched().
    rateLimitHit = true;
    throw new Error('RATE_LIMIT');
  }

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchCity({ key, query }) {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
  const data = await unsplashFetch(url);
  if (!data.results?.length) throw new Error(`No results for "${query}"`);
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

/** Fetches up to 3 photos for a city and returns entries keyed as `${key}-life-1/2/3`. */
async function fetchCityTriple({ key, query }) {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`;
  const data = await unsplashFetch(url);
  if (!data.results?.length) throw new Error(`No results for "${query}"`);
  return data.results.slice(0, 3).map((photo, i) => ({
    key: `${key}-life-${i + 1}`,
    value: {
      url: photo.urls.raw,
      photographer: photo.user.name,
      photographerUsername: photo.user.username,
      altDescription: photo.alt_description || `${query} photo`,
    },
  }));
}

async function main() {
  // Start with existing data — preserves real images already fetched in prior runs
  const results = { ...existing };
  const errors = [];

  // Count how many we actually need to fetch
  const clubsToFetch = CLUBS.filter(c => !alreadyFetched(c.key));
  const citiesToFetch = CITIES.filter(c => !alreadyFetched(c.key));
  const alreadyDone = CLUBS.length - clubsToFetch.length + (CITIES.length - citiesToFetch.length);
  if (alreadyDone > 0) {
    console.log(`Skipping ${alreadyDone} already-fetched images.`);
  }

  // Fetch club stadium images first
  console.log(`Fetching Unsplash images for ${clubsToFetch.length} clubs…`);
  for (const club of clubsToFetch) {
    if (rateLimitHit) break;
    try {
      const { key, value } = await fetchCity(club);
      results[key] = value;
      console.log(`  ✓ ${key} — Photo by ${value.photographer}`);
    } catch (err) {
      if (rateLimitHit) break;
      // Try city fallback query
      const fallbackQuery = CLUB_CITY_FALLBACKS[club.key];
      if (fallbackQuery) {
        try {
          const { value } = await fetchCity({ key: club.key, query: fallbackQuery });
          results[club.key] = value;
          console.log(`  ✓ ${club.key} (fallback) — Photo by ${value.photographer}`);
        } catch (fbErr) {
          if (!rateLimitHit) {
            errors.push(club.key);
            console.warn(`  ✗ ${club.key}: ${fbErr.message}`);
          }
        }
        if (!rateLimitHit) await sleep(250);
      } else {
        errors.push(club.key);
        console.warn(`  ✗ ${club.key}: ${err.message}`);
      }
    }
    // Save incrementally so progress isn't lost if interrupted
    writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
    if (!rateLimitHit) await sleep(250);
  }

  if (rateLimitHit) {
    writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
    console.warn('\n⚠ Rate limit reached — saved progress. Re-run (or redeploy) to fetch remaining images.');
    console.log(`Wrote ${Object.keys(results).length} images so far.`);
    return;
  }

  // Fetch city images (3 per city for the match page lifestyle grid;
  // the first result is also stored under the plain city slug as the city guide hero image)
  console.log(`\nFetching Unsplash images for ${citiesToFetch.length} cities…`);
  for (const city of citiesToFetch) {
    if (rateLimitHit) break;
    try {
      const entries = await fetchCityTriple(city);
      // Hero image for the city guide page (e.g. "london")
      results[city.key] = entries[0].value;
      // Lifestyle grid images (e.g. "london-life-1", "london-life-2", "london-life-3")
      for (const { key, value } of entries) {
        results[key] = value;
      }
      console.log(`  ✓ ${city.key} (×${entries.length}) — Photo by ${entries[0].value.photographer}`);
    } catch (err) {
      if (!rateLimitHit) {
        errors.push(city.key);
        console.warn(`  ✗ ${city.key}: ${err.message}`);
      }
    }
    // Save incrementally
    writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
    // Stay well within Unsplash's rate limit (50 req/hr on demo keys)
    if (!rateLimitHit) await sleep(250);
  }

  if (rateLimitHit) {
    writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
    console.warn('\n⚠ Rate limit reached — saved progress. Re-run (or redeploy) to fetch remaining images.');
    console.log(`Wrote ${Object.keys(results).length} images so far.`);
    return;
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
