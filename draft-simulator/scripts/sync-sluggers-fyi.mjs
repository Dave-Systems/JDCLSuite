// Refresh tests/fixtures/sluggers-fyi.json from https://www.sluggers.fyi/characters, a vanilla sanity check for the tests.
// The site ships its roster inside the JavaScript bundle, so this finds that array literal and
// converts it to JSON with a small tokenizer. Nothing from the site is executed.
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const site = 'https://www.sluggers.fyi';
const page = `${site}/characters`;
const output = new URL('../tests/fixtures/sluggers-fyi.json', import.meta.url);

async function text(url) {
  const response = await fetch(url, {headers: {'user-agent': 'jdcl-draft-room-sync'}});
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.text();
}

export function literalAt(source, start) {
  let depth = 0, quote = null;
  for (let i = start; i < source.length; i++) {
    const c = source[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '[' || c === '{') depth++;
    else if ((c === ']' || c === '}') && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('Unterminated roster literal.');
}

// Accepts the minified object-literal subset the bundle uses: bare keys, "strings", numbers, !0/!1.
export function toJson(literal) {
  let out = '';
  for (let i = 0; i < literal.length; i++) {
    const c = literal[i];
    if (c === '"') {
      let j = i + 1;
      while (j < literal.length && literal[j] !== '"') j += literal[j] === '\\' ? 2 : 1;
      if (j >= literal.length) throw new Error('Unterminated string in roster literal.');
      out += literal.slice(i, j + 1); i = j;
    } else if (c === '!' && (literal[i + 1] === '0' || literal[i + 1] === '1')) {
      out += literal[i + 1] === '0' ? 'true' : 'false'; i++;
    } else if (/[A-Za-z_$]/.test(c)) {
      let j = i;
      while (j < literal.length && /[\w$]/.test(literal[j])) j++;
      const word = literal.slice(i, j);
      if (literal[j] === ':') out += JSON.stringify(word);
      else if (['true', 'false', 'null'].includes(word)) out += word;
      else throw new Error(`Unexpected identifier "${word}" in roster literal.`);
      i = j - 1;
    } else if (c === '.' && /\d/.test(literal[i + 1]) && !/\d/.test(literal[i - 1])) out += '0.';
    else out += c;
  }
  return JSON.parse(out);
}

export async function sync() {
  const html = await text(page);
  const bundlePath = html.match(/<script[^>]+src="(\/assets\/[^"]+\.js)"/)?.[1];
  if (!bundlePath) throw new Error('Could not find the sluggers.fyi application bundle.');
  const bundle = await text(site + bundlePath);
  const start = bundle.indexOf('[{id:0,character:"Mario"');
  if (start < 0) throw new Error('Could not find the character roster in the sluggers.fyi bundle.');
  const raw = toJson(literalAt(bundle, start));

  const characters = raw.map(c => ({
    id: c.id,
    character: c.character,
    character_class: c.character_class,
    captain: c.captain,
    throwing_arm: c.throwing_arm,
    batting_stance: c.batting_stance,
    weight: c.weight,
    unknown: c.unknown,
    hitting_trajectory_sweet_spot: c.hitting_trajectory_sweet_spot,
    has_trajectory_curve: c.metadata?.has_trajectory_curve,
    slap_hit_contact_size: c.slap_hit_contact_size,
    charge_hit_contact_size: c.charge_hit_contact_size,
    slap_hit_power: c.slap_hit_power,
    charge_hit_power: c.charge_hit_power,
    bunting: c.bunting,
    speed: c.speed,
    throwing_speed: c.throwing_speed,
    fielding: c.fielding,
    curveball_speed: c.curveball_speed,
    fastball_speed: c.fastball_speed,
    curve: c.curve,
    unknown_goomba100: c.unknown_goomba100,
    stamina: c.stamina,
    captain_star_pitch: c.metadata?.captain_star_pitch ?? null,
    captain_star_swing: c.metadata?.captain_star_swing ?? null,
    star_pitch: c.metadata?.star_pitch ?? null,
    hitbox_width: c.hitbox_width,
    hitbox_height: c.hitbox_height,
    good_chemistry: c.good_chemistry,
    bad_chemistry: c.bad_chemistry,
  })).sort((a, b) => a.id - b.id);

  const data = {
    meta: {
      source: page,
      bundle: bundlePath,
      retrievedAt: new Date().toISOString().slice(0, 10),
      note: 'Vanilla reference values for the 71 playable characters (no Mii slots), copied as factual data from sluggers.fyi. Used only by tests to sanity-check the Stat Editor baseline; the app does not load it.',
    },
    characters,
  };
  await writeFile(output, JSON.stringify(data) + '\n');
  console.log(`Wrote ${characters.length} characters from ${site + bundlePath} to tests/fixtures/sluggers-fyi.json`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await sync();
