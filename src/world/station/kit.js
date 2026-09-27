/**
 * Station building kit: shared materials, a sign atlas and small geometry
 * helpers used by every part of the station module.
 *
 * Draw-call strategy: almost every solid part uses ONE vertex-coloured toon
 * material (colour baked into the geometry with geom.paint), metal parts use
 * one vertex-coloured metal, and every sign / poster / label is a region of
 * a shared canvas atlas.  After geom.bakeStatic() the whole station collapses
 * into a few dozen draw calls regardless of how many parts it has.
 */
import * as THREE from 'three';
import { Atlas } from './atlas.js';
import { makeTextures } from './textures.js';

/** Axis-dominant planar UVs (box projection) in the geometry's own space. */
export function boxUV(g, su = 1, sv = su, ou = 0, ov = 0) {
  const p = g.attributes.position;
  const n = g.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    let u, v;
    if (ay >= ax && ay >= az) { u = x / su; v = -z / sv; }
    else if (ax >= az) { u = z / su; v = y / sv; }
    else { u = x / su; v = y / sv; }
    uv[i * 2] = u + ou;
    uv[i * 2 + 1] = v + ov;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

/** Remap a plane's 0..1 UVs into an atlas region. */
export function regionUV(g, r) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, r.u0 + uv.getX(i) * (r.u1 - r.u0), r.v0 + uv.getY(i) * (r.v1 - r.v0));
  }
  uv.needsUpdate = true;
  return g;
}

export function paint(g, color) {
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

/**
 * Create the kit.  Returns { M (materials), atlas, tex (tiled textures), helpers... }.
 */
/**
 * Interior materials: multiply the (sky-blue) indirect light by a warm factor
 * so rooms under the roof read as lit by warm fluorescent tubes.
 */
const WARM_IN = {
  onShaderKey: 'stWarmIn',
  onShader(shader) {
    shader.fragmentShader = shader.fragmentShader.replace(
      'vec3 outgoingLight =',
      'reflectedLight.indirectDiffuse *= vec3( 1.46, 1.13, 0.74 );\n\tvec3 outgoingLight ='
    );
  },
};

export function createKit(ctx) {
  const { toon } = ctx;
  const T = makeTextures(ctx);
  // two sign atlas pages: A = railway signage + name boards at full resolution;
  // the second page holds maps / posters (P) and ads, drawings, timetables (Q),
  // stored at 72 % of their design resolution (they are read from a few metres,
  // text there stays legible and the page saves ~22 MB of GPU memory).
  const atlas = new Atlas(2048, 2048);
  const atlas2 = new Atlas(2048, 2048, { scale: 0.72 });
  const atlas3 = atlas2;
  const warm = { emissive: '#ffeede', emissiveIntensity: 0.12, ...WARM_IN };
  for (const [i, a] of [atlas, atlas2].entries()) {
    a.mats = {
      lit: toon.mat('#ffffff', { map: a.texture, alphaTest: 0.5, name: `st_sign${i}` }),
      in: toon.mat('#ffffff', { map: a.texture, alphaTest: 0.5, emissiveMap: a.texture, ...warm, name: `st_signIn${i}` }),
      unlit: toon.unlit('#ffffff', { map: a.texture, name: `st_signLit${i}` }),
      floor: toon.mat('#ffffff', { map: a.texture, alphaTest: 0.4, polygonOffset: 3, name: `st_signFloor${i}` }),
    };
  }

  const M = {
    vc: toon.mat('#ffffff', { vertexColors: true, name: 'st_vc' }),
    // interior surfaces: a touch of warm self-light (fluorescent / lamp bounce)
    vcIn: toon.mat('#ffffff', { vertexColors: true, emissive: '#5a4128', emissiveIntensity: 0.18, ...WARM_IN, name: 'st_vcIn' }),
    metal: toon.metal('#ffffff', { vertexColors: true, name: 'st_metal' }),
    lamp: toon.unlit('#ffffff', { vertexColors: true, name: 'st_lamp' }),
    paint: toon.mat('#ffffff', { vertexColors: true, polygonOffset: 2, name: 'st_paint' }),
    wall: toon.mat('#ffffff', { map: T.plaster, vertexColors: true, name: 'st_wall' }),
    wallIn: toon.mat('#ffffff', { map: T.plasterIn, vertexColors: true, emissive: '#5a4128', emissiveIntensity: 0.16, ...WARM_IN, name: 'st_wallIn' }),
    floor: toon.mat('#ffffff', { map: T.floorTile, vertexColors: true, emissive: '#4a3522', emissiveIntensity: 0.16, ...WARM_IN, name: 'st_floor' }),
    platform: toon.mat('#ffffff', { map: T.concrete, vertexColors: true, name: 'st_platform' }),
    concreteIn: toon.mat('#ffffff', { map: T.concrete, vertexColors: true, ...WARM_IN, name: 'st_concreteIn' }),
    retaining: toon.mat('#ffffff', { map: T.retaining, vertexColors: true, name: 'st_retain' }),
    tactileDot: toon.mat('#ffffff', { map: T.tactileDot, name: 'st_tdot' }),
    tactileLine: toon.mat('#ffffff', { map: T.tactileLine, name: 'st_tline' }),
    wood: toon.mat('#ffffff', { map: T.wood, vertexColors: true, name: 'st_wood' }),
    roof: toon.metal('#ffffff', { map: T.roof, vertexColors: true, spec: 0.14, shininess: 110, name: 'st_roof' }),
    glass: toon.glass({ tint: '#9db7cb', opacity: 0.32, sheen: 0.32 }),
    signIn: atlas.mats.in,
  };

  const kit = { ctx, M, T, atlas, atlas2, atlas3, colliders: [] };

  /** Add a geometry as a static mesh.  o: noOutline, cast (default true), uv:[su,sv,ou,ov] */
  kit.add = (parent, g, mat, color, o = {}) => {
    if (o.uv) boxUV(g, o.uv[0], o.uv[1], o.uv[2] || 0, o.uv[3] || 0);
    if (color !== null && color !== undefined) paint(g, color);
    const m = new THREE.Mesh(g, mat);
    m.castShadow = o.cast !== false;
    m.receiveShadow = true;
    if (o.noOutline) m.userData.noOutline = true;
    parent.add(m);
    return m;
  };

  /** Axis-aligned box given min / max corners (group-local coordinates). */
  kit.bx = (parent, mat, color, x0, x1, y0, y1, z0, z1, o = {}) => {
    const g = new THREE.BoxGeometry(Math.max(1e-3, Math.abs(x1 - x0)), Math.max(1e-3, Math.abs(y1 - y0)), Math.max(1e-3, Math.abs(z1 - z0)));
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    return kit.add(parent, g, mat, color, o);
  };

  /** Box by centre + size with optional rotation (o.rx / o.ry / o.rz, applied YXZ about its centre). */
  kit.box = (parent, mat, color, w, h, d, x, y, z, o = {}) => {
    const g = new THREE.BoxGeometry(w, h, d);
    if (o.rz) g.rotateZ(o.rz);
    if (o.rx) g.rotateX(o.rx);
    if (o.ry) g.rotateY(o.ry);
    g.translate(x, y, z);
    return kit.add(parent, g, mat, color, o);
  };

  /** Vertical cylinder standing on (x, y, z). o.rx/o.rz tilt it about its base. */
  kit.cyl = (parent, mat, color, rTop, rBot, h, x, y, z, seg = 10, o = {}) => {
    const g = new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, !!o.open, o.thetaStart || 0, o.thetaLength || Math.PI * 2);
    g.translate(0, h / 2, 0);
    if (o.rz) g.rotateZ(o.rz);
    if (o.rx) g.rotateX(o.rx);
    if (o.ry) g.rotateY(o.ry);
    g.translate(x, y, z);
    return kit.add(parent, g, mat, color, o);
  };

  /** Horizontal cylinder along X (o.axis 'x') or Z ('z') between a and b at (y, other). */
  kit.rod = (parent, mat, color, r, axis, a, b, y, other, seg = 6, o = {}) => {
    const len = Math.abs(b - a);
    const g = new THREE.CylinderGeometry(r, r, len, seg, 1, !!o.open);
    if (axis === 'x') { g.rotateZ(Math.PI / 2); g.translate((a + b) / 2, y, other); }
    else { g.rotateX(Math.PI / 2); g.translate(other, y, (a + b) / 2); }
    return kit.add(parent, g, mat, color, o);
  };

  kit.sphere = (parent, mat, color, r, x, y, z, o = {}) => {
    const g = new THREE.SphereGeometry(r, o.ws || 10, o.hs || 7);
    if (o.sy) g.scale(1, o.sy, 1);
    g.translate(x, y, z);
    return kit.add(parent, g, mat, color, o);
  };

  /**
   * Rectangular beam from point a to point b (cross-section w x h).  The beam's
   * "up" stays as close to o.up (default +Y) as possible.  o.under: the a-b line
   * is the beam's UNDERSIDE (for roof slabs / ramps) instead of its axis.
   */
  const _bx = new THREE.Vector3(), _by = new THREE.Vector3(), _bz = new THREE.Vector3(), _bm = new THREE.Matrix4();
  kit.beam = (parent, mat, color, a, b, w, h, o = {}) => {
    _bz.set(b.x - a.x, b.y - a.y, b.z - a.z);
    const L = _bz.length();
    _bz.divideScalar(L);
    const up = o.up ? _by.copy(o.up) : _by.set(0, 1, 0);
    if (Math.abs(up.dot(_bz)) > 0.99) up.set(0, 0, 1);
    _bx.crossVectors(up, _bz).normalize();
    _by.crossVectors(_bz, _bx);
    const g = new THREE.BoxGeometry(w, h, L + (o.extend || 0));
    if (o.under) g.translate(0, h / 2, 0);
    _bm.makeBasis(_bx, _by, _bz).setPosition((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    g.applyMatrix4(_bm);
    return kit.add(parent, g, mat, color, o);
  };

  /**
   * Straight wall with rectangular openings.  axis 'x': runs along X from s0
   * to s1, occupying t0..t1 in Z; axis 'z': runs along Z, t0..t1 in X.
   * openings: [{a, b, y0, y1}] in the run coordinate.
   */
  kit.wall = (parent, mat, color, axis, s0, s1, t0, t1, y0, y1, openings = [], o = {}) => {
    const piece = (a, b, ya, yb) => {
      if (b - a < 1e-3 || yb - ya < 1e-3) return;
      if (axis === 'x') kit.bx(parent, mat, color, a, b, ya, yb, t0, t1, o);
      else kit.bx(parent, mat, color, t0, t1, ya, yb, a, b, o);
    };
    const ops = [...openings].sort((p, q) => p.a - q.a);
    let cur = s0;
    for (const op of ops) {
      piece(cur, op.a, y0, y1);
      piece(op.a, op.b, y0, op.y0);
      piece(op.a, op.b, op.y1, y1);
      cur = op.b;
    }
    piece(cur, s1, y0, y1);
  };

  /**
   * Prism from a polygon in a vertical plane.  plane 'x': polygon points are
   * [z, y] and the prism spans x0..x1; plane 'z': points are [x, y], spans z0..z1.
   */
  kit.prism = (parent, mat, color, plane, pts, t0, t1, o = {}) => {
    const sh = new THREE.Shape();
    // plane 'x' uses u = -z so the extrusion stays right-handed
    const P = pts.map(([u, v]) => (plane === 'x' ? [-u, v] : [u, v]));
    sh.moveTo(P[0][0], P[0][1]);
    for (let i = 1; i < P.length; i++) sh.lineTo(P[i][0], P[i][1]);
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: t1 - t0, bevelEnabled: false });
    if (plane === 'x') {
      // (u, v, w) -> (x = t0 + w, y = v, z = -u)
      g.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, t0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 1));
    } else {
      g.translate(0, 0, t0);
    }
    g.computeVertexNormals();
    return kit.add(parent, g, mat, color, o);
  };

  /** Thin tube along world points. */
  kit.tube = (parent, mat, color, pts, r, radial = 5, o = {}) => {
    const g = ctx.geom.tubeAlong(pts, r, radial);
    return kit.add(parent, g, mat, color, { noOutline: true, ...o });
  };

  /**
   * Textured plane (atlas region).  Faces +Z after rotation ry (and rx).
   * o.mat (default M.sign), o.back (also add a mirrored back face with region o.back)
   */
  kit.decal = (parent, region, w, h, x, y, z, ry = 0, o = {}) => {
    const g = new THREE.PlaneGeometry(w, h);
    regionUV(g, region);
    if (o.rz) g.rotateZ(o.rz);
    if (o.rx) g.rotateX(o.rx);
    g.rotateY(ry);
    g.translate(x, y, z);
    const m = new THREE.Mesh(g, o.mat || region.atlas.mats.lit);
    m.userData.noOutline = true;
    m.castShadow = false;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  /** Pick the lit / interior / unlit / floor variant for a region's atlas. */
  kit.matFor = (region, kind = 'lit') => region.atlas.mats[kind];

  /**
   * A sign board: a thin coloured slab with the region on its front (and
   * optionally back) face.  Local frame: centred at (x,y,z), facing +Z rotated by ry.
   */
  kit.board = (parent, region, w, h, x, y, z, ry = 0, o = {}) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry;
    const t = o.thick ?? 0.04;
    const frame = o.frame ?? 0.02;
    kit.box(g, o.frameMat || M.metal, o.frameColor || '#e8e8e6', w + frame * 2, h + frame * 2, t, 0, 0, 0);
    const mat = o.mat || kit.matFor(region, o.kind);
    kit.decal(g, region, w, h, 0, 0, t / 2 + 0.003, 0, { mat });
    if (o.back) {
      const br = o.back === true ? region : o.back;
      const bmat = br.atlas === region.atlas ? mat : kit.matFor(br, o.kind);
      kit.decal(g, br, w, h, 0, 0, -t / 2 - 0.003, Math.PI, { mat: bmat });
    }
    parent.add(g);
    return g;
  };

  return kit;
}
