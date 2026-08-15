import { useState } from 'react';

export default function InfoPopover({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button type="button" className="info-icon" onClick={() => setOpen((o) => !o)} aria-label="Mehr Informationen">
        i
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 39 }} onClick={() => setOpen(false)} />
          <div className="info-popover" style={{ top: 26, left: 0 }}>
            {children}
          </div>
        </>
      )}
    </span>
  );
}
