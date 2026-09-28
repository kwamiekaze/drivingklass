import { Canvas } from "@react-three/fiber";
import type { RefObject } from "react";
import { KlassroomScene } from "./KlassroomScene";
import { LOW_POWER } from "./shared";
import { KlassCameraRig, type KlassView, type RigInput } from "./views";

export default function KlassroomCanvas({
  view,
  input,
  reducedMotion,
  started,
  onReady,
  onLost,
}: {
  view: KlassView;
  input: RefObject<RigInput>;
  reducedMotion: boolean;
  started: boolean;
  onReady?: () => void;
  onLost?: () => void;
}) {
  return (
    <Canvas
      shadows={LOW_POWER ? true : "soft"}
      dpr={LOW_POWER ? [1, 1.25] : [1, 1.5]}
      gl={{ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: false }}
      camera={{ position: [0, 4.5, 11.6], fov: 42, near: 0.1, far: 60 }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.08;
        // If the phone reclaims the GPU, say so instead of freezing.
        gl.domElement.addEventListener("webglcontextlost", (event) => {
          event.preventDefault();
          onLost?.();
        });
        onReady?.();
      }}
    >
      <KlassroomScene reducedMotion={reducedMotion} />
      <KlassCameraRig view={view} input={input} reducedMotion={reducedMotion} started={started} />
    </Canvas>
  );
}
