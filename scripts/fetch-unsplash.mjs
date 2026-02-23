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
  // Championship / other Premier League
  { key: 'leeds-united',              query: 'Elland Road Leeds United stadium' },
  { key: 'sunderland',                query: 'Stadium of Light Sunderland football' },
  { key: 'sheffield-united',          query: 'Bramall Lane Sheffield United stadium' },
  { key: 'brentford',                 query: 'Gtech Community Stadium Brentford London' },
  { key: 'crystal-palace',            query: 'Selhurst Park Crystal Palace stadium London' },
  { key: 'nottingham-forest',         query: 'City Ground Nottingham Forest River Trent' },
  { key: 'burnley',                   query: 'Turf Moor Burnley FC stadium Lancashire' },
  { key: 'wolverhampton-wanderers',   query: 'Molineux Stadium Wolverhampton Wanderers' },
  { key: 'afc-bournemouth',           query: 'Vitality Stadium Bournemouth Dean Court' },
  // La Liga
  { key: 'real-madrid',       query: 'Santiago Bernabéu stadium Madrid' },
  { key: 'barcelona',         query: 'Camp Nou Barcelona stadium' },
  { key: 'atletico-madrid',   query: 'Civitas Metropolitano Atletico Madrid stadium' },
  { key: 'athletic-bilbao',   query: 'San Mames stadium Bilbao' },
  { key: 'real-sociedad',     query: 'Reale Arena stadium San Sebastian' },
  { key: 'real-betis',        query: 'Estadio Benito Villamarin Seville stadium' },
  { key: 'sevilla',           query: 'Ramon Sanchez-Pizjuan stadium Seville' },
  { key: 'villarreal',        query: 'Estadio de la Ceramica Villarreal stadium' },
  { key: 'girona',            query: 'Estadi Montilivi Girona stadium' },
  { key: 'osasuna',           query: 'El Sadar stadium Pamplona football' },
  { key: 'celta-vigo',        query: 'Estadio Balaidos Celta Vigo stadium' },
  { key: 'mallorca',          query: 'Son Moix stadium Mallorca football' },
  { key: 'rayo-vallecano',    query: 'Estadio Vallecas Madrid football' },
  { key: 'getafe',            query: 'Coliseum Alfonso Perez Getafe stadium' },
  { key: 'alaves',            query: 'Mendizorrotza stadium Vitoria-Gasteiz' },
  { key: 'las-palmas',        query: 'Estadio Gran Canaria Las Palmas football' },
  { key: 'valencia',          query: 'Mestalla stadium Valencia Spain' },
  { key: 'espanyol',          query: 'RCDE Stadium Espanyol Barcelona' },
  { key: 'leganes',           query: 'Estadio Butarque Leganes Madrid' },
  { key: 'real-valladolid',   query: 'Estadio Zorrilla Valladolid Spain' },
  // Serie A
  { key: 'inter-milan',       query: 'Giuseppe Meazza San Siro stadium Milan' },
  { key: 'ac-milan',          query: 'San Siro stadium AC Milan Italy' },
  { key: 'juventus',          query: 'Allianz Stadium Juventus Turin' },
  { key: 'napoli',            query: 'Stadio Maradona Napoli Naples stadium' },
  { key: 'roma',              query: 'Stadio Olimpico Roma football' },
  { key: 'lazio',             query: 'Stadio Olimpico Lazio Rome football' },
  { key: 'atalanta',          query: 'Gewiss Stadium Atalanta Bergamo' },
  { key: 'fiorentina',        query: 'Stadio Franchi Fiorentina Florence' },
  { key: 'bologna',           query: 'Stadio Dall Ara Bologna football' },
  { key: 'torino',            query: 'Stadio Olimpico Grande Torino football' },
  { key: 'monza',             query: 'U-Power Stadium Monza Italy football' },
  { key: 'genoa',             query: 'Stadio Luigi Ferraris Genoa football' },
  { key: 'cagliari',          query: 'Unipol Domus Cagliari Sardinia football' },
  { key: 'udinese',           query: 'Bluenergy Stadium Udinese football' },
  { key: 'empoli',            query: 'Stadio Castellani Empoli Italy football' },
  { key: 'parma',             query: 'Stadio Tardini Parma Italy football' },
  { key: 'hellas-verona',     query: 'Stadio Bentegodi Verona Italy football' },
  { key: 'como',              query: 'Stadio Sinigaglia Como lake Italy' },
  { key: 'lecce',             query: 'Stadio Via del Mare Lecce Italy football' },
  { key: 'venezia',           query: 'Stadio Penzo Venice Italy football' },
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
  'leeds-united':                'Leeds city UK',
  'sunderland':                  'Sunderland city UK',
  'sheffield-united':            'Sheffield city UK',
  'brentford':                   'London west skyline Thames',
  'crystal-palace':              'London south Croydon skyline',
  'nottingham-forest':           'Nottingham city River Trent',
  'burnley':                     'Burnley Lancashire town',
  'wolverhampton-wanderers':     'Wolverhampton city West Midlands',
  'afc-bournemouth':             'Bournemouth beach seafront Dorset',
  // La Liga
  'real-madrid':       'Madrid city Spain',
  'barcelona':         'Barcelona city Spain',
  'atletico-madrid':   'Madrid city Spain',
  'athletic-bilbao':   'Bilbao city Spain',
  'real-sociedad':     'San Sebastian city Spain',
  'real-betis':        'Seville city Spain',
  'sevilla':           'Seville city Spain',
  'villarreal':        'Villarreal city Spain',
  'girona':            'Girona city Spain',
  'osasuna':           'Pamplona city Spain',
  'celta-vigo':        'Vigo city Spain',
  'mallorca':          'Palma Mallorca city',
  'rayo-vallecano':    'Madrid city Spain',
  'getafe':            'Getafe city Spain',
  'alaves':            'Vitoria-Gasteiz city Spain',
  'las-palmas':        'Las Palmas Gran Canaria city',
  'valencia':          'Valencia city Spain',
  'espanyol':          'Barcelona city Spain',
  'leganes':           'Leganés city Spain',
  'real-valladolid':   'Valladolid city Spain',
  // Serie A
  'inter-milan':       'Milan city Italy',
  'ac-milan':          'Milan city Italy',
  'juventus':          'Turin city Italy',
  'napoli':            'Naples city Italy',
  'roma':              'Rome city Italy',
  'lazio':             'Rome city Italy',
  'atalanta':          'Bergamo city Italy',
  'fiorentina':        'Florence city Italy',
  'bologna':           'Bologna city Italy',
  'torino':            'Turin city Italy',
  'monza':             'Monza city Italy',
  'genoa':             'Genoa city Italy',
  'cagliari':          'Cagliari Sardinia Italy',
  'udinese':           'Udine city Italy',
  'empoli':            'Empoli city Italy',
  'parma':             'Parma city Italy',
  'hellas-verona':     'Verona city Italy',
  'como':              'Como lake city Italy',
  'lecce':             'Lecce city Italy',
  'venezia':           'Venice city Italy',
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

/** Fetches up to 3 photos for a city and returns entries keyed as `${key}-life-1/2/3`. */
async function fetchCityTriple({ key, query }) {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`;
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

  // Fetch city images (3 per city for the match page lifestyle grid;
  // the first result is also stored under the plain city slug as the city guide hero image)
  console.log(`\nFetching Unsplash images for ${CITIES.length} cities…`);
  for (const city of CITIES) {
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
