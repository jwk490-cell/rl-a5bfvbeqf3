// 기판 지도 — 360° 입체뷰 (three.js). pcbmap.html 이 '360° 입체' 탭을 처음 열 때 동적으로 불러온다.
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {CSS2DRenderer, CSS2DObject} from 'three/addons/renderers/CSS2DRenderer.js';

const C = {pcb: 0x1f8050, pcbD: 0x0f5132, bt: 0x2e9c63, gold: 0xe0b84a, chip: 0x23262b, die: 0x9aa3ae, sub: 0x2f9a8c, core: 0x8a7448,
  ball: 0xc9ced6, lid: 0xc5cbd3, cu: 0xc98a3c, hdi: 0x1f65a3, flex: 0xe39a3b, mold: 0x1b1d21, slot: 0x1a1d21, white: 0xe8eaed, cap: 0xb89b6a, steel: 0x8f98a3};
const INNER = ['그 아래 패키지기판', '아랫면 접점', '칩 (적층)', '금선 (와이어)', '범프', '칩 (뒤집어 붙임)', '칩', '코어', '안쪽 회로층 (신호·전원·접지)'];
const hex = c => '#' + c.toString(16).padStart(6, '0');

export function init(o) {
  const {IT, ORDER, NUM, stage, panel, ex, spin, names} = o;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(35, 1.6, 0.1, 5000);
  const ren = new THREE.WebGLRenderer({antialias: true, alpha: true});
  ren.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const lab = new CSS2DRenderer();
  lab.domElement.className = 'l3wrap';
  stage.append(ren.domElement, lab.domElement);
  const ctl = new OrbitControls(cam, lab.domElement);
  ctl.enableDamping = true; ctl.autoRotate = true; ctl.autoRotateSpeed = 1.6; ctl.enablePan = false;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.5));
  const d1 = new THREE.DirectionalLight(0xffffff, 2.0); d1.position.set(3, 6, 4); scene.add(d1);
  const d2 = new THREE.DirectionalLight(0xffffff, 0.8); d2.position.set(-4, -3, -5); scene.add(d2);

  let group = null, parts = [], labels = [], cur = null;
  const mat = (c, p = {}) => new THREE.MeshStandardMaterial({color: c, roughness: p.rough ?? 0.62, metalness: Math.min(p.metal ?? 0.05, 0.3),
    transparent: p.fade != null || p.opacity != null, opacity: p.opacity ?? 1, side: p.side ?? THREE.FrontSide});
  const box = (w, h, d, c, p) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, p));
  const cyl = (r, h, c, p) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), mat(c, p));
  function put(m, pos, e, fade) {
    m.position.set(pos[0], pos[1], pos[2]);
    m.userData = {base: new THREE.Vector3(...pos), ex: new THREE.Vector3(...(e || [0, 0, 0])), fade};
    if (fade) m.material.transparent = true;
    group.add(m); parts.push(m); return m;
  }
  function tag(m, text, off = [0, 0, 0]) {
    const el = document.createElement('div'); el.className = 'l3' + (INNER.includes(text) ? ' in' : ''); el.textContent = text;
    const ob = new CSS2DObject(el); ob.position.set(...off); m.add(ob); labels.push(el); return m;
  }
  function inst(geo, material, pos) {
    const m = new THREE.InstancedMesh(geo, material, pos.length), d = new THREE.Object3D();
    pos.forEach((p, i) => { d.position.set(p[0], p[1], p[2]); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
    m.instanceMatrix.needsUpdate = true; return m;
  }
  function gridPos(nx, nz, pitch, skip) {
    const a = [];
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const x = (i - (nx - 1) / 2) * pitch, z = (j - (nz - 1) / 2) * pitch;
      if (!skip || !skip(x, z)) a.push([x, 0, z]);
    }
    return a;
  }
  const balls = (nx, nz, pitch, r, c, skip) => inst(new THREE.SphereGeometry(r, 10, 8), mat(c, {metal: 0.6, rough: 0.35}), gridPos(nx, nz, pitch, skip));
  function ribbon(pts, w, c) { // 휘어지는 띠(FPCB)
    const cv = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), n = 48, v = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const p = cv.getPoint(i / n), t = cv.getTangent(i / n), s = new THREE.Vector3().crossVectors(t, new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(w / 2);
      v.push(p.x - s.x, p.y - s.y, p.z - s.z, p.x + s.x, p.y + s.y, p.z + s.z);
      if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx); g.computeVertexNormals();
    return new THREE.Mesh(g, mat(c, {side: THREE.DoubleSide, rough: 0.5}));
  }

  const M = {
    module1() { // DDR5 RDIMM + eSSD
      const p = put(box(133, 1.3, 31, C.pcb), [0, 0, -22]); tag(p, 'DDR5 RDIMM — 모듈 PCB', [-52, 0, -19]);
      tag(put(box(66, 1.36, 3.2, C.gold, {metal: .8, rough: .3}), [-31.5, 0, -8.1]), '골드 핑거', [0, 0, 3]);
      put(box(55, 1.36, 3.2, C.gold, {metal: .8, rough: .3}), [37, 0, -8.1]);
      [-58, -47, -36, -25, -14, 14, 25, 36, 47, 58].forEach((x, i) => {
        put(box(9, .3, 11, C.bt), [x, .8, -25], [0, 5, 0]);
        const c = put(box(9, 1, 11, C.chip), [x, 1.45, -25], [0, 11, 0]); if (i === 2) tag(c, 'D램 패키지', [0, 2, 0]); if (i === 7) tag(c, '그 아래 패키지기판', [0, -4, 9]);
        put(box(9, 1, 11, C.chip), [x, -1.15, -25], [0, -9, 0]);
      });
      tag(put(box(8, 1, 8, 0x3a3f47), [0, 1.15, -25], [0, 11, 0]), 'RCD');
      put(box(6, 1, 4, 0x3a3f47), [0, 1.15, -34], [0, 11, 0]);
      const s = put(box(111, 1.2, 31, C.pcb), [0, 0, 24]); tag(s, 'eSSD — 모듈 PCB', [-40, 0, 19]);
      put(box(4, 1.26, 22, C.gold, {metal: .8, rough: .3}), [-53.6, 0, 24]);
      put(box(14, .3, 14, C.sub), [-36, .75, 24], [0, 5, 0]);
      tag(put(box(13, 1.1, 13, C.chip), [-36, 1.45, 24], [0, 11, 0]), '컨트롤러 (FC-CSP)', [0, 2, 0]);
      put(box(8, 1, 11, C.chip), [-20, 1.1, 24], [0, 11, 0]);
      [-4, 11, 26, 41].forEach((x, i) => { const c = put(box(13, 1.2, 18, C.chip), [x, 1.2, 24], [0, 11, 0]); if (i === 2) tag(c, '낸드', [0, 2, 0]); });
      return {size: 150, leg: [[C.pcb, '모듈 PCB', '칩 패키지를 얹어 서버에 꽂는 바탕 판'], [C.gold, '골드 핑거', '슬롯·커넥터와 닿는 금색 단자'], [C.chip, 'D램·낸드 패키지', '검은 칩. 분해하면 아래에 패키지기판이 보임'], [C.bt, '패키지기판', '칩과 모듈 PCB 사이의 얇은 판 (③④ 참고)']]};
    },
    socamm() {
      tag(put(box(90, 1.2, 14, C.pcb), [0, 0, 0]), 'SOCAMM — 모듈 PCB', [0, 0, 10]);
      [-30, -11, 11, 30].forEach((x, i) => { put(box(15, .3, 12, C.bt), [x, .75, 0], [0, 4, 0]); const c = put(box(15, 1.1, 12, C.chip), [x, 1.3, 0], [0, 9, 0]); if (i === 1) tag(c, 'LPDDR 패키지', [0, 2, 0]); });
      [-42.5, 0, 42.5].forEach((x, i) => { put(cyl(1.5, 1.3, 0x0b3d26), [x, 0.02, 0]); const sc = put(cyl(1.3, 5, C.steel, {metal: .8, rough: .3}), [x, 3, 0], [0, 17, 0]); if (i === 2) tag(sc, '고정 나사', [0, 4, 0]); });
      const pads = inst(new THREE.BoxGeometry(.8, .12, .8), mat(C.gold, {metal: .8, rough: .3}), gridPos(46, 7, 1.4).map(p => [p[0], 0, p[2]]));
      tag(put(pads, [0, -.66, 0], [0, -5, 0]), '아랫면 접점', [0, -1, 5]);
      tag(put(box(70, 2.2, 11, C.slot), [0, -2.2, 0], [0, -13, 0]), '압착식 커넥터 (메인보드 쪽)', [0, -2, 0]);
      return {size: 105, leg: [[C.pcb, '모듈 PCB', '길쭉한 소형 기판. 눕혀서 장착'], [C.chip, 'LPDDR 패키지', '저전력 D램 4개'], [C.gold, '아랫면 접점', '금색 단자 대신 바닥 접점으로 눌러 연결'], [C.steel, '고정 나사', '눌러 체결 — 떼어내 교체 가능'], [C.slot, '압착식 커넥터', '메인보드에 붙어 모듈을 받는 부분']]};
    },
    mempkg() {
      tag(put(box(12, .3, 10, C.bt), [0, 0, 0]), '패키지기판 (BT)', [0, 0, 7]);
      tag(put(balls(9, 7, 1.2, .36, C.ball), [0, -.5, 0], [0, -2.6, 0]), '솔더볼', [0, -1, 5]);
      put(box(9, .28, 7, C.die), [0, .3, 0], [0, 1.6, 0]);
      const d2 = put(box(8.4, .28, 6.2, 0xb4bcc6), [.5, .6, 0], [0, 3.2, 0]); tag(d2, '칩 (적층)', [0, .6, 0]);
      const wires = new THREE.Group(), wm = mat(C.gold, {metal: .9, rough: .25});
      for (let k = 0; k < 9; k++) for (const sgn of [-1, 1]) {
        const x = -3.6 + k * .9, cv = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x, .14, sgn * 2.9), new THREE.Vector3(x, 1.2, sgn * 3.9), new THREE.Vector3(x, -.5, sgn * 4.5));
        wires.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 10, .045, 5), wm));
      }
      wires.material = wm; tag(put(wires, [.5, .6, 0], [0, 3.2, 0]), '금선 (와이어)', [0, 1.4, -4.6]);
      tag(put(box(12, 1.25, 10, C.mold, {fade: 1}), [0, .78, 0], [0, 6.5, 0], [1, .28]), '검은 수지 (몰드)', [0, 1.2, 0]);
      return {size: 19, leg: [[C.bt, '패키지기판 (BT)', '칩을 받치고 신호를 아래로 넘기는 얇은 판'], [C.die, '칩', '메모리 칩. 여러 장을 쌓기도 함'], [C.gold, '금선', '칩과 기판을 잇는 가는 선'], [C.mold, '몰드', '칩을 덮어 보호하는 검은 수지'], [C.ball, '솔더볼', '모듈 PCB·메인보드에 붙는 납땜 공']]};
    },
    fccsp() {
      tag(put(box(14, .35, 14, C.bt), [0, 0, 0]), '패키지기판 (BT)', [0, 0, 9.5]);
      tag(put(balls(10, 10, 1.25, .36, C.ball), [0, -.52, 0], [0, -2.8, 0]), '솔더볼', [0, -1, 7.5]);
      tag(put(balls(12, 12, .7, .17, C.gold), [0, .34, 0], [0, 1.6, 0]), '범프', [5.5, 0, 0]);
      tag(put(box(9, .45, 9, C.die), [0, .74, 0], [0, 3.6, 0]), '칩 (뒤집어 붙임)', [0, .7, 0]);
      tag(put(box(14, 1.05, 14, C.mold, {fade: 1}), [0, .7, 0], [0, 7, 0], [1, .28]), '몰드', [0, 1, -6]);
      return {size: 22, leg: [[C.bt, '패키지기판 (BT)', '칩 크기에 가까운 소형 기판'], [C.gold, '범프', '금선 대신 칩과 기판을 직접 잇는 돌기'], [C.die, '칩', '회로면이 아래를 보게 뒤집어 붙임 (플립칩)'], [C.ball, '솔더볼', '아래 보드에 붙는 납땜 공'], [C.mold, '몰드', '보호용 수지']]};
    },
    fcbga() {
      const L = [[C.sub, .2], [C.sub, .2], [C.sub, .2], [C.core, .8], [C.sub, .2], [C.sub, .2], [C.sub, .2]];
      let y = -1; L.forEach(([c, h], i) => { const m = put(box(42, h, 42, c), [0, y + h / 2, 0], [0, (i - 3) * 2.4, 0]); y += h + .02;
        if (i === 3) tag(m, '코어', [23, 0, 0]); if (i === 6) tag(m, '빌드업층 (ABF)', [23, 0, 0]); });
      tag(put(balls(30, 30, 1.3, .4, C.ball), [0, -1.45, 0], [0, -12, 0]), '솔더볼', [0, -1, 22]);
      const top = y;
      tag(put(balls(22, 22, .75, .18, C.gold), [0, top + .18, 0], [0, 10.5, 0]), '범프', [10, 0, 0]);
      tag(put(box(18, .8, 18, C.die), [0, top + .76, 0], [0, 14, 0]), '칩', [0, 1, 0]);
      const caps = inst(new THREE.BoxGeometry(1.7, .8, .9), mat(C.cap), [-14, -9, -4, 4, 9, 14].flatMap(x => [[x, 0, 13.2], [x, 0, -13.2]]));
      put(caps, [0, top + .4, 0], [0, 8.4, 0]);
      tag(put(box(36, 1.5, 36, C.lid, {metal: .75, rough: .3, fade: 1}), [0, top + 1.3, 0], [0, 21, 0], [1, .5]), '방열 뚜껑', [0, 1.4, 0]);
      return {size: 62, leg: [[C.sub, '빌드업층', 'ABF 필름으로 쌓은 미세 회로층 — 위아래로 여러 겹'], [C.core, '코어', '가운데 뼈대가 되는 두꺼운 층'], [C.gold, '범프', '칩과 기판을 잇는 수백~수천 개 돌기'], [C.die, '칩', '네트워크 칩·ASIC 등 큰 칩'], [C.lid, '방열 뚜껑', '열을 퍼뜨리는 금속 덮개'], [C.ball, '솔더볼', '메인보드에 직접 붙는 납땜 공']]};
    },
    mlb() {
      const n = 12;
      for (let i = 0; i < n; i++) {
        const y = (i - (n - 1) / 2) * .62, e = (i - (n - 1) / 2) * 6;
        const m = put(box(170, .5, 120, i % 2 ? 0x146b43 : C.pcbD), [0, y, 0], [0, e, 0]);
        if (i < n - 1) put(box(164, .1, 114, C.cu, {metal: .7, rough: .4}), [0, y + .3, 0], [0, e, 0]);
        if (i === n - 1) tag(m, '맨 위층', [-80, 0, 62]); if (i === 5) tag(m, '안쪽 회로층 (신호·전원·접지)', [88, 0, 0]);
      }
      const ty = (n / 2) * .62, te = ((n - 1) / 2) * 6;
      [[-60, -40], [-20, 45], [30, -48], [70, 40], [70, -50], [-75, 30]].forEach(([x, z], i) => { const v = put(cyl(1.3, n * .62 + .3, C.gold, {metal: .8, rough: .3}), [x, 0, z], [0, 0, 0]); v.scale.y = 1; v.userData.stretch = te * 2; if (i === 0) tag(v, '층간 연결 홀 (비아)', [0, 5, 0]); });
      put(box(40, 1.2, 40, C.sub), [-45, ty + .7, -12], [0, te + 5, 0]);
      tag(put(box(32, 1.6, 32, C.lid, {metal: .75, rough: .3}), [-45, ty + 2.1, -12], [0, te + 5, 0]), 'FC-BGA 패키지', [0, 2, 0]);
      [8, 20, 32, 44].forEach((x, i) => { put(box(5, 5, 96, C.slot), [x, ty + 2.6, 0], [0, te + 5, 0]); const m = put(box(1.3, 22, 90, C.pcb), [x, ty + 14, 0], [0, te + 12, 0]); if (i === 3) tag(m, 'RDIMM (세워 꽂음)', [0, 12, 0]); });
      put(box(22, 4, 10, C.slot), [68, ty + 2.1, 44], [0, te + 5, 0]); put(box(22, 4, 10, C.slot), [68, ty + 2.1, 28], [0, te + 5, 0]);
      return {size: 205, leg: [[C.pcbD, '절연층', '층과 층 사이를 떼어 놓는 판'], [C.cu, '구리 회로층', '층마다 신호·전원·접지를 나눠 배치'], [C.gold, '비아', '층을 위아래로 잇는 구멍. 분해하면 기둥처럼 보임'], [C.lid, '위에 얹힌 부품', 'FC-BGA 패키지, 메모리 모듈 슬롯 등']]};
    },
    hdi() {
      for (let i = 0; i < 4; i++) { const e = (i - 1.5) * 2.6, y = (i - 1.5) * .28;
        const a = put(box(62, .25, 24, i % 2 ? 0x1a4f82 : C.hdi), [0, y, -30], [0, e, 0]); put(box(24, .25, 22, i % 2 ? 0x1a4f82 : C.hdi), [19, y, -7], [0, e, 0]);
        if (i === 3) tag(a, 'HDI 주기판 (얇은 층을 여러 겹)', [-10, 0, -15]); }
      const ty = .6, te = 3.9;
      tag(put(box(13, 1.2, 13, C.chip), [-14, ty + .6, -30], [0, te + 3, 0]), 'AP', [0, 1.5, 0]);
      put(box(9, 1, 11, C.chip), [2, ty + .5, -31], [0, te + 3, 0]); put(box(8, 1, 8, C.chip), [22, ty + .5, -6], [0, te + 3, 0]);
      tag(put(box(18, 1.6, 14, C.lid, {metal: .75, rough: .3, fade: 1}), [20, ty + .8, -31], [0, te + 9, 0], [1, .6]), '차폐 캔', [0, 1.5, 0]);
      tag(put(box(12, 6, 12, 0x15171b), [-24, 3, -6], [0, 5, 0]), '카메라 모듈', [0, 4.5, 0]);
      tag(put(ribbon([[-24, .2, -12], [-24, 2.4, -16], [-24, .9, -20]], 7, C.flex), [0, 0, 0], [0, 4.5, 0]), 'FPCB', [-24, 4, -16]);
      tag(put(box(44, .8, 12, C.hdi), [0, 0, 44]), '보조 기판', [0, 0, 8]);
      put(box(10, 2.4, 6, 0x15171b), [0, 1.2, 48]);
      tag(put(ribbon([[24, .7, 4], [25, 6, 14], [24, 1.2, 26], [22, 5, 34], [18, .6, 40]], 9, C.flex), [0, 0, 0], [0, 3, 0]), 'FPCB — 휘어지는 연성기판', [25, 7, 20]);
      tag(put(box(40, 3.6, 34, 0x4a4f58), [-8, 1.8, 18]), '배터리', [0, 2.6, 0]);
      return {size: 120, leg: [[C.hdi, 'HDI 주기판', '미세 홀로 층을 이어 좁은 면적에 촘촘히 배선'], [C.flex, 'FPCB', '얇은 필름 기판. 접고 휘어 부품 사이를 연결'], [C.chip, 'AP·메모리 등', '주기판 위에 올라가는 칩'], [C.lid, '차폐 캔', '전자파를 막는 금속 덮개']]};
    }
  };

  function clear() {
    labels.forEach(e => e.remove()); labels = [];
    if (group) { group.traverse(m => { if (m.geometry) m.geometry.dispose(); if (m.material && m.material.dispose) m.material.dispose(); }); scene.remove(group); }
    parts = [];
  }
  function explode() {
    const t = (+ex.value || 0) / 100; stage.classList.toggle('closed', t < 0.2);
    parts.forEach(m => { const u = m.userData; m.position.copy(u.base).addScaledVector(u.ex, t);
      if (u.fade && m.material) m.material.opacity = u.fade[0] + (u.fade[1] - u.fade[0]) * t;
      if (u.stretch != null) m.scale.y = 1 + t * (u.stretch / m.geometry.parameters.height); });
  }
  function show(id) {
    clear(); cur = id; group = new THREE.Group(); scene.add(group);
    const r = M[id](); explode();
    const dir = new THREE.Vector3(.55, .62, 1).normalize();
    cam.position.copy(dir.multiplyScalar(r.size * 1.75)); ctl.target.set(0, 0, 0);
    ctl.minDistance = r.size * .5; ctl.maxDistance = r.size * 4; cam.near = r.size / 200; cam.far = r.size * 20; cam.updateProjectionMatrix(); ctl.update();
    const d = IT[id];
    panel.innerHTML = `<div class="m3">${ORDER.map(k => `<button data-m3="${k}" class="${k === id ? 'on' : ''}">${NUM[IT[k].no - 1]} ${IT[k].n}</button>`).join('')}</div>
      <h3><span class="no">${d.no}</span>${d.n}</h3><div class="use">${d.use}</div><div class="ld">${d.lead}</div>
      <div class="sec">보이는 부분 <span>분해 막대를 밀면 층이 벌어집니다</span></div>
      <ul class="leg3">${r.leg.map(([c, n, t]) => `<li><i style="background:${hex(c)}"></i><div><b>${n}</b><span>${t}</span></div></li>`).join('')}</ul>
      <button class="kid go" data-info="${id}"><span class="kn">업황 · 전방사 · 관련 회사 보기 →</span></button>`;
  }
  function resize() {
    const w = stage.clientWidth || 600, h = Math.max(360, Math.min(640, Math.round(w * .62)));
    stage.style.height = h + 'px'; ren.setSize(w, h); lab.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  panel.addEventListener('click', e => {
    const b = e.target.closest('[data-m3]'); if (b) { show(b.dataset.m3); return; }
    const g = e.target.closest('[data-info]'); if (g) o.onInfo(g.dataset.info);
  });
  ex.addEventListener('input', explode);
  spin.addEventListener('change', () => { ctl.autoRotate = spin.checked; });
  names.addEventListener('change', () => { stage.classList.toggle('nolab', !names.checked); });
  lab.domElement.addEventListener('pointerdown', () => { if (spin.checked) { spin.checked = false; ctl.autoRotate = false; } });
  window.addEventListener('resize', resize);
  resize(); show(o.start || 'fcbga');
  (function loop() { requestAnimationFrame(loop); if (stage.offsetParent === null) return; ctl.update(); ren.render(scene, cam); lab.render(scene, cam); })();
  return {resize, show};
}
