'use client';

import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
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

const POSES = [
  { x: 0.12, y: -0.3, z: -0.15, fold: 0.18 },
  { x: -0.1, y: 0.36, z: 0.12, fold: 0.36 },
  { x: 0.23, y: -0.15, z: -0.06, fold: 0.06 },
];

const SCROLL_POSES = [
  { x: 0.12, y: -0.3, z: -0.15, fold: 0.18 },
  { x: -0.08, y: -0.12, z: -0.06, fold: 0.3 },
  { x: 0.16, y: 0.14, z: 0.08, fold: 0.22 },
  { x: 0.02, y: -0.05, z: -0.04, fold: 0.28 },
  { x: 0.12, y: -0.3, z: -0.15, fold: 0.18 },
];

const FLIGHT_DURATION = 3600;

/** Sample one continuous arc; the browser composites the flight independently of WebGL. */
function flightKeyframes(): Keyframe[] {
  return Array.from({ length: 61 }, (_, index) => {
    const progress = index / 60;
    const remaining = 1 - progress;
    const x = remaining ** 3 * 105 + 3 * remaining ** 2 * progress * 175 - 3 * remaining * progress ** 2 * 36;
    const y = remaining ** 3 * 130 - 3 * remaining ** 2 * progress * 75 - 3 * remaining * progress ** 2 * 55;
    const turn = remaining * 30 - Math.sin(progress * Math.PI) * 24;
    const scale = 0.92 + progress * 0.08;
    return {
      offset: progress,
      transform: `translate3d(${x}%, ${y}%, 0) rotate(${turn}deg) scale(${scale})`,
      opacity: Math.min(1, progress / 0.08),
    };
  });
}

/** A swept, openwork wing, modelled as separate pieces of curved gold ribbon. */
function wingContour(lower: boolean) {
  const path = new THREE.Shape();
  if (lower) {
    path.moveTo(0.055, -0.04);
    path.bezierCurveTo(0.58, 0.05, 1.65, 0.15, 1.72, -0.57);
    path.bezierCurveTo(1.79, -1.14, 1.26, -1.76, 0.77, -1.31);
    path.bezierCurveTo(0.28, -0.96, 0.16, -0.35, 0.055, -0.04);
  } else {
    path.moveTo(0.055, 0.065);
    path.bezierCurveTo(0.32, 0.72, 1.13, 1.98, 1.98, 1.84);
    path.bezierCurveTo(2.61, 1.73, 2.31, 0.94, 1.86, 0.58);
    path.bezierCurveTo(1.32, 0.15, 0.6, -0.04, 0.055, 0.065);
  }
  return path.getPoints(44);
}

function makeWing(
  material: THREE.MeshPhysicalMaterial,
) {
  const wing = new THREE.Group();
  for (const lower of [false, true]) {
    const contour = wingContour(lower);
    const scales = lower ? [1, 0.79, 0.59, 0.4] : [1, 0.83, 0.66, 0.49, 0.32];
    for (const [index, scale] of scales.entries()) {
      const innerScale = scale - (lower ? 0.095 : 0.08);
      // Connect corresponding contour points explicitly. A scaled hole can
      // cross a concave outline near the wing root; a swept quad strip keeps
      // every opening empty and gives each ribbon its own rounded thickness.
      const profile = [
        [0, -0.01], [0.13, -0.023], [0.87, -0.023], [1, -0.01],
        [1, 0.01], [0.87, 0.023], [0.13, 0.023], [0, 0.01],
      ];
      const vertices: number[] = [];
      const indices: number[] = [];
      for (let row = 0; row < contour.length; row += 1) {
        const point = contour[row];
        for (const [across, depth] of profile) {
          const radius = THREE.MathUtils.lerp(innerScale, scale, across);
          const x = point.x * radius;
          const y = point.y * radius;
          const sweep = 0.135 * x * x + Math.sin(y * 1.6) * 0.12 + index * 0.016;
          vertices.push(x, y, sweep + depth);
        }
        if (row === 0) continue;
        for (let column = 0; column < profile.length; column += 1) {
          const next = (column + 1) % profile.length;
          const a = (row - 1) * profile.length + column;
          const b = (row - 1) * profile.length + next;
          const c = row * profile.length + next;
          const d = row * profile.length + column;
          indices.push(a, b, d, b, c, d);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const ribbon = new THREE.Mesh(geometry, material);
      ribbon.userData = { layer: index, lower };
      wing.add(ribbon);
    }
  }
  return wing;
}

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
    renderer.toneMappingExposure = 1.08;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
    const sculpture = new THREE.Group();
    scene.add(sculpture);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    let environment: THREE.WebGLRenderTarget | undefined;
    try {
      environment = pmrem.fromScene(room, 0.035);
      scene.environment = environment.texture;
      scene.environmentIntensity = 0.9;
    } catch {
      // Direct studio lights also support the sculpture if PMREM is unavailable.
    }
    room.dispose();
    pmrem.dispose();

    const gold = new THREE.MeshPhysicalMaterial({
      color: 0xcdb285,
      metalness: 1,
      roughness: 0.22,
      clearcoat: 0.35,
      clearcoatRoughness: 0.2,
      side: THREE.DoubleSide,
    });
    const polishedGold = new THREE.MeshStandardMaterial({ color: 0xe3c999, metalness: 0.98, roughness: 0.19 });
    const darkGold = new THREE.MeshStandardMaterial({ color: 0x855321, metalness: 0.93, roughness: 0.3 });

    const rightWing = makeWing(gold);
    const leftWing = makeWing(gold);
    leftWing.scale.x = -1;
    sculpture.add(rightWing, leftWing);

    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 32), polishedGold);
    body.scale.set(0.09, 0.53, 0.11);
    body.position.set(0, -0.13, 0.12);
    sculpture.add(body);
    const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.115, 24, 24), gold);
    thorax.scale.set(0.85, 1.5, 1);
    thorax.position.set(0, 0.3, 0.13);
    sculpture.add(thorax);

    // A jeweller's fine collar and curved antennae finish the central silhouette.
    for (let i = 0; i < 7; i += 1) {
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.075 - i * 0.005, 0.012, 6, 20), darkGold);
      collar.rotation.x = Math.PI / 2;
      collar.position.set(0, -0.08 - i * 0.068, 0.12);
      sculpture.add(collar);
    }
    for (const direction of [-1, 1]) {
      const curve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(direction * 0.04, 0.38, 0.15),
        new THREE.Vector3(direction * 0.12, 0.77, 0.21),
        new THREE.Vector3(direction * 0.4, 1.02, 0.18),
        new THREE.Vector3(direction * 0.46, 0.93, 0.12),
      );
      sculpture.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.013, 6, false), polishedGold));
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 12), polishedGold);
      tip.position.copy(curve.getPoint(1));
      sculpture.add(tip);
    }

    const key = new THREE.DirectionalLight(0xfff4e4, 2.8);
    key.position.set(-3, 5, 5);
    const rim = new THREE.DirectionalLight(0xffdfab, 2.5);
    rim.position.set(4, 1, -2);
    const fill = new THREE.DirectionalLight(0xffffff, 1.1);
    fill.position.set(1, -3, 4);
    scene.add(key, rim, fill, new THREE.HemisphereLight(0xffe8c4, 0x302018, 0.6));

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let visible = true;
    let contextLost = false;
    let disposed = false;
    let ready = false;
    let sized = false;
    let curtainIsOpen = false;
    let flight: Animation | null = null;
    let flightComplete = false;
    mount.style.opacity = '0';

    const flightSeconds = () => typeof flight?.currentTime === 'number' ? flight.currentTime / 1000 : 0;
    const applyPose = () => {
      const progress = motionQuery.matches ? 0 : THREE.MathUtils.clamp(inputRef.current.scrollScene.current.progress, 0, 1);
      const driven = inputRef.current.scrollScene.current.scrollDriven && !motionQuery.matches;
      const pose = { ...POSES[((inputRef.current.active % POSES.length) + POSES.length) % POSES.length] };
      if (driven) {
        const segment = Math.min(3, Math.floor(progress * 4));
        const blend = THREE.MathUtils.smoothstep(progress * 4 - segment, 0, 1);
        for (const axis of ['x', 'y', 'z', 'fold'] as const) {
          pose[axis] = THREE.MathUtils.lerp(SCROLL_POSES[segment][axis], SCROLL_POSES[segment + 1][axis], blend);
        }
      }
      // The WAAPI clock keeps wingbeats and banking synchronized with every pause.
      const seconds = flightSeconds();
      const duration = FLIGHT_DURATION / 1000;
      const airborne = flight && !flightComplete && !motionQuery.matches;
      const envelope = airborne ? 1 - THREE.MathUtils.smoothstep(seconds / duration, 0.62, 1) : 0;
      const phase = Math.PI * 2 * (7 * seconds - 2.5 * seconds * seconds / duration);
      const wingbeat = envelope * (0.15 + (Math.sin(phase) + 1) * 0.43);
      sculpture.rotation.set(
        pose.x + Math.sin(seconds * 2.5) * envelope * 0.08,
        pose.y + Math.sin(seconds * 1.4) * envelope * 0.16,
        pose.z,
      );
      sculpture.position.y = -0.13;
      rightWing.rotation.y = -pose.fold - wingbeat;
      leftWing.rotation.y = pose.fold + wingbeat;
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
        flight?.pause();
      }
    };

    const canAnimate = () => !disposed && !contextLost && visible && !document.hidden && !motionQuery.matches && !inputRef.current.paused;
    const settle = () => {
      if (disposed) return;
      const alreadySettled = flightComplete;
      flightComplete = true;
      const completedFlight = flight;
      flight = null;
      completedFlight?.cancel();
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
      if (!canAnimate() || !flight || flightComplete) return;
      applyPose();
      render();
      if (canAnimate() && flight && !flightComplete) frame = window.requestAnimationFrame(tick);
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
      if (curtainIsOpen && ready && !flight && !flightComplete) {
        mount.style.willChange = 'transform, opacity';
        flight = mount.animate(flightKeyframes(), {
          duration: FLIGHT_DURATION,
          easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
          fill: 'both',
        });
        flight.pause();
        flight.currentTime = 0;
        flight.onfinish = settle;
      }
      if (flight && !flightComplete) {
        if (canAnimate()) {
          flight.play();
          frame = window.requestAnimationFrame(tick);
        } else {
          flight.pause();
        }
      }
      if (visible && !document.hidden && !contextLost) {
        applyPose();
        render();
      }
    };
    syncRef.current = sync;
    // No idle render loop after landing; deliberate scene changes still render.
    const sceneState = inputRef.current.scrollScene.current;
    sceneState.render = () => {
      if (disposed || !visible || document.hidden || contextLost) return;
      applyPose();
      render();
    };

    const resize = () => {
      // Layout dimensions stay stable while the composited flight rotates/scales.
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (width < 1 || height < 1) return;
      const mobile = window.matchMedia('(max-width: 767px)').matches;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5));
      renderer.setSize(width, height, false);
      sized = true;
      camera.aspect = width / height;
      // Fit the full antenna-to-wing silhouette at any aspect ratio.
      camera.position.set(0, 0, Math.max(4.7, 5.7 / camera.aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))));
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
    // Observe the stationary landing area, not the travelling element.
    intersectionObserver.observe(mount.parentElement ?? mount);
    const loseContext = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      mount.dataset.webglReady = 'false';
      canvas.style.opacity = '0';
      flight?.pause();
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
      flight?.cancel();
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
      gold.dispose();
      polishedGold.dispose();
      darkGold.dispose();
      environment?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, []);

  return <div ref={mountRef} data-webgl-ready="false" aria-hidden="true" style={{ width: '100%', height: '100%', pointerEvents: 'none' }} />;
}
