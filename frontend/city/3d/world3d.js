/* world3d.js - StarNet 3D mirror. Vanilla port of Astra's CanvasScene (pauli-command-center
   astra/3d-city-review-20260918), plus the live agent-motion layer Astra deliberately left
   unbound. On-demand rendering (no idle loop); rAF runs only while agents move. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export const WORLDS = {
  pauli:    { title: "Pauli's Place",    eyebrow: "WATERFRONT CAMPUS / 01", description: "A civic waterfront for culture, research and work.", camera: [34, 29, 40], target: [0, 2, 2], extent: 43, places: ["Terraced headquarters", "Research colonnade", "Cultural forum", "Tide terrace"] },
  polly:    { title: "Polly's Place",    eyebrow: "FICTIONAL STORY WORLD / 02", description: "A warm soundstage and story house. Entirely fictional.", camera: [32, 26, 38], target: [0, 2, 0], extent: 36, places: ["Barrel-vault soundstage", "Rehearsal courtyard", "Story house", "Timber pergola"] },
  officina: { title: "Officina de Bambu", eyebrow: "PRIVATE OFFICE CONCEPT / 03", description: "Generic office geometry only. No private account data.", camera: [24, 19, 29], target: [0, 1.6, 0], extent: 25, places: ["Quiet workspace", "Reading shelves", "Timber screen", "Garden edge"], ownerOnly: true },
};

export function createWorld3D(container, opts = {}) {
  const emit = (name, extra = {}) => {
    window.dispatchEvent(new CustomEvent("starnet-scene-telemetry", { detail: { name, ...extra } }));
  };
  const canvasHost = document.createElement("div");
  canvasHost.style.cssText = "position:relative;width:100%;height:100%;";
  container.appendChild(canvasHost);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: (opts.tier || "low") === "standard", alpha: false, powerPreference: "low-power" });
  } catch {
    opts.onError && opts.onError("3D is unavailable on this browser. The 2D city remains available.");
    return null;
  }
  const canvas = renderer.domElement;
  canvas.setAttribute("role", "img");
  canvasHost.appendChild(canvas);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 1500);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false; controls.autoRotate = false; controls.enablePan = false;

  let world = null, tier = opts.tier || "low", ready = false, stopped = false, failed = false;
  let worldGroup = null, chairGroup = null, environment = null;
  const agentGroup = new THREE.Group(); scene.add(agentGroup);
  const agents = new Map(); // id -> {mesh, from:Vector3, to:Vector3, t}
  let animFrame = 0, agentMotionActive = false;

  const hemi = new THREE.HemisphereLight(0xd7e5ec, 0x706247, 2.1); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe3b2, 3.6); sun.position.set(-22, 37, 24);
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.00035; sun.shadow.normalBias = 0.05; scene.add(sun);

  let pending = 0, cameraDemand = false;
  function render() {
    pending = 0; const camFrame = cameraDemand; cameraDemand = false;
    if (stopped || failed || document.hidden || !ready || !canvasHost.clientWidth) return;
    renderer.render(scene, camera);
    canvas.dataset.frames = String((+canvas.dataset.frames || 0) + 1);
    if (camFrame) emit("scene.frame");
  }
  function invalidate(cameraChange = false) {
    if (stopped || failed || document.hidden) return;
    cameraDemand = cameraDemand || cameraChange;
    if (!pending) pending = requestAnimationFrame(render);
  }
  controls.addEventListener("change", () => invalidate(true));

  /* Agent motion layer: the piece Astra left unbound (activityProps). Agents arrive as
     {id, x, z, color, label} in WORLD ground-plane coords (mapped by the caller from the
     2D city tile frame). Smooth-lerped; rAF lives only while an agent is in transit. */
  function setAgents(list, mapExtent) {
    const meta = WORLDS[world] || WORLDS.pauli;
    const half = (mapExtent || meta.extent) / 2;
    const seen = new Set();
    for (const a of list) {
      seen.add(a.id);
      const tx = Math.max(-half, Math.min(half, a.x)), tz = Math.max(-half, Math.min(half, a.z));
      let rec = agents.get(a.id);
      if (!rec) {
        const geo = new THREE.CapsuleGeometry(0.35, 0.9, 4, 8);
        const mat = new THREE.MeshStandardMaterial({ color: a.color || 0xffd166, roughness: 0.6 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(tx, 1.1, tz); mesh.castShadow = tier === "standard";
        agentGroup.add(mesh);
        rec = { mesh, from: new THREE.Vector3(tx, 1.1, tz), to: new THREE.Vector3(tx, 1.1, tz), t: 1 };
        agents.set(a.id, rec);
      }
      if (rec.to.x !== tx || rec.to.z !== tz) {
        rec.from.copy(rec.mesh.position); rec.to.set(tx, 1.1, tz); rec.t = 0;
      }
    }
    for (const [id, rec] of agents) {
      if (!seen.has(id)) { agentGroup.remove(rec.mesh); rec.mesh.geometry.dispose(); rec.mesh.material.dispose(); agents.delete(id); }
    }
    if (!agentMotionActive && [...agents.values()].some(r => r.t < 1)) {
      agentMotionActive = true; canvas.dataset.motion = "agents"; tick();
    }
  }
  function tick() {
    if (stopped || failed) { agentMotionActive = false; return; }
    let moving = false;
    for (const rec of agents.values()) {
      if (rec.t < 1) {
        rec.t = Math.min(1, rec.t + 0.04);
        rec.mesh.position.lerpVectors(rec.from, rec.to, rec.t);
        moving = true;
      }
    }
    if (ready && !document.hidden) renderer.render(scene, camera);
    if (moving) animFrame = requestAnimationFrame(tick);
    else { agentMotionActive = false; canvas.dataset.motion = "idle"; }
  }

  function fit() {
    const w = canvasHost.clientWidth, h = canvasHost.clientHeight;
    if (w <= 0 || h <= 0) return;
    renderer.setPixelRatio(tier === "low" ? Math.min(window.devicePixelRatio || 1, 1) : Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix(); controls.update(); invalidate();
  }
  new ResizeObserver(fit).observe(canvasHost);

  const loader = new GLTFLoader();
  function prepare(root) {
    root.traverse(o => { if (o.isMesh) { o.castShadow = tier === "standard"; o.receiveShadow = tier === "standard";
      if (tier === "low") { const ms = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of ms) if (m.isMeshStandardMaterial) { m.metalness = Math.min(m.metalness, 0.3); m.roughness = Math.max(m.roughness, 0.35); } } } });
  }
  function disposeObject(root) {
    const gs = new Set(), ms = new Set(), ts = new Set();
    root.traverse(o => { if (o.isMesh) { gs.add(o.geometry); for (const m of Array.isArray(o.material) ? o.material : [o.material]) { ms.add(m); for (const v of Object.values(m)) if (v && v.isTexture) ts.add(v); } } });
    gs.forEach(g => g.dispose()); ms.forEach(m => m.dispose()); ts.forEach(t => t.dispose());
  }

  async function loadWorld(nextWorld, nextTier) {
    const meta = WORLDS[nextWorld]; if (!meta) return;
    if (meta.ownerOnly && !opts.ownerMode) { opts.onError && opts.onError("Officina is owner-mode only."); return; }
    world = nextWorld; tier = nextTier || tier;
    ready = false; canvas.dataset.ready = "false"; canvas.dataset.world = world; canvas.dataset.tier = tier;
    if (worldGroup) { scene.remove(worldGroup); disposeObject(worldGroup); worldGroup = null; }
    if (chairGroup) { scene.remove(chairGroup); disposeObject(chairGroup); chairGroup = null; }
    scene.background = new THREE.Color(world === "polly" ? "#b8a28b" : world === "officina" ? "#a4a594" : "#718a8d");
    renderer.shadowMap.enabled = tier === "standard";
    if (tier === "standard" && !environment) {
      const pmrem = new THREE.PMREMGenerator(renderer);
      environment = pmrem.fromScene(new RoomEnvironment(), 0.04); pmrem.dispose();
    }
    scene.environment = tier === "standard" && environment ? environment.texture : null;
    if (scene.environment) scene.environmentIntensity = 0.45;
    sun.castShadow = tier === "standard";
    const s = meta.extent * 0.64;
    Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 100 });
    camera.position.set(...meta.camera); controls.target.set(...meta.target);
    controls.minPolarAngle = 0.25; controls.maxPolarAngle = Math.PI / 2.2;
    controls.minDistance = meta.extent * 0.62; controls.maxDistance = meta.extent * 2.7;
    controls.update();
    const groundColor = world === "pauli" ? 0x536e73 : world === "polly" ? 0x9e8772 : 0x848c7c;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshStandardMaterial({ color: groundColor, roughness: 0.94 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.52; ground.receiveShadow = true;
    worldGroup = new THREE.Group(); worldGroup.add(ground); scene.add(worldGroup);
    emit("scene.requested", { world, tier });
    const timeout = setTimeout(() => fail("The architectural asset timed out. Switch to 2D or retry."), 15000);
    try {
      const gltf = await loader.loadAsync(`/worlds/${world}/${tier}.glb`);
      if (stopped || failed) { disposeObject(gltf.scene); return; }
      prepare(gltf.scene); worldGroup.add(gltf.scene);
      const floorTexture = await new THREE.TextureLoader().loadAsync(`/worlds/${world}/contact.png`);
      floorTexture.colorSpace = THREE.SRGBColorSpace;
      const footprint = world === "pauli" ? [36, 26, 0.475] : world === "polly" ? [30, 23, 0.49] : [20, 16, 0.47];
      const fc = new THREE.Mesh(new THREE.PlaneGeometry(footprint[0], footprint[1]),
        new THREE.MeshBasicMaterial({ map: floorTexture, transparent: true, depthWrite: false, opacity: tier === "low" ? 1 : 0.65 }));
      fc.rotation.x = -Math.PI / 2; fc.position.y = footprint[2]; worldGroup.add(fc);
      clearTimeout(timeout);
      renderer.compile(scene, camera); renderer.shadowMap.needsUpdate = true;
      ready = true; canvas.dataset.ready = "true"; emit("scene.usable", { world, tier });
      opts.onReady && opts.onReady(world, tier);
      invalidate();
      if (world === "officina" && tier === "standard") {
        loader.loadAsync("/worlds/officina/sheen-chair.glb").then(({ scene: chair }) => {
          if (stopped || failed) { disposeObject(chair); return; }
          chair.scale.setScalar(2.5); chair.position.set(-2, 0.52, 2.15); chair.rotation.y = Math.PI;
          prepare(chair); chairGroup = chair; scene.add(chair); renderer.shadowMap.needsUpdate = true; invalidate();
        }).catch(() => {});
      }
    } catch { clearTimeout(timeout); fail("The architectural asset could not be loaded. The 2D city remains available."); }
  }
  function fail(msg) { if (stopped || failed) return; failed = true; canvas.dataset.ready = "false"; emit("scene.failed", { reason: msg }); opts.onError && opts.onError(msg); }
  canvas.addEventListener("webglcontextlost", e => { e.preventDefault(); fail("The graphics context was lost. Switch to 2D or retry."); });

  const api = {
    loadWorld,
    setAgents,
    explore(enabled) { controls.enabled = enabled; controls.enableZoom = enabled; canvas.style.touchAction = enabled ? "none" : "pan-y"; },
    command(action) {
      const meta = WORLDS[world] || WORLDS.pauli;
      if (action === "reset") { camera.position.set(...meta.camera); controls.target.set(...meta.target); }
      else { const off = camera.position.clone().sub(controls.target);
        if (action === "left" || action === "right") off.applyAxisAngle(new THREE.Vector3(0, 1, 0), action === "left" ? -0.2 : 0.2);
        else off.multiplyScalar(action === "in" ? 0.88 : 1.14);
        off.clampLength(controls.minDistance, controls.maxDistance); camera.position.copy(controls.target).add(off); }
      controls.update(); invalidate(true);
    },
    dispose() { stopped = true; cancelAnimationFrame(pending); cancelAnimationFrame(animFrame); controls.dispose(); disposeObject(scene); sun.shadow.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvasHost.remove(); },
    worlds: WORLDS,
  };
  api.explore(opts.explore !== false);
  fit();
  return api;
}
