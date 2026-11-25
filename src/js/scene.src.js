// صحنه سه‌بعدی زیرزمین: لایه‌ها، ابر احتمال کانه‌زایی، مدل‌های محتمل و گمانه‌ها
import * as THREE from 'three';

const GOLD = new THREE.Color('#C5A558'), GOLDL = new THREE.Color('#E6D3A0'), EARTH = new THREE.Color('#B8693A');
const C = new THREE.Vector3(1.0, -2.7, 0.3); // مرکز ابر
const LAYER_H = [0.6, 0.9, 1.1, 1.0, 1.3];
const LAYER_COL = ['#22377d', '#1a2d66', '#142555', '#101d45', '#0d1838'];
const EDGE_COL = [GOLD, EARTH, GOLD, EARTH, GOLD];
const HOLES = [[-1.4, -0.9, -0.3, 0.2], [0.3, 1.4, 0.2, 0.6], [1.9, -0.4, 0.6, -0.2], [3.0, 1.3, 0.1, 0.1]]; // x,z, dx,dz
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const lerp = (a, b, t) => a + (b - a) * t;

function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const terrain = (x, z) => {
  const edge = Math.min(1, (5 - Math.abs(x)) / 1.2) * Math.min(1, (5 - Math.abs(z)) / 1.2);
  return (0.2 * Math.sin(x * 0.55 + 0.6) * Math.cos(z * 0.45) + 0.1 * Math.sin(x * 1.2 + z * 0.8)) * Math.max(0, edge);
};

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function mountScene(canvas, opts = {}) {
  const mode = opts.mode || 'hero', rtl = opts.rtl !== false, L = opts.labels || {};
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) { return null; }
  if (!renderer.getContext()) return null;
  const small = Math.min(innerWidth, screen.width || 9999) < 760;
  const dpr = Math.min(devicePixelRatio || 1, small ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
  const uni = { uTime: { value: 0 }, uPulse: { value: 0 }, uCloud: { value: 1 }, uScale: { value: 20 }, uSlab: { value: -9 }, uSlabOn: { value: 1 } };

  // ----- لایه‌های زمین (هر لایه یک گروه، برای نمای انفجاری) -----
  const layerGroups = [];
  let y = 0;
  LAYER_H.forEach((h, i) => {
    const g = new THREE.Group();
    const geo = new THREE.BoxGeometry(10, h, 10);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: LAYER_COL[i], transparent: true, opacity: 0.42, depthWrite: false }));
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: EDGE_COL[i], transparent: true, opacity: 0.55 }));
    g.add(m, e); g.position.y = -(y + h / 2); g.userData.base = g.position.y; g.userData.i = i;
    scene.add(g); layerGroups.push(g); y += h;
  });
  // گسل‌ها
  [[-0.5, 0.6, 0.25], [1.4, -0.4, -0.5]].forEach(([px, ry, rz], k) => {
    const pg = new THREE.PlaneGeometry(9, 4.6);
    const g = new THREE.Group();
    g.add(new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ color: EARTH, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false })),
      new THREE.LineSegments(new THREE.EdgesGeometry(pg), new THREE.LineBasicMaterial({ color: EARTH, transparent: true, opacity: 0.35 })));
    g.position.set(px + k, -2.5, 0); g.rotation.set(0.1, ry + 1.2, rz); scene.add(g);
  });

  // ----- سطح زمین با موج پویش -----
  const N = small ? 44 : 72;
  const tg = new THREE.PlaneGeometry(10, 10, N, N); tg.rotateX(-Math.PI / 2);
  const tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) tp.setY(i, terrain(tp.getX(i), tp.getZ(i)));
  const shock = Array.from({ length: 4 }, () => new THREE.Vector4(0, 0, 0, 0));
  const tmat = new THREE.ShaderMaterial({
    wireframe: true, transparent: true, depthWrite: false,
    uniforms: { uTime: uni.uTime, uShock: { value: shock }, uScanOn: { value: 1 } },
    vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec3 vP; uniform float uTime,uScanOn; uniform vec4 uShock[4];
      void main(){ float d=length(vP.xz); float a=.17*smoothstep(5.6,1.5,d)+.05; float w=0.;
        float r=mod(uTime*1.3,9.); w+=uScanOn*exp(-pow((d-r)*1.6,2.))*.75;
        for(int i=0;i<4;i++){ float dd=length(vP.xz-uShock[i].xy); w+=uShock[i].w*exp(-pow((dd-uShock[i].z)*2.2,2.))*1.1; }
        vec3 c=mix(vec3(.77,.65,.35),vec3(1.,.93,.7),clamp(w,0.,1.)); gl_FragColor=vec4(c,clamp(a+w*.7,0.,1.)); }`,
  });
  scene.add(new THREE.Mesh(tg, tmat));

  // ----- ابر احتمال کانه‌زایی -----
  const NP = small ? 2400 : 5200, R = rng(11);
  const pos = new Float32Array(NP * 3), seed = new Float32Array(NP), dens = new Float32Array(NP);
  const g4 = () => (R() + R() + R() + R() - 2) * 0.85;
  const rotZ = -0.3, cz = Math.cos(rotZ), sz = Math.sin(rotZ);
  for (let i = 0; i < NP; i++) {
    const lobe = R() < 0.22; // یک لوب فرعی
    const gx = g4(), gy = g4(), gz = g4();
    let x = gx * 2.7, yy = gy * 1.05, z = gz * 1.9;
    if (lobe) { x = gx * 1.3 - 2.0; yy = gy * 0.6 + 0.5; z = gz * 1.1 - 0.6; }
    pos[i * 3] = C.x + x * cz - yy * sz; pos[i * 3 + 1] = C.y + x * sz + yy * cz; pos[i * 3 + 2] = C.z + z;
    seed[i] = R(); dens[i] = Math.exp(-(gx * gx + gy * gy * 1.4 + gz * gz) * 2.2);
  }
  const cg = new THREE.BufferGeometry();
  cg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  cg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  cg.setAttribute('aDens', new THREE.BufferAttribute(dens, 1));
  const cloud = new THREE.Points(cg, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: uni,
    vertexShader: `attribute float aSeed,aDens; uniform float uTime,uPulse,uCloud,uScale,uSlab,uSlabOn; varying float vD,vA;
      void main(){ vec3 p=position; p.y+=sin(uTime*.6+aSeed*40.)*.05; p.x+=cos(uTime*.5+aSeed*30.)*.04;
        vec4 mv=modelViewMatrix*vec4(p,1.); float tw=.65+.35*sin(uTime*2.+aSeed*60.);
        float s=exp(-pow(p.x-uSlab,2.)*1.4)*uSlabOn;
        gl_PointSize=uScale*(.5+aDens*1.5)*(1.+uPulse*.7+s*.9)*uCloud*(10./-mv.z)*tw;
        vD=aDens; vA=uCloud*(.22+.78*aDens)*tw+s*.55*aDens; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying float vD,vA; uniform float uPulse;
      void main(){ float d=length(gl_PointCoord-.5); if(d>.5) discard; float a=smoothstep(.5,0.,d);
        vec3 c=mix(vec3(.77,.62,.3),vec3(1.,.95,.8),vD*vD+uPulse*.45); gl_FragColor=vec4(c,a*vA); }`,
  }));
  scene.add(cloud);

  // ----- پوسته‌های مدل‌های محتمل -----
  const shells = [], shellCfg = [
    { col: GOLD, off: [0, 0, 0], sc: [2.7, 1.1, 1.9], seed: 1.0 },
    { col: EARTH, off: [-0.5, 0.35, 0.5], sc: [2.3, 0.9, 1.6], seed: 2.7 },
    { col: new THREE.Color('#8fa0d4'), off: [1.1, -0.2, -0.7], sc: [1.9, 1.3, 1.4], seed: 4.1 }, // فرض «نبود کانه‌زایی»
  ];
  shellCfg.forEach((c, k) => {
    const g = new THREE.IcosahedronGeometry(1, 3), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), yy = p.getY(i), z = p.getZ(i);
      const r = 1 + 0.2 * Math.sin(x * 3 + c.seed) * Math.sin(yy * 2.7 + c.seed * 1.3) + 0.12 * Math.sin(z * 4 + c.seed * 0.7);
      p.setXYZ(i, x * r, yy * r, z * r);
    }
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: c.col, wireframe: true, transparent: true, opacity: 0, depthWrite: false }));
    m.position.set(C.x + c.off[0], C.y + c.off[1], C.z + c.off[2]); m.rotation.z = rotZ;
    m.userData = { sc: c.sc, w: k === 0 ? 0.5 : 0.3, tw: k === 0 ? 0.5 : 0.3 };
    scene.add(m); shells.push(m);
  });

  // ----- گمانه‌ها -----
  const glow = glowTexture(), UP = new THREE.Vector3(0, 1, 0);
  const holes = HOLES.map(([x, z, dx, dz], i) => {
    const collar = new THREE.Vector3(x, terrain(x, z) + 0.02, z), end = new THREE.Vector3(x + dx, -4.5, z + dz);
    const dir = end.clone().sub(collar), len = dir.length(); dir.normalize();
    const cg2 = new THREE.CylinderGeometry(0.03, 0.03, 1, 6); cg2.translate(0, 0.5, 0);
    const rod = new THREE.Mesh(cg2, new THREE.MeshBasicMaterial({ color: GOLDL })); rod.position.copy(collar); rod.quaternion.setFromUnitVectors(UP, dir); rod.scale.y = 0.0001;
    const dg = new THREE.BufferGeometry().setFromPoints([collar, end]);
    const dash = new THREE.Line(dg, new THREE.LineDashedMaterial({ color: GOLDL, dashSize: 0.14, gapSize: 0.12, transparent: true, opacity: 0.45 })); dash.computeLineDistances();
    const tip = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: GOLD, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.18, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: GOLDL, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    ring.position.copy(collar).setY(collar.y + 0.01);
    scene.add(rod, dash, tip, ring);
    return { collar, end, len, dir, rod, dash, tip, ring, p: 0, prev: 0, el: null, ck: 0 };
  });

  // ----- گرد و غبار -----
  const DN = small ? 160 : 360, dp = new Float32Array(DN * 3), r2 = rng(5);
  for (let i = 0; i < DN; i++) { dp[i * 3] = (r2() - 0.5) * 26; dp[i * 3 + 1] = r2() * 12 - 5; dp[i * 3 + 2] = (r2() - 0.5) * 26; }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ map: glow, size: 0.16, color: GOLDL, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
  scene.add(dust);

  // ----- برش پویش عمودی -----
  const slabG = new THREE.PlaneGeometry(10, 4.9), slab = new THREE.Group();
  slab.add(new THREE.Mesh(slabG, new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })),
    new THREE.LineSegments(new THREE.EdgesGeometry(slabG), new THREE.LineBasicMaterial({ color: GOLDL, transparent: true, opacity: 0.7 })));
  slab.rotation.y = Math.PI / 2; slab.position.y = -2.45; scene.add(slab);

  // ----- برچسب‌های HTML -----
  const host = canvas.parentElement, lab = document.createElement('div'); lab.className = 'geo-labels'; host.appendChild(lab);
  const fa = ['۱', '۲', '۳', '۴'], mk = (cls, t) => { const s = document.createElement('span'); s.className = 'geo-label ' + cls; s.textContent = t; lab.appendChild(s); return s; };
  holes.forEach((h, i) => { h.el = mk('', (L.hole || 'گمانه') + ' ' + fa[i]); });
  const cloudEl = mk('geo-label--cloud', L.cloud || 'ابر احتمال کانه‌زایی');
  const dataEl = mk('geo-label--data', L.data || 'داده با درجه اعتبار');

  // ----- وضعیت و ورودی -----
  const st = { split: 0, shell: 1, cloud: 1, scan: 1, slab: 1, angle: 0.9, dash: 1, drill: [0, 0, 0, 0] };
  const target = { split: 0, shell: 1, cloud: 1, scan: 1, slab: 1, angle: 0.9, dash: 1 };
  let drillTarget = [0, 0, 0, 0];
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  let completed = 0;
  addEventListener('pointermove', (e) => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; }, { passive: true });

  const api = {
    setStage(n) {
      const T = [
        { split: 0.4, shell: 0, cloud: 0, scan: 1, slab: 0, dash: 0, angle: 0.55, d: [0, 0, 0, 0] },
        { split: 0, shell: 1, cloud: 0.4, scan: 0, slab: 1, dash: 0, angle: 0.95, d: [0, 0, 0, 0] },
        { split: 0, shell: 1, cloud: 0.75, scan: 0, slab: 0, dash: 1, angle: 1.35, d: [0, 0, 0, 0] },
        { split: 0, shell: 1, cloud: 1, scan: 0, slab: 1, dash: 1, angle: 1.8, d: [1, 1, 0.55, 0] },
      ][Math.max(0, Math.min(3, n))];
      Object.assign(target, { split: T.split, shell: T.shell, cloud: T.cloud, scan: T.scan, slab: T.slab, dash: T.dash, angle: T.angle });
      drillTarget = T.d;
    },
  };
  api.dbg = () => JSON.stringify({ st, target, drillTarget, run, visible });
  if (mode === 'how') api.setStage(0);

  function pulse(i) {
    uni.uPulse.value = 1; shock[i].set(holes[i].collar.x, holes[i].collar.z, 0, 1);
    shells.forEach((s, k) => { s.userData.w = k === 2 ? Math.max(0.12, 0.45 - completed * 0.1) : 0.25 + Math.random() * 0.55; });
    holes[i].ck = 1.8;
  }

  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    const wide = w / h > 1.15 && mode === 'hero';
    if (wide) camera.setViewOffset(w, h, (rtl ? 1 : -1) * w * 0.22, 0, w, h); else camera.clearViewOffset();
    camera.userData.r = small || w / h < 0.9 ? 30 : mode === "how" ? 22 : mode === "mini" ? 19 : 26;
    uni.uScale.value = dpr * Math.max(0.7, Math.min(1.5, h / 800)) * 18;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();

  const v3 = new THREE.Vector3();
  function project(el, p, show) {
    v3.copy(p).project(camera);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    el.style.transform = `translate(${((v3.x * 0.5 + 0.5) * w).toFixed(1)}px,${((-v3.y * 0.5 + 0.5) * h).toFixed(1)}px)`;
    el.classList.toggle('on', show && v3.z < 1 && !small);
  }

  let t = reduce ? 13 : 0, last = performance.now(), run = true, visible = true;
  const T_LOOP = 18, dur = 2.6;
  function holeP(i, tt) {
    const s = 2 + i * 3.2;
    if (tt < s) return 0; if (tt < s + dur) return ease((tt - s) / dur); if (tt < 16) return 1; if (tt < 17) return 1 - ease(tt - 16); return 0;
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!reduce) t += dt;
    uni.uTime.value = t;
    mouse.sx += (mouse.x - mouse.sx) * 0.05; mouse.sy += (mouse.y - mouse.sy) * 0.05;
    const k = 1 - Math.exp(-dt * 3);
    if (mode !== 'how') {
      const tt = t % T_LOOP; for (let i = 0; i < 4; i++) st.drill[i] = holeP(i, tt);
      if (tt < dt * 1.5 + 0.02) completed = 0;
      st.split = 0; st.shell = 1; st.cloud = Math.min(1, 0.7 + tt * 0.1); st.scan = 1; st.slab = 1; st.dash = 1;
    } else {
      ['split', 'shell', 'cloud', 'scan', 'slab', 'dash', 'angle'].forEach((n) => { st[n] += (target[n] - st[n]) * k; });
      for (let i = 0; i < 4; i++) { const d = drillTarget[i] - st.drill[i]; st.drill[i] += Math.max(-dt * 0.5, Math.min(dt * 0.5, d)); }
    }
    let done = 0;
    holes.forEach((h, i) => {
      const p = st.drill[i]; if (p >= 0.999) done++;
      if (h.prev < 0.999 && p >= 0.999) { completed = done; pulse(i); }
      h.prev = p;
      h.rod.scale.y = Math.max(0.0001, h.len * p);
      h.tip.position.copy(h.collar).addScaledVector(h.dir, h.len * p);
      const idle = p < 0.01 ? (0.5 + 0.5 * Math.sin(t * 3 + i)) : 1;
      h.tip.scale.setScalar(p < 0.999 ? 0.5 + 0.55 * idle : 0.35); h.tip.material.opacity = (p > 0.01 || st.dash > 0.5) ? 1 : 0;
      h.dash.visible = st.dash > 0.4; h.dash.material.opacity = 0.45 * Math.min(1, st.dash);
      h.ring.visible = st.dash > 0.4 || p > 0.01;
      h.ck = Math.max(0, h.ck - dt);
      const txt = (L.hole || 'گمانه') + ' ' + fa[i] + (h.ck > 0 ? ' · ' + (L.check || 'نقطه کنترل') : '');
      if (h.el.textContent !== txt) h.el.textContent = txt;
      project(h.el, h.collar.clone().setY(h.collar.y + 0.25), (p > 0.01 || st.dash > 0.5));
    });
    // موج‌ها
    shock.forEach((s) => { if (s.w > 0) { s.z += dt * 5; s.w = Math.max(0, s.w - dt * 0.55); } });
    uni.uPulse.value *= Math.exp(-dt * 1.8);
    uni.uCloud.value = st.cloud; uni.uSlabOn.value = st.slab; tmat.uniforms.uScanOn.value = st.scan;
    uni.uSlab.value = -4.5 + ((t * 0.9) % 10);
    slab.position.x = uni.uSlab.value; slab.visible = st.slab > 0.1; slab.children.forEach((c) => { c.material.opacity = (c === slab.children[0] ? 0.05 : 0.7) * st.slab; });
    // لایه‌ها
    layerGroups.forEach((g) => { g.position.y = g.userData.base - g.userData.i * st.split; });
    // پوسته‌ها
    shells.forEach((s, i) => {
      const w = s.userData; w.tw = w.tw + (w.w - w.tw) * (1 - Math.exp(-dt * 2));
      s.material.opacity = st.shell * (0.12 + 0.5 * w.tw);
      const b = 1 + 0.05 * Math.sin(t * 0.9 + i * 2);
      s.scale.set(w.sc[0] * b, w.sc[1] * b, w.sc[2] * b); s.rotation.y = t * 0.05 * (i + 1);
    });
    dust.rotation.y = t * 0.012;
    // دوربین
    const sc = mode === 'hero' ? Math.min(1, scrollY / innerHeight) : 0;
    const ang = (mode !== 'how' ? 0.75 + t * 0.06 + sc * 1.1 : st.angle + Math.sin(t * 0.15) * 0.12) + mouse.sx * 0.5 * (rtl ? -1 : 1);
    const rr = camera.userData.r + sc * 3;
    camera.position.set(Math.sin(ang) * rr, 6.4 + mouse.sy * -1.4 - sc * 1.5, Math.cos(ang) * rr);
    camera.lookAt(0, -2.0, 0);
    project(cloudEl, C.clone().add(new THREE.Vector3(-0.2, 1.1, 0)), st.cloud > 0.55);
    project(dataEl, new THREE.Vector3(-4.2, -0.6 - st.split * 0.5, 4.8), mode === 'how' && st.split > 0.2);
    renderer.render(scene, camera);
    if (!reduce && run && visible && !document.hidden) requestAnimationFrame(frame); else run = false;
  }
  const kick = () => { if (!run && visible && !reduce) { run = true; last = performance.now(); requestAnimationFrame(frame); } };
  run = true; requestAnimationFrame(frame);
  if (reduce) { run = false; }
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; kick(); }, { threshold: 0.02 }).observe(canvas);
  document.addEventListener('visibilitychange', kick);
  addEventListener('resize', () => { if (reduce) frame(performance.now()); });
  return api;
}
