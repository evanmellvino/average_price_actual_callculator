import { sanitizeNumericInput, parseNumber, formatInputNumber } from "../calculator.js";
import { TooltipIcon } from "./TooltipIcon.jsx";

export function NumericField({ label, tooltip, value, onChange, error, unit, suffix: customSuffix }) {
  const suffix = customSuffix ?? (unit === "miliar" ? "Miliar" : "Juta");

  const handleChange = (e) => {
    const raw = sanitizeNumericInput(e.target.value);
    const separators = raw.match(/[.,]/g) ?? [];
    if (separators.length > 1) return;
    const parsed = parseNumber(raw);
    if (parsed === null && raw !== "" && !/^\d+[.,]$/.test(raw)) return;
    onChange(raw);
  };

  const formatted = formatInputNumber(value);

  return (
    <div className="field-wrap">
      <div className="field-label-row">
        <label className="input-label" htmlFor={`field-${label.replace(/\W+/g, "-").toLowerCase()}`}>{label}</label>
        {tooltip && <TooltipIcon text={tooltip} />}
      </div>
      <div className="field-control">
        <input
          id={`field-${label.replace(/\W+/g, "-").toLowerCase()}`}
          type="text"
          inputMode="decimal"
          className={`input-field ${error ? "has-error" : ""}`}
          placeholder={`ex: ${unit === "miliar" ? "20321" : "20321000"}`}
          value={formatted}
          onChange={handleChange}
          aria-invalid={!!error}
          aria-describedby={error ? `${label.replace(/\s+/g, "")}-error` : undefined}
        />
        <span className="field-suffix">{suffix}</span>
      </div>
      {error && <span id={`${label.replace(/\s+/g, "")}-error`} className="field-error">{error}</span>}
    </div>
  );
}
