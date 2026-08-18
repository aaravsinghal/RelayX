'use client';

import Link from 'next/link';
import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';
import { useSimStore, effectivePosition, pointToEndpointSpec } from '@/store/useSimStore';
import { PLANETS, AU_KM } from '@/lib/planetData';
import { centuriesSinceJ2000, planetPositionAtDate, vecLength, vecSub } from '@/lib/orbitalMechanics';
import { checkSpecClearOverYear, lightDelaySeconds } from '@/lib/relayAlgorithm';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-lg font-semibold text-white/90">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-white/70">{children}</div>
    </section>
  );
}

export default function CalculationsPage() {
  const date = useSimStore((s) => s.date);
  const pointA = useSimStore((s) => s.pointA);
  const pointB = useSimStore((s) => s.pointB);
  const solution = useSimStore((s) => s.solution);
  const T = centuriesSinceJ2000(date);

  const a = effectivePosition(pointA, date);
  const b = effectivePosition(pointB, date);
  const directDist = vecLength(vecSub(b, a));
  const directCheck = checkSpecClearOverYear(pointToEndpointSpec(pointA), pointToEndpointSpec(pointB), date);

  return (
    <main className="min-h-dvh bg-[#05050a] px-6 py-10 text-white/90">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="text-sm text-sky-400 hover:text-sky-300">
            ← back to the model
          </Link>
          <span className="text-xs text-white/40">
            Evaluated at T = {T.toFixed(6)} Julian centuries since J2000.0
          </span>
        </div>

        <h1 className="mb-2 text-2xl font-bold">The Math Behind the Relay Planner</h1>
        <p className="mb-10 text-sm text-white/50">
          Every position shown in the 3D model and every relay recommendation is computed from
          the equations below — nothing is hard-coded or simulated visually only.
        </p>

        <Section title="1. Heliocentric position from Keplerian elements">
          <p>
            Each planet&apos;s position is derived from its six classical orbital elements at the
            J2000.0 epoch (semi-major axis <InlineMath math="a" />, eccentricity{' '}
            <InlineMath math="e" />, inclination <InlineMath math="i" />, mean longitude{' '}
            <InlineMath math="L" />, longitude of perihelion <InlineMath math="\varpi" />, and
            longitude of ascending node <InlineMath math="\Omega" />), each with a linear rate per
            Julian century <InlineMath math="T" /> (Standish 1992 / JPL low-precision elements,
            valid 1800–2050 AD):
          </p>
          <BlockMath math="a(T) = a_0 + \dot a\,T,\quad e(T) = e_0 + \dot e\,T,\quad \dots" />
          <p>
            The mean anomaly and argument of perihelion follow from these:
          </p>
          <BlockMath math="M = L - \varpi, \qquad \omega = \varpi - \Omega" />
          <p>
            Kepler&apos;s equation relates mean anomaly to eccentric anomaly <InlineMath math="E" />{' '}
            and is transcendental, solved here by Newton–Raphson iteration to 10⁻¹² rad precision:
          </p>
          <BlockMath math="M = E - e\sin E \quad\Longrightarrow\quad E_{n+1} = E_n - \frac{E_n - e\sin E_n - M}{1 - e\cos E_n}" />
          <p>Position in the orbital plane, then rotated into ecliptic coordinates:</p>
          <BlockMath math="x' = a(\cos E - e), \qquad y' = a\sqrt{1-e^2}\sin E" />
          <BlockMath math="\begin{pmatrix}x\\y\\z\end{pmatrix} = R_z(\Omega)\,R_x(i)\,R_z(\omega)\begin{pmatrix}x'\\y'\\0\end{pmatrix}" />
          <p className="text-white/50">
            This is exactly the transform implemented in{' '}
            <code className="text-white/70">heliocentricPosition()</code> in{' '}
            <code className="text-white/70">src/lib/orbitalMechanics.ts</code>, and it is what
            drives every planet&apos;s position in the live 3D scene as you move the timeline.
          </p>
        </Section>

        <Section title="2. Stable relay points — the Lagrange points L4 and L5">
          <p>
            In the circular restricted three-body problem (Sun + planet + negligible-mass relay),
            five equilibrium points exist. <InlineMath math="L_4" /> and <InlineMath math="L_5" />{' '}
            sit at the apex of an equilateral triangle with the Sun and the planet, leading or
            trailing the planet by 60° along its orbit:
          </p>
          <BlockMath math="\vec r_{L4} = \mathrm{Rot}_{\hat n}(+60^\circ)\,\vec r_{planet}, \qquad \vec r_{L5} = \mathrm{Rot}_{\hat n}(-60^\circ)\,\vec r_{planet}" />
          <p>
            where <InlineMath math="\hat n" /> is the unit orbital-angular-momentum vector of the
            planet (found numerically via <InlineMath math="\vec r \times \vec v" />) and the
            rotation uses Rodrigues&apos; formula:
          </p>
          <BlockMath math="\vec v_{rot} = \vec v\cos\theta + (\hat n \times \vec v)\sin\theta + \hat n(\hat n \cdot \vec v)(1-\cos\theta)" />
          <p>
            These points are linearly stable for any Sun–planet mass ratio below{' '}
            <InlineMath math="\mu_{crit} \approx 0.0385" /> — true for every planet in the solar
            system. A relay satellite parked there needs essentially no propellant for
            station-keeping, which is the &quot;no intervention&quot; requirement.
          </p>
        </Section>

        <Section title="2b. Endpoints: named orbits, L1/L2, and AI-identified trajectories">
          <p>
            An endpoint doesn&apos;t have to be a raw coordinate or a planet. Typing an orbit name
            into a Communication Endpoint box resolves it to a real position, live-tracked exactly
            like a planet attachment:
          </p>
          <p>
            <strong className="text-white/80">Named planet orbits</strong> (Low Mars Orbit,
            Geostationary Orbit, ...) resolve to the planet&apos;s own position — at interplanetary
            scale, a few hundred to tens of thousands of km of altitude is negligible next to AU-scale
            distances, so the endpoint is physically indistinguishable from the planet itself for
            line-of-sight purposes. The altitude is kept only for display.
          </p>
          <p>
            <strong className="text-white/80">Moons</strong> (the Moon, the Galilean moons,
            Titan, Triton, and other major named moons — snap-able the same way as planets) are
            positioned as <InlineMath math="\vec r_{moon} = \vec r_{planet} + \vec r_{moon/planet}" />
            , where the planet-relative term uses the same Kepler solver as everything else, given
            each moon&apos;s real semi-major axis, eccentricity, inclination, and orbital period.
            Because a real moon&apos;s orbital radius (thousands to a few million km) is just as
            invisible at AU scale as a planet&apos;s own radius, the 3D scene renders each moon at
            an exaggerated distance from its planet — the correct real-time <em>direction</em>
            (so it visibly orbits at the right relative angle and speed) but a fictional radius for
            legibility, exactly like planet body sizes around the Sun. The true, un-exaggerated
            position is always what&apos;s used for distance, delay, and occlusion calculations.
          </p>
          <p>
            <strong className="text-white/80">
              L<sub>1</sub> and L<sub>2</sub>
            </strong>{' '}
            (unlike the stable L4/L5 above) are the collinear Sun-planet equilibrium points, located
            along the Sun-planet line at:
          </p>
          <BlockMath math="\vec r_{L1} = \left(1 - \alpha\right)\vec r_{planet}, \qquad \vec r_{L2} = \left(1 + \alpha\right)\vec r_{planet}, \qquad \alpha = \left(\frac{m_{planet}}{3M_{\odot}}\right)^{1/3}" />
          <p>
            These are <em>unstable</em> equilibria (real missions like SOHO and JWST need periodic
            station-keeping burns to stay near them) — the UI notes this explicitly rather than
            implying they share L4/L5&apos;s free-riding stability.
          </p>
          <p>
            <strong className="text-white/80">Anything else</strong> (a cycler trajectory like the
            Aldrin cycler, an asteroid-like path, ...) is looked up in a small built-in table of
            well-known orbits first — no API call needed. If it&apos;s not there, the description is
            sent to Gemini with a prompt constraining it to return only real orbital parameters
            (semi-major axis, eccentricity, inclination) as strict JSON; those parameters are fed
            into the exact same Kepler propagator (§1) used for the planets, so the object&apos;s
            motion is real Keplerian motion, not a scripted animation. Since only the orbit&apos;s
            shape is known/estimated (not its exact phase on a given date), it&apos;s built as a
            static, non-precessing ellipse — labeled &quot;illustrative&quot; in the UI rather than
            presented as mission-grade ephemeris.
          </p>
        </Section>

        <Section title="3. Line-of-sight occlusion test">
          <p>
            For a candidate communication segment from <InlineMath math="\vec A" /> to{' '}
            <InlineMath math="\vec B" />, and a planet at position <InlineMath math="\vec P" />{' '}
            with physical radius <InlineMath math="R_p" />, we compute the closest point on the
            segment to the planet:
          </p>
          <BlockMath math="t = \mathrm{clamp}\left(\frac{(\vec P - \vec A)\cdot(\vec B - \vec A)}{|\vec B - \vec A|^2},\ 0,\ 1\right), \qquad \vec C = \vec A + t(\vec B - \vec A)" />
          <p>The link is blocked at this instant if:</p>
          <BlockMath math="|\vec P - \vec C| < R_p + R_{margin}, \qquad 0 < t < 1" />
          <p>
            where <InlineMath math="R_{margin}" /> is a 15,000&nbsp;km radio Fresnel-zone /
            grazing-atmosphere safety margin. We repeat this test for all 8 planets, sampled at 52
            points across a full year, to guarantee occlusion-free service for the entire
            orbital period — not just a single instant.
          </p>
          <p>
            <strong className="text-white/80">The Sun is a deliberate special case.</strong> Every
            body in the 3D scene is drawn far larger than true scale purely so it&apos;s visible at
            all (see <InlineMath math="\text{AU\_SCENE\_UNITS}" /> in{' '}
            <code className="text-white/70">src/lib/constants.ts</code>). For planets this never
            matters — they&apos;re small relative to their orbital spacing either way. The Sun is
            different: it sits at the one point every relay geometry pivots around, so its render
            size directly affects routing. Rather than pick between &quot;physically pure but
            visually clips the Sun&quot; and &quot;visually clean but detours absurdly far,&quot;
            the solver&apos;s Sun-exclusion radius is set to{' '}
            <InlineMath math="\max(R_{Sun} + R_{plasma},\ R_{Sun,\,rendered})" /> — whichever is
            larger. This has real physical backing, not just cosmetic convenience: NASA&apos;s Deep
            Space Network already avoids close solar approach during &quot;solar conjunction&quot;
            because coronal plasma scintillation degrades a radio link well before the photosphere
            would physically block it. That realistic plasma-avoidance margin happens to be sized
            to match the Sun&apos;s rendered radius here, so a recommended path is simultaneously
            physically sound <em>and</em> guaranteed to visibly clear the Sun on screen — without
            the earlier mistake of also inflating every planet&apos;s radius, which compounded
            needlessly and forced multi-hop detours to the outer solar system for no physical
            reason.
          </p>
        </Section>

        <Section title="4. Relay path search">
          <p>
            <strong className="text-white/80">Endpoints move too, not just obstacles.</strong> If
            A or B is snapped to a planet, it isn&apos;t frozen at today&apos;s position for the
            year-long scan below — it&apos;s re-evaluated from the same orbital model at every
            sample date, exactly like the obstacles it&apos;s being checked against. This matters
            enormously for a fast planet: Mercury completes over four full orbits in a year, so a
            Mercury endpoint sweeps through every possible angle relative to the Sun and every
            other planet — freezing it at one snapshot would silently miss (or wrongly invent)
            entire conjunction events that a real, continuously-orbiting spacecraft at Mercury
            would actually experience. A relay candidate&apos;s <InlineMath math="L_4/L_5" />{' '}
            position is treated the same way, since it co-orbits with its parent planet rather
            than sitting still.
          </p>
          <p>
            With that in place, the solver scans the direct segment <InlineMath math="A \to B" />{' '}
            day-by-day across a full year and groups consecutive blocked days into contiguous{' '}
            <em>occlusion windows</em> — e.g. a week-long solar conjunction, or a brief planetary
            transit. Three cases follow:
          </p>
          <p>
            <strong className="text-white/80">No occlusion windows:</strong> the direct link is
            used as-is, all year.
          </p>
          <p>
            <strong className="text-white/80">
              Windows cover most of the year (&ge;85%):
            </strong>{' '}
            treated as effectively permanent — the solver searches for a relay that keeps every
            hop clear for the <em>entire</em> year, evaluating every candidate{' '}
            <InlineMath math="L_4/L_5" /> point (16 candidates across the 8 planets) and picking
            the one minimizing total path length:
          </p>
          <BlockMath math="\min_R\; |R - A| + |B - R|" />
          <p>
            falling back to two-relay chains <InlineMath math="A \to R_1 \to R_2 \to B" /> over
            all candidate pairs if no single relay keeps every hop clear year-round.
          </p>
          <p>
            <strong className="text-white/80">
              Windows are brief relative to the year (&lt;85%):
            </strong>{' '}
            this is the common case for real solar-conjunction-style blackouts. Rather than force
            a relay to run permanently, the solver keeps the <em>direct link as primary</em> and
            searches for a relay that only needs to stay clear <em>during each specific
            window</em> (padded by 12 hours on each side as a safety margin) — the same{' '}
            <InlineMath math="\min_R\; |R - A| + |B - R|" /> search, just scoped to a much
            shorter, cheaper-to-satisfy date range. This mirrors how real deep-space missions
            operate: e.g. Mars missions switch off direct-to-Earth communication only during
            actual solar conjunction, not year-round. The 3D view and results panel show the
            direct link in blue (used most of the year) and each temporary relay window in
            violet, with its exact date range called out in bold.
          </p>
        </Section>

        <Section title="5. Signal propagation delay">
          <p>Given the total path length in AU, the one-way light-time delay is:</p>
          <BlockMath math="\Delta t = \frac{L_{AU}\times 1.495978707\times10^{8}\ \mathrm{km/AU}}{c},\qquad c = 299{,}792.458\ \mathrm{km/s}" />
        </Section>

        <Section title="Live values for the current session">
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 text-white/50">
                <tr>
                  <th className="px-3 py-2">Planet</th>
                  <th className="px-3 py-2">a (AU)</th>
                  <th className="px-3 py-2">e</th>
                  <th className="px-3 py-2">i (°)</th>
                  <th className="px-3 py-2">Heliocentric r (AU)</th>
                </tr>
              </thead>
              <tbody>
                {PLANETS.map((p) => {
                  const pos = planetPositionAtDate(p.elements, date);
                  return (
                    <tr key={p.name} className="border-t border-white/5">
                      <td className="px-3 py-1.5">{p.name}</td>
                      <td className="px-3 py-1.5">{(p.elements.a + p.elements.aDot * T).toFixed(4)}</td>
                      <td className="px-3 py-1.5">{(p.elements.e + p.elements.eDot * T).toFixed(4)}</td>
                      <td className="px-3 py-1.5">{(p.elements.i + p.elements.iDot * T).toFixed(3)}</td>
                      <td className="px-3 py-1.5">{vecLength(pos).toFixed(4)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-xs">
            <p className="mb-1 text-white/50">Current endpoints A → B, direct segment:</p>
            <p>
              Distance: {directDist.toFixed(4)} AU ({(directDist * AU_KM).toLocaleString()} km) —
              one-way delay {lightDelaySeconds(directDist).toFixed(2)} s
            </p>
            <p className="mt-1">
              Year-round clear line of sight:{' '}
              <span className={directCheck.clear ? 'text-emerald-400' : 'text-rose-400'}>
                {directCheck.clear ? 'yes' : `no — worst margin ${(directCheck.worstMarginAU * AU_KM).toFixed(0)} km`}
              </span>
            </p>
            {solution && (
              <p className="mt-2 text-white/50">
                Current solved relay path: <span className="text-white/80">{solution.type}</span>,
                total length {solution.totalPathLengthAU.toFixed(4)} AU, delay{' '}
                {lightDelaySeconds(solution.totalPathLengthAU).toFixed(2)} s.
              </p>
            )}
          </div>
        </Section>
      </div>
    </main>
  );
}
