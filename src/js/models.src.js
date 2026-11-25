// مدل‌های سه‌بعدی: یک رندرر WebGL مشترک؛ تصویر هر مدل روی canvas دوبعدی خودش کپی می‌شود
import * as THREE from 'three';

const C = (h) => new THREE.Color(h);
const GOLD = C('#C5A558'), GOLDL = C('#E6D3A0'), EARTH = C('#B8693A'), BLUE = C('#6F86D6'), NAVY = C('#22377d'), DEEP = C('#13214A'), WHITE = C('#FFF3CF');
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const lineMat = (c, o = 0.6) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: o });
const fillMat = (c, o = 0.2) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false });
const wireMat = (c, o = 0.5) => new THREE.MeshBasicMaterial({ color: c, wireframe: true, transparent: true, opacity: o, depthWrite: false });
const solid = (c) => new THREE.MeshBasicMaterial({ color: c });
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
// میله‌ای که از مبدأ به‌سمت پایین (cylD) یا بالا (cylU) رشد می‌کند، با scale.y = طول
const cylD = (r, seg = 8) => { const g = new THREE.CylinderGeometry(r, r, 1, seg); g.translate(0, -0.5, 0); return g; };
const cylU = (r, seg = 8) => { const g = new THREE.CylinderGeometry(r, r, 1, seg); g.translate(0, 0.5, 0); return g; };

function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.3, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}
let GLOW;
const sprite = (c, s) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: c, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); m.scale.setScalar(s); return m; };
const box = (w, h, d, c = GOLD, fill = 0.1, edge = 0.55) => { const g = new THREE.BoxGeometry(w, h, d), grp = new THREE.Group(); if (fill > 0) grp.add(new THREE.Mesh(g, fillMat(NAVY, fill))); grp.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), lineMat(c, edge))); return grp; };
function points(arr, size, col, op = 0.85) {
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ map: GLOW, size, color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false }));
}
function cloudPoints(n, sd, seed, size = 0.09, col = GOLDL) {
  const R = rng(seed), p = new Float32Array(n * 3), g = () => (R() + R() + R() + R() - 2) * 0.85;
  for (let i = 0; i < n; i++) { p[i * 3] = g() * sd[0]; p[i * 3 + 1] = g() * sd[1]; p[i * 3 + 2] = g() * sd[2]; }
  return points(p, size, col);
}
// پوسته‌ی تغییرشکل‌یابنده (سطح هم‌عیار)
function morphShell(det, col, o, seed) {
  const g = new THREE.IcosahedronGeometry(1, det), base = g.attributes.position.array.slice();
  const m = new THREE.Mesh(g, wireMat(col, o));
  m.userData.upd = (t, a = 1) => {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
      const r = 1 + a * (0.2 * Math.sin(x * 3 + seed + t * 0.6) * Math.sin(y * 2.7 + seed * 1.3 - t * 0.5) + 0.12 * Math.sin(z * 4 + seed * 0.7 + t * 0.8));
      p.setXYZ(i, x * r, y * r, z * r);
    }
    p.needsUpdate = true;
  };
  m.userData.upd(0);
  return m;
}
const gradeRamp = [[0, DEEP], [0.22, NAVY], [0.42, BLUE], [0.6, EARTH], [0.8, GOLD], [1, WHITE]];
function grade(g, out) {
  g = clamp(g);
  for (let i = 1; i < gradeRamp.length; i++) if (g <= gradeRamp[i][0]) { const a = gradeRamp[i - 1], b = gradeRamp[i]; return out.copy(a[1]).lerp(b[1], (g - a[0]) / (b[0] - a[0])); }
  return out.copy(WHITE);
}
const terrainH = (x, z) => 0.35 * Math.sin(x * 0.7 + 0.5) * Math.cos(z * 0.55) + 0.18 * Math.sin(x * 1.3 + z * 0.9);

const builders = {
  // ۱) مدل بلوکی منابع: وکسل‌های رنگی بر اساس عیار، با برش متحرک
  voxel() {
    const scene = new THREE.Scene(), g = new THREE.Group(); scene.add(g);
    const NX = 15, NY = 6, NZ = 12, S = 0.3, n = NX * NY * NZ;
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(S, S, S), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.92 }), n);
    const dummy = new THREE.Object3D(), col = new THREE.Color(), pos = [], gr = new Float32Array(n);
    let k = 0;
    for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) for (let l = 0; l < NZ; l++, k++) {
      const x = (i - (NX - 1) / 2) * S, y = (j - (NY - 1) / 2) * S, z = (l - (NZ - 1) / 2) * S;
      const d = ((x - 0.4) / 1.3) ** 2 + ((y + 0.1) / 0.5) ** 2 + ((z + 0.1) / 1.0) ** 2, d2 = ((x + 1.2) / 0.7) ** 2 + ((y - 0.3) / 0.4) ** 2 + ((z - 0.5) / 0.6) ** 2;
      gr[k] = clamp(Math.exp(-d) + 0.6 * Math.exp(-d2) + 0.05 * Math.sin(i * 1.7 + l * 2.3));
      pos.push([x, y, z]); grade(Math.pow(gr[k], 0.8), col); mesh.setColorAt(k, col);
    }
    mesh.instanceColor.needsUpdate = true; g.add(mesh);
    const bw = NX * S, bh = NY * S, bd = NZ * S; g.add(box(bw + 0.02, bh + 0.02, bd + 0.02, GOLD, 0, 0.7));
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(bd, bh), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.1, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })); plane.rotation.y = Math.PI / 2; g.add(plane);
    return { scene, bounds: [6.8, 4.4], update(t, h) {
      g.rotation.y = -0.7 + Math.sin(t * 0.3) * 0.25 + h * 0.4; g.rotation.x = 0.35;
      const cut = matchMedia('(prefers-reduced-motion: reduce)').matches ? -99 : (Math.sin(t * 0.55) * 0.5 - 0.1) * bw; plane.position.x = Math.max(cut, -bw / 2); plane.visible = cut > -bw / 2;
      for (let i = 0; i < n; i++) { const [x, y, z] = pos[i], vis = x > cut, s = vis ? 0.35 + 0.65 * gr[i] : 0.0001; dummy.position.set(x, y, z); dummy.scale.setScalar(Math.max(0.0001, s * (Math.abs(x - cut) < 0.35 && vis ? 1.25 : 1))); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); }
      mesh.instanceMatrix.needsUpdate = true;
    } };
  },

  // ۲) گمانه‌ها با رنگ عیار: هر قطعه به رنگ عیار و ضخیم‌تر در بخش پرعیار
  traces() {
    const scene = new THREE.Scene(), g = new THREE.Group(); scene.add(g);
    const tg = new THREE.PlaneGeometry(8, 8, 36, 36); tg.rotateX(-Math.PI / 2); const tp = tg.attributes.position;
    for (let i = 0; i < tp.count; i++) { const e = Math.min(1, (4 - Math.abs(tp.getX(i))) / 1) * Math.min(1, (4 - Math.abs(tp.getZ(i))) / 1); tp.setY(i, terrainH(tp.getX(i), tp.getZ(i)) * Math.max(0, e)); }
    g.add(new THREE.Mesh(tg, wireMat(GOLD, 0.22)));
    const OC = V(0.4, -2.0, 0.2), gradeAt = (p) => Math.exp(-(((p.x - OC.x) / 1.8) ** 2 + ((p.y - OC.y) / 0.9) ** 2 + ((p.z - OC.z) / 1.4) ** 2));
    const H = [[-2.6, -1.4], [-1.4, 1.5], [-0.5, -0.6], [0.5, 1.4], [1.3, -1.3], [2.3, 0.7], [0.3, 0.1], [-2.1, 0.3], [1.1, -0.1]];
    const NS = 22, segs = [], dummy = new THREE.Object3D(), col = new THREE.Color();
    const mesh = new THREE.InstancedMesh(cylU(0.03, 6), new THREE.MeshBasicMaterial(), H.length * NS); g.add(mesh);
    const tips = [];
    H.forEach(([x, z], hi) => {
      const c = V(x, terrainH(x, z), z), dir = V((OC.x - x) * 0.12 + (hi % 2 ? 0.15 : -0.15), -1, (OC.z - z) * 0.12).normalize(), len = 4.2 / NS;
      let p = c.clone();
      for (let s = 0; s < NS; s++) { const q = p.clone().addScaledVector(dir, len), gm = gradeAt(p.clone().add(q).multiplyScalar(0.5)); segs.push({ hi, s, p: p.clone(), q: q.clone(), gm, quat: new THREE.Quaternion().setFromUnitVectors(UP, dir) }); p = q; }
      const tip = sprite(GOLDL, 0.7); g.add(tip); const ring = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.15, 20).rotateX(-Math.PI / 2), fillMat(GOLDL, 0.9)); ring.position.copy(c).setY(c.y + 0.02); g.add(ring);
      tips.push({ tip, c, dir, len: len * NS });
    });
    const cl = cloudPoints(260, [1.1, 0.45, 0.8], 6, 0.08, GOLD); cl.position.copy(OC); g.add(cl);
    const prog = (tt, hi, LT) => ease((tt - (0.3 + hi * 0.42)) / 2.0) * (tt > LT - 0.8 ? (LT - tt) / 0.8 : 1);
    return { scene, bounds: [10.4, 8], update(t, h) {
      g.rotation.y = 0.5 + t * 0.12 + h * 0.5; g.rotation.x = 0.38;
      const LT = 9, tt = t % LT;
      segs.forEach((sg, k) => {
        const vis = (sg.s + 1) / NS <= prog(tt, sg.hi, LT) + 1e-6, w = vis ? 1 + sg.gm * 2.2 : 0.0001;
        dummy.position.copy(sg.p); dummy.quaternion.copy(sg.quat); dummy.scale.set(w, vis ? sg.p.distanceTo(sg.q) : 0.0001, w); dummy.updateMatrix(); mesh.setMatrixAt(k, dummy.matrix);
        grade(Math.pow(sg.gm, 0.7), col); if (sg.gm < 0.08) col.set('#4B5A99'); mesh.setColorAt(k, col);
      });
      mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
      tips.forEach((tp, hi) => { const pr = prog(tt, hi, LT); tp.tip.visible = pr > 0.01; tp.tip.position.copy(tp.c).addScaledVector(tp.dir, tp.len * pr); });
    } };
  },

  // ۳) عدم قطعیت: پوسته‌های تو در تو (کمینه، محتمل، بیشینه) با تغییرشکل زنده
  shells() {
    const scene = new THREE.Scene(), g = new THREE.Group(); scene.add(g);
    const a = morphShell(3, BLUE, 0.28, 1), b = morphShell(3, EARTH, 0.4, 1.3), c = morphShell(3, GOLD, 0.7, 1.6);
    a.scale.set(2.3, 1.5, 1.8); b.scale.set(1.7, 1.1, 1.3); c.scale.set(1.0, 0.7, 0.8);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 2), fillMat(GOLD, 0.35)), gl = sprite(GOLDL, 2.4);
    g.add(a, b, c, core, gl, cloudPoints(200, [0.5, 0.35, 0.4], 9, 0.08, WHITE));
    [[-1.4, 0.4], [0.2, -0.9], [1.1, 0.8]].forEach(([x, z]) => { const m = new THREE.Mesh(cylD(0.025), solid(GOLDL)); m.scale.y = 2.6; m.position.set(x, 1.9, z); g.add(m); });
    return { scene, bounds: [5.2, 4.4], update(t, h) { g.rotation.y = t * (0.25 + h * 0.8); g.rotation.x = 0.25; a.userData.upd(t, 1.2); b.userData.upd(t + 3, 1); c.userData.upd(t + 6, 0.8); gl.material.opacity = 0.6 + 0.3 * Math.sin(t * 2); } };
  },

  // ۴) یکپارچه‌سازی داده: چهار لایه داده با بافت متفاوت که به یک مدل می‌رسند
  datastack() {
    const scene = new THREE.Scene(), g = new THREE.Group(); scene.add(g);
    const tex = (kind) => {
      const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), R = rng(kind * 17 + 3);
      x.fillStyle = 'rgba(20,37,85,.75)'; x.fillRect(0, 0, 256, 256);
      if (kind === 0) for (let i = 0; i < 26; i++) { x.beginPath(); const cx = R() * 256, cy = R() * 256; for (let k = 0; k < 6; k++) { const a = k * 1.047 + R() * 0.4, r = 26 + R() * 28; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.closePath(); x.fillStyle = ['rgba(184,105,58,.45)', 'rgba(197,165,88,.4)', 'rgba(111,134,214,.4)'][i % 3]; x.fill(); x.strokeStyle = 'rgba(230,211,160,.6)'; x.stroke(); }
      if (kind === 1) for (let i = 0; i < 160; i++) { const cx = R() * 256, cy = R() * 256, r = 3 + R() * 9, gr = x.createRadialGradient(cx, cy, 0, cx, cy, r * 2.4); gr.addColorStop(0, 'rgba(255,243,207,.95)'); gr.addColorStop(1, 'rgba(197,165,88,0)'); x.fillStyle = gr; x.beginPath(); x.arc(cx, cy, r * 2.4, 0, 7); x.fill(); }
      if (kind === 2) { x.strokeStyle = 'rgba(230,211,160,.8)'; x.lineWidth = 1.4; for (let r = 10; r < 190; r += 14) { x.beginPath(); for (let a = 0; a <= 6.3; a += 0.08) { const rr = r + 7 * Math.sin(a * 3 + r * 0.1); x.lineTo(128 + Math.cos(a) * rr * 1.1, 128 + Math.sin(a) * rr * 0.9); } x.stroke(); } }
      if (kind === 3) for (let i = 0; i < 8; i++) { const px = 12 + i * 30, ph = 60 + R() * 150; for (let s = 0; s < 8; s++) { x.fillStyle = `rgba(${150 + R() * 90 | 0},${110 + R() * 70 | 0},60,.85)`; x.fillRect(px, 20 + s * ph / 8, 16, ph / 8 - 2); } }
      const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
    };
    const Y = [1.8, 0.6, -0.6, -1.8], planes = Y.map((y, k) => {
      const pg = new THREE.PlaneGeometry(3.4, 3.4).rotateX(-Math.PI / 2), grp = new THREE.Group();
      grp.add(new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ map: tex(k), transparent: true, opacity: 0.92, side: THREE.DoubleSide, depthWrite: false })), new THREE.LineSegments(new THREE.EdgesGeometry(pg), lineMat(GOLDL, 0.9)));
      grp.position.y = y; g.add(grp); return grp;
    });
    const NP = 220, P = new Float32Array(NP * 3), meta = [], R = rng(4);
    for (let i = 0; i < NP; i++) meta.push({ k: i % 4, u: (R() - 0.5) * 3, v: (R() - 0.5) * 3, ph: R() });
    const pts = points(P, 0.11, GOLDL, 0.9); g.add(pts);
    const core = sprite(GOLD, 2.4); core.position.y = -3.0; g.add(core);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 6, 8, 1, true), fillMat(GOLD, 0.12)); col.position.y = -0.3; g.add(col);
    return { scene, bounds: [4.6, 6.6], update(t, h) {
      g.rotation.y = t * (0.25 + h * 0.8); g.rotation.x = 0.28;
      planes.forEach((p, k) => { p.position.y = Y[k] + Math.sin(t * 0.9 + k) * 0.06; });
      meta.forEach((m, i) => { const u = (t * 0.22 + m.ph) % 1, e = u * u, sy = Y[m.k], fy = -3.0; P[i * 3] = m.u * (1 - e); P[i * 3 + 1] = sy + (fy - sy) * e; P[i * 3 + 2] = m.v * (1 - e); });
      pts.geometry.attributes.position.needsUpdate = true; core.scale.setScalar(2.2 + 0.4 * Math.sin(t * 3));
    } };
  },

  // ۵) درخت تصمیم: نقاط کنترل، ادامه، تغییر مسیر، توقف
  tree() {
    const scene = new THREE.Scene(), g = new THREE.Group(); scene.add(g);
    const nodes = [{ p: V(0, 2.2, 0), lv: 0, par: -1 }], cols = [GOLD, BLUE, EARTH];
    for (let a = 0; a < 3; a++) nodes.push({ p: V(Math.cos(a * 2.094) * 1.3, 1.0, Math.sin(a * 2.094) * 1.3), lv: 1, par: 0, br: a });
    const l1 = nodes.slice(1);
    l1.forEach((n, i) => { for (let k = 0; k < 3; k++) { const an = i * 2.094 + (k - 1) * 0.55; nodes.push({ p: V(Math.cos(an) * 2.4, -0.2, Math.sin(an) * 2.4), lv: 2, par: 1 + i, br: n.br }); } });
    const l2 = nodes.filter((n) => n.lv === 2);
    l2.forEach((n) => { const pi = nodes.indexOf(n); for (let k = 0; k < 2; k++) { const an = Math.atan2(n.p.z, n.p.x) + (k - 0.5) * 0.32; nodes.push({ p: V(Math.cos(an) * 3.2, -1.4, Math.sin(an) * 3.2), lv: 3, par: pi, br: n.br }); } });
    const ls = [];
    nodes.forEach((n) => { if (n.par >= 0) ls.push(nodes[n.par].p, n.p); });
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ls), lineMat(GOLD, 0.5)));
    nodes.forEach((n) => { const c = n.lv === 0 ? GOLDL : cols[n.br], m = new THREE.Mesh(new THREE.SphereGeometry(n.lv === 3 ? 0.075 : 0.12, 12, 8), solid(c)); m.position.copy(n.p); g.add(m); if (n.lv < 2) { const s = sprite(c, 0.9); s.position.copy(n.p); g.add(s); } });
    const dia = l1.map((n) => { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), solid(GOLDL)); m.position.copy(n.p).setY(n.p.y + 0.32); g.add(m); return m; });
    const leaves = nodes.map((n, i) => i).filter((i) => nodes[i].lv === 3), paths = leaves.map((li) => { const pth = []; let k = li; while (k >= 0) { pth.unshift(nodes[k].p); k = nodes[k].par; } return pth; });
    const pulses = [0, 1, 2, 3, 4, 5].map((i) => { const s = sprite(WHITE, 0.55); g.add(s); return { s, i }; });
    return { scene, bounds: [8.2, 5.8], update(t, h) {
      g.rotation.y = t * (0.2 + h * 0.6); g.rotation.x = 0.3; dia.forEach((m, i) => { m.rotation.y = t * 2; m.position.y = 1.32 + Math.sin(t * 2 + i) * 0.05; });
      pulses.forEach((p, i) => { const pth = paths[(i * 3 + Math.floor(t / 2.2 + i)) % paths.length], u = ((t / 2.2 + i * 0.37) % 1) * (pth.length - 1), k = Math.min(pth.length - 2, Math.floor(u)); p.s.position.lerpVectors(pth[k], pth[k + 1], u - k); });
    } };
  },

  // ۶) انتخاب هدف: زمین با خطوط تراز، رادار و اهداف رتبه‌بندی‌شده
  topo() {
    const scene = new THREE.Scene(), g = new THREE.Group(); scene.add(g);
    const U = { uTime: { value: 0 } }, hf = 'float hf(vec2 p){ return .55*sin(p.x*.8+.6)*cos(p.y*.65)+.3*sin(p.x*1.5+p.y*1.1)+.35*exp(-((p.x-1.2)*(p.x-1.2)+(p.y+.8)*(p.y+.8))*.5); }';
    const geo = new THREE.PlaneGeometry(6.4, 6.4, 120, 120).rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({ uniforms: U, transparent: true, side: THREE.DoubleSide, vertexShader: `${hf} varying vec3 vP; varying float vH; void main(){ vec3 p=position; float h=hf(p.xz); p.y=h*.7; vH=h; vP=p; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
      fragmentShader: `varying vec3 vP; varying float vH; uniform float uTime;
        vec3 ramp(float h){ vec3 a=vec3(.075,.13,.29), b=vec3(.13,.22,.5), c=vec3(.72,.41,.23), d=vec3(.77,.65,.35); float t=clamp((h+.5)/1.3,0.,1.); return t<.4?mix(a,b,t/.4):t<.7?mix(b,c,(t-.4)/.3):mix(c,d,(t-.7)/.3); }
        void main(){ float r=length(vP.xz); if(r>3.2) discard; float cl=abs(fract(vH*7.)-.5); float line=1.-smoothstep(0.,.05,cl);
          float ang=atan(vP.z,vP.x), sw=mod(uTime*.9,6.2832), df=mod(sw-ang+6.2832,6.2832), wedge=exp(-df*2.6)*step(r,3.2);
          vec3 col=ramp(vH)*.8+vec3(.9,.8,.5)*line*.55+vec3(1.,.9,.6)*wedge*.6; float a=.85*smoothstep(3.2,2.6,r)+.1; gl_FragColor=vec4(col,a); }` });
    g.add(new THREE.Mesh(geo, mat));
    const hh = (x, z) => (0.55 * Math.sin(x * 0.8 + 0.6) * Math.cos(z * 0.65) + 0.3 * Math.sin(x * 1.5 + z * 1.1) + 0.35 * Math.exp(-((x - 1.2) ** 2 + (z + 0.8) ** 2) * 0.5)) * 0.7;
    const T = [[1.2, -0.8, 1.9], [-1.5, 1.0, 1.2], [0.1, 1.7, 0.8]].map(([x, z, v]) => { const y = hh(x, z), b = new THREE.Mesh(cylU(0.02), solid(GOLDL)); b.position.set(x, y, z); b.scale.y = v; const r = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.26, 28).rotateX(-Math.PI / 2), fillMat(GOLDL, 0.9)); r.position.set(x, y + 0.02, z); const s = sprite(GOLD, 0.9); s.position.set(x, y + v, z); g.add(b, r, s); return { r, s, v, y }; });
    return { scene, bounds: [7.6, 5.6], update(t, h) { g.rotation.y = -0.4 + Math.sin(t * 0.25) * 0.3 + h * 0.5; g.rotation.x = 0.55; U.uTime.value = t; T.forEach((o, i) => { o.r.scale.setScalar(1 + 0.35 * Math.sin(t * 2.5 + i * 2)); o.s.position.y = o.y + o.v + Math.sin(t * 2 + i) * 0.06; }); } };
  },

  // ۷) دستگاه حفاری: دکل خرپایی، رشته حفاری و ستون مغزه
  rig() {
    const scene = new THREE.Scene(), g = new THREE.Group(); scene.add(g);
    const Ht = 4.2, B = 0.95, T0 = 0.28, pts = [], lvl = 8, at = (k) => { const u = k / lvl, r = B + (T0 - B) * u; return [V(-r, u * Ht, -r), V(r, u * Ht, -r), V(r, u * Ht, r), V(-r, u * Ht, r)]; };
    for (let k = 0; k <= lvl; k++) { const q = at(k); for (let i = 0; i < 4; i++) { pts.push(q[i], q[(i + 1) % 4]); if (k < lvl) { const n = at(k + 1); pts.push(q[i], n[i]); pts.push(q[i], n[(i + 1) % 4]); } } }
    g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), lineMat(GOLD, 0.75)));
    const crown = box(0.7, 0.3, 0.7, GOLDL, 0.4, 0.9); crown.position.y = Ht + 0.15; g.add(crown);
    const ground = box(4.4, 2.8, 4.4, GOLD, 0.16, 0.55); ground.position.y = -1.4; g.add(ground);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, Ht + 2.4, 10), solid(GOLDL)); rod.position.y = (Ht - 2.4) / 2 + 0.1; g.add(rod);
    const bit = sprite(WHITE, 1.1); bit.position.y = -2.3; g.add(bit);
    const blockM = box(0.5, 0.3, 0.5, WHITE, 0.6, 1); g.add(blockM);
    for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 12), solid(i >= 1 && i <= 3 ? GOLD : NAVY.clone().lerp(BLUE, 0.4))); m.rotation.z = Math.PI / 2; m.position.set(1.7, 0.1, -1.0 + i * 0.5); g.add(m); }
    const cased = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 2.4, 14, 1, true), wireMat(EARTH, 0.55)); cased.position.y = -1.2; g.add(cased);
    return { scene, bounds: [5.6, 7.8], update(t, h) { g.rotation.y = t * (0.3 + h * 0.8); g.rotation.x = 0.12; g.position.y = -1.6; blockM.position.y = 0.9 + (Math.sin(t * 0.9) * 0.5 + 0.5) * 2.8; rod.rotation.y = t * 8; bit.scale.setScalar(1 + 0.25 * Math.sin(t * 9)); } };
  },

  // ۸) ماتریس ارزش و ریسک: ستون‌های سه‌بعدی و مسیر صعود به بهترین تصمیم
  surface() {
    const scene = new THREE.Scene(), g = new THREE.Group(); scene.add(g);
    const N = 15, S = 0.34, f = (x, z) => 1.9 * Math.exp(-((x - 1) ** 2 + (z + 0.5) ** 2) / 2.2) + 1.1 * Math.exp(-((x + 1.6) ** 2 + (z - 1.2) ** 2) / 1.6) + 0.12;
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(S * 0.84, 1, S * 0.84), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9 }), N * N), d = new THREE.Object3D(), col = new THREE.Color();
    let k = 0;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++, k++) { const x = (i - 7) * S, z = (j - 7) * S, h = f(x, z); d.position.set(x, h / 2 - 1.2, z); d.scale.set(1, h, 1); d.updateMatrix(); mesh.setMatrixAt(k, d.matrix); grade(h / 2.1, col); mesh.setColorAt(k, col); }
    mesh.instanceColor.needsUpdate = true; g.add(mesh);
    const path = []; let px = -2.2, pz = -2.0;
    for (let s = 0; s < 70; s++) { const e = 0.01, gx = (f(px + e, pz) - f(px - e, pz)) / (2 * e), gz = (f(px, pz + e) - f(px, pz - e)) / (2 * e), L = Math.hypot(gx, gz) + 0.2; px += (gx / L) * 0.075 + 0.03 * Math.sin(s * 0.4); pz += (gz / L) * 0.075; path.push(V(px, f(px, pz) - 1.2 + 0.25, pz)); }
    const trail = new THREE.Line(new THREE.BufferGeometry().setFromPoints(path), lineMat(WHITE, 0.95)); g.add(trail);
    const ball = sprite(WHITE, 0.8); g.add(ball);
    const dia = [22, 44, 68].map((i) => { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.17), solid(GOLDL)); m.position.copy(path[i]).setY(path[i].y + 0.35); g.add(m); return m; });
    return { scene, bounds: [7.4, 5.4], update(t, h) { g.rotation.y = -0.65 + Math.sin(t * 0.3) * 0.3 + h * 0.5; g.rotation.x = 0.5; const u = (t * 0.12) % 1, kk = Math.min(path.length - 2, Math.floor(u * (path.length - 1))), fr = u * (path.length - 1) - kk; ball.position.lerpVectors(path[kk], path[kk + 1], fr); trail.geometry.setDrawRange(0, kk + 2); dia.forEach((m) => { m.rotation.y = t * 1.6; }); } };
  },

  // ۹) مرکز داده یکپارچه: منابع پراکنده ← پایگاه استاندارد
  datacenter() {
    const scene = new THREE.Scene(), g = new THREE.Group(); scene.add(g); const R = rng(7);
    const src = [];
    for (let i = 0; i < 14; i++) { const a = R() * 6.28, r = 2.8 + R() * 0.8, y = (R() - 0.5) * 2.6, m = box(0.3 + R() * 0.2, 0.2 + R() * 0.3, 0.3 + R() * 0.2, i % 2 ? EARTH : BLUE, 0.2, 0.9); m.position.set(Math.cos(a) * r, y, Math.sin(a) * r); m.rotation.set(R() * 3, R() * 3, R() * 3); g.add(m); src.push({ m, y, rot: [R() - 0.5, R() - 0.5, R() - 0.5] }); }
    const discs = [];
    for (let i = 0; i < 5; i++) { const grp = new THREE.Group(), cg = new THREE.CylinderGeometry(1.05, 1.05, 0.28, 36); grp.add(new THREE.Mesh(cg, fillMat(NAVY, 0.7)), new THREE.LineSegments(new THREE.EdgesGeometry(cg), lineMat(GOLD, 0.9))); grp.position.y = (i - 2) * 0.46; g.add(grp); discs.push(grp); }
    const NP = 160, P = new Float32Array(NP * 3), meta = []; for (let i = 0; i < NP; i++) meta.push({ s: i % 14, ph: R() });
    const pts = points(P, 0.17, GOLDL, 1); g.add(pts);
    const halo = sprite(GOLD, 3.2); g.add(halo);
    return { scene, bounds: [8, 4.8], update(t, h) {
      g.rotation.y = t * (0.18 + h * 0.6); g.rotation.x = 0.35;
      src.forEach((s, i) => { s.m.rotation.x += 0.004 * s.rot[0]; s.m.rotation.y += 0.006 * s.rot[1]; s.m.position.y = s.y + Math.sin(t + i) * 0.1; });
      meta.forEach((m, i) => { const s = src[m.s], u = (t * 0.25 + m.ph) % 1, e = ease(u), jx = (1 - e) * Math.sin(t * 3 + i) * 0.25; P[i * 3] = s.m.position.x * (1 - e) + jx; P[i * 3 + 1] = lerp(s.m.position.y, ((i % 5) - 2) * 0.46, e); P[i * 3 + 2] = s.m.position.z * (1 - e); });
      pts.geometry.attributes.position.needsUpdate = true; halo.material.opacity = 0.35 + 0.2 * Math.sin(t * 2);
      discs.forEach((d, i) => { d.children[1].material.opacity = 0.6 + 0.4 * Math.max(0, Math.sin(t * 3 - i)); });
    } };
  },

  // مغزه
  core() {
    const scene = new THREE.Scene(), g = new THREE.Group(); scene.add(g);
    const N = 13, segH = 0.46, gap = 0.1, segs = [];
    for (let i = 0; i < N; i++) {
      const ore = i >= 4 && i <= 7, mid = i === 3 || i === 8, col = ore ? GOLD : mid ? EARTH : NAVY.clone().lerp(BLUE, (i % 3) * 0.12);
      const geo = new THREE.CylinderGeometry(0.5, 0.5, segH, 28), m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: ore ? 0.92 : 0.6 }));
      m.position.y = -i * (segH + gap) + (N * (segH + gap)) / 2 - 0.3; m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), lineMat(GOLDL, 0.6))); g.add(m);
      if (ore) { const s = sprite(GOLDL, 1.8); s.position.copy(m.position); s.userData.o = i; g.add(s); segs.push(s); }
    }
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, N * (segH + gap) + 0.4, 28, 1, true), wireMat(GOLD, 0.16)));
    for (let i = 0; i <= N; i += 2) { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(1.15, 0, 0), V(1.55, 0, 0)]), lineMat(GOLD, 0.5)); l.position.y = -i * (segH + gap) + (N * (segH + gap)) / 2 - 0.05; g.add(l); }
    return { scene, bounds: [3.4, 8.4], update(t, h) { g.rotation.y = t * (0.35 + h * 0.8); g.position.y = Math.sin(t * 0.7) * 0.08; segs.forEach((s) => { s.material.opacity = 0.35 + 0.35 * Math.sin(t * 2 + s.userData.o); }); } };
  },
  // پیش‌بین کانه‌زایی
  target() {
    const scene = new THREE.Scene(), g = new THREE.Group(); scene.add(g); const rings = [], RR = [0.9, 1.5, 2.1];
    RR.forEach((r, i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.014, 8, 120), new THREE.MeshBasicMaterial({ color: i % 2 ? EARTH : GOLD, transparent: true, opacity: 0.7 })); m.rotation.x = Math.PI / 2.4; g.add(m); rings.push(m); });
    const c = cloudPoints(520, [0.6, 0.6, 0.6], 3, 0.1); g.add(c); const orb = RR.map(() => { const s = sprite(GOLDL, 0.5); g.add(s); return s; });
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0, -2.4, 0), V(0, 2.4, 0)]), lineMat(GOLDL, 0.3)));
    return { scene, bounds: [4.6, 4.2], update(t, h) { g.rotation.y = t * (0.3 + h); c.rotation.y = -t * 0.4; c.scale.setScalar(1 + 0.08 * Math.sin(t * 2)); rings.forEach((m, i) => { m.rotation.z = t * (0.2 + i * 0.1); }); orb.forEach((s, i) => { const a = t * (1.2 - i * 0.25) + i * 2, p = V(Math.cos(a) * RR[i], 0, Math.sin(a) * RR[i]); p.applyEuler(new THREE.Euler(Math.PI / 2.4, 0, t * (0.2 + i * 0.1))); s.position.copy(p); }); } };
  },
  // مته
  drill() {
    const scene = new THREE.Scene(), all = new THREE.Group(), g = new THREE.Group(); all.position.y = -0.9; scene.add(all); all.add(g);
    const H = 3, R = 0.8, cone = new THREE.Mesh(new THREE.ConeGeometry(R, H, 20, 6, true), wireMat(GOLD, 0.45)); cone.rotation.x = Math.PI; g.add(cone);
    const pts = []; for (let i = 0; i <= 160; i++) { const u = i / 160, a = u * Math.PI * 2 * 5, r = R * (1 - u); pts.push(V(Math.cos(a) * r, H / 2 - u * H, Math.sin(a) * r)); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 0.05, 6), solid(GOLDL)));
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.2, 10), wireMat(EARTH, 0.55)); shaft.position.y = H / 2 + 1.1; g.add(shaft);
    const tip = sprite(GOLDL, 1.2); tip.position.y = -H / 2; g.add(tip);
    const waves = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, side: THREE.DoubleSide })); m.position.y = -H / 2 - 0.2; all.add(m); return m; });
    const dust = cloudPoints(90, [1.4, 1, 1.4], 8, 0.07, EARTH); dust.position.y = -H / 2; all.add(dust);
    return { scene, bounds: [4.6, 6.2], update(t, h) { g.rotation.y = t * (3 + h * 5); g.position.y = Math.sin(t * 3) * 0.08; waves.forEach((m, i) => { const u = ((t * 0.5 + i / 3) % 1); m.scale.setScalar(0.3 + u * 2.6); m.material.opacity = (1 - u) * 0.7; }); dust.rotation.y = t * 0.5; } };
  },
  // روش مرسوم: یک تفسیر و شبکه ثابت گمانه (همه از بالا به پایین)
  conv() {
    const scene = new THREE.Scene(), g = new THREE.Group(); scene.add(g);
    g.add(box(4, 1.8, 3, GOLD, 0, 0.5));
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), wireMat(GOLD, 0.5)); s.scale.set(1.3, 0.55, 0.9); s.position.set(0.1, -0.2, 0); g.add(s);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const m = new THREE.Mesh(cylD(0.025), solid('#8A93B8')); m.scale.y = 1.7; m.position.set(-1.2 + i * 1.2, 0.9, -0.7 + j * 1.4); g.add(m); }
    return { scene, bounds: [5.2, 3.4], update(t, h) { g.rotation.y = 0.6 + Math.sin(t * 0.4) * 0.3 + h * 0.5; g.rotation.x = 0.25; } };
  },
  // مدل ما: مدل‌های محتمل و گمانه‌های هوشمند
  ours() {
    const scene = new THREE.Scene(), g = new THREE.Group(); scene.add(g);
    g.add(box(4, 1.8, 3, GOLD, 0, 0.5));
    const sh = [morphShell(2, GOLD, 0.5, 2), morphShell(2, EARTH, 0.4, 3.4), morphShell(2, BLUE, 0.35, 5)], SC = [[1.3, 0.55, 0.9], [1.1, 0.5, 0.8], [0.9, 0.6, 0.7]];
    sh[1].position.set(-0.5, 0.1, 0.3); sh[2].position.set(0.7, -0.1, -0.3); sh.forEach((s, i) => { s.scale.set(...SC[i]); g.add(s); });
    g.add(cloudPoints(380, [0.8, 0.35, 0.55], 4, 0.09));
    const P = [[-0.9, 0.5], [0.2, -0.3], [0.9, 0.7], [1.5, -0.5]], rods = P.map(([x, z], i) => { const m = new THREE.Mesh(cylD(0.03), solid(GOLDL)); m.position.set(x, 0.9, z); g.add(m); const s = sprite(GOLDL, 0.6); g.add(s); return { m, s, x, z, len: 1.1 + (i % 2) * 0.4 }; });
    return { scene, bounds: [5.2, 3.4], update(t, h) {
      g.rotation.y = 0.6 + Math.sin(t * 0.4) * 0.3 + h * 0.5; g.rotation.x = 0.25;
      sh.forEach((s, i) => { s.userData.upd(t + i * 2, 0.8); s.rotation.y = t * 0.2 * (i + 1); });
      rods.forEach((r, i) => { const p = clamp(((t % 8) - i * 1.6) / 1.4); r.m.scale.y = Math.max(0.001, p * r.len); r.s.position.set(r.x, 0.9 - p * r.len, r.z); r.s.visible = p > 0.01; });
    } };
  },
  // زنجیره اکتشاف: چهار بلوک با جزئیات فزاینده
  chain() {
    const scene = new THREE.Scene(), g = new THREE.Group(); scene.add(g); const blocks = [];
    [[2.2, 0.3, 2.2, 6], [1.8, 0.6, 1.8, 14], [1.4, 1.0, 1.4, 40], [1.0, 1.7, 1.0, 0]].forEach(([w, h, d, n], i) => {
      const grp = new THREE.Group(); grp.add(box(w, h, d, i % 2 ? EARTH : GOLD, 0, 0.6));
      if (n) grp.add(cloudPoints(n * 8, [w * 0.35, h * 0.3, d * 0.35], 20 + i, 0.07));
      if (i === 2) for (let k = 0; k < 5; k++) { const m = new THREE.Mesh(cylD(0.015), solid(GOLDL)); m.scale.y = h; m.position.set(-0.45 + k * 0.22, h / 2, k % 2 ? 0.25 : -0.25); grp.add(m); }
      if (i === 3) { const m = new THREE.Mesh(cylD(0.025), solid(GOLDL)); m.scale.y = h; m.position.y = h / 2; grp.add(m); const s = sprite(GOLD, 0.9); s.position.y = -h / 2 + 0.2; grp.add(s); }
      grp.position.set(-4.8 + i * 3.2, 0, 0); g.add(grp); blocks.push(grp);
    });
    const path = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(-6.5, -1.4, 0), V(6.5, -1.4, 0)]), new THREE.LineDashedMaterial({ color: GOLD, dashSize: 0.2, gapSize: 0.18, transparent: true, opacity: 0.5 })); path.computeLineDistances(); g.add(path);
    return { scene, bounds: [14, 3.6], update(t, h) { g.rotation.x = 0.35; g.rotation.y = Math.sin(t * 0.3) * 0.12 + h * 0.1; blocks.forEach((b, i) => { b.rotation.y = t * 0.25 + i; b.position.y = Math.sin(t * 0.8 + i) * 0.08; }); } };
  },
};
// نام‌های قدیمی صفحه‌ها
builders.layers = builders.datastack; builders.chart = builders.surface;

export function mountModels() {
  const els = [].slice.call(document.querySelectorAll('canvas[data-model]'));
  if (!els.length) return false;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch (e) { return fail(els); }
  if (!renderer.getContext()) return fail(els);
  GLOW = glowTex();
  const dpr = Math.min(devicePixelRatio || 1, 1.75); renderer.setPixelRatio(1); renderer.setClearColor(0x000000, 0);
  const items = els.map((cv) => {
    const b = builders[cv.dataset.model]; if (!b) return null;
    let m; try { m = b(); } catch (e) { console.error('model build', cv.dataset.model, e); return null; } return { cv, ctx: cv.getContext('2d'), m, cam: new THREE.PerspectiveCamera(34, 1, 0.1, 100), visible: false, hover: 0, hv: 0, w: 0, h: 0, yaw: 0, pitch: 0 };
  }).filter(Boolean);
  items.forEach((it) => {
    const host = it.cv.closest('.card,.visual,.model-wrap') || it.cv;
    host.addEventListener('pointerenter', () => { it.hv = 1; }); host.addEventListener('pointerleave', () => { it.hv = 0; });
    if (it.cv.dataset.drag) {
      let down = false, lx = 0, ly = 0; it.cv.style.cursor = 'grab'; it.cv.style.touchAction = 'pan-y';
      it.cv.addEventListener('pointerdown', (e) => { down = true; lx = e.clientX; ly = e.clientY; it.cv.setPointerCapture(e.pointerId); it.cv.style.cursor = 'grabbing'; });
      it.cv.addEventListener('pointermove', (e) => { if (!down) return; it.yaw += (e.clientX - lx) * 0.01; it.pitch = clamp(it.pitch + (e.clientY - ly) * 0.006, -0.8, 0.8); lx = e.clientX; ly = e.clientY; kick(); });
      const up = () => { down = false; it.cv.style.cursor = 'grab'; }; it.cv.addEventListener('pointerup', up); it.cv.addEventListener('pointercancel', up);
    }
  });
  const io = new IntersectionObserver((es) => { es.forEach((e) => { const it = items.find((x) => x.cv === e.target); if (it) it.visible = e.isIntersecting; }); kick(); }, { rootMargin: '80px' });
  items.forEach((it) => io.observe(it.cv));
  function size(it) {
    const w = Math.max(2, Math.round(it.cv.clientWidth * dpr)), h = Math.max(2, Math.round(it.cv.clientHeight * dpr));
    if (w !== it.w || h !== it.h) {
      it.w = w; it.h = h; it.cv.width = w; it.cv.height = h; it.cam.aspect = w / h;
      const [bw, bh] = it.m.bounds, th = Math.tan((it.cam.fov * Math.PI) / 360), dist = Math.max(bh / 2 / th, bw / 2 / (th * it.cam.aspect)) * 1.08;
      it.cam.position.set(0, 0, dist); it.cam.lookAt(0, 0, 0); it.cam.updateProjectionMatrix();
    }
  }
  let t = reduce ? 4 : 0, last = performance.now(), run = false;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; if (!reduce) t += dt;
    let any = false;
    items.forEach((it) => {
      if (!it.visible || it.dead) return; any = true;
      try {
      size(it);
      it.hover += (it.hv - it.hover) * 0.08; it.m.update(t, it.hover);
      it.m.scene.rotation.y = it.yaw; it.m.scene.rotation.x = it.pitch;
      if (renderer.domElement.width !== it.w || renderer.domElement.height !== it.h) renderer.setSize(it.w, it.h, false);
      renderer.render(it.m.scene, it.cam); it.ctx.clearRect(0, 0, it.w, it.h); it.ctx.drawImage(renderer.domElement, 0, 0, it.w, it.h);
      } catch (e) { it.dead = true; console.error('model update', it.cv.dataset.model, e && e.stack || e); }
    });
    if (any && !reduce && !document.hidden) requestAnimationFrame(frame); else run = false;
  }
  function kick() { if (!run && !document.hidden) { run = true; last = performance.now(); requestAnimationFrame(frame); } }
  document.addEventListener('visibilitychange', kick);
  addEventListener('resize', () => { items.forEach((it) => { it.w = 0; }); kick(); });
  items.forEach((it) => it.cv.classList.add('ready'));
  return true;
}
function fail(els) { els.forEach((cv) => { const c = cv.closest('.has-model'); if (c) c.classList.remove('has-model'); cv.remove(); }); return false; }
