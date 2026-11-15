/* ==========================================================================
   Géométrie des graphiques — calcul pur

   Graduations « rondes » d'un axe et tracé lissé d'une série. Le lissage est
   monotone (Fritsch–Carlson) : la courbe passe par chaque point sans jamais
   dépasser ses voisins, donc sans creuser sous zéro ni inventer de pic.
   ========================================================================== */

/**
 * Graduations d'un axe partant de zéro : pas de 1, 2 ou 5 × 10ⁿ, au plus
 * `count` intervalles, et un pas entier pour des effectifs (`integer`).
 */
export function niceTicks(max: number, count = 4, integer = true): number[] {
  if (!(max > 0)) return [0, 1];
  const rough = max / count;
  const power = 10 ** Math.floor(Math.log10(rough));
  let step = [1, 2, 5, 10].map((factor) => factor * power).find((candidate) => candidate >= rough) ?? 10 * power;
  if (integer) step = Math.max(1, Math.ceil(step));
  const top = Math.ceil(max / step - 1e-9) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, index) => Number((index * step).toFixed(6)));
}

const round = (value: number) => Math.round(value * 10) / 10;

/** Chemin SVG lissé passant par chaque point, sans dépassement (spline monotone). */
export function smoothPath(points: readonly { x: number; y: number }[]): string {
  const n = points.length;
  if (!n) return "";
  const start = `M${round(points[0].x)},${round(points[0].y)}`;
  if (n === 1) return start;
  const slopes = points.slice(0, -1).map((point, index) => {
    const next = points[index + 1];
    return (next.y - point.y) / (next.x - point.x || 1);
  });
  const tangents = points.map((_, index) =>
    index === 0
      ? slopes[0]
      : index === n - 1
        ? slopes[n - 2]
        : slopes[index - 1] * slopes[index] <= 0
          ? 0
          : (slopes[index - 1] + slopes[index]) / 2,
  );
  slopes.forEach((slope, index) => {
    if (slope === 0) {
      tangents[index] = 0;
      tangents[index + 1] = 0;
      return;
    }
    const a = tangents[index] / slope;
    const b = tangents[index + 1] / slope;
    const length = a * a + b * b;
    if (length > 9) {
      const scale = 3 / Math.sqrt(length);
      tangents[index] = scale * a * slope;
      tangents[index + 1] = scale * b * slope;
    }
  });
  let path = start;
  for (let index = 0; index < n - 1; index += 1) {
    const from = points[index];
    const to = points[index + 1];
    const third = (to.x - from.x) / 3;
    path +=
      `C${round(from.x + third)},${round(from.y + tangents[index] * third)} ` +
      `${round(to.x - third)},${round(to.y - tangents[index + 1] * third)} ${round(to.x)},${round(to.y)}`;
  }
  return path;
}
