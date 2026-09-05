import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Bin, Obstacle } from './physics';
export type Room = { group: THREE.Group; binGroup: THREE.Group; bin: Bin; obstacles: Obstacle[]; animate: (t: number) => void };
const mat = (c: THREE.ColorRepresentation, roughness = .7, metalness = 0) => new THREE.MeshStandardMaterial({ color: c, roughness, metalness });
function mesh(g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D) {
  const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
}
function box(parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, m: THREE.Material, rounded = 0) {
  return mesh(rounded ? new RoundedBoxGeometry(w, h, d, 2, rounded) : new THREE.BoxGeometry(w, h, d), m, x, y, z, parent);
}
function cyl(parent: THREE.Object3D, x: number, y: number, z: number, rt: number, rb: number, h: number, m: THREE.Material, open = false) {
  return mesh(new THREE.CylinderGeometry(rt, rb, h, 40, 1, open), m, x, y, z, parent);
}
function ring(parent: THREE.Object3D, y: number, r: number, tube: number, m: THREE.Material) {
  const o = mesh(new THREE.TorusGeometry(r, tube, 8, 64), m, 0, y, 0, parent); o.rotation.x = Math.PI / 2; return o;
}
function textPanel(parent: THREE.Object3D, text: string, x: number, y: number, z: number, w: number, h: number, color = '#d9e5df', bg = '#163b36', family = 'sans-serif') {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1024, 256); ctx.fillStyle = color; ctx.font = `500 110px ${family}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 512, 137);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }), x, y, z, parent);
}
function grainTexture(color: string, size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size; const ctx = c.getContext('2d')!;
  ctx.fillStyle = color; ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 18000; i++) { const n = Math.random() * 55; ctx.fillStyle = `rgba(${n + 125},${n + 135},${n + 130},.12)`; ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(15, 18); return t;
}
export function createBin(parent: THREE.Object3D, bin: Bin, beach: boolean) {
  const g = new THREE.Group(); g.position.set(bin.x, 0, bin.z); parent.add(g);
  const metal = mat(beach ? '#8f6942' : '#444f4b', .38, .65);
  const inner = mat(beach ? '#292721' : '#24312d', .9); inner.side = THREE.DoubleSide;
  cyl(g, 0, .04, 0, bin.radius * .77, bin.radius * .77, .065, inner);
  if (beach) {
    cyl(g, 0, bin.height / 2, 0, bin.radius, bin.radius * .77, bin.height, inner, true);
    const wood = mat('#b69363', .65);
    for (let i = 0; i < 56; i++) {
      const a = i / 56 * Math.PI * 2;
      const o = box(g, Math.sin(a) * bin.radius * .885, bin.height / 2, Math.cos(a) * bin.radius * .885, .027, bin.height - .02, .03, wood, .006);
      o.rotation.set(Math.cos(a) * .095, a, -Math.sin(a) * .095);
    }
    ring(g, .1, bin.radius * .8, .016, metal);
  } else {
    for (let i = 0; i < 42; i++) {
      const a = i / 42 * Math.PI * 2;
      const path = new THREE.LineCurve3(new THREE.Vector3(Math.sin(a) * bin.radius * .77, .055, Math.cos(a) * bin.radius * .77), new THREE.Vector3(Math.sin(a + .32) * bin.radius, bin.height, Math.cos(a + .32) * bin.radius));
      mesh(new THREE.TubeGeometry(path, 1, .008, 4, false), metal, 0, 0, 0, g);
      const path2 = new THREE.LineCurve3(new THREE.Vector3(Math.sin(a) * bin.radius * .77, .055, Math.cos(a) * bin.radius * .77), new THREE.Vector3(Math.sin(a - .32) * bin.radius, bin.height, Math.cos(a - .32) * bin.radius));
      mesh(new THREE.TubeGeometry(path2, 1, .007, 4, false), metal, 0, 0, 0, g);
    }
    for (let i = 1; i < 8; i++) ring(g, bin.height * i / 8, bin.radius * (.77 + .23 * i / 8), .007, metal);
  }
  ring(g, bin.height, bin.radius, .022, metal); ring(g, .035, bin.radius * .77, .018, metal);
  const target = mesh(new THREE.RingGeometry(bin.radius + .14, bin.radius + .155, 64), new THREE.MeshBasicMaterial({ color: '#d5eb8b', transparent: true, opacity: .6, side: THREE.DoubleSide, depthWrite: false }), 0, .012, 0, g); target.rotation.x = -Math.PI / 2;
  return g;
}
function officeDesk(parent: THREE.Object3D, x: number, z: number, rot: number) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; parent.add(g);
  const top = mat('#dbdfce'), steel = mat('#3c5650', .45, .4), beige = mat('#c7cbb6'), dark = mat('#172e27');
  box(g, 0, .84, 0, 2.7, .105, 1.35, top, .035);
  for (const xx of [-1.13, 1.13]) for (const zz of [-.49, .49]) box(g, xx, .4, zz, .065, .8, .065, steel);
  box(g, .88, .47, .07, .63, .64, 1.02, beige, .015);
  for (let i = 0; i < 3; i++) { box(g, .88, .28 + i * .2, .589, .59, .012, .012, steel); box(g, .88, .36 + i * .2, .601, .2, .025, .02, steel); }
  box(g, -.3, .99, -.14, .57, .2, .47, beige, .035);
  box(g, -.3, 1.32, -.22, .76, .55, .5, beige, .075);
  box(g, -.3, 1.32, .039, .61, .4, .016, dark, .025);
  const screen = textPanel(g, '43  08  91  62', -.3, 1.32, .05, .52, .22, '#8bcec0', '#102b25', 'monospace'); screen.castShadow = false;
  box(g, -.3, .927, .37, .74, .045, .24, beige, .015);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 12; c++) box(g, -.62 + c * .057, .955, .28 + r * .05, .045, .009, .035, steel);
  cyl(g, .7, .97, -.25, .09, .08, .19, mat('#f5f1d8'));
  box(g, -.9, .91, .1, .24, .025, .32, mat('#f7f5df'));
  const chair = new THREE.Group(); chair.position.set(-.25, 0, 1.08); chair.rotation.y = -.15; g.add(chair);
  cyl(chair, 0, .27, 0, .033, .033, .4, steel);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const leg = box(chair, Math.sin(a) * .17, .08, Math.cos(a) * .17, .045, .035, .39, steel); leg.rotation.y = a; }
  box(chair, 0, .52, 0, .59, .13, .56, mat('#235c4f'), .07);
  box(chair, 0, .82, .25, .59, .56, .12, mat('#235c4f'), .09);
  return g;
}
export function buildOffice(): Room {
  const group = new THREE.Group(), obstacles: Obstacle[] = [];
  const carpet = mat('#304c40'); carpet.map = grainTexture('#2a4639'); carpet.roughness = 1;
  box(group, 0, -.11, 0, 18, .2, 23, carpet);
  const wall = mat('#c1d5c8'), trim = mat('#687e70');
  box(group, 0, 2.1, -8.9, 18, 4.2, .2, wall);
  box(group, -8.9, 2.1, 0, .2, 4.2, 18, wall); box(group, 8.9, 2.1, 0, .2, 4.2, 18, wall);
  for (let x = -8; x <= 8; x += 2) box(group, x, 2.1, -8.77, .022, 4.2, .012, trim);
  box(group, 0, .08, -8.72, 18, .16, .075, trim);
  box(group, 0, 4.24, 0, 18, .1, 20, mat('#c4ccbf'));
  const grid = mat('#8f9d90'), glow = new THREE.MeshStandardMaterial({ color: '#f2ffe7', emissive: '#edfbe3', emissiveIntensity: 1.5 });
  for (let z = -8; z <= 8; z += 2) box(group, 0, 4.17, z, 18, .035, .025, grid);
  for (let x = -8; x <= 8; x += 2) box(group, x, 4.17, 0, .025, .035, 20, grid);
  for (let x = -6; x <= 6; x += 4) for (let z = -6; z <= 6; z += 4) {
    box(group, x, 4.135, z, 1.55, .065, .8, mat('#52675c'));
    box(group, x, 4.095, z, 1.44, .025, .68, glow);
  }
  for (const x of [-4.4, 4.4]) for (const z of [-4.5, .1]) {
    officeDesk(group, x, z, x < 0 ? .06 : -.06);
    obstacles.push({ min: { x: x - 1.4, y: .79, z: z - .7 }, max: { x: x + 1.4, y: .91, z: z + .7 } });
    box(group, x, 1.02, z - .82, 3.15, 1.42, .12, mat('#6f9786'), .03);
  }
  // The corridor, clock, and spare furniture give the office its unnervingly ordered scale.
  box(group, -5.5, 1.32, -8.7, 1.45, 2.64, .1, mat('#4c7466'));
  box(group, -5.5, 1.32, -8.61, 1.26, 2.42, .03, mat('#a3b8a7'));
  cyl(group, -5.0, 1.2, -8.5, .04, .04, .035, mat('#b3bbaa', .2, .8)).rotation.x = Math.PI / 2;
  textPanel(group, 'LUMON', 0, 2.65, -8.75, 2.25, .6, '#28534b', '#c1d5c8', 'serif');
  textPanel(group, 'MACRODATA REFINEMENT', 0, 2.08, -8.73, 2.05, .22, '#466459', '#c1d5c8');
  const clock = cyl(group, 5.9, 2.85, -8.72, .32, .32, .06, mat('#e8eddc')); clock.rotation.x = Math.PI / 2;
  box(group, 5.9, 2.94, -8.67, .022, .2, .015, mat('#2f4841')); const hand = box(group, 5.97, 2.85, -8.66, .17, .018, .016, mat('#2f4841')); hand.rotation.z = -.35;
  for (let i = 0; i < 3; i++) { box(group, 6.1 + i * .7, .65, -7.4, .65, 1.3, .6, mat('#859e8b'), .025); for (let j = 0; j < 3; j++) box(group, 6.1 + i * .7, .28 + j * .38, -7.085, .21, .03, .02, trim); }
  const hemi = new THREE.HemisphereLight('#ecfff3', '#203b2c', 2.4); group.add(hemi);
  const light = new THREE.DirectionalLight('#f3ffe8', 2.3); light.position.set(-3, 7, 4); light.castShadow = true; light.shadow.mapSize.set(2048, 2048); light.shadow.camera.left = -11; light.shadow.camera.right = 11; light.shadow.camera.top = 11; light.shadow.camera.bottom = -11; light.shadow.normalBias = .025; light.shadow.bias = -.0001; group.add(light);
  obstacles.push({ min: { x: -9, y: 0, z: -9 }, max: { x: 9, y: 4.3, z: -8.8 } }, { min: { x: -9, y: 4.2, z: -9 }, max: { x: 9, y: 4.4, z: 10 } });
  const bin = { x: .15, z: -1.2, radius: .42, height: .72 };
  return { group, binGroup: createBin(group, bin, false), bin, obstacles, animate() {} };
}

function sofa(parent: THREE.Object3D, x: number, z: number, rotation: number, color: string, width = 3.8) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotation; parent.add(g);
  const fabric = mat(color, .95), base = mat('#8c7252');
  box(g, 0, .19, 0, width - .2, .2, 1.24, base, .08);
  box(g, 0, .43, 0, width, .42, 1.42, fabric, .18);
  box(g, 0, .91, -.55, width, .8, .44, fabric, .19);
  for (const side of [-1, 1]) box(g, side * (width / 2 - .17), .66, .04, .38, .55, 1.36, fabric, .16);
  const count = Math.round(width / 1.2);
  for (let i = 0; i < count; i++) {
    const xx = (i - (count - 1) / 2) * (width - .7) / count;
    box(g, xx, .68, .16, (width - .72) / count - .026, .22, .99, fabric, .12);
    const cushion = box(g, xx, 1.02, -.25, (width - .8) / count - .04, .62, .2, fabric, .09); cushion.rotation.x = -.13;
  }
  const pillow = box(g, -width / 2 + .68, .99, .08, .56, .52, .19, mat('#8b6847', .97), .1); pillow.rotation.set(-.25, .22, -.16);
  const pillow2 = box(g, width / 2 - .65, .96, .1, .49, .5, .19, mat('#b5ac8d', .98), .09); pillow2.rotation.set(-.35, -.3, .18);
  return g;
}
function palm(parent: THREE.Object3D, x: number, z: number, scale: number, turn: number) {
  const g = new THREE.Group(); g.position.set(x, -.12, z); g.rotation.y = turn; g.scale.setScalar(scale); parent.add(g);
  const path = new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(.2, 1.8, 0), new THREE.Vector3(.65, 3.6, .05), new THREE.Vector3(1.1, 5, .1)]);
  mesh(new THREE.TubeGeometry(path, 16, .13, 8, false), mat('#8c8161'), 0, 0, 0, g);
  const leafMat = mat('#537e53', .8); leafMat.side = THREE.DoubleSide;
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2, verts: number[] = [], indices: number[] = [];
    for (let j = 0; j <= 14; j++) {
      const t = j / 14, length = t * 2.65, y = 5 + Math.sin(t * Math.PI) * .65 - t * .9, width = Math.sin(t * Math.PI) * .32;
      for (const side of [-1, 1]) verts.push(1.1 + Math.sin(a) * length + Math.cos(a) * width * side, y - Math.abs(side) * .05, .1 + Math.cos(a) * length - Math.sin(a) * width * side);
      if (j < 14) { const k = j * 2; indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); geo.setIndex(indices); geo.computeVertexNormals(); mesh(geo, leafMat, 0, 0, 0, g);
  }
}
export function buildBeach(): Room {
  const group = new THREE.Group(), obstacles: Obstacle[] = [];
  const stone = mat('#dad7c5', .56), plaster = mat('#ebe7d7', .94), wood = mat('#8d7352', .65), bronze = mat('#514b3e', .34, .65);
  box(group, 0, -.14, 1, 19, .25, 22, stone);
  // Large limestone slabs, airy roof, and slim floor-to-ceiling window frames.
  const seam = mat('#c2c2af');
  for (let x = -9; x <= 9; x += 2.25) box(group, x, -.009, 1, .012, .008, 21, seam);
  for (let z = -8; z <= 10; z += 2.25) box(group, 0, -.008, z, 19, .008, .012, seam);
  box(group, -9.3, 3.35, 0, .25, 6.7, 20, plaster); box(group, 9.3, 3.35, 0, .25, 6.7, 20, plaster);
  box(group, 0, 6.72, 0, 19, .18, 20, plaster);
  for (const x of [-7, -3.5, 0, 3.5, 7]) box(group, x, 6.53, 0, .18, .32, 20, wood);
  for (let x = -9; x <= 9; x += 3) box(group, x, 3.32, -8.7, .085, 6.64, .14, bronze);
  box(group, 0, 6.55, -8.7, 18.2, .16, .18, bronze); box(group, 0, .045, -8.7, 18.2, .07, .17, bronze);
  box(group, 0, 4.85, -8.7, 18.2, .055, .09, bronze);
  // Very light glazing lets the beach remain legible while catching a trace of window tint.
  const glass = new THREE.MeshPhysicalMaterial({ color: '#c6e5df', roughness: .08, transparent: true, opacity: .045, side: THREE.DoubleSide, depthWrite: false });
  const glazing = mesh(new THREE.PlaneGeometry(18.1, 6.5), glass, 0, 3.3, -8.69, group); glazing.castShadow = false;
  const curtain = mat('#e6e0cc', 1); curtain.side = THREE.DoubleSide;
  for (const side of [-1, 1]) for (let i = 0; i < 18; i++) {
    const x = side * (8.3 - i * .065);
    cyl(group, x, 3.24, -8.45 + Math.sin(i * 1.5) * .08, .056, .073, 6.28, curtain, true).castShadow = false;
  }
  // Woven rug and generous curved upholstery.
  const rug = mat('#c5b99a', 1); rug.map = grainTexture('#b7ad94'); rug.map.repeat.set(9, 8);
  box(group, 0, .022, -.15, 12.8, .035, 10.8, rug, .03);
  const border = mat('#a89d81');
  for (const x of [-6.23, 6.23]) box(group, x, .044, -.15, .03, .003, 10.5, border);
  for (const z of [-5.34, 5.04]) box(group, 0, .044, z, 12.5, .003, .03, border);
  sofa(group, -4.45, -.4, Math.PI / 2, '#e8e2cf', 4.8);
  sofa(group, 4.25, -3.3, -.62, '#ddd3bb', 4.0);
  // A chaise makes the left sofa read as a generous designer sectional.
  box(group, -3.25, .42, 1.7, 2.15, .48, 1.44, mat('#e8e2cf'), .2); box(group, -3.22, .69, 1.7, 2.11, .17, 1.4, mat('#e8e2cf'), .12);
  obstacles.push({ min: { x: -5.2, y: .12, z: -2.9 }, max: { x: -3.65, y: 1.3, z: 2.1 } }, { min: { x: -4.4, y: .18, z: 1.0 }, max: { x: -2.13, y: .79, z: 2.42 } }, { min: { x: 2.1, y: .15, z: -5 }, max: { x: 6.4, y: 1.3, z: -1.6 } });
  const tableMat = mat('#b6a887', .4);
  const tabletop = cyl(group, -2.3, .57, -2.1, .85, .85, .15, tableMat); tabletop.scale.set(1.1, 1, 1.65);
  const tableBase = cyl(group, -2.3, .28, -2.1, .44, .51, .54, tableMat); tableBase.scale.z = 1.4;
  obstacles.push({ min: { x: -3.3, y: .49, z: -3.5 }, max: { x: -1.36, y: .67, z: -.7 } });
  box(group, -2.25, .68, -1.65, .5, .07, .65, mat('#394e43')); box(group, -2.21, .725, -1.67, .45, .025, .61, mat('#e3d9c2'));
  const bowl = mesh(new THREE.SphereGeometry(.22, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat('#463d31', .4), -2.4, .67, -2.7, group); bowl.rotation.x = Math.PI;
  cyl(group, -6.1, .56, -3.8, .53, .48, .12, wood); cyl(group, -6.1, .27, -3.8, .17, .21, .5, wood);
  const vase = cyl(group, -6.1, .85, -3.8, .12, .23, .48, mat('#d3c6a7'));
  for (let i = 0; i < 5; i++) { const stem = box(group, vase.position.x + (i - 2) * .045, 1.38 + i * .02, -3.8, .012, .74, .012, wood); stem.rotation.z = (i - 2) * .16; }
  // Sculptural pendants hang in the tall volume at the side of the throwing lane.
  for (let i = 0; i < 3; i++) {
    const x = -3.1 + i * .8, z = -3.3 - i * .35, y = 4.4 + i * .4;
    cyl(group, x, (6.5 + y) / 2, z, .009, .009, 6.5 - y, bronze);
    cyl(group, x, y, z, .2 + i * .025, .46, .45, mat('#d3bd84'), true);
    const bulb = new THREE.PointLight('#ffd9a0', 8, 5, 2); bulb.position.set(x, y - .2, z); group.add(bulb);
  }
  // Slatted walnut feature wall and a floating hearth.
  box(group, -9.13, 2.0, -2, .08, 4, 5.5, mat('#594d3c'));
  for (let i = 0; i < 42; i++) box(group, -9.03, 2, -4.7 + i * .13, .11, 4, .055, wood);
  box(group, -8.95, .64, -2, .3, .15, 5.8, tableMat, .025);
  box(group, -8.86, 1.0, -2, .035, .52, 2.8, mat('#222b24'));
  // Exterior terrace, sand, palms, and gently moving ocean shader.
  box(group, 0, -.15, -12.2, 23, .22, 7.0, mat('#baa884'));
  for (let z = -9.1; z > -15.6; z -= .32) box(group, 0, -.027, z, 23, .008, .018, wood);
  box(group, 0, -.24, -25, 250, .3, 21, mat('#ead8b1', 1));
  const water = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec2 vUv; uniform float time; void main(){float d=vUv.y; vec3 col=mix(vec3(.16,.67,.66),vec3(.09,.37,.49),smoothstep(0.,.5,d)); float w=sin(d*520.+time*.65+sin(vUv.x*42.+time*.15)*1.8); float w2=sin(d*210.+time*.45+vUv.x*17.); float sparkle=pow(max(0.,w*w2),15.); col+=sparkle*.16; float foam=smoothstep(.89,1.,sin(d*260.+time*.38+sin(vUv.x*51.)*.4))*(1.-smoothstep(0.,.06,d)); col=mix(col,vec3(.88,.94,.83),foam*.8); gl_FragColor=vec4(col,1.);}`,
  });
  const sea = mesh(new THREE.PlaneGeometry(250, 150, 1, 1), water, 0, -.11, -108, group); sea.rotation.x = -Math.PI / 2; sea.castShadow = false; sea.receiveShadow = false;
  // A far sea panel meets the sky cleanly from a seated perspective.
  const horizon = mesh(new THREE.PlaneGeometry(260, 6), new THREE.MeshBasicMaterial({ color: '#629da9' }), 0, -3.0, -145, group); horizon.castShadow = false;
  palm(group, -10.5, -19, 1.25, .5); palm(group, 10, -17, 1.25, -1); palm(group, 17, -24, .95, -1.8);
  for (const x of [-5.5, 5.5]) {
    const lounge = new THREE.Group(); lounge.position.set(x, 0, -12.5); lounge.rotation.y = .14; group.add(lounge);
    box(lounge, 0, .27, 0, .88, .13, 2.4, wood, .04); box(lounge, 0, .4, .3, .82, .14, 1.7, mat('#f1e6cc'), .055);
    const back = box(lounge, 0, .65, -.7, .82, .16, .9, mat('#f1e6cc'), .045); back.rotation.x = -.55;
    for (const z of [-.8, .8]) box(lounge, 0, .13, z, .78, .26, .09, wood);
  }
  const hemi = new THREE.HemisphereLight('#d7f3ff', '#998660', 2.5); group.add(hemi);
  const sun = new THREE.DirectionalLight('#ffedc3', 4.5); sun.position.set(-12, 10, -15); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -14; sun.shadow.camera.right = 14; sun.shadow.camera.top = 14; sun.shadow.camera.bottom = -14; sun.shadow.normalBias = .025; sun.shadow.bias = -.0001; group.add(sun);
  const fill = new THREE.DirectionalLight('#fff2d6', 1.2); fill.position.set(1, 5, 6); group.add(fill);
  obstacles.push({ min: { x: -9.4, y: 0, z: -8.8 }, max: { x: 9.4, y: 6.7, z: -8.65 } }, { min: { x: -9.4, y: 6.6, z: -9 }, max: { x: 9.4, y: 6.9, z: 10 } });
  const bin = { x: .6, z: -2.1, radius: .39, height: .83 };
  return { group, binGroup: createBin(group, bin, true), bin, obstacles, animate(t) { water.uniforms.time.value = t; } };
}
