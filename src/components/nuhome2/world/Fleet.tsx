import { useRef, Component, Suspense, useContext, useMemo, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CAR_SPECS, Car, Topper, plateTexture } from './Cars';
import { NightCtx } from './theme';

/*
 * The DrivingKlass fleet: one premium fastback sedan, generated in Higgsfield from the reference car, shown five times
 * in the Guyana flag colours. The model file lives at public/models/dk-fleet-sedan.glb. It is an untextured mesh, so
 * the paint, black glass roof, wheels, trim and lamps are drawn by a shader that reads each point's place on the car.
 * Every device gets this car: the full model on most, a lighter copy of it on slow phones. The earlier procedural cars
 * only stand in if the file itself is missing or fails to load, so the lot is never empty.
 */
export const FLEET_URL = `${import.meta.env.BASE_URL}models/dk-fleet-sedan.glb`;
/** The same car with 30% of the triangles, 33 KB, for slower phones. Both files are meshopt compressed. */
export const FLEET_LITE_URL = `${import.meta.env.BASE_URL}models/dk-fleet-sedan-lite.glb`;
/** The same sedan generated WITH surface detail (lamps, grille, panel lines, wheels). Used automatically once public/models/dk-fleet-sedan-textured.glb is in the build. */
export const FLEET_TEX_URL = `${import.meta.env.BASE_URL}models/dk-fleet-sedan-textured.glb`;
/** The textured sedan is used whenever its file is in the build; ?fleet=painted forces the painted one for comparison. */
export const FLEET_TEX_LITE_URL = `${import.meta.env.BASE_URL}models/dk-fleet-sedan-textured-lite.glb`;
export const useTexturedFleet = () => typeof window === 'undefined' || new URLSearchParams(window.location.search).get('fleet') !== 'painted';
export const FLEET_COLORS = { red: '#ce1126', black: '#101114', yellow: '#f7c600', white: '#f3f3f0', green: '#009e49' } as const;
const LENGTH = 4.9;   // metres, the reference car's class

/** The real lamps of a Meshy car, measured on the model in car space (metres, nose +x, up +y). Centre and half size of the lamp on the car's right (+z); the left lamp is its mirror. Lets the turn signal light the car's own headlight and tail light. */
type LampBox = [cx: number, cy: number, cz: number, hx: number, hy: number, hz: number];
type Lamps = { front: LampBox; rear: LampBox };
type ImportedFleetAsset = { full: string; lite: string; length?: number; flip?: boolean; roofX?: number; lamps?: Lamps; plateRy?: number };   // length: metres, flip: model nose guess is wrong, roofX: topper position along the car (fraction of length from the middle)
const asset = (name: string, o: { length?: number; flip?: boolean; roofX?: number; lamps?: Lamps; plateRy?: number } = {}): ImportedFleetAsset => ({
  full: `${import.meta.env.BASE_URL}models/${name}.glb`,
  lite: `${import.meta.env.BASE_URL}models/${name}-lite.glb`,
  ...o,
});

/** The three Meshy cars selected for the new homepage. Their baked paint and surface detail are preserved. */
const IMPORTED_FLEET: Partial<Record<keyof typeof CAR_SPECS, ImportedFleetAsset>> = {
  corolla: asset('dk-meshy-future-ev'),
  elantra: asset('dk-meshy-red-sport'),
  // the other three spots: Matra Laser 1971, orange sports car, red roadster (all Meshy, CC0 models supplied by the owner)
  civic: asset('dk-meshy-matra-laser', { length: 4.4 }),
  camry: asset('dk-meshy-vibranium', { length: 4.3, plateRy: .6, lamps: { front: [1.87, .575, .6, .3, .11, .24], rear: [-1.93, .755, .6, .27, .1, .24] } }),   // the school's car: the Vibranium Meshy model, in the opening shot
  sentra: asset('dk-meshy-lamborghini', { length: 4.5 }),
  hero: asset('dk-meshy-orange-sport', { length: 4.5 }),   // the parked car that used to be the gold sedan
};

export type Prepared = { M: THREE.Matrix4; geo: THREE.BufferGeometry; L: number; H: number; W: number; ax: number; rw: number; nose: number; roof: THREE.Vector3; plateF: THREE.Vector3; plateR: THREE.Vector3 };

/** Bake the model into car space: length along x, up y, wheels on y = 0, centred. Then find wheels, nose, roof and plate spots. */
const prepared = new Map<string, Prepared>();
export function prepare(scene: THREE.Object3D): Prepared {
  scene.updateMatrixWorld(true);
  const parts: THREE.BufferGeometry[] = [];
  scene.traverse(o => {
    const m = o as THREE.Mesh; if (!m.isMesh || !m.geometry) return;
    const src = m.geometry, pa = src.getAttribute('position'), f = new Float32Array(pa.count * 3);
    for (let i = 0; i < pa.count; i++) { f[i * 3] = pa.getX(i); f[i * 3 + 1] = pa.getY(i); f[i * 3 + 2] = pa.getZ(i); }
    const na = src.getAttribute('normal'), nf = new Float32Array(pa.count * 3);
    if (na) for (let i = 0; i < na.count; i++) { nf[i * 3] = na.getX(i); nf[i * 3 + 1] = na.getY(i); nf[i * 3 + 2] = na.getZ(i); }
    const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(f, 3)); if (na) out.setAttribute('normal', new THREE.BufferAttribute(nf, 3));
    if (src.index) out.setIndex(new THREE.BufferAttribute(Uint32Array.from(src.index.array as ArrayLike<number>), 1));
    out.applyMatrix4(m.matrixWorld); parts.push(out);
  });
  let geo = parts.length === 1 ? parts[0]! : mergeGeometries(parts, false)!;
  geo.computeBoundingBox();
  let s = geo.boundingBox!.getSize(new THREE.Vector3());
  const M = new THREE.Matrix4();   // model space to car space, so a textured copy of the same model can be placed identically
  if (s.z > s.x) { geo.rotateY(Math.PI / 2); M.premultiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)); }
  geo.computeBoundingBox(); s = geo.boundingBox!.getSize(new THREE.Vector3());
  const c = geo.boundingBox!.getCenter(new THREE.Vector3());
  M.premultiply(new THREE.Matrix4().makeTranslation(-c.x, -geo.boundingBox!.min.y, -c.z)); geo.translate(-c.x, -geo.boundingBox!.min.y, -c.z);
  const k = LENGTH / s.x; geo.scale(k, k, k); M.premultiply(new THREE.Matrix4().makeScale(k, k, k));
  geo.computeBoundingBox(); s = geo.boundingBox!.getSize(new THREE.Vector3());
  const L = s.x, H = s.y, W = s.z, p = geo.attributes.position as THREE.BufferAttribute;
  // wheels: the lowest points are where the tyres touch the ground
  let fx = 0, fn = 0, rx = 0, rn = 0; const top = { f: 0, r: 0 };
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    if (y < .03 * H) { if (x > 0) { fx += x; fn++; } else { rx += x; rn++; } }
    if (Math.abs(Math.abs(x) - .4 * L) < .05 * L && Math.abs(p.getZ(i)) < .15 * W) { if (x > 0) top.f = Math.max(top.f, y); else top.r = Math.max(top.r, y); }
  }
  const ax = fn && rn ? (fx / fn - rx / rn) / 2 : .3 * L, rw = .245 * H;
  const nose = top.f <= top.r ? 1 : -1;   // the hood sits lower than the trunk deck
  if (!geo.getAttribute('normal')) geo = toCreasedNormals(geo, Math.PI / 4.2);   // older model files carry no normals
  // roof and plate spots, found by casting onto the real surface
  const mesh = new THREE.Mesh(geo), ray = new THREE.Raycaster(), hit = (o: THREE.Vector3, d: THREE.Vector3, fb: THREE.Vector3) => { ray.set(o, d); const h = ray.intersectObject(mesh, false)[0]; return h ? h.point.clone() : fb; };
  const roof = hit(new THREE.Vector3(-.05 * L * nose, H + 2, 0), new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, H, 0));
  const plateF = hit(new THREE.Vector3(nose * (L + 1), .3 * H, 0), new THREE.Vector3(-nose, 0, 0), new THREE.Vector3(nose * L / 2, .3 * H, 0));
  const plateR = hit(new THREE.Vector3(-nose * (L + 1), .42 * H, 0), new THREE.Vector3(nose, 0, 0), new THREE.Vector3(-nose * L / 2, .42 * H, 0));
  return { M, geo, L, H, W, ax, rw, nose, roof, plateF, plateR };
}

let carEnvCache: THREE.Texture | null = null;
/**
 * What the paint and glass reflect: a bright sky overhead, a soft grey horizon, a darker ground and two soft light boxes. The
 * scene's own environment is mostly empty black between its light panels, which showed up as dark stains on the hoods.
 */
export function carEnv(gl: THREE.WebGLRenderer) {
  if (carEnvCache) return carEnvCache;
  const sc = new THREE.Scene(), g = new THREE.SphereGeometry(50, 48, 24), pos = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(pos.count * 3);
  const top = new THREE.Color('#d2dff3'), mid = new THREE.Color('#8c9ab0'), low = new THREE.Color('#4b4a4e'), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 50; c.copy(mid); if (y > 0) c.lerp(top, Math.pow(y, .6)); else c.lerp(low, Math.pow(-y, .5)); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  sc.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const box = (w: number, h: number, p: [number, number, number], k: number, tint: string) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(...p); m.lookAt(0, 0, 0); sc.add(m); };
  box(40, 14, [0, 38, 6], 1.9, '#ffffff'); box(26, 8, [-34, 14, 14], 1.5, '#fff4e0'); box(22, 7, [30, 12, -16], 1.1, '#dfe9ff');
  const pm = new THREE.PMREMGenerator(gl); carEnvCache = pm.fromScene(sc, .03).texture; pm.dispose();
  return carEnvCache;
}

export function fleetMaterial(color: string, P: Prepared, twoTone: boolean, blackRoof = false, env?: THREE.Texture) {
  // soft, wide reflections: sharp mirror reflections of the empty parts of the sky read as black stains on the hood and roof
  const m = new THREE.MeshPhysicalMaterial({ color, metalness: .22, roughness: .42, clearcoat: 1, clearcoatRoughness: .16, envMap: env ?? null, envMapIntensity: .7 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uTwoTone: { value: twoTone ? 1 : 0 }, uBlackRoof: { value: blackRoof ? 1 : 0 }, uL: { value: P.L }, uH: { value: P.H }, uW: { value: P.W }, uAx: { value: P.ax }, uRw: { value: P.rw }, uNose: { value: P.nose } });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCar;\nvarying vec3 vCarN;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvCar = position; vCarN = objectNormal;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCar;\nvarying vec3 vCarN;\nuniform float uTwoTone, uBlackRoof;\nuniform float uL, uH, uW, uAx, uRw, uNose;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float h = vCar.y / uH, fx = vCar.x * uNose, kRough = .42, kMetal = .22; vec3 glow = vec3(0.);
        vec2 wa = vec2(vCar.x - uAx, vCar.y - uRw), wb = vec2(vCar.x + uAx, vCar.y - uRw); vec2 wc = length(wa) < length(wb) ? wa : wb; float wr = length(wc);
        bool outer = abs(vCar.z) > uW * .5 - .3;
        // windows: side glass on the tapered flanks, the windshield on the long front slope, the rear glass on the fastback slope.
        // Between them the surface stays paint: that is what makes the A, B and C pillars read.
        float f = fx / uL, nz = abs(vCarN.z), nf = vCarN.x * uNose, zz = abs(vCar.z) / (uW * .5), gl = 0.;
        if (h > .6) {
          float aboveBelt = smoothstep(.605, .64, h);
          float side = aboveBelt * smoothstep(.6, .72, nz) * (1. - smoothstep(.62, .72, vCarN.y)) * smoothstep(-.235, -.205, f) * (1. - smoothstep(.17, .2, f));
          side *= 1. - smoothstep(-.052, -.04, f) * (1. - smoothstep(-.012, .0, f));          // the B pillar
          float wind = smoothstep(.028, .048, f) * (1. - smoothstep(.215, .24, f)) * smoothstep(.1, .2, nf) * (1. - smoothstep(.3, .4, nz)) * (1. - smoothstep(.56, .64, zz)) * smoothstep(.69, .75, h);
          float rear = smoothstep(-.43, -.4, f) * (1. - smoothstep(-.245, -.22, f)) * smoothstep(.1, .2, -nf) * (1. - smoothstep(.3, .4, nz)) * (1. - smoothstep(.56, .64, zz)) * smoothstep(.69, .75, h);
          gl = max(side, max(wind, rear));
        }
        if (wr < uRw * 1.03 && outer) {
          if (wr < uRw * .7) { float a = atan(wc.y, wc.x); float spoke = smoothstep(.15, .55, sin(a * 10.)); diffuseColor.rgb = mix(vec3(.05), vec3(.62, .64, .67), spoke * step(uRw * .17, wr)); kMetal = .85; kRough = .28; }
          else { diffuseColor.rgb = vec3(.025); kMetal = 0.; kRough = .92; }
        } else if (gl > .12) {
          // real windows: tinted glass with a clear sheen, inside a thin black rubber seal
          if (gl > .55) { diffuseColor.rgb = vec3(.03, .045, .065); kMetal = .28; kRough = .1; }
          else { diffuseColor.rgb = vec3(.012, .013, .016); kMetal = .2; kRough = .45; }
        } else if (h > .6 && f < .25 && f > -.42) {
          // the roof, pillars and rails above the glass. The white car wears a gloss black roof; every other car is painted to the top.
          if (uTwoTone > .5 && uBlackRoof > .5) { diffuseColor.rgb = vec3(.012, .013, .016); kMetal = .35; kRough = .22; }
        }
        else if (h > .596 && h < .624 && f < .25 && f > -.3 && nz > .6 && abs(vCar.z) > uW * .26) { diffuseColor.rgb = vec3(.8, .82, .86); kMetal = 1.; kRough = .14; }   // the thin chrome line under the side windows only
        else if (h < .16) { diffuseColor.rgb = vec3(.035); kMetal = .1; kRough = .6; }
        if (fx < -(uL * .5 - .16) && h > .09 && h < .21) { vec2 ex = vec2((abs(vCar.z) - uW * .3) / (uW * .11), (h - .15) / .05); if (dot(ex, ex) < 1.) { diffuseColor.rgb = vec3(.78, .8, .84); kMetal = 1.; kRough = .12; } }
        if (fx > uL * .5 - .2 && h > .26 && h < .47 && abs(vCar.z) < uW * .24) { diffuseColor.rgb = vec3(.015, .016, .02); kMetal = .5; kRough = .35; }
        if (fx < -(uL * .5 - .09) && h > .515 && h < .555 && abs(vCar.z) < uW * .43 && abs(vCar.z) > uW * .05) { diffuseColor.rgb = vec3(.32, .01, .01); glow = vec3(1., .05, .03) * .55; }   // a slim red light bar across the tail
        if (fx > uL * .5 - .12 && h > .465 && h < .51 && abs(vCar.z) > uW * .2 && abs(vCar.z) < uW * .42) { diffuseColor.rgb = vec3(.9, .93, 1.); glow = vec3(.8, .88, 1.) * .55; }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = kRough;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = kMetal;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += glow;');
  };
  m.customProgramCacheKey = () => 'dk-fleet';
  return m;
}

function Loaded({ color, plate, position, rotationY, lite }: { color: string; plate: string; position: [number, number, number]; rotationY: number; lite: boolean }) {
  const url = lite ? FLEET_LITE_URL : FLEET_URL;
  const { scene } = useGLTF(url);
  // the five cars share one prepared model: the work is done once, and the geometry sits on the GPU once
  const P = useMemo(() => { let p = prepared.get(url); if (!p) { p = prepare(scene.clone(true)); prepared.set(url, p); } return p; }, [scene, url]);
  const twoTone = color === FLEET_COLORS.white || color === FLEET_COLORS.black;
  const gl = useThree((st) => st.gl), mix = useContext(NightCtx);
  const mat = useMemo(() => fleetMaterial(color, P, twoTone, color === FLEET_COLORS.white, carEnv(gl)), [color, P, twoTone, gl]);
  useFrame(() => { mat.envMapIntensity = .7 - .4 * mix.current; });   // a duller sky to reflect at night
  const plateMat = useMemo(() => new THREE.MeshStandardMaterial({ map: plateTexture(plate), roughness: .45 }), [plate]);
  const shadow = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!; const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }); }, []);
  // the scene's cars face +x when rotationY = 0; the model's nose is turned to match
  return <group position={position} rotation-y={rotationY}>
    <group rotation-y={P.nose > 0 ? 0 : Math.PI}>
      <mesh position={[0, .06, 0]} rotation-x={-Math.PI / 2} scale={[P.L * 1.25, P.W * 1.45, 1]} material={shadow} renderOrder={2}><planeGeometry args={[1, 1]} /></mesh>
      <mesh geometry={P.geo} material={mat} castShadow receiveShadow />
      <mesh position={[P.plateF.x + P.nose * .012, P.plateF.y, 0]} rotation-y={P.nose > 0 ? Math.PI / 2 : -Math.PI / 2} material={plateMat}><planeGeometry args={[.3, .15]} /></mesh>
      <mesh position={[P.plateR.x - P.nose * .012, P.plateR.y, 0]} rotation-y={P.nose > 0 ? -Math.PI / 2 : Math.PI / 2} material={plateMat}><planeGeometry args={[.3, .15]} /></mesh>
      <Topper position={[P.roof.x, P.roof.y - .012, 0]} />
    </group>
  </group>;
}

/**
 * Body paint for the textured sedan. The baked texture carries the real detail (panel lines, glass, lamps, grille, tyres, rims)
 * but also a dirty, uneven paint tone. So: wherever the texture is light and neutral (the body) the fleet colour is drawn clean and
 * glossy; wherever it is dark or coloured (glass, tyres, lamps, trim) the texture shows as drawn. Wheels and lamp zones are never repainted.
 */
function paintMaterial(map: THREE.Texture | null, color: string, P: Prepared) {
  const m = new THREE.MeshPhysicalMaterial({ map, roughness: .22, metalness: .3, clearcoat: 1, clearcoatRoughness: .035, envMapIntensity: 1.15 });
  const paint = new THREE.Color(color);
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uM: { value: P.M }, uPaint: { value: new THREE.Vector3(paint.r, paint.g, paint.b) }, uL: { value: P.L }, uH: { value: P.H }, uW: { value: P.W }, uAx: { value: P.ax }, uRw: { value: P.rw }, uNose: { value: P.nose } });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCar;\nuniform mat4 uM;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvCar = (uM * vec4(position, 1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCar;\nuniform vec3 uPaint;\nuniform float uL, uH, uW, uAx, uRw, uNose;')
      .replace('#include <map_fragment>', `
        vec4 texel = texture2D(map, vMapUv);
        float lum = dot(texel.rgb, vec3(.2126, .7152, .0722));
        float sat = max(texel.r, max(texel.g, texel.b)) - min(texel.r, min(texel.g, texel.b));
        float paintMask = smoothstep(.07, .17, lum) * (1. - smoothstep(.07, .2, sat));
        vec2 wa = vec2(vCar.x - uAx, vCar.y - uRw), wb = vec2(vCar.x + uAx, vCar.y - uRw);
        float wr = min(length(wa), length(wb));
        float wheelZone = (wr < uRw * .9 && abs(vCar.z) > uW * .5 - .32) ? 1. : 0.;
        float hh = vCar.y / uH, fnx = vCar.x * uNose;
        float lampZone = (fnx > uL * .5 - .22 && hh > .38 && hh < .56 && abs(vCar.z) > uW * .14 && abs(vCar.z) < uW * .46) ? 1. : 0.;   // the headlights only: the tail light bar is red, so it protects itself
        paintMask *= (1. - wheelZone) * (1. - lampZone);
        vec3 body = uPaint * (.9 + .1 * smoothstep(.1, .6, lum));
        diffuseColor.rgb = mix(texel.rgb, body, paintMask);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(.62, .2, paintMask);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(.1, .38, paintMask);');
  };
  m.customProgramCacheKey = () => 'dk-fleet-paint';
  return m;
}

/** The textured sedan: its own baked surface (lamps, grille, window frames, wheels), with the fleet colour as a multiply tint so the black roof, glass and tyres stay black. */
function LoadedTex({ color, plate, position, rotationY, lite }: { color: string; plate: string; position: [number, number, number]; rotationY: number; lite: boolean }) {
  const url = lite ? FLEET_TEX_LITE_URL : FLEET_TEX_URL;   // phones in the low tier get the lighter textured car, not the painted one
  const { scene } = useGLTF(url);
  const P = useMemo(() => { let p = prepared.get(url); if (!p) { p = prepare(scene.clone(true)); prepared.set(url, p); } return p; }, [scene, url]);
  const root = useMemo(() => {
    // smooth normals once per model: the file stores 8-bit normals, which is what made the paint look blotchy and crumpled
    if (!scene.userData.dkSmooth) { scene.userData.dkSmooth = true; scene.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry = toCreasedNormals(m.geometry, Math.PI * .31); }); }
    const r = scene.clone(true);
    r.traverse(o => { const m = o as THREE.Mesh; if (!m.isMesh) return; m.material = paintMaterial((m.material as THREE.MeshStandardMaterial).map ?? null, color, P); m.castShadow = true; m.receiveShadow = true; });
    return r;
  }, [scene, color, P]);
  const xf = useMemo(() => { const p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); P.M.decompose(p, q, sc); return { p, q, sc }; }, [P]);
  const plateMat = useMemo(() => new THREE.MeshStandardMaterial({ map: plateTexture(plate), roughness: .45 }), [plate]);
  const shadow = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!; const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }); }, []);
  return <group position={position} rotation-y={rotationY}>
    <group rotation-y={P.nose > 0 ? 0 : Math.PI}>
      <mesh position={[0, .06, 0]} rotation-x={-Math.PI / 2} scale={[P.L * 1.25, P.W * 1.45, 1]} material={shadow} renderOrder={2}><planeGeometry args={[1, 1]} /></mesh>
      <group position={xf.p} quaternion={xf.q} scale={xf.sc}><primitive object={root} /></group>
      <mesh position={[P.plateF.x + P.nose * .012, P.plateF.y, 0]} rotation-y={P.nose > 0 ? Math.PI / 2 : -Math.PI / 2} material={plateMat}><planeGeometry args={[.3, .15]} /></mesh>
      <mesh position={[P.plateR.x - P.nose * .012, P.plateR.y, 0]} rotation-y={P.nose > 0 ? -Math.PI / 2 : Math.PI / 2} material={plateMat}><planeGeometry args={[.3, .15]} /></mesh>
      <Topper position={[P.roof.x, P.roof.y - .012, 0]} />
    </group>
  </group>;
}

/** The turn signal: left is the car's left. Flashes at 90 a minute, 50% on, and always starts on, the way a real stalk does. */
export type CarSignal = { left: boolean; right: boolean };
const glowTex = (() => { if (typeof document === 'undefined') return null; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!; const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,190,70,1)'); r.addColorStop(.35, 'rgba(255,150,20,.55)'); r.addColorStop(1, 'rgba(255,120,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const FLASH = .66, ON = .33;
const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** One side's flasher: 0 to 1, with a quick lamp warm-up and fade-out. `since` is when that side's signal was switched on. */
function flash(on: boolean, since: { v: number }, now: number) {
  if (!on) { since.v = -1; return 0; }
  if (since.v < 0) since.v = now;
  const c = (now - since.v) % FLASH;
  return c < ON ? ss(0, .045, c) : 1 - ss(ON, ON + .06, c);
}
/** The generic lamps for a car whose file does not say where its lights are: a lens and a glow at each corner. */
function Blinkers({ L, W, H, signal }: { L: number; W: number; H: number; signal: { current: CarSignal } }) {
  const lamps = useRef<(THREE.Group | null)[]>([]), sl = useRef({ v: -1 }), sr = useRef({ v: -1 });
  useFrame(({ clock }) => {
    const s = signal.current, l = flash(s.left, sl.current, clock.elapsedTime) > .5, r = flash(s.right, sr.current, clock.elapsedTime) > .5;
    const lit = [l, l, r, r];   // front left, rear left, front right, rear right (car space: nose +x, the car's right is +z)
    lamps.current.forEach((g, i) => { if (g) g.scale.setScalar(lit[i]! ? 1 : .0001); });
  });
  const spots: [number, number, number, number][] = [
    [L / 2 - .1, H * .46, -W * .37, 1], [-L / 2 + .1, H * .6, -W * .36, -1],
    [L / 2 - .1, H * .46, W * .37, 1], [-L / 2 + .1, H * .6, W * .36, -1],
  ];
  return <group>
    {spots.map(([x, y, z, d], i) => (
      <group key={i} ref={(g) => { lamps.current[i] = g; }} position={[x, y, z]} visible={false}>
        <mesh scale={[.07, .05, .13]} rotation-y={d * .35 * (z < 0 ? -1 : 1)}><sphereGeometry args={[1, 14, 10]} /><meshBasicMaterial color="#ffb02e" toneMapped={false} /></mesh>
        <sprite scale={[.7, .7, .7]}><spriteMaterial map={glowTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></sprite>
      </group>
    ))}
  </group>;
}

/**
 * The turn signal of a car with measured lamps. The car's own headlight and tail light light up amber: the paint shader finds the
 * bright parts of the lamp in the model's texture, inside the lamp's box, and turns exactly those amber, so the glow follows the
 * real lamp shape on the real surface. A soft halo sits just outside each lamp. `u` holds the two flasher values the shader reads.
 */
type LampUniforms = { uLeft: { value: number }; uRight: { value: number }; uToCar: { value: THREE.Matrix4 }; uFc: { value: THREE.Vector3 }; uFh: { value: THREE.Vector3 }; uRc: { value: THREE.Vector3 }; uRh: { value: THREE.Vector3 } };
const makeLampUniforms = (lamps: Lamps, toCar: THREE.Matrix4): LampUniforms => ({
  uLeft: { value: 0 }, uRight: { value: 0 }, uToCar: { value: toCar },
  uFc: { value: new THREE.Vector3(...lamps.front.slice(0, 3) as [number, number, number]) }, uFh: { value: new THREE.Vector3(...lamps.front.slice(3) as [number, number, number]) },
  uRc: { value: new THREE.Vector3(...lamps.rear.slice(0, 3) as [number, number, number]) }, uRh: { value: new THREE.Vector3(...lamps.rear.slice(3) as [number, number, number]) },
});
function lampShader(material: THREE.MeshStandardMaterial, u: LampUniforms) {
  material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLp;\nuniform mat4 uToCar;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLp = (uToCar * vec4(position, 1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vLp;
        uniform float uLeft, uRight; uniform vec3 uFc, uFh, uRc, uRh;
        float lampIn(vec3 p, vec3 c, vec3 h) { vec3 d = abs(p - c) / h; return 1. - smoothstep(.72, .96, max(d.x, max(d.y, d.z))); }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          vec3 q = vec3(vLp.x, vLp.y, abs(vLp.z));
          float inside = max(lampIn(q, uFc, uFh), lampIn(q, uRc, uRh));
          float on = vLp.z > 0. ? uRight : uLeft;
          float lum = dot(diffuseColor.rgb, vec3(.3, .59, .11));
          float lit = inside * on * (.08 + .92 * smoothstep(.05, .4, lum));
          totalEmissiveRadiance += vec3(1., .46, .03) * lit * 3.6;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1., .5, .06), lit * .35);
        }`);
  };
  material.customProgramCacheKey = () => 'dk-lamps-v1';
}
function LampHalos({ lamps, u, signal }: { lamps: Lamps; u: LampUniforms; signal: { current: CarSignal } }) {
  const halos = useRef<(THREE.Sprite | null)[]>([]), sl = useRef({ v: -1 }), sr = useRef({ v: -1 });
  useFrame(({ clock }) => {
    const s = signal.current, l = flash(s.left, sl.current, clock.elapsedTime), r = flash(s.right, sr.current, clock.elapsedTime);
    u.uLeft.value = l; u.uRight.value = r;
    const lit = [l, l, r, r];   // front left, rear left, front right, rear right
    halos.current.forEach((h, i) => { if (!h) return; (h.material as THREE.SpriteMaterial).opacity = lit[i]! * .7; });
  });
  const f = lamps.front, r = lamps.rear;
  const spots: [number, number, number][] = [[f[0] + f[3] * .45, f[1], -f[2]], [r[0] - r[3] * .45, r[1], -r[2]], [f[0] + f[3] * .45, f[1], f[2]], [r[0] - r[3] * .45, r[1], r[2]]];
  return <group>{spots.map((p, i) => <sprite key={i} ref={(h) => { halos.current[i] = h; }} position={p} scale={[.5, .36, 1]}><spriteMaterial map={glowTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></sprite>)}</group>;
}

/** A selected Meshy car with its original identity, finish and baked PBR detail intact. */
function LoadedImported({ files, plate, position, rotationY, lite, signal }: { files: ImportedFleetAsset; plate?: string; position: [number, number, number]; rotationY: number; lite: boolean; signal?: { current: CarSignal } }) {
  const url = lite ? files.lite : files.full;
  const { scene } = useGLTF(url);
  const P = useMemo(() => { let p = prepared.get(url); if (!p) { p = prepare(scene.clone(true)); prepared.set(url, p); } return p; }, [scene, url]);
  const fit = files.length ? files.length / P.L : 1;   // this car's real-world length
  const xf = useMemo(() => { const p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); P.M.decompose(p, q, sc); return { p: p.multiplyScalar(fit), q, sc: sc.multiplyScalar(fit) }; }, [P, fit]);
  const lampU = useMemo(() => (signal && files.lamps ? makeLampUniforms(files.lamps, new THREE.Matrix4().compose(xf.p, xf.q, xf.sc)) : null), [signal, files.lamps, xf]);
  const root = useMemo(() => {
    const r = scene.clone(true);
    const polish = (source: THREE.Material) => {
      const material = source.clone();
      if (material instanceof THREE.MeshStandardMaterial) {
        material.envMapIntensity = lite ? .75 : 1.05;
        if (lampU) lampShader(material, lampU);
        material.needsUpdate = true;
      }
      return material;
    };
    r.traverse(o => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.material = Array.isArray(m.material) ? m.material.map(polish) : polish(m.material);
      m.castShadow = !lite;
      m.receiveShadow = !lite;
    });
    return r;
  }, [scene, lite, lampU]);
  const nz = (files.flip ? -1 : 1) * P.nose;
  const plateMat = useMemo(() => (plate ? new THREE.MeshStandardMaterial({ map: plateTexture(plate), roughness: .45 }) : null), [plate]);
  const shadow = useMemo(() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!; const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,.56)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }); }, []);
  const rf = P.roof.clone().multiplyScalar(fit), pf = P.plateF.clone().multiplyScalar(fit), pr = P.plateR.clone().multiplyScalar(fit);
  if (files.plateRy != null) pr.y = files.plateRy;   // this car's tail is curved: the plate sits where the body is flat
  return <group position={position} rotation-y={rotationY}>
    <group rotation-y={nz > 0 ? 0 : Math.PI}>
      <mesh position={[0, .055, 0]} rotation-x={-Math.PI / 2} scale={[P.L * fit * 1.22, P.W * fit * 1.42, 1]} material={shadow} renderOrder={2}><planeGeometry args={[1, 1]} /></mesh>
      <group position={xf.p} quaternion={xf.q} scale={xf.sc}><primitive object={root} /></group>
      {plateMat && <>
        <mesh position={[pf.x + nz * .012, pf.y, 0]} rotation-y={nz > 0 ? Math.PI / 2 : -Math.PI / 2} material={plateMat}><planeGeometry args={[.3, .15]} /></mesh>
        <mesh position={[pr.x - nz * .012, pr.y, 0]} rotation-y={nz > 0 ? -Math.PI / 2 : Math.PI / 2} material={plateMat}><planeGeometry args={[.3, .15]} /></mesh>
      </>}
      <Topper position={[rf.x + (files.roofX ?? 0) * P.L * fit, rf.y - .012, 0]} />
      {signal && (lampU && files.lamps ? <LampHalos lamps={files.lamps} u={lampU} signal={signal} /> : <Blinkers L={P.L * fit} W={P.W * fit} H={P.H * fit} signal={signal} />)}
    </group>
  </group>;
}

class Fallback extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/** One fleet car: three selected Meshy cars plus two house sedans, all with automatic mobile variants and fallbacks. */
export function FleetCar({ color, plate, specId, position, rotationY = 0, lite = false, signal }: { color: string; plate: string; specId: keyof typeof CAR_SPECS; position: [number, number, number]; rotationY?: number; lite?: boolean; signal?: { current: CarSignal } }) {
  const spec = useMemo(() => ({ ...CAR_SPECS[specId]!, color }), [specId, color]);
  const fallback = <Car spec={spec} position={position} rotationY={rotationY} />;
  // while the file loads the spot stays empty for a moment, so the boxy stand-in never flashes up first
  const standard = <Fallback fallback={fallback}><Suspense fallback={null}><Loaded color={color} plate={plate} position={position} rotationY={rotationY} lite={lite} /></Suspense></Fallback>;
  // textured first; if its file is not in the build the painted sedan stays, so the lot is never empty
  const house = useTexturedFleet() ? <Fallback fallback={standard}><Suspense fallback={null}><LoadedTex color={color} plate={plate} position={position} rotationY={rotationY} lite={lite} /></Suspense></Fallback> : standard;
  const imported = IMPORTED_FLEET[specId];
  return imported ? <Fallback fallback={house}><Suspense fallback={null}><LoadedImported files={imported} plate={['civic', 'camry', 'sentra', 'hero'].includes(specId) ? plate : undefined} position={position} rotationY={rotationY} lite={lite} signal={signal} /></Suspense></Fallback> : house;
}
