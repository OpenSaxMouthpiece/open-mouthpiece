// Three.js STL viewer (OpenSCAD's Z-up convention) with an SVG fallback for 2D results.
// The camera is kept across re-renders so parameter tweaks can be compared in place; it is
// framed automatically only for the first model of a file (or on demand).
// Section view: a clipping plane cuts the model lengthwise (keeps x <= position) or across (keeps
// z <= position); the solid's back faces, seen through the cut, are drawn in a flat cut color so
// walls read as solid material.
// Ghost: after a change of settings, the previous shape is drawn faintly over the new one (an
// onion skin: its own pass with the depth cleared, so only its outer surface and edges show) until
// rendering has been quiet for a moment, then it fades. It is kept (hidden) until the next change,
// so "Last shape" can bring it back.
import { useEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import type { FocusRequest } from "../focus";
import { Menu } from "./Menu";
import { luminance, useLook, useTheme, viewerBackground } from "../appearance";

// Sides as the player sees them (the lettering's convention: looking down on the top with the tip
// away, right = -X): "left" looks from +X, "right" from -X.
type ViewName = "iso" | "front" | "back" | "left" | "right" | "top";
const VIEW_DIRS: Record<ViewName, [number, number, number]> = {
  iso: [1, -1.2, 0.9],
  front: [0, -1, 0],
  back: [0, 1, 0],
  left: [1, 0, 0],
  right: [-1, 0, 0],
  top: [0, -0.0001, 1],
};

const VIEW_LABELS: Record<ViewName, string> = {
  iso: "3D",
  front: "Table",
  back: "Top",
  left: "Left",
  right: "Right",
  top: "Tip",
};
const VIEW_TITLES: Record<ViewName, string> = {
  iso: "3D view (fit)",
  front: "Looking at the table and window",
  back: "Looking down on the top (the lettering side)",
  left: "The player's left side",
  right: "The player's right side",
  top: "Looking down the tip, along the bore",
};

function Toggle({
  on,
  set,
  title,
  children,
}: {
  on: boolean;
  set(on: boolean): void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button className={`toggle${on ? " on" : ""}`} aria-pressed={on} title={title} onClick={() => set(!on)}>
      {children}
    </button>
  );
}
// A checkbox line in the Show menu.
function Check({
  on,
  set,
  title,
  children,
}: {
  on: boolean;
  set(on: boolean): void;
  title: string;
  children: ReactNode;
}) {
  return (
    <label className="show-item" title={title}>
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} /> {children}
    </label>
  );
}

interface Ctx {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  model: THREE.Group; // holds a (the editor's model), b (the pinned comparison model) and the ligature + reed made for a
  a: THREE.Group;
  b: THREE.Group;
  lig: THREE.Group;
  reed: THREE.Group;
  capG: THREE.Group; // the cap made for A
  ghost: THREE.Group; // the previous shape of A, for a moment after a change
  grid: THREE.GridHelper;
  axes: THREE.AxesHelper;
  draw(): void;
}

interface Props {
  stl: ArrayBuffer | null;
  svg: string | null;
  compare: ArrayBuffer | null; // pinned model B, blue (see-through when overlaid on A)
  frameKey: string; // changes when a different file is loaded -> reframe on the next model
  compact?: boolean; // phone layout: the tool strip folds behind a ⋯ button
  focus?: FocusRequest | null; // fly to the part a parameter shapes (cut open when it's inside)
  busy?: boolean; // a render is running: show progress over the current model
  busyLabel?: string; // what it is making, if not the model on screen (a download)
  overlay?: ReactNode; // e.g. the first-visit hint
  quality?: ReactNode; // the render quality switch, with the view tools
  labelA?: string; // names for the A/B legend and the labels under the models
  labelB?: string;
  compareKey?: string; // changes when a different B is pinned (-> side by side)
  onClearB?(): void;
  // The ligature made for A, seated on it (same frame as A), and a model reed under it. on / reedOn =
  // the tools' toggles; beside = the ligature stands next to A instead of on it.
  ligature?: {
    on: boolean;
    beside: boolean;
    reedOn: boolean;
    stl: ArrayBuffer | null;
    reed: ArrayBuffer | null;
  } | null;
  onLigature?(change: { on?: boolean; beside?: boolean; reed?: boolean }): void;
  // The cap made for A, seated on it (see-through, so A and the ligature show), or beside it.
  cap?: { on: boolean; beside: boolean; stl: ArrayBuffer | null } | null;
  onCap?(change: { on?: boolean; beside?: boolean }): void;
  // Whether this design (A) is shown, when the app controls it (to look at the ligature or cap alone).
  showModel?: boolean;
  onShowModel?(on: boolean): void;
}

// View settings outlive the viewer: the desktop and phone layouts each mount their own, and a
// switch shouldn't reset them. The toggles are also kept in this browser (a convenience only).
type Section = "off" | "length" | "across";
interface ViewPrefs {
  edges: boolean;
  wire: boolean;
  seeThrough: boolean;
  layout: "overlay" | "side";
  section: Section;
  showA: boolean;
  showB: boolean;
  ghost: boolean;
}
const PREFS_KEY = "open-mouthpiece-view-v1";
const viewPrefs: ViewPrefs = (() => {
  const p: ViewPrefs = {
    edges: true,
    wire: false,
    seeThrough: false,
    layout: "side",
    section: "off",
    showA: true,
    showB: true,
    ghost: true,
  };
  try {
    const s = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") as Partial<ViewPrefs>;
    for (const k of ["edges", "wire", "seeThrough", "ghost"] as const) if (typeof s[k] === "boolean") p[k] = s[k]!;
    if (s.layout === "overlay" || s.layout === "side") p.layout = s.layout;
  } catch {
    // no storage: defaults
  }
  return p;
})();
function keepPrefs(p: ViewPrefs) {
  Object.assign(viewPrefs, p);
  try {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ edges: p.edges, wire: p.wire, seeThrough: p.seeThrough, layout: p.layout, ghost: p.ghost }),
    );
  } catch {
    // storage unavailable: kept for this page only
  }
}

const B_COLOR = 0x4ea3f2;
const B_CUT = 0x1d4f80;
const LIG_COLOR = 0x7d848f; // graphite: neutral on any mouthpiece colour (blue is B, teal the cap)
const LIG_CUT = 0x33373d;
const REED_COLOR = 0xe6dcbc;
const REED_CUT = 0x9a8f6c;
const CAP_COLOR = 0x3fbfae;
const CAP_CUT = 0x1d6b61;
const CAP_SEATED_OPACITY = 0.38;
// The ghost: how long it stays once rendering is quiet, how long it fades, and how strong it is.
const GHOST_HOLD_MS = 2500;
const GHOST_FADE_MS = 700;
const GHOST_FILM = 0.2; // the old surface's tint
const GHOST_EDGES = 0.6; // its edges

export function Viewer({
  stl,
  svg,
  compare,
  frameKey,
  compact = false,
  focus = null,
  busy = false,
  busyLabel,
  overlay,
  quality,
  labelA,
  labelB,
  compareKey,
  onClearB,
  ligature = null,
  onLigature,
  cap = null,
  onCap,
  showModel,
  onShowModel,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  // Appearance (the ⚙ menu): model colour, background, grid, axes.
  const [look] = useLook();
  const bg = viewerBackground(look, useTheme());
  const modelColor = useRef(look.model);
  modelColor.current = look.model;
  const ctxRef = useRef<Ctx | null>(null);
  const framedFor = useRef<string | null>(null);
  const [edges, setEdges] = useState(viewPrefs.edges);
  const [wire, setWire] = useState(viewPrefs.wire);
  const [seeThrough, setSeeThrough] = useState(viewPrefs.seeThrough);
  const [showAPref, setShowAPref] = useState(viewPrefs.showA);
  // A's visibility: the app's when it controls it, else the A/B toggle's (kept with the view prefs)
  const showA = showModel ?? showAPref;
  const setShowA = onShowModel ?? setShowAPref;
  const [showB, setShowB] = useState(viewPrefs.showB);
  const [layout, setLayout] = useState<"overlay" | "side">(viewPrefs.layout);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [section, setSection] = useState<Section>(viewPrefs.section);
  const [ghostOn, setGhostOn] = useState(viewPrefs.ghost);
  useEffect(
    () => keepPrefs({ edges, wire, seeThrough, layout, section, showA: showAPref, showB, ghost: ghostOn }),
    [edges, wire, seeThrough, layout, section, showAPref, showB, ghostOn],
  );
  // The design and part of the model on screen: a ghost only compares shapes of the same one.
  const shownKey = useRef<string | null>(null);
  const ghostColor = useRef(0xffffff);
  ghostColor.current = bg.light ? 0x1b1d23 : 0xffffff;
  const ghostTimer = useRef<number | null>(null);
  const ghostFade = useRef<number | null>(null);
  // none; showing (after a change, fades by itself); kept (hidden, can be brought back); held (shown
  // by "Last shape" until turned off)
  type GhostMode = "none" | "showing" | "kept" | "held";
  const [ghostMode, setGhostModeState] = useState<GhostMode>("none");
  const ghostModeRef = useRef<GhostMode>("none");
  const setGhostMode = (m: GhostMode) => {
    ghostModeRef.current = m;
    setGhostModeState(m);
  };
  // A newly pinned B: side by side (overlaid, a B that is nearly the same shape hides inside A).
  const lastB = useRef(compareKey);
  const framedB = useRef<string | undefined>(compare ? compareKey : undefined);
  useEffect(() => {
    if (compareKey && compareKey !== lastB.current) {
      setLayout("side");
      setShowB(true);
    }
    lastB.current = compareKey;
  }, [compareKey]);
  // "A" / "B" under the models while they stand side by side (placed on every draw).
  const labelARef = useRef<HTMLDivElement>(null),
    labelBRef = useRef<HTMLDivElement>(null);
  const labelsOn = useRef(false);
  labelsOn.current = layout === "side" && !!compare && !svg;
  const [secPos, setSecPos] = useState(0);
  // A lengthwise cut keeps the half away from the camera's side: x <= pos (cut face toward +X, the
  // Left view), or x >= pos after the Right view, so both side views look at the cut.
  const [secFlip, setSecFlip] = useState(false);
  const [bounds, setBounds] = useState<{ x: [number, number]; z: [number, number] }>({ x: [-20, 20], z: [0, 100] });
  const plane = useRef(new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0));
  const autoCut = useRef(false); // the section was turned on by a focus (so a later one may turn it off)
  const [zoomedIn, setZoomedIn] = useState(false); // flown to a part by a focus: "Whole model" goes back
  const flight = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Seconds since the running render started (renders in the browser can take a while on a phone).
  useEffect(() => {
    if (!busy) return;
    const t0 = performance.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed((performance.now() - t0) / 1000), 200);
    return () => clearInterval(id);
  }, [busy]);

  useEffect(() => {
    const host = hostRef.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // the background is the container's CSS
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.localClippingEnabled = true;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 10000);
    camera.up.set(0, 0, 1);
    camera.position.set(120, -140, 110);
    scene.add(camera);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3f4b, 1.4));
    const key = new THREE.DirectionalLight(0xffffff, 1.8);
    key.position.set(0.6, 1, 1.5);
    camera.add(key); // light follows the camera, so no face is ever unlit

    const grid = new THREE.GridHelper(200, 20, 0x5a6070, 0x3a3f4b);
    grid.rotation.x = Math.PI / 2;
    const axes = new THREE.AxesHelper(25);
    scene.add(grid, axes);
    const model = new THREE.Group();
    const a = new THREE.Group(),
      b = new THREE.Group(),
      lig = new THREE.Group(),
      reed = new THREE.Group(),
      capG = new THREE.Group(),
      ghost = new THREE.Group();
    model.add(a, b, lig, reed, capG);
    // the ghost has its own pass, drawn over everything else
    const ghostScene = new THREE.Scene();
    ghostScene.add(ghost);
    scene.add(model);

    const controls = new OrbitControls(camera, renderer.domElement);
    const place = (el: HTMLDivElement | null, g: THREE.Group) => {
      if (!el) return;
      const box = new THREE.Box3().setFromObject(g);
      if (!labelsOn.current || !g.visible || box.isEmpty()) {
        el.style.display = "none";
        return;
      }
      const p = new THREE.Vector3((box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, box.min.z).project(camera);
      if (p.z > 1) {
        el.style.display = "none";
        return;
      }
      el.style.display = "";
      el.style.left = `${((p.x + 1) / 2) * host.clientWidth}px`;
      el.style.top = `${((1 - p.y) / 2) * host.clientHeight}px`;
    };
    const draw = () => {
      renderer.render(scene, camera);
      // (the ghost is A's previous shape: not while A is hidden)
      if (ghost.visible && a.visible && ghost.children.length) {
        renderer.autoClear = false;
        renderer.clearDepth();
        renderer.render(ghostScene, camera);
        renderer.autoClear = true;
      }
      place(labelARef.current, a);
      place(labelBRef.current, b);
    };
    controls.addEventListener("change", draw);
    controls.addEventListener("start", () => {
      // the user takes over: stop any camera flight
      if (flight.current !== null) cancelAnimationFrame(flight.current);
      flight.current = null;
    });

    const ro = new ResizeObserver(() => {
      const w = host.clientWidth,
        h = Math.max(1, host.clientHeight);
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      draw();
    });
    ro.observe(host);
    ctxRef.current = { renderer, scene, camera, controls, model, a, b, lig, reed, capG, ghost, grid, axes, draw };
    // Dev-only handle for scripted inspection (e.g. from browser automation).
    if (import.meta.env.DEV) (window as unknown as { __viewer: Ctx }).__viewer = ctxRef.current;
    return () => {
      ro.disconnect();
      controls.dispose();
      clearModel(a);
      clearModel(b);
      clearModel(lig);
      clearModel(reed);
      clearModel(capG);
      clearModel(ghost);
      renderer.dispose();
      host.removeChild(renderer.domElement);
      ctxRef.current = null;
    };
  }, []);

  // size of the framed box last time, to refit the view when the model grows or shrinks a lot
  const fitSize = useRef<THREE.Vector3 | null>(null);
  const sizeChanged = (box: THREE.Box3) => {
    const size = box.getSize(new THREE.Vector3());
    const old = fitSize.current;
    fitSize.current = size;
    return (
      !!old &&
      [0, 1, 2].some((i) => {
        const a = old.getComponent(i),
          b = size.getComponent(i);
        return Math.max(a, b) > 1.25 * Math.max(Math.min(a, b), 1e-6);
      })
    );
  };

  const frame = (view: ViewName, keepDir = false) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    setZoomedIn(false);
    // side by side: B goes to the screen's right, so from the side it stands beside A, not behind it
    sideAxis.current = view === "left" || view === "right" ? "y" : "x";
    if (view === "left" || view === "right" || view === "iso") setSecFlip(view === "right");
    placeB(ctx);
    const box = new THREE.Box3().setFromObject(ctx.model);
    if (box.isEmpty()) return;
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const dist = (sphere.radius / Math.sin(THREE.MathUtils.degToRad(ctx.camera.fov / 2))) * 1.05;
    const dir = keepDir
      ? ctx.camera.position.clone().sub(ctx.controls.target).normalize()
      : new THREE.Vector3(...VIEW_DIRS[view]).normalize();
    ctx.camera.position.copy(sphere.center).addScaledVector(dir, dist);
    fitSize.current = box.getSize(new THREE.Vector3());
    ctx.camera.near = dist / 100;
    ctx.camera.far = dist * 100;
    ctx.camera.updateProjectionMatrix();
    ctx.controls.target.copy(sphere.center);
    ctx.controls.update();
    ctx.draw();
  };

  // Glide the camera to look at a box from a direction, filling the view (both fovs).
  const flyTo = (box: THREE.Box3, dirIn: THREE.Vector3) => {
    const ctx = ctxRef.current;
    if (!ctx || box.isEmpty()) return;
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const r = Math.max(sphere.radius, 6);
    const vfov = THREE.MathUtils.degToRad(ctx.camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * ctx.camera.aspect);
    const dist = (r / Math.sin(Math.min(vfov, hfov) / 2)) * 1.3; // some context around the part
    const toPos = sphere.center.clone().addScaledVector(dirIn.clone().normalize(), dist);
    const fromPos = ctx.camera.position.clone(),
      fromTarget = ctx.controls.target.clone();
    ctx.camera.near = Math.min(ctx.camera.near, dist / 100);
    ctx.camera.far = Math.max(ctx.camera.far, dist * 100);
    ctx.camera.updateProjectionMatrix();
    if (flight.current !== null) cancelAnimationFrame(flight.current);
    const t0 = performance.now(),
      ms = 450;
    const step = () => {
      const t = Math.min(1, (performance.now() - t0) / ms),
        e = t * t * (3 - 2 * t);
      ctx.camera.position.lerpVectors(fromPos, toPos, e);
      ctx.controls.target.lerpVectors(fromTarget, sphere.center, e);
      ctx.controls.update();
      ctx.draw();
      flight.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    flight.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    if (!focus || !ctxRef.current) return;
    if (focus.cut && section !== "length") {
      setSection("length");
      setSecPos(0);
      autoCut.current = true;
    } else if (!focus.cut && autoCut.current) {
      setSection("off");
      autoCut.current = false;
    }
    const box = new THREE.Box3(new THREE.Vector3(...focus.box[0]), new THREE.Vector3(...focus.box[1]));
    flyTo(box, new THREE.Vector3(...focus.dir));
    setZoomedIn(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce]);

  const fill = (
    group: THREE.Group,
    buf: ArrayBuffer | null,
    color: number | string,
    cut: number | string = color === B_COLOR ? B_CUT : cutColor(color),
  ) => {
    clearModel(group);
    if (!buf) return;
    const geom = new STLLoader().parse(buf);
    const mesh = new THREE.Mesh(
      geom,
      new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, wireframe: wire }),
    );
    mesh.name = "body";
    const lines = new THREE.LineSegments(
      new THREE.EdgesGeometry(geom, 25),
      new THREE.LineBasicMaterial({ color: edgeColor(color), transparent: true, opacity: 0.35 }),
    );
    lines.visible = edges && !wire;
    lines.name = "edges";
    // Back faces in a flat color: only visible through a section cut, where they show the walls.
    const cap = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color: cut, side: THREE.BackSide }));
    cap.name = "cap";
    group.add(mesh, lines, cap);
  };

  // See-through: both models with the toggle; B also whenever it is overlaid on A.
  const applyLook = (ctx: Ctx) => {
    const set = (group: THREE.Group, on: boolean) =>
      group.traverse((o) => {
        if (o.name !== "body" || !(o instanceof THREE.Mesh)) return;
        const m = o.material as THREE.MeshStandardMaterial;
        Object.assign(
          m,
          on
            ? { transparent: true, opacity: 0.45, depthWrite: false }
            : { transparent: false, opacity: 1, depthWrite: true },
        );
        m.needsUpdate = true;
        o.renderOrder = on ? 1 : 0;
      });
    set(ctx.a, seeThrough);
    set(ctx.lig, seeThrough);
    set(ctx.reed, seeThrough);
    // the cap on A is always see-through (it would hide the mouthpiece); beside it, as the others
    const capSeated = !cap?.beside && showA; // see-through only over the mouthpiece
    set(ctx.capG, seeThrough || capSeated);
    if (capSeated && !seeThrough)
      ctx.capG.traverse((o) => {
        if (o.name === "body" && o instanceof THREE.Mesh) (o.material as THREE.Material).opacity = CAP_SEATED_OPACITY;
      });
    set(ctx.b, seeThrough || layout === "overlay");
    const overlaid = layout === "overlay";
    ctx.b.traverse((o) => {
      if (o.name === "body" && o instanceof THREE.Mesh && overlaid && !seeThrough)
        (o.material as THREE.Material).opacity = 0.3;
      if (o.name === "edges" && o instanceof THREE.LineSegments) {
        const m = o.material as THREE.LineBasicMaterial;
        m.depthTest = !overlaid; // overlaid: B's edges (window, table, tip) show through A
        m.opacity = overlaid ? 0.8 : 0.35;
        m.color.set(overlaid ? 0x6fb8ff : 0x1d4f80);
        m.needsUpdate = true;
        o.renderOrder = overlaid ? 2 : 0;
      }
    });
  };

  // Point the clipping plane and turn it on/off on every material.
  const applySection = (ctx: Ctx) => {
    if (section === "length") plane.current.set(new THREE.Vector3(secFlip ? 1 : -1, 0, 0), secFlip ? -secPos : secPos);
    else plane.current.set(new THREE.Vector3(0, 0, -1), secPos);
    const planes = section === "off" ? [] : [plane.current];
    ctx.ghost.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
        (o.material as THREE.Material).clippingPlanes = planes;
        (o.material as THREE.Material).needsUpdate = true;
      }
    });
    ctx.model.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
        const m = o.material as THREE.Material;
        m.clippingPlanes = planes;
        m.needsUpdate = true;
      }
      if (o.name === "cap") o.visible = section !== "off" && !wire;
    });
  };

  // B sits on A in "overlay"; in "side" it moves along +X (+Y in the side view) to just past A.
  const sideAxis = useRef<"x" | "y">("x");
  const placeB = (ctx: Ctx) => {
    ctx.b.position.set(0, 0, 0);
    if (layout === "side" && ctx.a.children.length && ctx.b.children.length) {
      // a lengthwise cut keeps x <= pos, so B then goes along Y (else the cut would take it away)
      const ba = new THREE.Box3().setFromObject(ctx.a),
        bb = new THREE.Box3().setFromObject(ctx.b),
        k = section === "length" ? "y" : sideAxis.current;
      const gap = 0.15 * Math.max(ba.max.x - ba.min.x, 5);
      ctx.b.position[k] = ba.max[k] + gap - bb.min[k];
    }
  };

  // The ligature: on A where it seats, or beside it: on the plate in front of A (-Y, toward the
  // default camera; B goes to +X).
  const placeLig = (ctx: Ctx) => {
    ctx.lig.position.set(0, 0, 0);
    if (!ligature?.beside || !ctx.a.children.length || !ctx.lig.children.length) return;
    const ba = new THREE.Box3().setFromObject(ctx.a),
      bl = new THREE.Box3().setFromObject(ctx.lig);
    ctx.lig.position.y = ba.min.y - 0.4 * Math.max(bl.max.y - bl.min.y, 5) - bl.max.y;
    ctx.lig.position.z = -bl.min.z;
  };
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const on = !!ligature?.on;
    fill(ctx.lig, on ? ligature!.stl : null, LIG_COLOR, LIG_CUT);
    fill(ctx.reed, ligature?.reedOn ? ligature.reed : null, REED_COLOR, REED_CUT);
    applyLook(ctx);
    placeLig(ctx);
    applySection(ctx);
    ctx.draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ligature?.on, ligature?.reedOn, ligature?.stl, ligature?.reed]);
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    placeLig(ctx);
    ctx.draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ligature?.beside]);

  // The cap: on A where it seats, or beside it, behind A (+Y; the ligature goes in front, B to +X).
  const placeCap = (ctx: Ctx) => {
    ctx.capG.position.set(0, 0, 0);
    if (!cap?.beside || !ctx.a.children.length || !ctx.capG.children.length) return;
    const ba = new THREE.Box3().setFromObject(ctx.a),
      bc = new THREE.Box3().setFromObject(ctx.capG);
    ctx.capG.position.y = ba.max.y + 0.4 * Math.max(bc.max.y - bc.min.y, 5) - bc.min.y;
    ctx.capG.position.z = -bc.min.z;
  };
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    fill(ctx.capG, cap?.on ? cap.stl : null, CAP_COLOR, CAP_CUT);
    applyLook(ctx);
    placeCap(ctx);
    applySection(ctx);
    ctx.draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cap?.on, cap?.stl, cap?.beside]);

  // The ghost: A's surface and edges move over (no new geometry), with ghost materials. Kept
  // through a drag (the first shape of it), dropped by a different design or part.
  const stopGhostFade = () => {
    if (ghostTimer.current !== null) clearTimeout(ghostTimer.current);
    if (ghostFade.current !== null) cancelAnimationFrame(ghostFade.current);
    ghostTimer.current = ghostFade.current = null;
  };
  const setGhostStrength = (ctx: Ctx, k: number) =>
    ctx.ghost.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments)
        if (o.userData.opacity !== undefined) (o.material as THREE.Material).opacity = k * o.userData.opacity;
    });
  const keepAsGhost = (ctx: Ctx) => {
    const body = ctx.a.getObjectByName("body") as THREE.Mesh | undefined;
    if (!body) return;
    const edgeLines = ctx.a.getObjectByName("edges") as THREE.LineSegments | undefined;
    const cap = ctx.a.getObjectByName("cap") as THREE.Mesh | undefined;
    for (const o of [body, edgeLines, cap]) {
      if (!o) continue;
      ctx.a.remove(o);
      (o.material as THREE.Material).dispose();
    }
    const color = ghostColor.current;
    // depth first (nothing drawn), so the tint and the edges keep to the nearest surface
    const offset = { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 };
    const depth = new THREE.Mesh(body.geometry, new THREE.MeshBasicMaterial({ colorWrite: false, ...offset }));
    const film = new THREE.Mesh(
      body.geometry,
      new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, ...offset }),
    );
    film.userData.opacity = GHOST_FILM;
    film.renderOrder = 1;
    ctx.ghost.add(depth, film);
    if (edgeLines) {
      const lines = new THREE.LineSegments(
        edgeLines.geometry,
        new THREE.LineBasicMaterial({ color, transparent: true }),
      );
      lines.userData.opacity = GHOST_EDGES;
      lines.renderOrder = 2;
      ctx.ghost.add(lines);
    }
    setGhostStrength(ctx, 1);
  };
  const clearGhost = (ctx: Ctx) => {
    stopGhostFade();
    // the film and the edges share geometries: dispose each once
    const geoms = new Set<THREE.BufferGeometry>();
    for (const o of [...ctx.ghost.children]) {
      ctx.ghost.remove(o);
      if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
        geoms.add(o.geometry);
        (o.material as THREE.Material).dispose();
      }
    }
    geoms.forEach((g) => g.dispose());
  };

  // New model A.
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const same = !!stl && shownKey.current === frameKey && ctx.a.children.length > 0 && !svg;
    if (same) {
      stopGhostFade();
      // a change while the ghost still shows is the same change going on (a drag): keep its first shape
      if (ghostModeRef.current === "showing" && ctx.ghost.children.length) setGhostStrength(ctx, 1);
      else {
        clearGhost(ctx);
        keepAsGhost(ctx);
      }
      ctx.ghost.visible = ghostOn;
      setGhostMode(ghostOn ? "showing" : "kept");
    } else {
      clearGhost(ctx);
      setGhostMode("none");
    }
    shownKey.current = stl ? frameKey : null;
    fill(ctx.a, stl, modelColor.current);
    applyLook(ctx);
    placeB(ctx);
    placeLig(ctx);
    applySection(ctx);
    if (stl) {
      const box = new THREE.Box3().setFromObject(ctx.a);
      setBounds({ x: [box.min.x, box.max.x], z: [box.min.z, box.max.z] });
    }
    if (stl && framedFor.current !== frameKey) {
      framedFor.current = frameKey;
      frame("iso");
    } else if (stl && !svg && sizeChanged(new THREE.Box3().setFromObject(ctx.model))) frame("iso", true);
    ctx.draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stl]);

  // New model B, or a layout change.
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    fill(ctx.b, compare, B_COLOR);
    applyLook(ctx);
    placeB(ctx);
    applySection(ctx);
    // a different B: frame both (a re-aligned STL of the same B keeps the camera)
    if (compare && (compareKey !== framedB.current || sizeChanged(new THREE.Box3().setFromObject(ctx.model)))) {
      framedB.current = compareKey;
      frame("iso", compareKey === framedB.current);
    } else ctx.draw();
    if (!compare) framedB.current = undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compare]);
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    applyLook(ctx);
    placeB(ctx);
    frame("iso");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  // Display toggles.
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.model.traverse((o) => {
      if (o instanceof THREE.Mesh) (o.material as THREE.MeshStandardMaterial).wireframe = wire;
      if (o.name === "edges") o.visible = edges && !wire;
    });
    ctx.a.visible = showA;
    ctx.reed.visible = showA;
    ctx.b.visible = showB;
    applyLook(ctx);
    placeB(ctx);
    applySection(ctx);
    ctx.draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edges, wire, seeThrough, showA, showB, section, secPos, secFlip]);

  // Once rendering is quiet, the ghost stays a moment, then fades out (and is kept, hidden).
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx || busy || ghostMode !== "showing" || !ctx.ghost.children.length) return;
    stopGhostFade();
    ghostTimer.current = window.setTimeout(() => {
      const t0 = performance.now();
      const step = () => {
        const t = Math.min(1, (performance.now() - t0) / GHOST_FADE_MS);
        if (t < 1) {
          setGhostStrength(ctx, 1 - t);
          ghostFade.current = requestAnimationFrame(step);
        } else {
          ghostFade.current = null;
          ctx.ghost.visible = false;
          setGhostStrength(ctx, 1);
          setGhostMode("kept");
        }
        ctx.draw();
      };
      ghostFade.current = requestAnimationFrame(step);
    }, GHOST_HOLD_MS);
    return stopGhostFade;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, stl, ghostMode]);
  // The automatic ghost turned off: one showing now is hidden (and kept for "Last shape").
  useEffect(() => {
    const ctx = ctxRef.current;
    if (ctx && !ghostOn && ghostModeRef.current === "showing") {
      stopGhostFade();
      ctx.ghost.visible = false;
      setGhostStrength(ctx, 1);
      setGhostMode("kept");
      ctx.draw();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ghostOn]);
  // "Last shape": the shape before the last change, shown until turned off again.
  const toggleLastShape = () => {
    const ctx = ctxRef.current;
    if (!ctx || !ctx.ghost.children.length) return;
    stopGhostFade();
    setGhostStrength(ctx, 1);
    const hold = ghostModeRef.current !== "held";
    ctx.ghost.visible = hold;
    setGhostMode(hold ? "held" : "kept");
    ctx.draw();
  };

  // Appearance changes: recolour A (body, edges, cut) and the grid for the background; grid / axes on or off.
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.a.traverse((o) => {
      if (!(o instanceof THREE.Mesh || o instanceof THREE.LineSegments)) return;
      const m = o.material as THREE.MeshStandardMaterial;
      if (o.name === "body") m.color.set(look.model);
      if (o.name === "cap") m.color.set(cutColor(look.model));
      if (o.name === "edges") m.color.set(edgeColor(look.model));
    });
    const mats = (
      Array.isArray(ctx.grid.material) ? ctx.grid.material : [ctx.grid.material]
    ) as THREE.LineBasicMaterial[];
    const [center, line] = bg.light ? [0x8f96a3, 0xb3b9c4] : [0x5a6070, 0x3a3f4b];
    ctx.grid.geometry.dispose();
    const fresh = new THREE.GridHelper(200, 20, center, line);
    ctx.grid.geometry = fresh.geometry;
    mats.forEach((m) => m.dispose());
    ctx.grid.material = fresh.material;
    ctx.grid.visible = look.grid;
    ctx.axes.visible = look.axes;
    ctx.draw();
  }, [look.model, bg.light, look.grid, look.axes]);

  const range = section === "length" ? bounds.x : bounds.z;
  // Save the view as a PNG: the viewer's background painted under the (transparent) 3D canvas.
  const snapshot = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.draw(); // the canvas is read in the same task as the draw (no preserveDrawingBuffer needed)
    const src = ctx.renderer.domElement;
    const out = document.createElement("canvas");
    out.width = src.width;
    out.height = src.height;
    const g = out.getContext("2d")!;
    const grad = g.createLinearGradient(0, 0, 0, out.height);
    bg.stops.forEach(([c, t]) => grad.addColorStop(t, c));
    g.fillStyle = bg.stops.length > 1 ? grad : bg.stops[0][0];
    g.fillRect(0, 0, out.width, out.height);
    g.drawImage(src, 0, 0);
    out.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${(labelA ?? "mouthpiece").replace(/[^\w.-]+/g, "_")}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, "image/png");
  };
  // Back out of an auto-zoom: the cut it made goes, the whole model in view from the same side.
  const wholeModel = () => {
    if (autoCut.current) {
      autoCut.current = false;
      setSection("off");
    }
    frame("iso", true);
  };
  const chooseSection = (s: Section) => {
    autoCut.current = false;
    setSection(s);
    setSecPos(s === "length" ? 0 : +((bounds.z[0] + bounds.z[1]) / 2).toFixed(1)); // centerline / halfway
  };

  return (
    <div className={`viewer${bg.light ? " light-bg" : ""}`} style={{ background: bg.css }}>
      <div className="viewer-canvas" ref={hostRef} />
      {svg && (
        <div className="svg-view">
          <img alt="2D result" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} />
        </div>
      )}
      {!svg && (!compact || toolsOpen) && (
        <div className={`viewer-tools${compact ? " compact" : ""}`}>
          <div className="segmented views" role="group" aria-label="View">
            {(["iso", "front", "back", "left", "right", "top"] as ViewName[]).map((v) => (
              <button key={v} onClick={() => frame(v)} title={VIEW_TITLES[v]}>
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>
          <span className="sep" />
          <Menu
            label="Show ▾"
            title="What the view shows: edges, see-through, the ligature and a reed"
            align="left"
            className="show-menu"
          >
            {() => (
              <div className="show-list">
                <Check on={edges} set={setEdges} title="Outline the model's edges">
                  Edges
                </Check>
                <Check on={wire} set={setWire} title="Show the triangles">
                  Wireframe
                </Check>
                <Check
                  on={seeThrough}
                  set={setSeeThrough}
                  title="Translucent models: see the chamber and bore through the walls"
                >
                  See-through
                </Check>
                <Check
                  on={ghostOn}
                  set={setGhostOn}
                  title="After a change, the previous shape shows faintly over the new one for a few seconds"
                >
                  Ghost after a change
                </Check>
                {(onLigature || onCap) && (
                  <Check on={showA} set={setShowA} title="Show the mouthpiece (off: the ligature and cap alone)">
                    Mouthpiece
                  </Check>
                )}
                {onLigature && (
                  <>
                    <Check
                      on={!!ligature?.on}
                      set={(on) => onLigature({ on })}
                      title="Show the ligature made for this mouthpiece (grey) on it"
                    >
                      Ligature
                    </Check>
                    {ligature?.on && (
                      <select
                        value={ligature.beside ? "beside" : "on"}
                        onChange={(e) => onLigature({ beside: e.target.value === "beside" })}
                        title="Where the ligature is shown"
                      >
                        <option value="on">On the mouthpiece</option>
                        <option value="beside">Beside it</option>
                      </select>
                    )}
                    <Check
                      on={!!ligature?.reedOn}
                      set={(reed) => onLigature({ reed })}
                      title="Show a reed on the table"
                    >
                      Reed
                    </Check>
                  </>
                )}
                {onCap && (
                  <>
                    <Check
                      on={!!cap?.on}
                      set={(on) => onCap({ on })}
                      title="Show the cap made for this mouthpiece (teal, see-through) on it"
                    >
                      Cap
                    </Check>
                    {cap?.on && (
                      <select
                        value={cap.beside ? "beside" : "on"}
                        onChange={(e) => onCap({ beside: e.target.value === "beside" })}
                        title="Where the cap is shown"
                      >
                        <option value="on">On the mouthpiece</option>
                        <option value="beside">Beside it</option>
                      </select>
                    )}
                  </>
                )}
              </div>
            )}
          </Menu>
          {ghostMode !== "none" && (
            <Toggle
              on={ghostMode === "held"}
              set={toggleLastShape}
              title="Show the shape from before your last change over the model (again)"
            >
              Last shape
            </Toggle>
          )}
          <select
            className={section !== "off" ? "on" : ""}
            value={section}
            onChange={(e) => chooseSection(e.target.value as Section)}
            title="Cut the model open to see the inside"
          >
            <option value="off">Cut open: off</option>
            <option value="length">Cut lengthwise</option>
            <option value="across">Cut across</option>
          </select>
          {section !== "off" && (
            <label
              className="section-pos"
              title={
                section === "length"
                  ? "Cut position across the width (0 = centerline)"
                  : "Cut height along the mouthpiece"
              }
            >
              <input
                type="range"
                min={range[0]}
                max={range[1]}
                step={0.1}
                value={secPos}
                onChange={(e) => setSecPos(Number(e.target.value))}
              />
              <span>{secPos.toFixed(1)}</span>
            </label>
          )}
          {quality}
          <span className="sep" />
          <button
            className="toggle picture"
            onClick={snapshot}
            title="Save this view as a picture (PNG)"
            aria-label="Save a picture of the view"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 8h3l2-2.5h6L17 8h3v11H4z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
          </button>
          {compare && (
            <>
              <span className="sep" />
              <Toggle on={showA} set={setShowA} title="Show A (this design)">
                <span className="swatch a" /> A
              </Toggle>
              <Toggle on={showB} set={setShowB} title="Show B (the one you compare with)">
                <span className="swatch b" /> B
              </Toggle>
              <select value={layout} onChange={(e) => setLayout(e.target.value as "overlay" | "side")}>
                <option value="overlay">Overlay</option>
                <option value="side">Side by side</option>
              </select>
            </>
          )}
        </div>
      )}
      {compare && !svg && labelB && (
        <div className="ab-legend">
          <span title={labelA}>
            <span className="swatch a" /> A {labelA}
          </span>
          <span title={labelB}>
            <span className="swatch b" /> B {labelB}
          </span>
          {onClearB && (
            <button onClick={onClearB} aria-label="Stop comparing (clear B)" title="Stop comparing (clear B)">
              ✕
            </button>
          )}
        </div>
      )}
      <div ref={labelARef} className="model-label a" style={{ display: "none" }}>
        A
      </div>
      <div ref={labelBRef} className="model-label b" style={{ display: "none" }}>
        B
      </div>
      {busy && (
        <div className={`render-progress${stl ? "" : " first"}`} role="status">
          <span className="spinner" aria-hidden="true" />
          {busyLabel ?? "Rendering…"}
          {elapsed >= 1 ? ` ${elapsed.toFixed(0)}s` : ""}
        </div>
      )}
      {overlay}
      {(zoomedIn || (autoCut.current && section !== "off")) && !svg && (
        <button
          className="whole-model"
          onClick={wholeModel}
          title="Zoom out to the whole model (and close the cut auto-zoom made)"
        >
          Whole model
        </button>
      )}
      {!svg && compact && (
        <div className="viewer-tools-toggle">
          {!toolsOpen && section !== "off" && (
            <label className="section-pos">
              <input
                type="range"
                min={range[0]}
                max={range[1]}
                step={0.1}
                value={secPos}
                onChange={(e) => setSecPos(Number(e.target.value))}
              />
            </label>
          )}
          <button onClick={() => setToolsOpen((o) => !o)} aria-label="View options" aria-expanded={toolsOpen}>
            {toolsOpen ? "✕" : "⋯"}
          </button>
        </div>
      )}
    </div>
  );
}

// The colour a section cut shows the walls in: the model's colour, darker (B has its own).
function cutColor(color: number | string) {
  const c = new THREE.Color(color);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  return c.setHSL(hsl.h, Math.min(1, hsl.s * 0.9), hsl.l > 0.25 ? hsl.l * 0.5 : hsl.l + 0.25).getHex();
}
// Edges: dark lines on a light model, light ones on a dark model.
function edgeColor(color: number | string) {
  if (color === B_COLOR) return 0x1d4f80;
  const hex = `#${new THREE.Color(color).getHexString()}`;
  return luminance(hex) < 0.2 ? 0xffffff : 0x000000;
}

function clearModel(group: THREE.Group) {
  for (const o of [...group.children]) {
    group.remove(o);
    if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
  }
}
