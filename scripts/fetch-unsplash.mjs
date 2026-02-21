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
  'leeds-united':      'Leeds city UK',
  'sunderland':        'Sunderland city UK',
  'sheffield-united':  'Sheffield city UK',
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
  { key: 'las-palmas',    query: 'Las Palmas Gran Canaria city' },
  { key: 'valencia',      query: 'Valencia city Spain' },
  { key: 'valladolid',    query: 'Valladolid city Spain' },
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
  { key: 'monza',         query: 'Monza city Italy' },
  { key: 'lecce',         query: 'Lecce city Italy' },
  { key: 'venice',        query: 'Venice city Italy' },
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
