'use client';

import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

type Props = { active: number; paused: boolean; scrollPose: RefObject<{ progress: number }> };

/** Four aluminium chords and diagonal braces, like a standard box truss. */
function trussGeometry(length: number) {
  const parts: THREE.BufferGeometry[] = [];
  const corners = [[-.065, -.065], [.065, -.065], [.065, .065], [-.065, .065]];
  const tube = (a: THREE.Vector3, b: THREE.Vector3, radius: number) => {
    const delta = b.clone().sub(a);
    const geometry = new THREE.CylinderGeometry(radius, radius, delta.length(), 5);
    geometry.translate(0, delta.length() / 2, 0);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), delta.normalize()));
    geometry.translate(a.x, a.y, a.z); parts.push(geometry);
  };
  corners.forEach(([x,z], index) => {
    tube(new THREE.Vector3(x,0,z), new THREE.Vector3(x,length,z), .012);
    const [bx,bz] = corners[(index + 1) % 4];
    const bays = Math.ceil(length / .2);
    for (let i = 0; i < bays; i++) tube(new THREE.Vector3(i % 2 ? bx : x,i * length / bays,i % 2 ? bz : z), new THREE.Vector3(i % 2 ? x : bx,(i + 1) * length / bays,i % 2 ? z : bz), .006);
  });
  const merged = mergeGeometries(parts);
  parts.forEach(part => part.dispose());
  return merged;
}

/** A technical stage: box truss, LED wall, flown line arrays and moving heads. */
export default function LiveStage({ active, paused, scrollPose }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const inputs = useRef({ active, paused, scrollPose });
  const refresh = useRef<(() => void) | null>(null);
  useEffect(() => { inputs.current = { active, paused, scrollPose }; refresh.current?.(); }, [active, paused, scrollPose]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); }
    catch { return; }
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, .1, 50);
    camera.position.set(4.6, 3.3, 7.3);
    camera.lookAt(0, .45, 0);
    const rig = new THREE.Group();
    scene.add(rig);
    const aluminium = new THREE.MeshStandardMaterial({ color: 0xd4d8dc, metalness: .72, roughness: .32 });
    const black = new THREE.MeshStandardMaterial({ color: 0x17191d, metalness: .4, roughness: .55 });
    const edge = new THREE.LineBasicMaterial({ color: 0xc9a24a, transparent: true, opacity: .45 });
    const glow = new THREE.MeshBasicMaterial({ color: 0xffdf94 });
    const beamMaterial = new THREE.MeshBasicMaterial({ color: 0xd9be80, transparent: true, opacity: .035, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(3.7, .16, 2.6), black);
    deck.position.y = -.85;
    rig.add(deck);
    const deckEdges = new THREE.LineSegments(new THREE.EdgesGeometry(deck.geometry), edge);
    deckEdges.position.copy(deck.position);
    rig.add(deckEdges);
    const grid = new THREE.GridHelper(8, 24, 0xc9a24a, 0x50452e);
    grid.position.y = -.95;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = .16;
    scene.add(grid);
    const portals: THREE.Group[] = [];
    const upright = trussGeometry(2.6);
    const crossbar = trussGeometry(3.3);
    for (let i = 0; i < 2; i++) {
      const portal = new THREE.Group();
      for (const side of [-1, 1]) {
        const tower = new THREE.Mesh(upright, aluminium);
        tower.position.set(side * 1.65, -.8, 0);
        portal.add(tower);
        const foot = new THREE.Mesh(new THREE.BoxGeometry(.3,.025,.3), black);
        foot.position.set(side * 1.65,-.79,0); portal.add(foot);
      }
      const top = new THREE.Mesh(crossbar, aluminium);
      top.rotation.z = -Math.PI / 2; top.position.set(-1.65,1.8,0); portal.add(top);
      portal.position.z = .9 - i * 1.8;
      rig.add(portal); portals.push(portal);
    }
    // Rear LED wall: a local canvas texture keeps this independent of image CDN/CORS.
    const screenCanvas = document.createElement('canvas'); screenCanvas.width = 1024; screenCanvas.height = 576;
    const context = screenCanvas.getContext('2d');
    if (context) {
      context.fillStyle = '#080b10'; context.fillRect(0,0,1024,576);
      context.strokeStyle = '#b9913b'; context.lineWidth = 3;
      for (let i = 0; i < 8; i++) { context.beginPath(); context.moveTo(-100 + i * 170,576); context.lineTo(330 + i * 170,0); context.stroke(); }
      context.fillStyle = '#080b10'; context.fillRect(90,200,844,180);
      context.fillStyle = '#e6c984'; context.textAlign = 'center'; context.font = 'bold 79px Arial'; context.fillText('EVENTHEMES',512,285);
      context.fillStyle = '#ffffff'; context.font = '24px Arial'; context.fillText('WE ENGINEER THE EXPERIENCE.',512,342);
    }
    const screenTexture = new THREE.CanvasTexture(screenCanvas); screenTexture.colorSpace = THREE.SRGBColorSpace;
    const screenMaterial = new THREE.MeshBasicMaterial({ map: screenTexture, color: 0xffffff });
    const screen = new THREE.Group();
    screen.add(new THREE.Mesh(new THREE.BoxGeometry(2.8,1.67,.1),black));
    const display = new THREE.Mesh(new THREE.PlaneGeometry(2.7,1.57),screenMaterial); display.position.z = .06; screen.add(display);
    screen.position.set(0,.45,-.98); rig.add(screen);
    const speakers: THREE.Group[] = [];
    for (const side of [-1,1]) {
      const array = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const cabinet = new THREE.Mesh(new THREE.BoxGeometry(.3,.23,.28),black);
        cabinet.position.y = -i * .25; cabinet.rotation.x = i * .035;
        array.add(cabinet);
        const grille = new THREE.LineSegments(new THREE.EdgesGeometry(cabinet.geometry),edge);
        grille.position.copy(cabinet.position); grille.rotation.copy(cabinet.rotation); array.add(grille);
      }
      array.position.set(side * 1.88,1.3,.65); rig.add(array); speakers.push(array);
      const sub = new THREE.Mesh(new THREE.BoxGeometry(.48,.4,.5),black);
      sub.position.set(side * 1.35,-.58,.97); rig.add(sub);
    }
    for (let step = 0; step < 3; step++) {
      const stair = new THREE.Mesh(new THREE.BoxGeometry(.8,.08,.22),black);
      stair.position.set(0,-.92 + step * .04,1.68 - step * .2); rig.add(stair);
    }
    const beams: THREE.Group[] = [];
    for (let i = 0; i < 5; i++) {
      const head = new THREE.Group();
      head.position.set((i - 2) * .64, 1.55, .8);
      const fixture = new THREE.Mesh(new THREE.CylinderGeometry(.09, .11, .18, 12), black);
      const lens = new THREE.Mesh(new THREE.SphereGeometry(.065, 8, 6), glow);
      lens.position.y = -.11;
      const ray = new THREE.Mesh(new THREE.ConeGeometry(.55, 2.5, 20, 1, true), beamMaterial);
      ray.position.y = -1.35;
      head.add(fixture, lens, ray); rig.add(head); beams.push(head);
    }
    const key = new THREE.DirectionalLight(0xfff4d4, 4);
    key.position.set(2, 5, 4);
    const rim = new THREE.DirectionalLight(0x8cc8dd, 2);
    rim.position.set(-4, 2, -3);
    scene.add(key, rim, new THREE.AmbientLight(0xffffff, 1.2));
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    let frameId = 0, lastTime = 0, time = 0, progress = inputs.current.active;
    let visible = true, lost = false, disposed = false;
    const pointer = { x: 0, y: 0 };
    const pose = (delta: number) => {
      const moving = !motion.matches && !inputs.current.paused;
      const scroll = moving ? inputs.current.scrollPose.current.progress : 0;
      const target = Math.min(2, inputs.current.active + scroll * 1.6);
      progress = moving ? THREE.MathUtils.damp(progress, target, 4.5, delta) : inputs.current.active;
      if (moving) time += delta;
      rig.rotation.y = -.15 + (moving ? scroll * .55 + Math.sin(time * .23) * .035 + pointer.x * .12 : 0);
      rig.rotation.x = moving ? pointer.y * .035 : 0;
      portals.forEach((portal, i) => {
        const separation = Math.max(0, 1 - progress);
        portal.position.y = separation * i * .15;
        portal.position.z = .9 - i * (1.8 + separation * .2);
      });
      screen.position.y = .45 + Math.max(0, 1 - progress) * .14;
      screenMaterial.color.setScalar(.55 + progress * .225);
      speakers.forEach(array => { array.position.y = 1.3 + Math.max(0,1-progress) * .16; });
      beams.forEach((head, i) => {
        head.rotation.x = -.2 + (moving ? Math.sin(time * .7 + i * .65) * .32 : 0);
        head.rotation.z = (i - 2) * .16 + (moving ? Math.cos(time * .55 + i) * .18 : 0);
      });
      beamMaterial.opacity = .025 + progress * .035;
      glow.color.set(progress > 1.4 ? 0xffdf94 : 0xd9be80);
      renderer.render(scene, camera);
      mount.dataset.ready = 'true';
    };
    const main = mount.closest('main');
    const canRun = () => !disposed && !lost && visible && !document.hidden && !main?.inert && !motion.matches && !inputs.current.paused;
    const tick = (now: number) => {
      frameId = 0;
      if (!canRun()) return;
      const elapsed = now - lastTime;
      if (elapsed >= 1000 / 30) { pose(Math.min(elapsed / 1000, .06)); lastTime = now; }
      frameId = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frameId); frameId = 0;
      if (disposed || lost || !visible || document.hidden) return;
      pose(.016);
      if (canRun()) { lastTime = performance.now(); frameId = requestAnimationFrame(tick); }
    };
    refresh.current = sync;
    const resize = () => {
      if (!mount.clientWidth || !mount.clientHeight || lost) return;
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix(); sync();
    };
    const move = (event: PointerEvent) => {
      if (!fine.matches || motion.matches) return;
      const rect = mount.getBoundingClientRect();
      pointer.x = (event.clientX - rect.left) / rect.width - .5;
      pointer.y = (event.clientY - rect.top) / rect.height - .5;
    };
    const leave = () => { pointer.x = 0; pointer.y = 0; };
    const lose = (event: Event) => { event.preventDefault(); lost = true; cancelAnimationFrame(frameId); mount.dataset.ready = 'false'; };
    const restore = () => { lost = false; resize(); };
    const ro = new ResizeObserver(resize); ro.observe(mount);
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }); io.observe(mount);
    const menuObserver = new MutationObserver(sync);
    if (main) menuObserver.observe(main, { attributes: true, attributeFilter: ['inert'] });
    mount.addEventListener('pointermove', move); mount.addEventListener('pointerleave', leave);
    renderer.domElement.addEventListener('webglcontextlost', lose);
    renderer.domElement.addEventListener('webglcontextrestored', restore);
    document.addEventListener('visibilitychange', sync); motion.addEventListener('change', sync);
    resize();
    return () => {
      disposed = true; refresh.current = null; cancelAnimationFrame(frameId); ro.disconnect(); io.disconnect(); menuObserver.disconnect();
      mount.removeEventListener('pointermove', move); mount.removeEventListener('pointerleave', leave);
      document.removeEventListener('visibilitychange', sync); motion.removeEventListener('change', sync);
      renderer.domElement.removeEventListener('webglcontextlost', lose); renderer.domElement.removeEventListener('webglcontextrestored', restore);
      const geometries = new Set<THREE.BufferGeometry>(); const materials = new Set<THREE.Material>();
      scene.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) { geometries.add(object.geometry); for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material); } });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); screenTexture.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    };
    // Props update via inputs; preserve one WebGL context for the mounted stage.
  }, []);
  return <div ref={mountRef} data-ready="false" style={{ width: '100%', height: '100%' }} aria-hidden="true" />;
}
