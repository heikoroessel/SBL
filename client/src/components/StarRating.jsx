export default function StarRating({ value, onChange, readOnly = false }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="star-rating">
      {stars.map((n) => (
        <button
          key={n}
          type="button"
          className={n <= (value || 0) ? 'filled' : ''}
          onClick={() => !readOnly && onChange?.(n)}
          disabled={readOnly}
          aria-label={`${n} Sterne`}
        >
          {n <= (value || 0) ? '★' : '☆'}
        </button>
      ))}
    </div>
  );
}
