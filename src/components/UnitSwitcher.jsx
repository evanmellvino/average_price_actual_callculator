export function UnitSwitcher({ unit, onChange }) {
  const toggle = () => onChange(unit === "miliar" ? "juta" : "miliar");

  return (
    <div className="unit-switch">
      <button
        type="button"
        onClick={toggle}
        className={`unit-btn ${unit === "miliar" ? "active" : ""}`}
        aria-pressed={unit === "miliar"}
      >
        Miliar
      </button>
      <button
        type="button"
        onClick={toggle}
        className={`unit-btn ${unit === "juta" ? "active" : ""}`}
        aria-pressed={unit === "juta"}
      >
        Juta
      </button>
    </div>
  );
}
