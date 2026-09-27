import { useGLTF } from "@react-three/drei";
import { Component, Suspense, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import carAsset from "@/assets/dk-car-gold.glb.asset.json";

/**
 * The actual DrivingKlass gold car, the same GLB that spins on the homepage.
 * Falls back to the procedural sedan if the model can't be fetched.
 */

const MODEL_URL = (carAsset as { url: string }).url;

class CarBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {}
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function CarModel({ length }: { length: number }) {
  const { scene } = useGLTF(MODEL_URL, true) as unknown as { scene: THREE.Group };
  const model = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    clone.position.sub(center);
    clone.position.y += size.y / 2;
    const scale = length / Math.max(size.x, size.z);
    clone.scale.setScalar(scale);
    clone.position.multiplyScalar(scale);
    clone.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat && "envMapIntensity" in mat) mat.envMapIntensity = 1.6;
    });
    return clone;
  }, [scene, length]);
  return <primitive object={model} />;
}

export function RealCar({ length = 1.25, fallback }: { length?: number; fallback: ReactNode }) {
  return (
    <CarBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <CarModel length={length} />
      </Suspense>
    </CarBoundary>
  );
}
