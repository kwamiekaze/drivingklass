import { useMemo } from "react";
import * as THREE from "three";

interface BeamsProps {
  count?: number;
}

export function Beams({ count = 5 }: BeamsProps) {
  const beams = useMemo(() => {
    const arr: {
      position: [number, number, number];
      rotation: [number, number, number];
    }[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = 6;
      arr.push({
        position: [Math.cos(angle) * r, 7, Math.sin(angle) * r],
        rotation: [Math.PI + 0.35 * Math.sin(angle), angle, 0.35 * Math.cos(angle)],
      });
    }
    return arr;
  }, [count]);

  return (
    <group>
      {beams.map((b, i) => (
        <mesh key={i} position={b.position} rotation={b.rotation}>
          <coneGeometry args={[2.2, 9, 24, 1, true]} />
          <meshBasicMaterial
            color="#f5d68a"
            transparent
            opacity={0.055}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

export function LineLights() {
  const positions = useMemo(() => {
    const lines: [number, number, number, number, number, number][] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r1 = 8;
      const r2 = 12;
      const y = 6 + Math.sin(i) * 1.5;
      lines.push([
        Math.cos(a) * r1,
        y,
        Math.sin(a) * r1,
        Math.cos(a + 0.6) * r2,
        y + 2,
        Math.sin(a + 0.6) * r2,
      ]);
    }
    return lines;
  }, []);

  return (
    <group>
      {positions.map((p, i) => {
        const geom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(p[0], p[1], p[2]),
          new THREE.Vector3(p[3], p[4], p[5]),
        ]);
        return (
          <line key={i}>
            <primitive object={geom} attach="geometry" />
            <lineBasicMaterial
              color="#f0c96b"
              transparent
              opacity={0.35}
              blending={THREE.AdditiveBlending}
            />
          </line>
        );
      })}
    </group>
  );
}
