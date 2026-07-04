import { useEffect, useState } from "react";

export type CapabilityTier = "full" | "lite" | "poster";

/**
 * Picks a rendering tier for the 3D hero.
 * - poster: prefers-reduced-motion, no WebGL, or very low device memory.
 * - lite: mobile or mid-range devices (no postprocessing, capped DPR).
 * - full: capable desktop GPUs.
 */
export function useCapabilityTier(): CapabilityTier {
  const [tier, setTier] = useState<CapabilityTier>("poster");

  useEffect(() => {
    const prefersReduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    // WebGL support probe
    let hasWebGL = false;
    try {
      const canvas = document.createElement("canvas");
      hasWebGL = !!(
        canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        (canvas.getContext as unknown as (n: string) => unknown)(
          "experimental-webgl"
        )
      );
    } catch {
      hasWebGL = false;
    }

    if (prefersReduced || !hasWebGL) {
      setTier("poster");
      return;
    }

    const nav = navigator as Navigator & {
      deviceMemory?: number;
      hardwareConcurrency?: number;
    };
    const mem = nav.deviceMemory ?? 4;
    const cores = nav.hardwareConcurrency ?? 4;
    const isCoarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
    const isSmall = window.matchMedia?.("(max-width: 768px)").matches ?? false;

    if (mem <= 2) {
      setTier("poster");
    } else if (isCoarse || isSmall || mem <= 4 || cores <= 4) {
      setTier("lite");
    } else {
      setTier("full");
    }
  }, []);

  return tier;
}
