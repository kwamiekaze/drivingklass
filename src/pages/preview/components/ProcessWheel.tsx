import { useEffect, useRef, useState } from "react";
import { PROCESS_STEPS } from "../data/processSteps";
import { cn } from "@/lib/utils";

export function ProcessWheel() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && setVisible(true),
      { threshold: 0.3 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || userInteracted) return;
    const id = setInterval(() => {
      setActive((a) => (a + 1) % PROCESS_STEPS.length);
    }, 3200);
    return () => clearInterval(id);
  }, [visible, userInteracted]);

  const total = PROCESS_STEPS.length;
  const step = PROCESS_STEPS[active];
  const arcAngle = (active / total) * 360;

  return (
    <div
      ref={ref}
      className={cn(
        "relative w-full flex flex-col items-center transition-all duration-1000",
        visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      )}
    >
      <div className="relative w-[min(90vw,560px)] aspect-square">
        {/* Outer gold ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "conic-gradient(from -90deg, rgba(212,164,55,0.08), rgba(245,214,138,0.35), rgba(212,164,55,0.08))",
            padding: 2,
            WebkitMask:
              "radial-gradient(circle, transparent 62%, black 62.5%, black 66%, transparent 66.5%)",
            mask: "radial-gradient(circle, transparent 62%, black 62.5%, black 66%, transparent 66.5%)",
          }}
        />
        {/* Rotating highlight arc */}
        <div
          className="absolute inset-0 rounded-full transition-transform duration-700 ease-out"
          style={{
            transform: `rotate(${arcAngle}deg)`,
            background:
              "conic-gradient(from -90deg, transparent 0deg, transparent 340deg, rgba(245,214,138,0.9) 350deg, rgba(212,164,55,1) 360deg)",
            WebkitMask:
              "radial-gradient(circle, transparent 60%, black 60.5%, black 68%, transparent 68.5%)",
            mask: "radial-gradient(circle, transparent 60%, black 60.5%, black 68%, transparent 68.5%)",
            filter: "drop-shadow(0 0 12px rgba(245,214,138,0.6))",
          }}
        />

        {/* Star nodes */}
        {PROCESS_STEPS.map((s, i) => {
          const angle = (i / total) * 360 - 90;
          const rad = (angle * Math.PI) / 180;
          const r = 46; // percent
          const x = 50 + Math.cos(rad) * r;
          const y = 50 + Math.sin(rad) * r;
          const isActive = i === active;
          return (
            <button
              key={s.id}
              onClick={() => {
                setActive(i);
                setUserInteracted(true);
              }}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300 group",
                "flex items-center justify-center focus:outline-none"
              )}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: isActive ? 56 : 40,
                height: isActive ? 56 : 40,
              }}
              aria-label={`Step ${i + 1}: ${s.title}`}
            >
              <span
                className="absolute inset-0 rounded-full transition-all duration-300"
                style={{
                  background: isActive
                    ? "radial-gradient(circle, rgba(245,214,138,0.95), rgba(212,164,55,0.5) 60%, transparent 75%)"
                    : "radial-gradient(circle, rgba(212,164,55,0.55), rgba(212,164,55,0.15) 60%, transparent 75%)",
                  filter: isActive
                    ? "drop-shadow(0 0 18px rgba(245,214,138,0.9))"
                    : "drop-shadow(0 0 6px rgba(212,164,55,0.5))",
                }}
              />
              <svg
                viewBox="0 0 24 24"
                className={cn("relative transition-all", isActive ? "w-7 h-7" : "w-5 h-5")}
                fill="url(#goldGrad)"
              >
                <defs>
                  <linearGradient id="goldGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#f5d68a" />
                    <stop offset="100%" stopColor="#d4a437" />
                  </linearGradient>
                </defs>
                <path d="M12 2l2.6 6.3L21 9l-5 4.4L17.5 20 12 16.7 6.5 20 8 13.4 3 9l6.4-.7z" />
              </svg>
            </button>
          );
        })}

        {/* Center card */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[52%] aspect-square rounded-full flex items-center justify-center">
          <div
            className="w-full h-full rounded-full flex flex-col items-center justify-center text-center px-6"
            style={{
              background:
                "radial-gradient(circle at 30% 20%, rgba(40,25,10,0.85), rgba(10,7,3,0.95))",
              border: "1px solid rgba(212,164,55,0.4)",
              boxShadow:
                "inset 0 0 40px rgba(212,164,55,0.15), 0 0 60px rgba(212,164,55,0.15)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div
              className="text-xs uppercase tracking-[0.3em] mb-2"
              style={{ color: "#d4a437" }}
            >
              Step {active + 1} / {total}
            </div>
            <div
              className="font-display font-bold text-xl sm:text-2xl mb-3"
              style={{
                background: "linear-gradient(135deg, #f5d68a, #d4a437)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {step.title}
            </div>
            <div className="text-xs sm:text-sm text-amber-50/80 leading-relaxed max-w-[90%]">
              {step.description}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
