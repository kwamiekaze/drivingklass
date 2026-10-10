import { useEffect, useState } from "react";
import { Navigation } from "lucide-react";

/**
 * "Re-center": appears only while a car is driving in the back lot and the visitor has moved the camera off it (Rig.tsx sends `dk:cam-away`).
 * One tap and the lens glides back onto the car and follows it again (Rig.tsx hears `dk:recenter`). It sits low on the left, clear of the header, the signs and the buttons.
 */
export function RecenterButton() {
  const [away, setAway] = useState(false);
  useEffect(() => {
    const on = (e: Event) => setAway(!!(e as CustomEvent<boolean>).detail);
    window.addEventListener("dk:cam-away", on);
    return () => window.removeEventListener("dk:cam-away", on);
  }, []);
  if (!away) return null;
  return (
    <button type="button" className="n2-recenter" aria-label="Re-center the camera on the car" onClick={() => { window.dispatchEvent(new Event("dk:recenter")); setAway(false); }}>
      <Navigation size={15} aria-hidden="true" /><span>Re-center</span>
    </button>
  );
}
