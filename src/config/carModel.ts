// Swap this to any hosted GLB URL to replace the placeholder sedan.
// Currently points at the Lovable-hosted dk-car-gold.glb asset; we will
// replace this with a fresh photoreal mesh soon. When null, the scene
// renders a stylized primitive gold sedan instead.
import dkCarGold from "@/assets/dk-car-gold.glb.asset.json";

export const CAR_GLB_URL: string | null = dkCarGold.url;
