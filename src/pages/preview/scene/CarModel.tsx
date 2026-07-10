import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { CAR_GLB_URL } from "@/config/carModel";
import { PlaceholderSedan } from "./PlaceholderSedan";

function GLBCar({ url }: { url: string }) {
  const { scene } = useGLTF(url);

  const prepared = useMemo(() => {
    const clone = scene.clone(true);
    // Measure BEFORE any transforms
    const preBox = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    preBox.getSize(size);
    // Orient long axis along +X so keyframes (rear-3/4, side profile) frame it
    if (size.z > size.x) {
      clone.rotation.y = Math.PI / 2;
      clone.updateMatrixWorld(true);
    }
    // Re-measure after rotation
    const box = new THREE.Box3().setFromObject(clone);
    const size2 = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size2);
    box.getCenter(center);
    const targetLength = 4.4;
    const scale = targetLength / Math.max(size2.x, size2.z);
    clone.scale.setScalar(scale);
    // Ground contact at y=0, centered on XZ
    clone.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    clone.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const mat = mesh.material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[];
        const bump = (m: THREE.Material) => {
          const std = m as THREE.MeshStandardMaterial;
          if ("envMapIntensity" in std) std.envMapIntensity = 1.6;
          std.needsUpdate = true;
        };
        if (Array.isArray(mat)) mat.forEach(bump);
        else if (mat) bump(mat);
      }
    });
    return clone;
  }, [scene]);

  return <primitive object={prepared} />;
}

export function CarModel() {
  useEffect(() => {
    if (CAR_GLB_URL) useGLTF.preload(CAR_GLB_URL);
  }, []);

  if (CAR_GLB_URL) return <GLBCar url={CAR_GLB_URL} />;
  return <PlaceholderSedan />;
}
