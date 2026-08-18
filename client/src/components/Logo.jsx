export default function Logo({ withText = true, size = 34 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ flexShrink: 0 }}>
        {/* Obere Spitze: orange */}
        <polygon points="95,5 55,45 78,68" fill="#e0632c" />
        {/* Untere Spitze: schwarz */}
        <polygon points="55,45 5,95 78,68" fill="#14140f" />
      </svg>
      {withText && (
        <div style={{ lineHeight: 1.15 }}>
          <div style={{ fontWeight: 800, fontSize: 19, letterSpacing: '-0.01em' }}>Systemischer Kompass</div>
          <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Systemische Business Landkarte</div>
        </div>
      )}
    </div>
  );
}
