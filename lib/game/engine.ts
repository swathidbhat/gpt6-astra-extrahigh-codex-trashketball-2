import * as THREE from 'three';
import { buildOffice, buildBeach, type Room } from './rooms';
import { createBall, stepBall, trajectory, ORIGIN, BALL_RADIUS, STEP, clamp, type Ball } from './physics';
export type GameState = { level: number; score: number; shots: number; made: number; streak: number; yaw: number; elevation: number; power: number; flying: boolean; ready: boolean; transition: boolean; message: string };
export type GameAPI = { state: GameState; setAim: (yaw: number, elevation: number) => void; setPower: (p: number) => void; shoot: () => boolean; setTrajectory: (show: boolean) => void; setSound: (on: boolean) => void; setPaused: (paused: boolean) => void; nextLevel: () => void; restart: () => void; dispose: () => void };
export function createGame(container: HTMLDivElement, onState: (s: GameState) => void): GameAPI {
  const state: GameState = { level: 1, score: 0, shots: 0, made: 0, streak: 0, yaw: 0, elevation: 51, power: 57, flying: false, ready: false, transition: false, message: '' };
  const emit = () => onState({ ...state });
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#a7c2b0'); scene.fog = new THREE.Fog('#afc9b6', 18, 45);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-label', '3D trashketball room. Drag to aim, then use the Throw button or press Space.'); renderer.domElement.style.touchAction = 'none';
  container.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(57, 1, .05, 150); camera.position.set(0, 2.12, 7.2); camera.lookAt(0, 1.28, -2);
  let room: Room = buildOffice(); scene.add(room.group);
  function paperGeometry() {
    const g = new THREE.IcosahedronGeometry(BALL_RADIUS, 2); const p = g.getAttribute('position');
    // Coordinate-derived deformation keeps shared vertices sealed while forming crumpled facets.
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const k = 1 + .12 * Math.sin(x * 153 + y * 61) * Math.cos(z * 129 - x * 51);
      p.setXYZ(i, x * k, y * k, z * k);
    }
    g.computeVertexNormals(); return g;
  }
  const paperMat = new THREE.MeshStandardMaterial({ color: '#f8f5e9', roughness: 1, flatShading: true });
  const ballGeo = paperGeometry(); const held = new THREE.Mesh(ballGeo, paperMat); held.castShadow = true; held.position.set(ORIGIN.x, ORIGIN.y, ORIGIN.z); scene.add(held);
  const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(.025, 6, 6), new THREE.MeshBasicMaterial({ color: '#efffcc', transparent: true, opacity: .86, depthTest: true }), 65); dots.instanceMatrix.setUsage(THREE.DynamicDrawUsage); dots.frustumCulled = false; scene.add(dots);
  const landing = new THREE.Mesh(new THREE.RingGeometry(.12, .15, 40), new THREE.MeshBasicMaterial({ color: '#efffcc', transparent: true, opacity: .8, side: THREE.DoubleSide })); landing.rotation.x = -Math.PI / 2; scene.add(landing);
  const matrix = new THREE.Matrix4(); let showTrajectory = true, paused = false, sound = false, disposed = false;
  let live: { body: Ball; mesh: THREE.Mesh; outcome: boolean } | null = null;
  const settled: THREE.Mesh[] = [];
  let accumulator = 0, lastTime = 0, frame = 0, messageTime = 0, audio: AudioContext | undefined;
  function play(kind: 'throw' | 'hit' | 'make') {
    if (!sound) return;
    try { audio ??= new AudioContext(); void audio.resume();
      const t = audio.currentTime;
      (kind === 'make' ? [523, 659, 784] : [kind === 'throw' ? 180 : 90]).forEach((f, i) => { const osc = audio!.createOscillator(), gain = audio!.createGain(); osc.connect(gain); gain.connect(audio!.destination); osc.type = kind === 'make' ? 'sine' : 'triangle'; osc.frequency.setValueAtTime(f, t + i * .09); gain.gain.setValueAtTime(.0001, t); gain.gain.setValueAtTime(.06, t + i * .09); gain.gain.exponentialRampToValueAtTime(.0001, t + i * .09 + .18); osc.start(t + i * .09); osc.stop(t + i * .09 + .2); });
    } catch { /* Sound is optional when audio is unavailable. */ }
  }
  function updateArc() {
    const visible = showTrajectory && !state.transition;
    dots.visible = landing.visible = visible;
    if (!visible) return;
    const points = trajectory(state.yaw, state.elevation, state.power, room.bin, room.obstacles);
    dots.count = Math.min(points.length, 65);
    for (let i = 0; i < dots.count; i++) { matrix.makeTranslation(points[i].x, points[i].y, points[i].z); dots.setMatrixAt(i, matrix); }
    dots.instanceMatrix.needsUpdate = true;
    const end = points[points.length - 1]; landing.position.set(end.x, Math.max(.02, end.y - .08), end.z);
  }
  function clearBalls() { if (live) scene.remove(live.mesh); live = null; settled.forEach(m => scene.remove(m)); settled.length = 0; }
  function disposeRoom(r: Room) {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
    r.group.traverse(o => { if (o instanceof THREE.Mesh) { geometries.add(o.geometry); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { materials.add(m); for (const v of Object.values(m)) if (v instanceof THREE.Texture) textures.add(v); }); } if (o instanceof THREE.Light && 'shadow' in o) (o as THREE.DirectionalLight).shadow?.dispose(); });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); scene.remove(r.group);
  }
  function changeRoom(level: number) {
    clearBalls(); disposeRoom(room); room = level === 1 ? buildOffice() : buildBeach(); scene.add(room.group);
    scene.background = new THREE.Color(level === 1 ? '#a7c2b0' : '#b0dce0'); scene.fog = new THREE.Fog(level === 1 ? '#afc9b6' : '#c1e0df', 25, 95);
    state.level = level; state.flying = false; state.transition = false; state.yaw = 0; state.elevation = 51; state.power = level === 1 ? 57 : 62; held.visible = true; updateArc(); emit();
  }
  const api: GameAPI = {
    state,
    setAim(yaw, elevation) { if (state.flying || state.transition || paused) return; state.yaw = clamp(yaw, -34, 34); state.elevation = clamp(elevation, 23, 67); updateArc(); emit(); },
    setPower(power) { if (state.flying || state.transition || paused) return; state.power = clamp(power, 10, 100); updateArc(); emit(); },
    shoot() {
      if (!state.ready || state.flying || state.transition || paused) return false;
      state.flying = true; state.shots++; state.message = ''; held.visible = false;
      const m = new THREE.Mesh(ballGeo, paperMat); m.castShadow = true; m.position.copy(held.position); scene.add(m);
      live = { body: createBall(state.yaw, state.elevation, state.power), mesh: m, outcome: false }; updateArc(); play('throw'); emit(); return true;
    },
    setTrajectory(show) { showTrajectory = show; updateArc(); }, setSound(on) { sound = on; }, setPaused(value) { paused = value; accumulator = 0; },
    nextLevel() { if (state.level === 1 && state.score >= 100) { state.message = 'Welcome to your outie life.'; changeRoom(2); messageTime = performance.now() + 3000; } },
    restart() { Object.assign(state, { score: 0, shots: 0, made: 0, streak: 0, message: '' }); changeRoom(1); },
    dispose() { disposed = true; cancelAnimationFrame(frame); resize.disconnect(); clearBalls(); disposeRoom(room); ballGeo.dispose(); paperMat.dispose(); dots.geometry.dispose(); (dots.material as THREE.Material).dispose(); landing.geometry.dispose(); (landing.material as THREE.Material).dispose(); renderer.dispose(); renderer.domElement.remove(); void audio?.close(); }
  };
  const resize = new ResizeObserver(() => { const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return; renderer.setSize(w, h); camera.aspect = w / h; camera.fov = w / h < .85 ? 72 : 57; camera.updateProjectionMatrix(); }); resize.observe(container);
  function animate(now: number) {
    if (disposed) return; frame = requestAnimationFrame(animate);
    const dt = lastTime ? Math.min((now - lastTime) / 1000, .05) : 0; lastTime = now;
    if (!paused && !document.hidden) {
      room.animate(now / 1000);
      held.rotation.set(now * .00013, now * .0002, .3); held.position.y = ORIGIN.y + Math.sin(now * .002) * .014;
      if (live) {
        accumulator += dt;
        while (accumulator >= STEP && live) {
          const oldBounces = live.body.bounces, made = stepBall(live.body, room.bin, room.obstacles); accumulator -= STEP;
          if (live.body.bounces > oldBounces && live.body.age < 2.5) play('hit');
          if (made && !live.outcome) {
            live.outcome = true; state.score += 10; state.made++; state.streak++; state.message = state.streak >= 3 ? `${state.streak} in a row. +10` : 'Beautifully disposed. +10'; messageTime = now + 2700; play('make'); emit();
          }
          if (live.body.age > 3.2 || (live.body.age > 1.5 && live.body.p.y < .22 && Math.hypot(live.body.v.x, live.body.v.y, live.body.v.z) < .2)) {
            if (!live.outcome) { state.streak = 0; state.message = 'A little adjustment. Another shot.'; messageTime = now + 2200; }
            live.mesh.position.set(live.body.p.x, live.body.p.y, live.body.p.z);
            settled.push(live.mesh); if (settled.length > 14) scene.remove(settled.shift()!); live = null; state.flying = false;
            state.transition = state.level === 1 && state.score >= 100;
            held.visible = !state.transition; updateArc(); emit();
          }
        }
        if (live) { live.mesh.position.set(live.body.p.x, live.body.p.y, live.body.p.z); live.mesh.rotation.x += dt * 7; live.mesh.rotation.z += dt * 4; }
      }
      if (state.message && now > messageTime && !state.transition) { state.message = ''; emit(); }
    }
    renderer.render(scene, camera);
  }
  updateArc(); state.ready = true; emit(); frame = requestAnimationFrame(animate); return api;
}
