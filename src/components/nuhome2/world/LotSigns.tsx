import { useContext, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NightCtx } from './theme';
import { SIGN_FONT, goldGradient, makeCanvasTexture } from './parts';
import { LOT_SIGN, LOT_SIGNS } from './rearlot';

/*
 * The EXIT and ENTRANCE guide signs of the back lot, in the page's navy and gold like the PARKING and EXIT buttons: a navy board with a polished gold frame, the word and an arrow
 * in gold, on two slim galvanised poles. They are lit from within at night. Where they stand and which way they face is in rearlot.ts (LOT_SIGNS).
 */
function faceTexture(kind: 'exit' | 'entrance') {
  return makeCanvasTexture(1024, 435, (g, w, h) => {
    const rr = (x: number, y: number, ww: number, hh: number, r: number) => { g.beginPath(); g.roundRect(x, y, ww, hh, r); };
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#12489a'); bg.addColorStop(1, '#061c4a');
    rr(0, 0, w, h, 38); g.fillStyle = bg; g.fill();
    rr(14, 14, w - 28, h - 28, 28); g.lineWidth = 12; g.strokeStyle = goldGradient(g, 0, h); g.stroke();
    rr(34, 34, w - 68, h - 68, 18); g.lineWidth = 3; g.strokeStyle = 'rgba(255, 224, 138, .55)'; g.stroke();
    const gold = goldGradient(g, 70, h - 70);
    // the arrow: left for the exit, up for the entrance
    g.save(); g.fillStyle = gold; g.translate(190, h / 2);
    g.beginPath();
    if (kind === 'exit') { g.moveTo(-110, 0); g.lineTo(-10, -100); g.lineTo(-10, -42); g.lineTo(110, -42); g.lineTo(110, 42); g.lineTo(-10, 42); g.lineTo(-10, 100); }
    else { g.moveTo(0, -110); g.lineTo(100, -10); g.lineTo(42, -10); g.lineTo(42, 110); g.lineTo(-42, 110); g.lineTo(-42, -10); g.lineTo(-100, -10); }
    g.closePath(); g.fill(); g.restore();
    g.fillStyle = gold; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `700 ${kind === 'exit' ? 250 : 150}px ${SIGN_FONT}`;
    g.fillText(kind === 'exit' ? 'EXIT' : 'ENTRANCE', kind === 'exit' ? 640 : 625, h / 2 + 10, kind === 'exit' ? 600 : 650);
  });
}

export function LotSign({ kind }: { kind: 'exit' | 'entrance' }) {
  const mix = useContext(NightCtx), g = LOT_SIGNS[kind];
  const tex = useMemo(() => faceTexture(kind), [kind]);
  const face = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: .05, roughness: .4, metalness: .1, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), [tex]);
  const board = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0a2a66', roughness: .45, metalness: .35 }), []);
  const metal = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8d9198', roughness: .45, metalness: .75 }), []);
  useFrame(() => { face.emissiveIntensity = .05 + .5 * mix.current; });
  const { W, H, Y, POLE_H, POLE_DX } = LOT_SIGN;
  return <group position={[g.x, 0, g.z]} rotation-y={g.rotY}>
    {[-POLE_DX, POLE_DX].map(x => <mesh key={x} position={[x, POLE_H / 2, -.06]} material={metal} castShadow><cylinderGeometry args={[.045, .05, POLE_H, 12]} /></mesh>)}
    <mesh position={[0, Y, 0]} material={board} castShadow><boxGeometry args={[W, H, .07]} /></mesh>
    <mesh position={[0, Y, .045]} material={face} renderOrder={1}><planeGeometry args={[W - .05, H - .05]} /></mesh>
    {[-POLE_DX, POLE_DX].flatMap(x => [Y + H * .3, Y - H * .3].map(y => <mesh key={`${x}${y}`} position={[x, y, -.05]} material={metal}><boxGeometry args={[.07, .06, .04]} /></mesh>))}
  </group>;
}
