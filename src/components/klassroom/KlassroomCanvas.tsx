import { Canvas } from "@react-three/fiber";
import type { RefObject } from "react";
import { KlassroomScene } from "./KlassroomScene";
import { KlassCameraRig, type KlassView, type RigInput } from "./views";

export default function KlassroomCanvas({
  view,
  input,
  reducedMotion,
  onReady,
}: {
  view: KlassView;
  input: RefObject<RigInput>;
  reducedMotion: boolean;
  onReady?: () => void;
}) {
  return (
    <Canvas
      shadows="soft"
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: false }}
      camera={{ position: [0, 4.5, 11.6], fov: 42, near: 0.1, far: 60 }}
      onCreated={() => onReady?.()}
    >
      <KlassroomScene reducedMotion={reducedMotion} />
      <KlassCameraRig view={view} input={input} reducedMotion={reducedMotion} />
    </Canvas>
  );
}
