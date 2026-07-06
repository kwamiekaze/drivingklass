// Shared gold car marker for Leaflet maps.
// Uses the same top-down car sprite the driving game uses so the
// tracking maps match the DrivingKlass brand car exactly.
import L from "leaflet";
import { CAR_SPRITE_URI } from "@/games/roadtest/game/carSprite";

export const GOLD_CAR_SPRITE = CAR_SPRITE_URI;

export function createGoldCarIcon(size: number = 56): L.DivIcon {
  const html = `
    <div style="
      width:${size}px;height:${size}px;
      display:flex;align-items:center;justify-content:center;
      filter: drop-shadow(0 3px 6px rgba(0,0,0,0.4));
      pointer-events:none;
    ">
      <img src="${GOLD_CAR_SPRITE}" alt="" style="width:100%;height:100%;object-fit:contain;" />
    </div>`;
  return L.divIcon({
    html,
    className: "dk-gold-car-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
