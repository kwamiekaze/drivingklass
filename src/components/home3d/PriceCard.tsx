import { cn } from "@/lib/utils";
import type { Package } from "@/data/packages";

interface Props {
  pkg: Package;
  hovered: boolean;
  dimAmount: number; // 0 = fully visible, 1 = fully dimmed (far side of ring)
  onEnter: () => void;
  onLeave: () => void;
  onOpen: () => void;
  onBook: () => void;
}

export function PriceCard({
  pkg,
  hovered,
  dimAmount,
  onEnter,
  onLeave,
  onOpen,
  onBook,
}: Props) {
  const opacity = 1 - dimAmount * 0.65;
  const scale = hovered ? 1.08 : 1;

  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        opacity,
        transform: `translate(-50%, -50%) scale(${scale})`,
        transition: "transform 220ms cubic-bezier(.2,.7,.2,1), opacity 220ms",
        willChange: "transform, opacity",
      }}
      className="absolute left-1/2 top-1/2"
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${pkg.label.replace("\n", " ")} — ${pkg.price} — view details`}
        className={cn(
          "block w-[160px] text-left rounded-2xl px-4 py-3 backdrop-blur-md",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
        )}
        style={{
          background:
            "linear-gradient(135deg, hsl(30 12% 10% / 0.88) 0%, hsl(25 10% 5% / 0.92) 100%)",
          border: `1px solid hsl(43 ${hovered ? "90%" : "65%"} ${hovered ? "60%" : "45%"} / ${hovered ? "0.95" : "0.6"})`,
          boxShadow: hovered
            ? "0 10px 32px hsl(0 0% 0% / 0.55), 0 0 34px hsl(43 90% 55% / 0.55), inset 0 1px 0 hsl(43 60% 60% / 0.25)"
            : "0 6px 18px hsl(0 0% 0% / 0.5), 0 0 14px hsl(43 70% 50% / 0.18), inset 0 1px 0 hsl(43 50% 50% / 0.12)",
          color: "hsl(42 30% 88%)",
        }}
      >
        <div
          className="text-[10px] tracking-[0.2em] uppercase mb-1"
          style={{ color: "hsl(42 30% 65%)" }}
        >
          Klass
        </div>
        <div
          className="font-bold text-sm leading-tight mb-1.5 whitespace-pre-line"
          style={{ color: "hsl(42 30% 92%)" }}
        >
          {pkg.label}
        </div>
        <div
          className="font-bold text-xl leading-none"
          style={{
            background:
              "linear-gradient(135deg, hsl(43 85% 55%) 0%, hsl(48 90% 72%) 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 8px hsl(43 80% 52% / 0.35))",
          }}
        >
          {pkg.price}
        </div>
        {hovered && (
          <div
            role="presentation"
            onClick={(e) => {
              e.stopPropagation();
              onBook();
            }}
            className="mt-2 text-center text-[11px] tracking-[0.18em] uppercase font-semibold px-3 py-1.5 rounded-full cursor-pointer"
            style={{
              background:
                "linear-gradient(145deg, hsl(36 75% 35%), hsl(43 80% 52%) 50%, hsl(48 75% 60%))",
              color: "hsl(30 10% 8%)",
              boxShadow: "0 3px 12px hsl(43 80% 52% / 0.4)",
            }}
          >
            Book Now →
          </div>
        )}
      </button>
    </div>
  );
}
