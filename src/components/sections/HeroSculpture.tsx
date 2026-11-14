'use client';

import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { onCurtainOpen } from '@/lib/intro';

export type HeroSceneState = {
  progress: number;
  scrollDriven: boolean;
  render?: () => void;
};

type HeroSculptureProps = {
  active: number;
  paused: boolean;
  scrollScene: RefObject<HeroSceneState>;
  onReady?: () => void;
  onSettled?: () => void;
};

/**
 * Pose of the rig: rotation, assembly (0 = parts apart, 1 = assembled) and
 * light (0 = fixtures off, 1 = beams on).
 */
type Pose = { x: number; y: number; z: number; assembly: number; light: number };

/** One pose per hero scene: Concevoir, Installer, Exploiter. */
const POSES: Pose[] = [
  { x: 0.16, y: -0.5, z: 0.02, assembly: 0.3, light: 0 },
  { x: 0.12, y: -0.18, z: 0, assembly: 0.8, light: 0.15 },
  { x: 0.1, y: 0.32, z: -0.02, assembly: 1, light: 1 },
];

const SCROLL_POSES: Pose[] = [
  { x: 0.16, y: -0.5, z: 0.02, assembly: 0.3, light: 0 },
  { x: 0.14, y: -0.3, z: 0.01, assembly: 0.62, light: 0 },
  { x: 0.12, y: -0.05, z: 0, assembly: 0.92, light: 0.25 },
  { x: 0.1, y: 0.25, z: -0.02, assembly: 1, light: 1 },
  { x: 0.1, y: 0.4, z: -0.02, assembly: 1, light: 1 },
];

const ENTRANCE_DURATION = 2600;

/** The rig rises into place; the browser composites this layer independently of WebGL. */
const ENTRANCE_KEYFRAMES: Keyframe[] = [
  { offset: 0, transform: 'translate3d(0, 7%, 0) scale(.94)', opacity: 0 },
  { offset: 0.25, opacity: 1 },
  { offset: 1, transform: 'none', opacity: 1 },
];

/** Aluminium stage truss, in scene units: 0.22 square section, square bays. */
const HALF = 0.11;
const CHORD = 0.017;
const LACING = 0.008;
const TOWER_X = 1.2;
const TOWER_HEIGHT = 2;
const BASE_Y = -1;
const FIXTURES = [-0.62, 0, 0.62];
/** Gold corner blocks are a little wider than the truss; the beam spans between them. */
const BLOCK_HALF = HALF + 0.015;
const BEAM_LENGTH = 2 * (TOWER_X - BLOCK_HALF);

const UP = new THREE.Vector3(0, 1, 0);

/** A tube between two points: one chord or one lacing brace. */
function strut(from: THREE.Vector3, to: THREE.Vector3, radius: number) {
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
 * (Warren) lacing on each face, as aluminium event truss is built.
 */
function boxTruss(length: number) {
  const corners = [[-HALF, -HALF], [HALF, -HALF], [HALF, HALF], [-HALF, HALF]] as const;
  const parts = corners.map(([x, z]) => strut(new THREE.Vector3(x, 0, z), new THREE.Vector3(x, length, z), CHORD));
  const bays = Math.max(1, Math.round(length / (2 * HALF)));
  const step = length / bays;
  corners.forEach(([ax, az], face) => {
    const [bx, bz] = corners[(face + 1) % corners.length];
    for (let bay = 0; bay < bays; bay += 1) {
      const [fromX, fromZ, toX, toZ] = bay % 2 === 0 ? [ax, az, bx, bz] : [bx, bz, ax, az];
      parts.push(strut(new THREE.Vector3(fromX, bay * step, fromZ), new THREE.Vector3(toX, (bay + 1) * step, toZ), LACING));
    }
  });
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  return merged;
}

/** An open light cone hanging from its apex, bright at the lens and fading to nothing. */
function beamGeometry(length: number, radius: number) {
  const geometry = new THREE.CylinderGeometry(0.035, radius, length, 32, 8, true);
  geometry.translate(0, -length / 2, 0);
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 4);
  const gold = new THREE.Color(0xd9be80);
  for (let index = 0; index < position.count; index += 1) {
    const fade = THREE.MathUtils.clamp(1 + position.getY(index) / length, 0, 1);
    colors.set([gold.r, gold.g, gold.b, fade ** 1.6], index * 4);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
  return geometry;
}

const blend = (from: Pose, to: Pose, amount: number): Pose => ({
  x: THREE.MathUtils.lerp(from.x, to.x, amount),
  y: THREE.MathUtils.lerp(from.y, to.y, amount),
  z: THREE.MathUtils.lerp(from.z, to.z, amount),
  assembly: THREE.MathUtils.lerp(from.assembly, to.assembly, amount),
  light: THREE.MathUtils.lerp(from.light, to.light, amount),
});

export default function HeroSculpture({ active, paused, scrollScene, onReady, onSettled }: HeroSculptureProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef({ active, paused, onReady, onSettled, scrollScene });
  const syncRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    inputRef.current = { active, paused, onReady, onSettled, scrollScene };
    syncRef.current?.();
  }, [active, paused, onReady, onSettled, scrollScene]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch {
      // The surrounding hero supplies an image beneath this transparent layer.
      inputRef.current.onSettled?.();
      return;
    }

    const canvas = renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, { display: 'block', width: '100%', height: '100%', opacity: '0' });
    mount.appendChild(canvas);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
    const rig = new THREE.Group();
    scene.add(rig);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    let environment: THREE.WebGLRenderTarget | undefined;
    try {
      environment = pmrem.fromScene(room, 0.035);
      scene.environment = environment.texture;
      scene.environmentIntensity = 0.85;
    } catch {
      // Direct studio lights also support the rig if PMREM is unavailable.
    }
    room.dispose();
    pmrem.dispose();

    // Brand palette: aluminium (argent), gold accents, deep black fixtures.
    const aluminium = new THREE.MeshStandardMaterial({ color: 0xc5c8ce, metalness: 0.92, roughness: 0.3 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 1, roughness: 0.24 });
    const black = new THREE.MeshStandardMaterial({ color: 0x131417, metalness: 0.6, roughness: 0.45 });
    const lens = new THREE.MeshBasicMaterial({ color: 0x2a2b2e });
    const light = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const lensOff = new THREE.Color(0x2a2b2e);
    const lensOn = new THREE.Color(0xfff1d0);

    const towerGeometry = boxTruss(TOWER_HEIGHT);
    const beamTruss = boxTruss(BEAM_LENGTH);
    const block = new THREE.BoxGeometry(2 * BLOCK_HALF, 2 * BLOCK_HALF, 2 * BLOCK_HALF);
    const plate = new THREE.BoxGeometry(0.42, 0.025, 0.42);
    const cone = beamGeometry(2.3, 0.42);

    // Towers stand on base plates; their pivot is the foot of the tower.
    const towers = [-1, 1].map((side) => {
      const tower = new THREE.Group();
      tower.add(new THREE.Mesh(towerGeometry, aluminium));
      const base = new THREE.Mesh(plate, black);
      base.position.y = -0.0125;
      tower.add(base);
      rig.add(tower);
      return { tower, side };
    });

    // The top: a horizontal beam between two gold corner blocks, carrying the fixtures.
    const top = new THREE.Group();
    const beam = new THREE.Mesh(beamTruss, aluminium);
    beam.rotation.z = -Math.PI / 2;
    beam.position.x = -BEAM_LENGTH / 2;
    top.add(beam);
    for (const side of [-1, 1]) {
      const corner = new THREE.Mesh(block, gold);
      corner.position.x = side * TOWER_X;
      top.add(corner);
    }
    const heads = FIXTURES.map((x, index) => {
      const fixture = new THREE.Group();
      fixture.position.set(x, -HALF - 0.02, 0);
      const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.05), black);
      yoke.position.y = -0.02;
      const head = new THREE.Group();
      head.position.y = -0.1;
      // Aimed down and toward the audience, fanning out across the stage.
      head.rotation.set(-0.42, 0, (index - 1) * 0.2);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.15, 20), black);
      const glass = new THREE.Mesh(new THREE.CircleGeometry(0.058, 24), lens);
      glass.rotation.x = Math.PI / 2;
      glass.position.y = -0.076;
      const ray = new THREE.Mesh(cone, light);
      ray.position.y = -0.08;
      head.add(body, glass, ray);
      fixture.add(yoke, head);
      top.add(fixture);
      return fixture;
    });
    rig.add(top);

    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(-3, 5, 5);
    const rim = new THREE.DirectionalLight(0xffe2a8, 2.2);
    rim.position.set(4, 1, -2);
    const fill = new THREE.DirectionalLight(0xffffff, 0.9);
    fill.position.set(1, -3, 4);
    scene.add(key, rim, fill, new THREE.HemisphereLight(0xf2f3f5, 0x131417, 0.55));

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let visible = true;
    let contextLost = false;
    let disposed = false;
    let ready = false;
    let sized = false;
    let curtainIsOpen = false;
    let entrance: Animation | null = null;
    let entranceComplete = false;
    mount.style.opacity = '0';

    const entranceProgress = () =>
      entrance && !entranceComplete && typeof entrance.currentTime === 'number'
        ? THREE.MathUtils.clamp(entrance.currentTime / ENTRANCE_DURATION, 0, 1)
        : 1;

    const applyPose = () => {
      const progress = motionQuery.matches ? 0 : THREE.MathUtils.clamp(inputRef.current.scrollScene.current.progress, 0, 1);
      const driven = inputRef.current.scrollScene.current.scrollDriven && !motionQuery.matches;
      let pose = POSES[((inputRef.current.active % POSES.length) + POSES.length) % POSES.length];
      if (driven) {
        const segment = Math.min(SCROLL_POSES.length - 2, Math.floor(progress * (SCROLL_POSES.length - 1)));
        const amount = THREE.MathUtils.smoothstep(progress * (SCROLL_POSES.length - 1) - segment, 0, 1);
        pose = blend(SCROLL_POSES[segment], SCROLL_POSES[segment + 1], amount);
      }
      // The WAAPI clock drives the entrance, so the pause button freezes it too.
      const intro = entranceProgress();
      const assembly = pose.assembly * THREE.MathUtils.smoothstep(intro, 0, 0.85);
      const glow = pose.light * THREE.MathUtils.smoothstep(intro, 0.7, 1);
      const apart = 1 - assembly;

      rig.rotation.set(pose.x, pose.y + (1 - intro) * 0.55, pose.z);
      for (const { tower, side } of towers) {
        tower.position.set(side * (TOWER_X + 0.55 * apart), BASE_Y - 0.4 * apart, side * 0.22 * apart);
        tower.rotation.z = -side * 0.1 * apart;
      }
      top.position.set(0, BASE_Y + TOWER_HEIGHT + BLOCK_HALF + 0.6 * apart, 0.25 * apart);
      top.rotation.z = -0.07 * apart;
      heads.forEach((fixture, index) => {
        fixture.position.y = -HALF - 0.02 - (0.12 + index * 0.05) * apart;
      });
      light.opacity = 0.42 * glow;
      lens.color.lerpColors(lensOff, lensOn, glow);
    };

    const render = () => {
      if (disposed || contextLost || !sized) return;
      try {
        renderer.render(scene, camera);
        if (!ready) {
          mount.dataset.webglReady = 'true';
          ready = true;
          canvas.style.opacity = '1';
          inputRef.current.onReady?.();
        }
      } catch {
        contextLost = true;
        mount.dataset.webglReady = 'false';
        canvas.style.opacity = '0';
        entrance?.pause();
      }
    };

    const canAnimate = () => !disposed && !contextLost && visible && !document.hidden && !motionQuery.matches && !inputRef.current.paused;
    const settle = () => {
      if (disposed) return;
      const alreadySettled = entranceComplete;
      entranceComplete = true;
      const completed = entrance;
      entrance = null;
      completed?.cancel();
      window.cancelAnimationFrame(frame);
      frame = 0;
      mount.style.opacity = '1';
      mount.style.transform = 'none';
      mount.style.willChange = '';
      applyPose();
      if (visible && !document.hidden) render();
      if (!alreadySettled) inputRef.current.onSettled?.();
    };
    const tick = () => {
      frame = 0;
      if (!canAnimate() || !entrance || entranceComplete) return;
      applyPose();
      render();
      if (canAnimate() && entrance && !entranceComplete) frame = window.requestAnimationFrame(tick);
    };

    const sync = () => {
      if (disposed) return;
      window.cancelAnimationFrame(frame);
      frame = 0;
      if (motionQuery.matches) {
        settle();
        return;
      }
      // Dynamic import and the curtain can finish in either order. Wait for both.
      if (curtainIsOpen && ready && !entrance && !entranceComplete) {
        mount.style.willChange = 'transform, opacity';
        entrance = mount.animate(ENTRANCE_KEYFRAMES, {
          duration: ENTRANCE_DURATION,
          easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
          fill: 'both',
        });
        entrance.pause();
        entrance.currentTime = 0;
        entrance.onfinish = settle;
      }
      if (entrance && !entranceComplete) {
        if (canAnimate()) {
          entrance.play();
          frame = window.requestAnimationFrame(tick);
        } else {
          entrance.pause();
        }
      }
      if (visible && !document.hidden && !contextLost) {
        applyPose();
        render();
      }
    };
    syncRef.current = sync;
    // No idle render loop once assembled; deliberate scene changes still render.
    const sceneState = inputRef.current.scrollScene.current;
    sceneState.render = () => {
      if (disposed || !visible || document.hidden || contextLost) return;
      applyPose();
      render();
    };

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (width < 1 || height < 1) return;
      const mobile = window.matchMedia('(max-width: 767px)').matches;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5));
      renderer.setSize(width, height, false);
      sized = true;
      camera.aspect = width / height;
      // Fit the rig with its parts apart, light cones included, at any aspect ratio.
      camera.position.set(0, 0.1, Math.max(4.2, 4.6 / camera.aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))));
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      render();
      sync();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }, { threshold: 0 });
    // Observe the stationary landing area, not the rising element.
    intersectionObserver.observe(mount.parentElement ?? mount);
    const loseContext = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      mount.dataset.webglReady = 'false';
      canvas.style.opacity = '0';
      entrance?.pause();
      window.cancelAnimationFrame(frame);
      frame = 0;
    };
    const restoreContext = () => {
      contextLost = false;
      ready = false;
      canvas.style.opacity = '1';
      resize();
      sync();
    };
    document.addEventListener('visibilitychange', sync);
    motionQuery.addEventListener('change', sync);
    canvas.addEventListener('webglcontextlost', loseContext);
    canvas.addEventListener('webglcontextrestored', restoreContext);
    applyPose();
    resize();
    const unsubscribeCurtain = onCurtainOpen(() => {
      curtainIsOpen = true;
      sync();
    });
    sync();

    return () => {
      disposed = true;
      syncRef.current = null;
      delete sceneState.render;
      window.cancelAnimationFrame(frame);
      unsubscribeCurtain();
      entrance?.cancel();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', sync);
      motionQuery.removeEventListener('change', sync);
      canvas.removeEventListener('webglcontextlost', loseContext);
      canvas.removeEventListener('webglcontextrestored', restoreContext);
      const geometries = new Set<THREE.BufferGeometry>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) geometries.add(object.geometry);
      });
      geometries.forEach((geometry) => geometry.dispose());
      for (const material of [aluminium, gold, black, lens, light]) material.dispose();
      environment?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, []);

  return <div ref={mountRef} data-webgl-ready="false" aria-hidden="true" style={{ width: '100%', height: '100%', pointerEvents: 'none' }} />;
}
