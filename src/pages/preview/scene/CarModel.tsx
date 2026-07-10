import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { CAR_GLB_URL } from "@/config/carModel";
import { PlaceholderSedan } from "./PlaceholderSedan";

function GLBCar({ url }: { url: string }) {
  const { scene } = useGLTF(url);

  const prepared = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const targetLength = 4.4;
    const scale = targetLength / Math.max(size.x, size.z);
    clone.scale.setScalar(scale);
    clone.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    clone.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        (obj as THREE.Mesh).castShadow = true;
        (obj as THREE.Mesh).receiveShadow = true;
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
