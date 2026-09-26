/**
 * ?debug=layout — translucent footprints for lots (by type), roads, platforms,
 * station, trees, poles and reserved spots.  Development aid only.
 */
import * as THREE from 'three';

const TYPE_COLORS = {
  house: '#7aa6d8', cafe: '#d88a5a', flower: '#e07ab0', books: '#8a7ad8', bicycle: '#5ab8a0', konbini: '#3aa37a',
  wagashi: '#e8a0b8', zakka: '#c8a050', ramen: '#d85050', tabako: '#a07050',
};

export default function build(ctx) {
  const { layout } = ctx;
  const g = new THREE.Group();
  g.name = 'debugLayout';
  const matFor = (c, o = 0.45) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false });
  const box = (w, h, d, c, x, y, z, ry = 0, o) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matFor(c, o));
    m.position.set(x, y + h / 2, z);
    m.rotation.y = ry;
    m.userData.noOutline = true;
    g.add(m);
    return m;
  };
  for (const l of layout.LOTS) {
    box(l.width, l.floors === 1 ? 3.2 : 6, l.depth, TYPE_COLORS[l.type] || '#999', l.x, l.y, l.z, l.rotY, l.street === 'backrow' ? 0.25 : 0.45);
    // front marker
    box(0.4, 0.4, 0.4, '#ff0000', l.front.x, l.y + 0.2, l.front.z, 0, 0.9);
  }
  const B = layout.STATION.building;
  box(B.xMax - B.xMin, B.eaveY, B.zMax - B.zMin, '#f2e6cf', (B.xMin + B.xMax) / 2, 0, (B.zMin + B.zMax) / 2, 0, 0.6);
  const P = layout.PLATFORM;
  for (const p of [P.P1, P.P2]) box(P.xMax - P.xMin, P.top, Math.abs(p.zBack - p.zTrack), '#cccccc', (P.xMin + P.xMax) / 2, 0, (p.zBack + p.zTrack) / 2, 0, 0.6);
  for (const t of layout.RAIL.tracks) box(layout.RAIL.xMax - layout.RAIL.xMin, 0.45, 2.8, '#6a5a50', 0, 0, t.z, 0, 0.6);
  const PL = layout.PLAZA;
  box(PL.xMax - PL.xMin, 0.05, PL.zMax - PL.zMin, '#e0d8c0', (PL.xMin + PL.xMax) / 2, 0, (PL.zMin + PL.zMax) / 2, 0, 0.5);
  for (const t of layout.TREES) {
    if (t.far) continue;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 5, 8), matFor(t.hero ? '#ff3080' : '#f090b0', 0.8));
    m.position.set(t.x, t.y + 2.5, t.z);
    g.add(m);
  }
  for (const line of layout.POLE_LINES) for (const p of line.poles) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 9, 6), matFor('#555555', 0.8));
    m.position.set(p.x, p.y + 4.5, p.z);
    g.add(m);
  }
  for (const v of layout.SPOTS.vending) box(1.0, 1.8, 0.8, '#ff2020', v.x, v.y, v.z, v.rotY, 0.8);
  for (const v of layout.SPOTS.bicycles) box(0.5, 1.0, 1.7, '#20a0ff', v.x, v.y, v.z, v.rotY, 0.8);
  for (const v of layout.SPOTS.vehicles) box(1.5, 1.6, 3.4, '#ffffff', v.x, v.y, v.z, v.rotY, 0.8);
  // main street centreline
  const pts = [];
  for (let s = 0; s < layout.MAIN_STREET.length; s += 2) {
    const f = layout.MAIN_STREET.atS(s);
    pts.push(new THREE.Vector3(f.x, layout.groundY(f.x, f.z) + 0.1, f.z));
  }
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#ff8800' }));
  g.add(line);
  return g;
}
