import { useMemo } from 'react';
import * as THREE from 'three';
import { SIGN_FONT, makeCanvasTexture } from './parts';

/*
 * A real stop sign: red octagon with a white border and STOP in white, on a galvanised pole, a gray back plate.
 * Faces +z, which is toward traffic arriving from the south. Dimensions follow the standard 30 inch sign.
 * The face is a CircleGeometry with 8 segments turned half a step, so its corners sit at 22.5 degrees + k x 45
 * and the canvas octagon below is drawn on exactly the same corners.
 */
const R = .43, POLE_H = 2.45, CY = POLE_H - R * Math.cos(Math.PI / 8);   // centre height: the octagon's flat top sits exactly at the top of the pole

function faceTexture() {
  return makeCanvasTexture(512, 512, (g, w) => {
    const c = w / 2, oct = (r: number) => { g.beginPath(); for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + (k * Math.PI) / 4; g[k ? 'lineTo' : 'moveTo'](c + Math.cos(a) * r, c - Math.sin(a) * r); } g.closePath(); };
    g.fillStyle = '#f7f5ee'; oct(c); g.fill();
    g.fillStyle = '#c4161c'; oct(c * .9); g.fill();
    g.fillStyle = '#f7f5ee'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `800 ${w * .27}px Arial, Helvetica, sans-serif`;
    g.fillText('STOP', c, c + w * .012);
  }, 8, false);
}

export function StopSign({ position, rotationY = 0 }: { position: [number, number, number]; rotationY?: number }) {
  const tex = useMemo(faceTexture, []);
  const face = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, roughness: .35, metalness: .15 }), [tex]);
  const metal = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8d9198', roughness: .45, metalness: .75 }), []);
  const geo = useMemo(() => new THREE.CircleGeometry(R, 8, Math.PI / 8), []);
  return <group position={position} rotation-y={rotationY}>
    <mesh position={[0, (POLE_H - .01) / 2, -.07]} material={metal} castShadow><cylinderGeometry args={[.036, .04, POLE_H - .01, 12]} /></mesh>
    <mesh position={[0, CY, -.03]} rotation-z={0} geometry={geo} material={metal} scale={1.02}><meshStandardMaterial color="#8d9198" roughness={.5} metalness={.7} side={THREE.BackSide} /></mesh>
    <mesh position={[0, CY, .0]} geometry={geo} material={face} castShadow />
    {[.22, -.22].map(y => <mesh key={y} position={[0, CY + y, -.05]} material={metal}><boxGeometry args={[.07, .06, .03]} /></mesh>)}
  </group>;
}
