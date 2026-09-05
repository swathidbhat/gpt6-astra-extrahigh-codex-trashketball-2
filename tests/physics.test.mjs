import test from 'node:test';
import assert from 'node:assert/strict';
import { createBall, stepBall, integrate, trajectory, STEP, DRAG, GRAVITY, BALL_RADIUS } from '../lib/game/physics.ts';
const office = { x: .15, z: -1.2, radius: .42, height: .72 };
const beach = { x: .6, z: -2.1, radius: .39, height: .83 };
function run(ball, bin, obstacles = []) { let makes = 0; for (let i = 0; i < 800; i++) makes += Number(stepBall(ball, bin, obstacles)); return { ball, makes }; }
test('flight follows the exact gravity-and-drag solution and is independent of step size', () => {
  const b = createBall(5, 51, 63), start = structuredClone(b), dt = 1.1;
  integrate(b, dt);
  const decay = Math.exp(-DRAG * dt);
  assert.ok(Math.abs(b.p.y - (start.p.y + (start.v.y + GRAVITY / DRAG) * (1 - decay) / DRAG - GRAVITY * dt / DRAG)) < 1e-10);
  const fine = structuredClone(start); for (let i = 0; i < 198; i++) integrate(fine, STEP);
  for (const k of ['x', 'y', 'z']) assert.ok(Math.abs(b.p[k] - fine.p[k]) < 1e-10);
});
test('a descending ball fully inside either opening scores exactly once', () => {
  for (const bin of [office, beach]) {
    const ball = { p: { x: bin.x, y: 1.3, z: bin.z }, v: { x: 0, y: -1, z: 0 }, scored: false, age: 0, bounces: 0 };
    const result = run(ball, bin); assert.equal(result.makes, 1); assert.equal(result.ball.scored, true); assert.ok(result.ball.p.y >= BALL_RADIUS);
  }
});
test('achievable human throws make both levels without furniture or ceiling interference', () => {
  assert.equal(run(createBall(1.25, 51, 63), office, [{ min: { x: -9, y: 4.2, z: -9 }, max: { x: 9, y: 4.4, z: 10 } }]).makes, 1);
  assert.equal(run(createBall(4.5, 51, 74), beach).makes, 1);
});
test('wide, weak and excessively strong throws are misses', () => {
  for (const args of [[18, 51, 63], [0, 51, 15], [-15, 35, 100]]) assert.equal(run(createBall(...args), office).makes, 0);
});
test('crossing the rim plane beside the basket cannot score', () => {
  const ball = { p: { x: office.x + office.radius + .2, y: .73, z: office.z }, v: { x: 0, y: -3, z: 0 }, scored: false, age: 0, bounces: 0 };
  assert.equal(run(ball, office).makes, 0);
});
test('upward crossings do not score', () => {
  const ball = { p: { x: office.x, y: .71, z: office.z }, v: { x: 0, y: 3, z: 0 }, scored: false, age: 0, bounces: 0 };
  assert.equal(stepBall(ball, office), false); assert.equal(ball.scored, false); assert.ok(ball.p.y > office.height);
});
test('the metal rim deflects the ball with energy loss', () => {
  const ball = { p: { x: office.x + office.radius, y: office.height + BALL_RADIUS + .024, z: office.z }, v: { x: 0, y: -3, z: 0 }, scored: false, age: 0, bounces: 0 };
  stepBall(ball, office); assert.ok(ball.v.y > 0); assert.ok(ball.v.y < 3); assert.equal(ball.scored, false);
});
test('floor and furniture collisions rebound instead of passing through', () => {
  const b = { p: { x: 3, y: .11, z: 2 }, v: { x: 1, y: -4, z: 0 }, scored: false, age: 0, bounces: 0 };
  stepBall(b, office); assert.ok(b.v.y > 0); assert.ok(b.v.y < 4); assert.ok(b.p.y >= BALL_RADIUS);
  const table = { min: { x: 2, y: .8, z: 1 }, max: { x: 4, y: 1, z: 3 } };
  b.p.y = 1.11; b.v.y = -4; stepBall(b, office, [table]); assert.ok(b.v.y > 0); assert.ok(b.p.y >= 1 + BALL_RADIUS - .00001);
});
test('the visible trajectory uses the same coordinates as the live simulation', () => {
  const arc = trajectory(1.25, 51, 63, office), b = createBall(1.25, 51, 63); const sampled = [structuredClone(b.p)];
  for (let i = 0; i < 540; i++) { stepBall(b, office); if (i % 9 === 0) sampled.push(structuredClone(b.p)); if (b.scored || b.bounces > 0) break; }
  assert.deepEqual(arc, sampled); assert.ok(arc.length > 20);
});
test('a sweep across the full controls stays finite and above the floor', () => {
  for (const yaw of [-34, 0, 34]) for (const elevation of [23, 45, 67]) for (const power of [10, 55, 100]) {
    const { ball } = run(createBall(yaw, elevation, power), office);
    for (const v of Object.values(ball.p)) assert.ok(Number.isFinite(v)); assert.ok(ball.p.y >= BALL_RADIUS - 1e-6);
  }
});
