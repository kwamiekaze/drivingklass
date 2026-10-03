import { Component, Suspense, useMemo, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CAR_SPECS, Car, Topper, plateTexture } from './Cars';

/*
 * The DrivingKlass fleet: one premium fastback sedan, generated in Higgsfield from the reference car, shown five times
 * in the Guyana flag colours. The model file lives at public/models/dk-fleet-sedan.glb. It is an untextured mesh, so
 * the paint, black glass roof, wheels, trim and lamps are drawn by a shader that reads each point's place on the car.
 * If the file is missing or fails to load, the earlier procedural cars stand in, so the lot is never empty.
 */
export const FLEET_URL = `${import.meta.env.BASE_URL}models/dk-fleet-sedan.glb`;
export const FLEET_COLORS = { red: '#ce1126', black: '#101114', yellow: '#fcd116', white: '#f3f3f0', green: '#009e49' } as const;
const LENGTH = 4.9;   // metres, the reference car's class

type Prepared = { geo: THREE.BufferGeometry; L: number; H: number; W: number; ax: number; rw: number; nose: number; roof: THREE.Vector3; plateF: THREE.Vector3; plateR: THREE.Vector3 };

/** Bake the model into car space: length along x, up y, wheels on y = 0, centred. Then find wheels, nose, roof and plate spots. */
function prepare(scene: THREE.Object3D): Prepared {
  scene.updateMatrixWorld(true);
  const parts: THREE.BufferGeometry[] = [];
  scene.traverse(o => {
    const m = o as THREE.Mesh; if (!m.isMesh || !m.geometry) return;
    const g = m.geometry.clone().applyMatrix4(m.matrixWorld), out = new THREE.BufferGeometry();
    out.setAttribute('position', g.getAttribute('position'));
    if (g.index) out.setIndex(g.index);
    parts.push(out.index ? out.toNonIndexed() : out);
  });
  let geo = parts.length === 1 ? parts[0]! : mergeGeometries(parts, false)!;
  geo.computeBoundingBox();
  let s = geo.boundingBox!.getSize(new THREE.Vector3());
  if (s.z > s.x) geo.rotateY(Math.PI / 2);
  geo.computeBoundingBox(); s = geo.boundingBox!.getSize(new THREE.Vector3());
  const c = geo.boundingBox!.getCenter(new THREE.Vector3());
  geo.translate(-c.x, -geo.boundingBox!.min.y, -c.z);
  const k = LENGTH / s.x; geo.scale(k, k, k);
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
  geo.computeVertexNormals();
  // roof and plate spots, found by casting onto the real surface
  const mesh = new THREE.Mesh(geo), ray = new THREE.Raycaster(), hit = (o: THREE.Vector3, d: THREE.Vector3, fb: THREE.Vector3) => { ray.set(o, d); const h = ray.intersectObject(mesh, false)[0]; return h ? h.point.clone() : fb; };
  const roof = hit(new THREE.Vector3(-.05 * L * nose, H + 2, 0), new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, H, 0));
  const plateF = hit(new THREE.Vector3(nose * (L + 1), .3 * H, 0), new THREE.Vector3(-nose, 0, 0), new THREE.Vector3(nose * L / 2, .3 * H, 0));
  const plateR = hit(new THREE.Vector3(-nose * (L + 1), .42 * H, 0), new THREE.Vector3(nose, 0, 0), new THREE.Vector3(-nose * L / 2, .42 * H, 0));
  return { geo, L, H, W, ax, rw, nose, roof, plateF, plateR };
}

function fleetMaterial(color: string, P: Prepared) {
  const m = new THREE.MeshPhysicalMaterial({ color, metalness: .5, roughness: .25, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.5 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uL: { value: P.L }, uH: { value: P.H }, uW: { value: P.W }, uAx: { value: P.ax }, uRw: { value: P.rw }, uNose: { value: P.nose } });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCar;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvCar = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCar;\nuniform float uL, uH, uW, uAx, uRw, uNose;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float h = vCar.y / uH, fx = vCar.x * uNose, kRough = .25, kMetal = .5; vec3 glow = vec3(0.);
        vec2 wa = vec2(vCar.x - uAx, vCar.y - uRw), wb = vec2(vCar.x + uAx, vCar.y - uRw); vec2 wc = length(wa) < length(wb) ? wa : wb; float wr = length(wc);
        bool outer = abs(vCar.z) > uW * .5 - .3;
        if (wr < uRw * 1.03 && outer) {
          if (wr < uRw * .7) { float a = atan(wc.y, wc.x); float spoke = smoothstep(.15, .55, sin(a * 10.)); diffuseColor.rgb = mix(vec3(.05), vec3(.62, .64, .67), spoke * step(uRw * .17, wr)); kMetal = .85; kRough = .28; }
          else { diffuseColor.rgb = vec3(.025); kMetal = 0.; kRough = .92; }
        } else if (h > .62) { diffuseColor.rgb = vec3(.02, .025, .03); kMetal = .6; kRough = .07; }
        else if (h < .16) { diffuseColor.rgb = vec3(.035); kMetal = .1; kRough = .6; }
        if (fx < -(uL * .5 - .09) && h > .5 && h < .57) { diffuseColor.rgb = vec3(.55, .02, .02); glow = vec3(1., .07, .04) * .9; }
        if (fx > uL * .5 - .12 && h > .45 && h < .52 && abs(vCar.z) > uW * .16) { diffuseColor.rgb = vec3(.9, .92, .95); glow = vec3(.85, .9, 1.) * .6; }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = kRough;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = kMetal;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += glow;');
  };
  m.customProgramCacheKey = () => 'dk-fleet';
  return m;
}

function Loaded({ color, plate, position, rotationY }: { color: string; plate: string; position: [number, number, number]; rotationY: number }) {
  const { scene } = useGLTF(FLEET_URL);
  const P = useMemo(() => prepare(scene.clone(true)), [scene]);
  const mat = useMemo(() => fleetMaterial(color, P), [color, P]);
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

class Fallback extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/** One fleet car. Shows the generated sedan when the model is available, the procedural car otherwise. */
export function FleetCar({ color, plate, specId, position, rotationY = 0, model = true }: { color: string; plate: string; specId: keyof typeof CAR_SPECS; position: [number, number, number]; rotationY?: number; model?: boolean }) {
  const spec = useMemo(() => ({ ...CAR_SPECS[specId]!, color }), [specId, color]);
  const fallback = <Car spec={spec} position={position} rotationY={rotationY} />;
  if (!model) return fallback;
  return <Fallback fallback={fallback}><Suspense fallback={fallback}><Loaded color={color} plate={plate} position={position} rotationY={rotationY} /></Suspense></Fallback>;
}
