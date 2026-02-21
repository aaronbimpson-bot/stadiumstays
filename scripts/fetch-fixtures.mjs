/**
 * Fetches Premier League fixtures for the remainder of the current season
 * from the ESPN unofficial API (no API key required).
 * Saves to src/data/fixtures.json
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dirname, '../src/data/fixtures.json');

// Map ESPN team display names → our club slugs
const TEAM_SLUG_MAP = {
  'Arsenal': 'arsenal',
  'Chelsea': 'chelsea',
  'Liverpool': 'liverpool',
  'Manchester City': 'manchester-city',
  'Manchester United': 'manchester-united',
  'Tottenham Hotspur': 'tottenham-hotspur',
  'Newcastle United': 'newcastle-united',
  'Aston Villa': 'aston-villa',
  'West Ham United': 'west-ham-united',
  'Brighton & Hove Albion': 'brighton',
  'Everton': 'everton',
  'Fulham': 'fulham',
};

function todayDate() {
  return new Date().toISOString().substring(0, 10).replace(/-/g, '');
}

function fetchJson(url) {
  const raw = execSync(`curl -s "${url}"`, { maxBuffer: 10 * 1024 * 1024 });
  return JSON.parse(raw.toString());
}

function fetchFixtures() {
  const from = todayDate();
  const to = '20260531';

  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=${from}-${to}`;
  console.log(`Fetching PL fixtures from ESPN: ${url}`);

  const data = fetchJson(url);
  const events = data.events || [];
  console.log(`Got ${events.length} fixtures`);

  const fixtures = events.map((event) => {
    const comp = event.competitions[0];
    const home = comp.competitors.find((c) => c.homeAway === 'home');
    const away = comp.competitors.find((c) => c.homeAway === 'away');
    const status = comp.status.type;

    const homeTeam = home?.team?.displayName ?? '';
    const awayTeam = away?.team?.displayName ?? '';

    return {
      id: event.id,
      date: event.date,                        // ISO 8601, e.g. "2026-02-22T15:00Z"
      homeTeam,
      awayTeam,
      homeSlug: TEAM_SLUG_MAP[homeTeam] ?? null,
      awaySlug: TEAM_SLUG_MAP[awayTeam] ?? null,
      homeScore: status.completed ? (home?.score ?? null) : null,
      awayScore: status.completed ? (away?.score ?? null) : null,
      status: status.name,                     // STATUS_SCHEDULED | STATUS_IN_PROGRESS | STATUS_FINAL
      venue: comp.venue?.fullName ?? null,
      venueCity: comp.venue?.address?.city ?? null,
    };
  });

  fixtures.sort((a, b) => a.date.localeCompare(b.date));

  writeFileSync(OUT_FILE, JSON.stringify(fixtures, null, 2));
  console.log(`Saved ${fixtures.length} fixtures to ${OUT_FILE}`);
}

try {
  fetchFixtures();
} catch (err) {
  console.error('Failed to fetch fixtures:', err.message);
  process.exit(1);
}
