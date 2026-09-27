/**
 * One lot -> geometry.  Kept free of canvas / material code so the same
 * function can be driven from Node for triangle accounting
 * (see .shots/houses/nodebuild.mjs).
 *
 *   buildLot(B, D, lot)   plan + shell + openings + exterior + shadow proxy
 *   chunkOf(lot)          area chunk id (frustum-culling unit of the batch)
 */
import * as THREE from 'three';
import { makePlan } from './plan.js';
import { roofParams, buildFoundation, buildFacadeWall, buildRoof, buildFrontEave } from './shell.js';
import { planOpenings, buildOpenings } from './openings.js';
import { buildExterior } from './exterior.js';
import { buildRearYard } from './rear.js';
import { buildApartment } from './apartment.js';

/**
 * Area chunks keep frustum culling useful while holding draw calls down.
 * Frontage lots are grouped by street; filler lots by lane (the three east
 * lanes / three west lanes, and the two short lanes north of the station).
 */
export function chunkOf(lot) {
  if (lot.filler) {
    if (lot.street === 'LNE' || lot.street === 'LNW') return 'fN';
    const east = lot.x > 0;
    if (lot.street.endsWith('1')) return east ? 'fE1' : 'fW1';
    return east ? 'fE23' : 'fW23';
  }
  if (lot.street === 'north') return lot.x < 0 ? 'nrW' : 'nrE';
  if (lot.street === 'stationFront') return lot.x < 0 ? 'sfW' : 'sfE';
  return lot.z < 78 ? 'mainN' : 'mainS';
}

const lotM = new THREE.Matrix4();

/** Build one lot into the batch; returns its plan (for colliders / stats). */
export function buildLot(B, D, lot) {
  const P = makePlan(lot);
  planOpenings(P);
  B.setChunk(chunkOf(lot));
  lotM.makeRotationY(lot.rotY).setPosition(lot.x, lot.y, lot.z);
  B.setBase(lotM);
  D.porch = null;
  for (const b of P.blocks) b.rp = roofParams(b);
  for (const b of P.blocks) buildFoundation(B, P, b);
  for (const f of P.facades) buildFacadeWall(B, P, f);
  for (const b of P.blocks) buildRoof(B, P, b);
  if (P.frontEave) buildFrontEave(B, P);
  buildOpenings(B, P, D);
  if (P.apartment) buildApartment(B, P, D);
  buildExterior(B, P, D);
  if (lot.street === 'north') buildRearYard(B, P, D);
  return P;
}
