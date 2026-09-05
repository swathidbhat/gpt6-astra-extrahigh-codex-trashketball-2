import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import path from 'node:path';
// Exercise the real scene builders and game loop without a GPU. Only the renderer and browser hosts are replaced.
test('ten real throws unlock the beach, its throws add points, and restart resets the session', async () => {
  const bundled = await build({ entryPoints: ['lib/game/engine.ts'], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent', plugins: [{ name: 'headless-renderer', setup(b) {
    b.onResolve({ filter: /^three$/ }, () => ({ path: 'three', namespace: 'headless' }));
    b.onLoad({ filter: /.*/, namespace: 'headless' }, () => ({ resolveDir: process.cwd(), contents: `export * from ${JSON.stringify(path.resolve('node_modules/three/build/three.module.js'))}; export class WebGLRenderer { constructor(){this.shadowMap={}; this.domElement={style:{},setAttribute(){},remove(){}};} setPixelRatio(){} setSize(){} render(){} dispose(){} }` }));
  } }] });
  let nextFrame, time = performance.now();
  globalThis.window = { devicePixelRatio: 1 };
  globalThis.document = { hidden: false, createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {}, fillText() {} }) }) };
  globalThis.ResizeObserver = class { constructor(cb) { this.cb = cb; } observe() { this.cb(); } disconnect() {} };
  globalThis.requestAnimationFrame = cb => { nextFrame = cb; return 1; };
  globalThis.cancelAnimationFrame = () => {};
  const { createGame } = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));
  const snapshots = [], g = createGame({ clientWidth: 1280, clientHeight: 800, appendChild() {} }, s => snapshots.push(s));
  const advance = n => { for (let i = 0; i < n; i++) { time += 1000 / 60; nextFrame(time); } };
  assert.equal(g.state.ready, true); assert.equal(g.state.level, 1);
  g.nextLevel(); assert.equal(g.state.level, 1);
  g.setAim(1.25, 51); g.setPower(63);
  g.setPaused(true); assert.equal(g.shoot(), false); g.setPaused(false);
  for (let i = 1; i <= 10; i++) {
    assert.equal(g.shoot(), true); assert.equal(g.shoot(), false, 'prevent multiple simultaneous shots'); advance(240);
    assert.equal(g.state.score, i * 10); assert.equal(g.state.made, i); assert.equal(g.state.transition, i === 10);
  }
  assert.equal(g.state.shots, 10); assert.equal(g.shoot(), false);
  g.nextLevel(); assert.equal(g.state.level, 2); assert.equal(g.state.score, 100); assert.equal(g.state.transition, false);
  g.setAim(4.5, 51); g.setPower(74); assert.equal(g.shoot(), true); advance(240);
  assert.equal(g.state.score, 110); assert.equal(g.state.made, 11);
  g.setAim(25, 30); g.setPower(20); g.shoot(); advance(240); assert.equal(g.state.score, 110); assert.equal(g.state.streak, 0);
  g.restart(); assert.equal(g.state.level, 1); assert.equal(g.state.score, 0); assert.equal(g.state.shots, 0); assert.equal(g.state.made, 0); assert.equal(g.state.flying, false);
  assert.ok(snapshots.some(s => s.score === 100 && s.transition));
  g.dispose();
});
