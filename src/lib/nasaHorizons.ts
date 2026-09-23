import { Vec3 } from './orbitalMechanics';

export interface NasaHorizonsTelemetry {
  target: string;
  date: string;
  positionAU: Vec3;
  velocityKmS: number;
  lightTimeSeconds: number;
  rangeKm: number;
  rangeAU: number;
  source: string;
}

const cache = new Map<string, NasaHorizonsTelemetry>();

export async function fetchNasaHorizonsTelemetry(target: string, date: Date): Promise<NasaHorizonsTelemetry> {
  const dateStr = date.toISOString().slice(0, 10);
  const cacheKey = `${target}@${dateStr}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const url = `/api/nasa/horizons?target=${encodeURIComponent(target)}&date=${encodeURIComponent(dateStr)}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `NASA JPL request failed for ${target}`);
  }

  cache.set(cacheKey, data);
  return data as NasaHorizonsTelemetry;
}
