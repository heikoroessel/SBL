const LABELS = {
  erledigt: 'Erledigt',
  offen: 'Offen',
  ueberfaellig: 'Überfällig',
};

export default function StatusBadge({ status, dotOnly = false }) {
  if (!status) return null;
  if (dotOnly) {
    return <span className={`status-dot ${status}`} title={LABELS[status] || status} />;
  }
  return (
    <span className={`status-pill ${status}`}>
      <span className={`status-dot ${status}`} />
      {LABELS[status] || status}
    </span>
  );
}
