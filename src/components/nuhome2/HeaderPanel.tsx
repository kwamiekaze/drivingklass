/** The navy header panel: two curved end caps and a stretched middle, all CSS and SVG so the gold edge stays sharp at any width. */
export function HeaderPanel() {
  return (
    <div className="n2-hdr-bg" aria-hidden="true">
      <svg className="n2-hdr-cap n2-hdr-cap--l" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
        <defs>
          <linearGradient id="n2h-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0b3475" /><stop offset=".5" stopColor="#082a63" /><stop offset="1" stopColor="#061b48" /></linearGradient>
          <linearGradient id="n2h-gold" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#956716" /><stop offset=".45" stopColor="#e5b84a" /><stop offset="1" stopColor="#e5b84a" /></linearGradient>
        </defs>
        <path d="M0 0 H100 V100 C58 100 42 80 0 80 Z" fill="url(#n2h-fill)" />
        <path d="M0 80 C42 80 58 100 100 100" fill="none" stroke="url(#n2h-gold)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="n2-hdr-mid" />
      <svg className="n2-hdr-cap n2-hdr-cap--r" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
        <path d="M0 0 H100 V100 C58 100 42 80 0 80 Z" fill="url(#n2h-fill)" />
        <path d="M0 80 C42 80 58 100 100 100" fill="none" stroke="url(#n2h-gold)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="n2-hdr-spark" />
    </div>
  );
}
