export type Vec = { x: number; y: number; z: number };
export type Bin = { x: number; z: number; radius: number; height: number };
export type Obstacle = { min: Vec; max: Vec };
export type Ball = { p: Vec; v: Vec; scored: boolean; age: number; bounces: number };
export const GRAVITY = 9.81;
export const DRAG = 0.16;
export const BALL_RADIUS = 0.105;
export const STEP = 1 / 180;
export const ORIGIN: Vec = { x: 0, y: 1.48, z: 5.7 };
export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
export function velocity(yaw: number, elevation: number, power: number): Vec {
  const speed = 4.5 + power * .065, a = elevation * Math.PI / 180, b = yaw * Math.PI / 180;
  return { x: Math.sin(b) * Math.cos(a) * speed, y: Math.sin(a) * speed, z: -Math.cos(b) * Math.cos(a) * speed };
}
export function createBall(yaw: number, elevation: number, power: number): Ball {
  return { p: { ...ORIGIN }, v: velocity(yaw, elevation, power), scored: false, age: 0, bounces: 0 };
}
// Exact integration of gravity with linear aerodynamic drag. Shared by the preview and live shot.
export function integrate(ball: Ball, dt: number) {
  const decay = Math.exp(-DRAG * dt), k = (1 - decay) / DRAG;
  ball.p.x += ball.v.x * k;
  ball.p.y += (ball.v.y + GRAVITY / DRAG) * k - GRAVITY * dt / DRAG;
  ball.p.z += ball.v.z * k;
  ball.v.x *= decay; ball.v.z *= decay;
  ball.v.y = (ball.v.y + GRAVITY / DRAG) * decay - GRAVITY / DRAG;
  ball.age += dt;
}
function rebound(ball: Ball, nx: number, ny: number, nz: number, restitution: number) {
  const inward = ball.v.x * nx + ball.v.y * ny + ball.v.z * nz;
  if (inward < 0) {
    ball.v.x -= (1 + restitution) * inward * nx;
    ball.v.y -= (1 + restitution) * inward * ny;
    ball.v.z -= (1 + restitution) * inward * nz;
    ball.bounces++;
  }
}
export function stepBall(ball: Ball, bin: Bin, obstacles: Obstacle[] = [], dt = STEP): boolean {
  const old = { ...ball.p };
  integrate(ball, dt);
  const p = ball.p, r = BALL_RADIUS;
  let made = false;
  // A make requires a downward crossing through the opening, with the whole ball clear of the rim.
  if (!ball.scored && old.y > bin.height && p.y <= bin.height && ball.v.y < 0) {
    const t = (old.y - bin.height) / (old.y - p.y);
    const x = old.x + (p.x - old.x) * t - bin.x, z = old.z + (p.z - old.z) * t - bin.z;
    if (Math.hypot(x, z) < bin.radius - r - .022) { ball.scored = true; made = true; }
  }
  let dx = p.x - bin.x, dz = p.z - bin.z, radial = Math.hypot(dx, dz);
  // Sphere against the circular metal rim (a torus), including realistic rim deflections.
  if (radial > .001) {
    const qx = bin.x + dx / radial * bin.radius, qz = bin.z + dz / radial * bin.radius;
    const nx = p.x - qx, ny = p.y - bin.height, nz = p.z - qz, d = Math.hypot(nx, ny, nz), limit = r + .022;
    if (d < limit && d > .00001) {
      p.x += nx / d * (limit - d); p.y += ny / d * (limit - d); p.z += nz / d * (limit - d);
      rebound(ball, nx / d, ny / d, nz / d, .38);
    }
  }
  dx = p.x - bin.x; dz = p.z - bin.z; radial = Math.hypot(dx, dz);
  if (p.y < bin.height - .04 && p.y > .045 && radial > .001) {
    const wallR = bin.radius * (.77 + .23 * clamp(p.y / bin.height, 0, 1));
    if (Math.abs(radial - wallR) < r + .018) {
      const side = radial < wallR ? -1 : 1;
      p.x = bin.x + dx / radial * (wallR + side * (r + .019));
      p.z = bin.z + dz / radial * (wallR + side * (r + .019));
      rebound(ball, dx / radial * side, 0, dz / radial * side, .3);
    }
  }
  const bottom = radial < bin.radius * .77 ? .06 : 0;
  if (p.y < bottom + r) {
    p.y = bottom + r;
    rebound(ball, 0, 1, 0, .28);
    const friction = Math.exp(-7 * dt); ball.v.x *= friction; ball.v.z *= friction;
    if (Math.abs(ball.v.y) < .13) ball.v.y = 0;
  }
  for (const box of obstacles) {
    const q = { x: clamp(p.x, box.min.x, box.max.x), y: clamp(p.y, box.min.y, box.max.y), z: clamp(p.z, box.min.z, box.max.z) };
    const n = { x: p.x - q.x, y: p.y - q.y, z: p.z - q.z }, d = Math.hypot(n.x, n.y, n.z);
    if (d < r && d > .000001) {
      p.x += n.x / d * (r - d); p.y += n.y / d * (r - d); p.z += n.z / d * (r - d);
      rebound(ball, n.x / d, n.y / d, n.z / d, .28);
    }
  }
  return made;
}
export function trajectory(yaw: number, elevation: number, power: number, bin: Bin, obstacles: Obstacle[] = []) {
  const b = createBall(yaw, elevation, power), points: Vec[] = [{ ...b.p }];
  for (let i = 0; i < 540; i++) {
    stepBall(b, bin, obstacles);
    if (i % 9 === 0) points.push({ ...b.p });
    if (b.scored || b.bounces > 0) break;
  }
  return points;
}
