import { PER_OPTIONS, PBV_OPTIONS } from "../calculator.js";
import { NumericField } from "./NumericField.jsx";

export function PerPbvSelector({ per, pbv, customPbv, onChangePer, onChangePbv, onChangeCustomPbv, sectorPbvValues = [] }) {
  const isSectorPreset = sectorPbvValues.includes(Number(pbv));
  const isCustom = Number(pbv) === 4 && !isSectorPreset;
  const hasPresetPbv = sectorPbvValues.includes(Number(pbv));

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <div className="field-label-row">
          <label className="input-label">Asumsi PER</label>
        </div>
        <select
          className="select-field"
          value={per}
          onChange={(e) => onChangePer(Number(e.target.value))}
        >
          {PER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              PER {o.value} — {o.label}
            </option>
          ))}
        </select>
        <p className="section-subtitle">
          Default: PER 10 (paling realistis). PER lebih dari 10 biasanya growth.
        </p>
      </div>
      <div>
        <div className="field-label-row">
          <label className="input-label">Asumsi PBV</label>
        </div>
        <select
          className="select-field"
          value={hasPresetPbv ? pbv : isCustom ? 4 : pbv}
          onChange={(e) => onChangePbv(Number(e.target.value))}
        >
          {PBV_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              PBV {o.value} — {o.label}
            </option>
          ))}
          {sectorPbvValues.filter((value) => !PBV_OPTIONS.some((option) => option.value === value)).map((value) => (
            <option key={`sector-${value}`} value={value}>
              PBV {value} — acuan sektor
            </option>
          ))}
        </select>
        {isCustom && (
          <div className="field-wrap mt-2">
            <NumericField
              label="PBV custom (4–10)"
              value={customPbv}
              onChange={onChangeCustomPbv}
              unit="miliar"
              error={customPbv && (Number(customPbv) < 4 || Number(customPbv) > 10) ? "PBV custom harus 4–10." : undefined}
            />
          </div>
        )}
        <p className="section-subtitle">PBV 4–10 bisa custom input.</p>
      </div>
    </div>
  );
}
