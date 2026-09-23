import { NextRequest, NextResponse } from 'next/server';

// NASA JPL Horizons body code mapping
const JPL_BODY_CODES: Record<string, string> = {
  Sun: '10',
  Mercury: '199',
  Venus: '299',
  Earth: '399',
  Mars: '499',
  Jupiter: '599',
  Saturn: '699',
  Uranus: '799',
  Neptune: '899',
  Pluto: '999',
  JWST: '-170',
  'Voyager 1': '-31',
  'Voyager 2': '-32',
  Perseverance: '-168',
  ISS: '-125544',
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const target = searchParams.get('target') || 'Earth';
    const dateStr = searchParams.get('date') || new Date().toISOString().slice(0, 10);

    const bodyCode = JPL_BODY_CODES[target] || target;

    const startDate = new Date(dateStr);
    const stopDate = new Date(startDate.getTime() + 86400000);

    const formatISO = (d: Date) => d.toISOString().slice(0, 10);

    const params = new URLSearchParams({
      format: 'json',
      COMMAND: `'${bodyCode}'`,
      OBJ_DATA: "'NO'",
      MAKE_EPHEM: "'YES'",
      EPHEM_TYPE: "'VECTORS'",
      CENTER: "'@sun'", // Heliocentric origin
      START_TIME: `'${formatISO(startDate)}'`,
      STOP_TIME: `'${formatISO(stopDate)}'`,
      STEP_SIZE: "'1d'",
      REF_PLANE: "'ECLIPTIC'",
    });

    const jplUrl = `https://ssd.jpl.nasa.gov/api/horizons.api?${params.toString()}`;
    const res = await fetch(jplUrl, { next: { revalidate: 3600 } });

    if (!res.ok) {
      return NextResponse.json({ error: `NASA JPL Horizons API HTTP ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    const resultText: string = data.result || '';

    const soeIndex = resultText.indexOf('$$SOE');
    const eoeIndex = resultText.indexOf('$$EOE');

    if (soeIndex === -1 || eoeIndex === -1) {
      return NextResponse.json({ error: `JPL Horizons vector data unavailable for target "${target}".` }, { status: 404 });
    }

    const vectorBlock = resultText.slice(soeIndex + 5, eoeIndex);

    const xMatch = vectorBlock.match(/X\s*=\s*([+-]?\d+\.?\d*E[+-]?\d+)/i);
    const yMatch = vectorBlock.match(/Y\s*=\s*([+-]?\d+\.?\d*E[+-]?\d+)/i);
    const zMatch = vectorBlock.match(/Z\s*=\s*([+-]?\d+\.?\d*E[+-]?\d+)/i);
    const vxMatch = vectorBlock.match(/VX\s*=\s*([+-]?\d+\.?\d*E[+-]?\d+)/i);
    const vyMatch = vectorBlock.match(/VY\s*=\s*([+-]?\d+\.?\d*E[+-]?\d+)/i);
    const vzMatch = vectorBlock.match(/VZ\s*=\s*([+-]?\d+\.?\d*E[+-]?\d+)/i);
    const ltMatch = vectorBlock.match(/LT\s*=\s*([+-]?\d+\.?\d*E[+-]?\d+)/i);
    const rgMatch = vectorBlock.match(/RG\s*=\s*([+-]?\d+\.?\d*E[+-]?\d+)/i);

    if (!xMatch || !yMatch || !zMatch) {
      return NextResponse.json({ error: 'Could not parse vector coordinates from JPL response.' }, { status: 422 });
    }

    const xKm = parseFloat(xMatch[1]);
    const yKm = parseFloat(yMatch[1]);
    const zKm = parseFloat(zMatch[1]);
    const vx = vxMatch ? parseFloat(vxMatch[1]) : 0;
    const vy = vyMatch ? parseFloat(vyMatch[1]) : 0;
    const vz = vzMatch ? parseFloat(vzMatch[1]) : 0;
    const ltSec = ltMatch ? parseFloat(ltMatch[1]) : 0;
    const rangeKm = rgMatch ? parseFloat(rgMatch[1]) : Math.hypot(xKm, yKm, zKm);

    const AU_KM = 149597870.7;
    const positionAU = { x: xKm / AU_KM, y: yKm / AU_KM, z: zKm / AU_KM };
    const velocityKmS = Math.hypot(vx, vy, vz);

    return NextResponse.json({
      target,
      date: dateStr,
      positionAU,
      velocityKmS,
      lightTimeSeconds: ltSec,
      rangeKm,
      rangeAU: rangeKm / AU_KM,
      source: 'NASA/JPL Horizons REST API',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'NASA JPL fetch failed' }, { status: 500 });
  }
}
