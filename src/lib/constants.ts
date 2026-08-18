/** 1 astronomical unit, in Three.js scene units. Orbit distances are true to
 * scale relative to each other; planet body sizes are exaggerated (see
 * `visualRadius` in planetData.ts) so they remain visible -- a standard
 * convention in solar-system visualizations, since true-to-scale planet
 * radii (a few pixels at this distance) would be invisible. */
export const AU_SCENE_UNITS = 12;

/** Rendered Sun sphere radius, in scene units (see Sun.tsx). Purely
 * decorative -- NOT used for occlusion physics (see relayAlgorithm.ts),
 * which enforces the true physical radius + safety margin instead, so relay
 * paths stay short and efficient rather than detouring around a fictional
 * exclusion zone the size of a decorative sphere. */
export const SUN_VISUAL_RADIUS_SCENE = 1.8;

export function auToScene(v: number): number {
  return v * AU_SCENE_UNITS;
}

export function sceneToAu(v: number): number {
  return v / AU_SCENE_UNITS;
}
