import { PLANETS } from './planetData';
import { EndpointSpec } from './relayAlgorithm';

export interface ResolvedOrbit {
  description: string;
  source: 'builtin' | 'ai';
  spec: EndpointSpec;
  altitudeKm?: number;
  notes?: string;
}

interface BuiltinOrbit {
  description: string;
  spec: EndpointSpec;
  altitudeKm?: number;
  notes?: string;
}

const VALID_PLANETS = new Set(PLANETS.map((p) => p.name));

/**
 * Common, well-known orbits resolve instantly with real physics and no API
 * call/key required -- only genuinely unusual or free-text descriptions
 * ("S1L1 cycler", "Molniya-type orbit around Jupiter", ...) fall back to
 * asking Gemini. Every alias here maps to the same canonical entry.
 */
const BUILTIN_ORBITS: Record<string, BuiltinOrbit> = {
  'low earth orbit': { description: 'Low Earth Orbit (~400 km altitude)', spec: { kind: 'planet', planetName: 'Earth' }, altitudeKm: 400 },
  leo: { description: 'Low Earth Orbit (~400 km altitude)', spec: { kind: 'planet', planetName: 'Earth' }, altitudeKm: 400 },
  'geostationary orbit': { description: 'Geostationary Earth Orbit (~35,786 km altitude)', spec: { kind: 'planet', planetName: 'Earth' }, altitudeKm: 35786 },
  geo: { description: 'Geostationary Earth Orbit (~35,786 km altitude)', spec: { kind: 'planet', planetName: 'Earth' }, altitudeKm: 35786 },
  'high earth orbit': { description: 'High Earth Orbit (~35,786 km altitude)', spec: { kind: 'planet', planetName: 'Earth' }, altitudeKm: 35786 },
  'earth orbit': { description: 'Earth Orbit', spec: { kind: 'planet', planetName: 'Earth' } },
  'low mars orbit': { description: 'Low Mars Orbit (~400 km altitude)', spec: { kind: 'planet', planetName: 'Mars' }, altitudeKm: 400 },
  lmo: { description: 'Low Mars Orbit (~400 km altitude)', spec: { kind: 'planet', planetName: 'Mars' }, altitudeKm: 400 },
  'high mars orbit': { description: 'High Mars Orbit (~20,000 km altitude)', spec: { kind: 'planet', planetName: 'Mars' }, altitudeKm: 20000 },
  hmo: { description: 'High Mars Orbit (~20,000 km altitude)', spec: { kind: 'planet', planetName: 'Mars' }, altitudeKm: 20000 },
  'areostationary orbit': { description: 'Areostationary Orbit (~17,032 km altitude)', spec: { kind: 'planet', planetName: 'Mars' }, altitudeKm: 17032 },
  'mars orbit': { description: 'Mars Orbit', spec: { kind: 'planet', planetName: 'Mars' } },
  'low venus orbit': { description: 'Low Venus Orbit (~250 km altitude)', spec: { kind: 'planet', planetName: 'Venus' }, altitudeKm: 250 },
  'low jupiter orbit': { description: 'Low Jupiter Orbit (~5,000 km altitude, deep in the radiation belts)', spec: { kind: 'planet', planetName: 'Jupiter' }, altitudeKm: 5000 },

  'earth-sun l1': { description: 'Earth-Sun L1', spec: { kind: 'lagrange', planetName: 'Earth', point: 'L1' }, notes: 'Unstable equilibrium -- requires active station-keeping, unlike L4/L5.' },
  'sun-earth l1': { description: 'Earth-Sun L1', spec: { kind: 'lagrange', planetName: 'Earth', point: 'L1' }, notes: 'Unstable equilibrium -- requires active station-keeping, unlike L4/L5.' },
  'earth-sun l2': { description: 'Earth-Sun L2', spec: { kind: 'lagrange', planetName: 'Earth', point: 'L2' }, notes: 'Unstable equilibrium -- requires active station-keeping, unlike L4/L5.' },
  'sun-earth l2': { description: 'Earth-Sun L2', spec: { kind: 'lagrange', planetName: 'Earth', point: 'L2' }, notes: 'Unstable equilibrium -- requires active station-keeping, unlike L4/L5.' },
  'earth-sun l4': { description: 'Earth-Sun L4', spec: { kind: 'lagrange', planetName: 'Earth', point: 'L4' } },
  'earth-sun l5': { description: 'Earth-Sun L5', spec: { kind: 'lagrange', planetName: 'Earth', point: 'L5' } },
  'mars-sun l1': { description: 'Mars-Sun L1', spec: { kind: 'lagrange', planetName: 'Mars', point: 'L1' }, notes: 'Unstable equilibrium -- requires active station-keeping, unlike L4/L5.' },
  'mars-sun l2': { description: 'Mars-Sun L2', spec: { kind: 'lagrange', planetName: 'Mars', point: 'L2' }, notes: 'Unstable equilibrium -- requires active station-keeping, unlike L4/L5.' },
  'mars-sun l4': { description: 'Mars-Sun L4', spec: { kind: 'lagrange', planetName: 'Mars', point: 'L4' } },
  'mars-sun l5': { description: 'Mars-Sun L5', spec: { kind: 'lagrange', planetName: 'Mars', point: 'L5' } },

  'aldrin cycler': {
    description: 'Aldrin Cycler (Earth-Mars transfer orbit)',
    spec: { kind: 'heliocentric', a: 1.28, e: 0.264, i: 0.5 },
    notes: 'Illustrative: real cycler phasing depends on launch epoch; shown here as a static ellipse with the correct shape and period.',
  },
  'buzz aldrin cycler': {
    description: 'Aldrin Cycler (Earth-Mars transfer orbit)',
    spec: { kind: 'heliocentric', a: 1.28, e: 0.264, i: 0.5 },
    notes: 'Illustrative: real cycler phasing depends on launch epoch; shown here as a static ellipse with the correct shape and period.',
  },
};

export function lookupBuiltinOrbit(query: string): ResolvedOrbit | null {
  const key = query.trim().toLowerCase().replace(/\s+/g, ' ');
  const hit = BUILTIN_ORBITS[key];
  return hit ? { ...hit, source: 'builtin' } : null;
}

interface AiOrbitResponse {
  recognized: boolean;
  description?: string;
  kind?: 'planet' | 'lagrange' | 'heliocentric';
  planetName?: string | null;
  point?: 'L1' | 'L2' | 'L4' | 'L5' | null;
  altitudeKm?: number | null;
  elements?: { a: number; e: number; i: number } | null;
  notes?: string;
}

export function buildOrbitLookupPrompt(query: string): string {
  return `You are an orbital-mechanics database for a solar-system visualization tool. Given a short description of a spacecraft orbit or trajectory, respond with ONLY a single raw JSON object -- no markdown code fences, no prose before or after -- in exactly this shape:

{
  "recognized": true,
  "description": "<short canonical name, e.g. 'Low Mars Orbit'>",
  "kind": "planet" | "lagrange" | "heliocentric",
  "planetName": "Mercury" | "Venus" | "Earth" | "Mars" | "Jupiter" | "Saturn" | "Uranus" | "Neptune" | null,
  "point": "L1" | "L2" | "L4" | "L5" | null,
  "altitudeKm": <number altitude above the planet's surface> | null,
  "elements": {"a": <semi-major axis in AU>, "e": <eccentricity, 0-1>, "i": <inclination in degrees>} | null,
  "notes": "<one short sentence, e.g. a caveat about the orbit's stability or realism>"
}

Rules:
- "planet" kind: an orbit close to a single named planet (any low/high/polar/named orbit). Set planetName and altitudeKm (km above that planet's surface, a real published or well-estimated value). Set point and elements to null.
- "lagrange" kind: one of the five Sun-planet Lagrange points. Set planetName and point. Set altitudeKm and elements to null.
- "heliocentric" kind: an independent heliocentric trajectory not tied to one planet (a cycler orbit, an asteroid-like path, a free transfer orbit). Set elements to real or well-estimated values (e.g. the Aldrin cycler: a≈1.28 AU, e≈0.264). Set planetName, point, and altitudeKm to null.
- If you cannot confidently identify the object as a real or plausible orbital location, respond with {"recognized": false, "notes": "<why, one sentence>"} and nothing else.
- Use accurate, real-world orbital parameters where they are known publicly. Do not invent implausible numbers.

Query: "${query.replace(/"/g, "'")}"`;
}

export function parseAiOrbitResponse(rawText: string, originalQuery: string): ResolvedOrbit | { error: string } {
  let jsonText = rawText.trim();
  const fenced = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) jsonText = fenced[1].trim();

  let parsed: AiOrbitResponse;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { error: `Gemini didn't return valid data for "${originalQuery}". Try rephrasing, or use a preset like "Low Mars Orbit".` };
  }

  if (!parsed.recognized) {
    return { error: parsed.notes || `Couldn't identify "${originalQuery}" as a real orbital location.` };
  }

  const description = parsed.description || originalQuery;
  const notes = parsed.notes;

  if (parsed.kind === 'planet') {
    if (!parsed.planetName || !VALID_PLANETS.has(parsed.planetName)) {
      return { error: `Gemini named an unrecognized planet for "${originalQuery}".` };
    }
    return {
      description,
      source: 'ai',
      spec: { kind: 'planet', planetName: parsed.planetName },
      altitudeKm: parsed.altitudeKm ?? undefined,
      notes,
    };
  }

  if (parsed.kind === 'lagrange') {
    if (!parsed.planetName || !VALID_PLANETS.has(parsed.planetName) || !parsed.point) {
      return { error: `Gemini's Lagrange-point answer for "${originalQuery}" was incomplete.` };
    }
    return {
      description,
      source: 'ai',
      spec: { kind: 'lagrange', planetName: parsed.planetName, point: parsed.point },
      notes,
    };
  }

  if (parsed.kind === 'heliocentric') {
    const el = parsed.elements;
    if (!el || !Number.isFinite(el.a) || el.a <= 0 || !Number.isFinite(el.e) || el.e < 0 || el.e >= 1 || !Number.isFinite(el.i)) {
      return { error: `Gemini's orbital elements for "${originalQuery}" were incomplete or implausible.` };
    }
    return {
      description,
      source: 'ai',
      spec: { kind: 'heliocentric', a: el.a, e: el.e, i: el.i },
      notes,
    };
  }

  return { error: `Unrecognized orbit kind for "${originalQuery}".` };
}
