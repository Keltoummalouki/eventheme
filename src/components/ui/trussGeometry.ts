import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Section of an aluminium box truss, in scene units: half the width of the
 * square section, and the radius of the chords and of the lacing braces.
 */
export type TrussSection = { half: number; chord: number; lacing: number };

const UP = new THREE.Vector3(0, 1, 0);

/** A tube between two points: one chord or one lacing brace. */
export function strut(from: THREE.Vector3, to: THREE.Vector3, radius: number) {
  const direction = new THREE.Vector3().subVectors(to, from);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 6, 1, true);
  geometry.translate(0, length / 2, 0);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, direction.normalize()));
  geometry.translate(from.x, from.y, from.z);
  return geometry;
}

/**
 * A square box truss along Y, from 0 to `length`: four chords and a zigzag
 * (Warren) lacing on each face, as aluminium event truss is built. Shared by
 * the hero rig and the stage of the back office dashboard.
 */
export function boxTruss(length: number, { half, chord, lacing }: TrussSection) {
  const corners = [[-half, -half], [half, -half], [half, half], [-half, half]] as const;
  const parts = corners.map(([x, z]) => strut(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, length, z), chord));
  const bays = Math.max(1, Math.round(length / (2 * half)));
  const step = length / bays;
  corners.forEach(([ax, az], face) => {
    const [bx, bz] = corners[(face + 1) % corners.length];
    for (let bay = 0; bay < bays; bay += 1) {
      const [fromX, fromZ, toX, toZ] = bay % 2 === 0 ? [ax, az, bx, bz] : [bx, bz, ax, az];
      parts.push(strut(new THREE.Vector3(fromX, bay * step, fromZ), new THREE.Vector3(toX, (bay + 1) * step, toZ), lacing));
    }
  });
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  return merged;
}

/** An open light cone hanging from its apex, bright at the lens and fading to nothing. */
export function beamGeometry(length: number, radius: number, color: THREE.ColorRepresentation = 0xd9be80) {
  const geometry = new THREE.CylinderGeometry(0.035, radius, length, 32, 8, true);
  geometry.translate(0, -length / 2, 0);
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 4);
  const tint = new THREE.Color(color);
  for (let index = 0; index < position.count; index += 1) {
    const fade = THREE.MathUtils.clamp(1 + position.getY(index) / length, 0, 1);
    colors.set([tint.r, tint.g, tint.b, fade ** 1.6], index * 4);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
  return geometry;
}
