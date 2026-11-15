"use client";

/* ==========================================================================
   Le plateau en volume — scène three.js du tableau de bord

   Une tour truss par rubrique, posée sur un plateau de scène : sa hauteur
   suit le nombre de fiches, son cœur doré celles qui sont publiées (ou les
   demandes traitées). Un portique en fond porte une poursuite qui éclaire la
   tour survolée. Décor de données : la légende voisine donne les mêmes
   chiffres en texte, et le canevas est caché aux lecteurs d'écran.

   Rendu à la demande uniquement (aucune boucle au repos) ; mouvement réduit :
   la scène est posée d'emblée, sans parallaxe.
   ========================================================================== */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { beamGeometry, boxTruss } from "@/components/ui/trussGeometry";
import { count } from "@/lib/eventheme/analytics";
import type { Volume } from "@/lib/eventheme/dashboard";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import s from "./Admin.module.css";

type Props = {
  volumes: Volume[];
  /** Tour mise en avant (survol de la scène ou de la légende). */
  highlight: string | null;
  onHighlight: (id: string | null) => void;
  /** Clic sur une tour : ouvre la rubrique correspondante. */
  onSelect: (id: string) => void;
  /** WebGL indisponible ou perdu : le parent affiche la version à plat. */
  onFail: () => void;
};

const SECTION = { half: 0.19, chord: 0.02, lacing: 0.01 };
const SPACING = 1.05;
const MAX_HEIGHT = 2.3;
const MIN_HEIGHT = 0.24;
const DECK_DEPTH = 1.8;
const DECK_THICKNESS = 0.08;
const RIG_HEIGHT = MAX_HEIGHT + 0.8;
const CAMERA_DIRECTION = new THREE.Vector3(0.6, 0.46, 0.8).normalize();
/** Part du canevas que le plateau peut occuper, en largeur et en hauteur. */
const FILL = { x: 0.9, y: 0.84 };

type Tower = {
  id: string;
  x: number;
  height: number;
  coreHeight: number;
  group: THREE.Group;
  frame: THREE.Mesh | null;
  core: THREE.Mesh;
  cap: THREE.Mesh | null;
  hit: THREE.Mesh;
  coreMaterial: THREE.MeshStandardMaterial;
  grow: { value: number };
};

type Api = {
  setVolumes: (volumes: Volume[]) => void;
  setHighlight: (id: string | null) => void;
};

/** Couleurs de la charte, lues dans les jetons : elles suivent le thème clair ou sombre. */
function readPalette() {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    gold: read("--or", "#c9a24a"),
    silver: read("--argent", "#c5c8ce"),
    deck: read("--noir-3", "#1f2022"),
    plate: read("--noir-4", "#2a2b2e"),
    light: document.documentElement.dataset.theme === "light",
  };
}

export default function StageVolume({ volumes, highlight, onHighlight, onSelect, onFail }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  const callbacks = useRef({ onHighlight, onSelect, onFail });
  const initial = useRef(volumes);

  useEffect(() => {
    callbacks.current = { onHighlight, onSelect, onFail };
  }, [onHighlight, onSelect, onFail]);

  useEffect(() => {
    const mount = mountRef.current;
    const labels = labelsRef.current;
    if (!mount || !labels) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      callbacks.current.onFail();
      return;
    }
    const canvas = renderer.domElement;
    canvas.setAttribute("aria-hidden", "true");
    canvas.className = s.stageCanvas;
    mount.prepend(canvas);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
    const stage = new THREE.Group();
    scene.add(stage);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    let environment: THREE.WebGLRenderTarget | undefined;
    try {
      environment = pmrem.fromScene(room, 0.04);
      scene.environment = environment.texture;
      scene.environmentIntensity = 0.75;
    } catch {
      /* Les lumières directes suffisent si l'environnement échoue. */
    }
    room.dispose();
    pmrem.dispose();

    let palette = readPalette();
    const aluminium = new THREE.MeshStandardMaterial({ metalness: 0.9, roughness: 0.32 });
    const plateMaterial = new THREE.MeshStandardMaterial({ metalness: 0.55, roughness: 0.45 });
    const deckMaterial = new THREE.MeshStandardMaterial({ metalness: 0.25, roughness: 0.85 });
    const edgeMaterial = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.6 });
    const gridMaterial = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.09 });
    const fixtureMaterial = new THREE.MeshStandardMaterial({ metalness: 0.6, roughness: 0.4 });
    const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const beamMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
    });
    const coreTemplate = new THREE.MeshStandardMaterial({ metalness: 0.82, roughness: 0.3, emissiveIntensity: 0.1 });

    const applyPalette = () => {
      aluminium.color.set(palette.silver);
      plateMaterial.color.set(palette.plate);
      deckMaterial.color.set(palette.deck);
      edgeMaterial.color.set(palette.gold);
      gridMaterial.color.set(palette.silver);
      gridMaterial.opacity = palette.light ? 0.16 : 0.09;
      fixtureMaterial.color.set(palette.plate);
      for (const tower of towers) {
        tower.coreMaterial.color.set(palette.gold);
        tower.coreMaterial.emissive.set(palette.gold);
      }
      beamMaterial.blending = palette.light ? THREE.NormalBlending : THREE.AdditiveBlending;
      beamMaterial.needsUpdate = true;
    };

    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-3, 6, 5);
    const rim = new THREE.DirectionalLight(0xffe2a8, 1.6);
    rim.position.set(5, 2, -3);
    scene.add(key, rim, new THREE.HemisphereLight(0xf2f3f5, 0x131417, 0.6));

    /* --- Plateau, grille et portique : reconstruits avec la largeur de la scène. */
    const set = new THREE.Group();
    stage.add(set);
    const beamCone = beamGeometry(RIG_HEIGHT - 0.25, 0.42);
    const beam = new THREE.Mesh(beamCone, beamMaterial);
    const fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 0.18, 18), fixtureMaterial);
    const spot = new THREE.Group();
    spot.add(fixture, beam);
    fixture.position.y = -0.09;
    beam.position.y = -0.17;
    spot.position.set(0, RIG_HEIGHT - 0.1, -0.15);
    stage.add(spot);
    let deckWidth = 0;

    const clearSet = () => {
      set.children.forEach((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) child.geometry.dispose();
      });
      set.clear();
    };
    const buildSet = (width: number) => {
      clearSet();
      deckWidth = width;
      const deckGeometry = new THREE.BoxGeometry(width, DECK_THICKNESS, DECK_DEPTH);
      const deck = new THREE.Mesh(deckGeometry, deckMaterial);
      deck.position.y = -DECK_THICKNESS / 2;
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(deckGeometry), edgeMaterial);
      edges.position.copy(deck.position);
      // Grille de régie sur le plateau : un filet tous les 25 cm.
      const lines: number[] = [];
      for (let x = -width / 2 + 0.25; x < width / 2; x += 0.25) lines.push(x, 0.002, -DECK_DEPTH / 2, x, 0.002, DECK_DEPTH / 2);
      for (let z = -DECK_DEPTH / 2 + 0.25; z < DECK_DEPTH / 2; z += 0.25) lines.push(-width / 2, 0.002, z, width / 2, 0.002, z);
      const gridGeometry = new THREE.BufferGeometry();
      gridGeometry.setAttribute("position", new THREE.Float32BufferAttribute(lines, 3));
      const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
      // Portique de fond : deux tours et une poutre qui portent la poursuite.
      const rigX = width / 2 - 0.16;
      const rigZ = -DECK_DEPTH / 2 + 0.16;
      const leg = boxTruss(RIG_HEIGHT, SECTION);
      const left = new THREE.Mesh(leg, aluminium);
      left.position.set(-rigX, 0, rigZ);
      const right = new THREE.Mesh(leg.clone(), aluminium);
      right.position.set(rigX, 0, rigZ);
      const top = new THREE.Mesh(boxTruss(2 * rigX, SECTION), aluminium);
      top.rotation.z = -Math.PI / 2;
      top.position.set(-rigX, RIG_HEIGHT + SECTION.half, rigZ);
      set.add(deck, edges, grid, left, right, top);
      spot.position.z = rigZ;
    };

    /* --- Tours --------------------------------------------------------------- */
    let towers: Tower[] = [];
    const plateGeometry = new THREE.BoxGeometry(2 * SECTION.half + 0.12, 0.025, 2 * SECTION.half + 0.12);
    const coreGeometry = new THREE.BoxGeometry(SECTION.half * 1.15, 1, SECTION.half * 1.15);
    coreGeometry.translate(0, 0.5, 0);
    const capGeometry = new THREE.BoxGeometry(2 * SECTION.half + 0.04, 0.03, 2 * SECTION.half + 0.04);

    const disposeTowers = () => {
      for (const tower of towers) {
        gsap.killTweensOf(tower.grow);
        tower.frame?.geometry.dispose();
        tower.hit.geometry.dispose();
        tower.coreMaterial.dispose();
        stage.remove(tower.group);
      }
      towers = [];
    };

    const buildTowers = (list: Volume[]) => {
      disposeTowers();
      const most = Math.max(...list.map((volume) => volume.total), 1);
      const heightOf = (value: number) => (value > 0 ? Math.max(MIN_HEIGHT, (value / most) * MAX_HEIGHT) : 0);
      towers = list.map((volume, index) => {
        const x = (index - (list.length - 1) / 2) * SPACING;
        const height = heightOf(volume.total);
        const coreHeight = Math.min(height, heightOf(volume.core));
        const group = new THREE.Group();
        group.position.x = x;
        const plate = new THREE.Mesh(plateGeometry, plateMaterial);
        plate.position.y = 0.0125;
        group.add(plate);
        const frame = height ? new THREE.Mesh(boxTruss(height, SECTION), aluminium) : null;
        if (frame) group.add(frame);
        const coreMaterial = coreTemplate.clone();
        coreMaterial.color.set(palette.gold);
        coreMaterial.emissive.set(palette.gold);
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        core.visible = coreHeight > 0;
        group.add(core);
        const cap = height ? new THREE.Mesh(capGeometry, aluminium) : null;
        if (cap) group.add(cap);
        const hit = new THREE.Mesh(
          new THREE.BoxGeometry(SPACING * 0.86, Math.max(height, 0.45) + 0.3, 0.7),
          hitMaterial,
        );
        hit.position.y = (Math.max(height, 0.45) + 0.3) / 2;
        hit.userData.id = volume.id;
        group.add(hit);
        stage.add(group);
        return { id: volume.id, x, height, coreHeight, group, frame, core, cap, hit, coreMaterial, grow: { value: 0 } };
      });
      const width = Math.max(3.4, (list.length - 1) * SPACING + 1.7);
      if (width !== deckWidth) buildSet(width);
      applyPose();
      fit();
    };

    const applyPose = () => {
      for (const tower of towers) {
        const grow = tower.grow.value;
        if (tower.frame) tower.frame.scale.y = Math.max(0.0001, grow);
        tower.core.scale.y = Math.max(0.0001, tower.coreHeight * grow);
        if (tower.cap) tower.cap.position.y = tower.height * grow + 0.015;
      }
    };

    /* --- Caméra, rendu à la demande, étiquettes ------------------------------- */
    let width = 1;
    let height = 1;
    const target = new THREE.Vector3();
    const bounds = new THREE.Box3();
    const corner = new THREE.Vector3();
    /** Emprise à l'écran (coordonnées normalisées) du plateau vu depuis `distance`. */
    const extent = (distance: number) => {
      camera.position.copy(target).addScaledVector(CAMERA_DIRECTION, distance);
      camera.lookAt(target);
      camera.updateMatrixWorld();
      let [minX, maxX, minY, maxY] = [Infinity, -Infinity, Infinity, -Infinity];
      for (let index = 0; index < 8; index += 1) {
        corner
          .set(
            index & 1 ? bounds.max.x : bounds.min.x,
            index & 2 ? bounds.max.y : bounds.min.y,
            index & 4 ? bounds.max.z : bounds.min.z,
          )
          .project(camera);
        [minX, maxX, minY, maxY] = [Math.min(minX, corner.x), Math.max(maxX, corner.x), Math.min(minY, corner.y), Math.max(maxY, corner.y)];
      }
      return { minX, maxX, minY, maxY };
    };
    /**
     * Cadrage : la distance la plus courte où tout le plateau (portique compris)
     * tient dans le canevas, puis un décentrage de l'image qui le met au milieu.
     */
    const fit = () => {
      camera.aspect = width / height;
      camera.clearViewOffset();
      camera.updateProjectionMatrix();
      const top = RIG_HEIGHT + 2 * SECTION.half + 0.3;
      bounds.min.set(-deckWidth / 2, -DECK_THICKNESS, -DECK_DEPTH / 2);
      bounds.max.set(deckWidth / 2, top, DECK_DEPTH / 2);
      target.set(0, top * 0.42, 0);
      let [near, far] = [1, 80];
      for (let step = 0; step < 26; step += 1) {
        const middle = (near + far) / 2;
        const box = extent(middle);
        if (box.maxX - box.minX <= 2 * FILL.x && box.maxY - box.minY <= 2 * FILL.y) far = middle;
        else near = middle;
      }
      const box = extent(far);
      camera.setViewOffset(width, height, ((box.minX + box.maxX) / 2) * (width / 2), -((box.minY + box.maxY) / 2) * (height / 2), width, height);
      camera.updateProjectionMatrix();
      request();
    };

    const orbit = { yaw: 0, pitch: 0 };
    const anchor = new THREE.Vector3();
    const placeLabels = () => {
      for (const tower of towers) {
        const label = labels.querySelector<HTMLElement>(`[data-id="${tower.id}"]`);
        if (!label) continue;
        anchor.set(tower.x, tower.height * tower.grow.value + 0.2, 0);
        stage.localToWorld(anchor);
        anchor.project(camera);
        const x = ((anchor.x + 1) / 2) * width;
        const y = ((1 - anchor.y) / 2) * height;
        label.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
        label.style.opacity = String(Math.min(1, tower.grow.value * 1.6));
      }
    };

    let frame = 0;
    let visible = false;
    let disposed = false;
    let lost = false;
    const draw = () => {
      frame = 0;
      if (disposed || lost || !visible) return;
      stage.rotation.set(orbit.pitch, orbit.yaw, 0);
      stage.updateMatrixWorld();
      try {
        renderer.render(scene, camera);
      } catch {
        lost = true;
        callbacks.current.onFail();
        return;
      }
      placeLabels();
    };
    function request() {
      if (!frame && !disposed) frame = requestAnimationFrame(draw);
    }

    const reduced = () => prefersReducedMotion();
    let introduced = false;
    const grow = (from = 0) => {
      introduced = true;
      if (reduced()) {
        towers.forEach((tower) => (tower.grow.value = 1));
        applyPose();
        request();
        return;
      }
      towers.forEach((tower, index) => {
        tower.grow.value = from;
        gsap.fromTo(
          tower.grow,
          { value: from },
          {
            value: 1,
            duration: 1.25,
            delay: index * 0.09,
            ease: "power3.out",
            onUpdate: () => {
              applyPose();
              request();
            },
          },
        );
      });
    };

    /* --- Mise en avant : poursuite, cœur plus lumineux ------------------------ */
    let highlighted: string | null = null;
    const setHighlight = (id: string | null) => {
      highlighted = id;
      const tower = towers.find((item) => item.id === id);
      const duration = reduced() ? 0 : 0.45;
      for (const item of towers) {
        gsap.to(item.coreMaterial, {
          emissiveIntensity: item === tower ? 0.42 : 0.1,
          duration,
          overwrite: true,
          onUpdate: request,
        });
      }
      if (tower) {
        // Poursuite éteinte : elle se place d'un coup ; allumée, elle glisse vers la nouvelle tour.
        gsap.to(spot.position, {
          x: tower.x,
          duration: beamMaterial.opacity < 0.02 ? 0 : duration,
          ease: "power3.out",
          overwrite: true,
          onUpdate: request,
        });
        gsap.to(beamMaterial, { opacity: palette.light ? 0.22 : 0.3, duration, overwrite: true, onUpdate: request });
        canvas.style.cursor = "pointer";
      } else {
        gsap.to(beamMaterial, { opacity: 0, duration, overwrite: true, onUpdate: request });
        canvas.style.cursor = "";
      }
      request();
    };

    /* --- Pointeur : parallaxe et survol ---------------------------------------- */
    const yawTo = gsap.quickTo(orbit, "yaw", { duration: 0.9, ease: "power3.out", onUpdate: request });
    const pitchTo = gsap.quickTo(orbit, "pitch", { duration: 0.9, ease: "power3.out", onUpdate: request });
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const towerAt = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(towers.map((tower) => tower.hit), false)[0];
      return (hit?.object.userData.id as string | undefined) ?? null;
    };
    const onMove = (event: PointerEvent) => {
      const id = towerAt(event);
      if (id !== highlighted) callbacks.current.onHighlight(id);
      if (!reduced() && event.pointerType === "mouse") {
        yawTo(pointer.x * 0.16);
        pitchTo(-pointer.y * 0.035);
      }
    };
    const onLeave = () => {
      yawTo(0);
      pitchTo(0);
      callbacks.current.onHighlight(null);
    };
    const onClick = (event: MouseEvent) => {
      const id = towerAt(event);
      if (id) callbacks.current.onSelect(id);
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("click", onClick);

    /* --- Taille, visibilité, thème, perte de contexte -------------------------- */
    const resize = () => {
      width = Math.max(1, mount.clientWidth);
      height = Math.max(1, mount.clientHeight);
      const small = window.matchMedia("(max-width: 767px)").matches;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.75));
      renderer.setSize(width, height, false);
      fit();
      draw();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    const intersection = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !introduced) grow();
        if (visible) request();
      },
      { threshold: 0.15 },
    );
    intersection.observe(mount);
    const themeObserver = new MutationObserver(() => {
      palette = readPalette();
      applyPalette();
      request();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const onLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      callbacks.current.onFail();
    };
    canvas.addEventListener("webglcontextlost", onLost);

    buildTowers(initial.current);
    applyPalette();
    resize();

    apiRef.current = {
      setVolumes: (list) => {
        buildTowers(list);
        applyPalette();
        if (introduced) grow(0);
        if (highlighted) setHighlight(highlighted);
        request();
      },
      setHighlight,
    };

    return () => {
      disposed = true;
      apiRef.current = null;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      themeObserver.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("webglcontextlost", onLost);
      gsap.killTweensOf([orbit, spot.position, beamMaterial]);
      disposeTowers();
      clearSet();
      for (const geometry of [plateGeometry, coreGeometry, capGeometry, beamCone, fixture.geometry]) geometry.dispose();
      for (const material of [aluminium, plateMaterial, deckMaterial, edgeMaterial, gridMaterial, fixtureMaterial, hitMaterial, beamMaterial, coreTemplate])
        material.dispose();
      environment?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, []);

  const signature = volumes.map((volume) => `${volume.id}:${volume.total}:${volume.core}`).join("|");
  const latest = useRef(volumes);
  useEffect(() => {
    latest.current = volumes;
  }, [volumes]);
  const built = useRef(signature);
  useEffect(() => {
    if (built.current === signature) return;
    built.current = signature;
    apiRef.current?.setVolumes(latest.current);
  }, [signature]);

  useEffect(() => {
    apiRef.current?.setHighlight(highlight);
  }, [highlight]);

  return (
    <div ref={mountRef} className={s.stageMount}>
      <div ref={labelsRef} className={s.stageLabels} aria-hidden="true">
        {volumes.map((volume) => (
          <span key={volume.id} data-id={volume.id} className={s.stageLabel} data-active={highlight === volume.id ? "" : undefined}>
            <b>{count(volume.total)}</b>
            <small>{volume.label}</small>
          </span>
        ))}
      </div>
    </div>
  );
}
