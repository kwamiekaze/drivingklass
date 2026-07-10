export function SceneLoader() {
  return (
    <div className="fixed inset-0 -z-10 flex items-center justify-center bg-[#0a0603]">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-16 h-16 rounded-full animate-spin"
          style={{
            background:
              "conic-gradient(from 0deg, transparent, #d4a437, transparent)",
            WebkitMask:
              "radial-gradient(circle, transparent 55%, black 56%)",
            mask: "radial-gradient(circle, transparent 55%, black 56%)",
          }}
        />
        <div
          className="text-xs uppercase tracking-[0.4em]"
          style={{ color: "#d4a437" }}
        >
          Preparing Showcase
        </div>
      </div>
    </div>
  );
}
