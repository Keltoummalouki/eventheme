import assert from "node:assert/strict";
import { test } from "node:test";
import { niceTicks, smoothPath } from "../src/lib/chart";

test("axis ticks are round numbers from zero, enough to hold the largest value", () => {
  assert.deepEqual(niceTicks(3), [0, 1, 2, 3]);
  assert.deepEqual(niceTicks(1), [0, 1]);
  assert.deepEqual(niceTicks(17), [0, 5, 10, 15, 20]);
  assert.deepEqual(niceTicks(40), [0, 10, 20, 30, 40]);
  assert.deepEqual(niceTicks(1234), [0, 500, 1000, 1500]);
  assert.deepEqual(niceTicks(0), [0, 1], "an empty series still has an axis");
  assert.deepEqual(niceTicks(Number.NaN), [0, 1]);
  assert.deepEqual(niceTicks(0.6, 3, false), [0, 0.2, 0.4, 0.6], "decimal steps when the values are not counts");
});

/** Ordonnées de tous les nombres du chemin (une paire x,y sur deux). */
const ordinates = (path: string) => (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number).filter((_, index) => index % 2 === 1);

test("the smoothed line goes through every point and never overshoots its neighbours", () => {
  assert.equal(smoothPath([]), "");
  assert.equal(smoothPath([{ x: 4, y: 8 }]), "M4,8");
  const points = [
    { x: 0, y: 100 },
    { x: 10, y: 100 },
    { x: 20, y: 0 },
    { x: 30, y: 100 },
    { x: 40, y: 60 },
    { x: 50, y: 60 },
  ];
  const path = smoothPath(points);
  assert.match(path, /^M0,100C/);
  for (const point of points) assert.ok(path.includes(`${point.x},${point.y}`), `passes through ${point.x},${point.y}`);
  // y = 100 is the baseline (zero) on screen: no control point may dip under it, nor above the peak.
  for (const y of ordinates(path)) assert.ok(y >= 0 && y <= 100, `control point at ${y} stays within the data range`);
  // A flat stretch stays flat.
  assert.ok(path.endsWith("C43.3,60 46.7,60 50,60"));
  // Two points share an abscissa: no division by zero.
  assert.doesNotMatch(smoothPath([{ x: 1, y: 1 }, { x: 1, y: 5 }]), /NaN|Infinity/);
});
