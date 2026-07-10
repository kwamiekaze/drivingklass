export function StaticFallback() {
  return (
    <div
      className="fixed inset-0 -z-10"
      style={{
        background:
          "radial-gradient(ellipse at center, #8a6430 0%, #3a2510 45%, #1a1108 80%, #0a0603 100%)",
      }}
      aria-hidden
    />
  );
}
