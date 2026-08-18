export default function Logo({ withSubtitle = true, height = 34 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <img
        src="/logo.png"
        alt="Systemischer Kompass"
        style={{ height, width: 'auto', display: 'block' }}
      />
      {withSubtitle && (
        <div style={{ fontSize: 12, color: 'var(--ink-muted)', borderLeft: '1px solid var(--line-strong)', paddingLeft: 12, lineHeight: 1.3 }}>
          Systemische<br />Business Landkarte
        </div>
      )}
    </div>
  );
}
