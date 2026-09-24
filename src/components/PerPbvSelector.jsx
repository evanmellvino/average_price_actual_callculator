import { PER_OPTIONS, PBV_OPTIONS, parseNumber } from "../calculator.js";

export function PerPbvSelector({ per, pbv, customPbv, onChangePer, onChangePbv, onChangeCustomPbv, sectorPbvValues = [] }) {
  const isSectorPreset = sectorPbvValues.includes(Number(pbv));
  const isCustom = Number(pbv) === 4 && !isSectorPreset;
  const pbvValue = isCustom ? customPbv : pbv;
  const knownPerOptions = PER_OPTIONS.map((option) => option.value);
  const knownPbvOptions = [...new Set([...PBV_OPTIONS.filter((option) => option.value !== 4).map((option) => option.value), ...sectorPbvValues])];

  const handlePerInput = (value) => {
    if (value === "") {
      onChangePer("");
      return;
    }
    const parsed = parseNumber(value);
    if (parsed !== null && parsed > 0) onChangePer(value);
  };

  const handlePbvInput = (value) => {
    if (value === "") {
      onChangePbv("");
      onChangeCustomPbv("");
      return;
    }
    const parsed = parseNumber(value);
    if (parsed === null) return;
    if (parsed > 0 && parsed <= 10) {
      onChangePbv(4);
      onChangeCustomPbv(value);
    } else if (parsed > 10) {
      onChangePbv(value);
      onChangeCustomPbv("");
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <div className="field-label-row">
          <label className="input-label">Asumsi PER</label>
        </div>
        <div className="valuation-choice-row">
          <input
            className="input-field valuation-number-input"
            type="text"
            inputMode="decimal"
            list="per-presets"
            aria-label="Ketik asumsi PER atau pilih preset"
            value={per}
            onChange={(event) => handlePerInput(event.target.value)}
            placeholder="Contoh: 12"
          />
          <datalist id="per-presets">
            {PER_OPTIONS.map((option) => <option key={option.value} value={option.value} label={option.label} />)}
          </datalist>
          <select className="select-field valuation-preset-select" aria-label="Pilih preset PER" value={knownPerOptions.includes(Number(per)) ? per : ""} onChange={(event) => onChangePer(Number(event.target.value))}>
            <option value="" disabled>Pilih preset</option>
            {PER_OPTIONS.map((option) => <option key={option.value} value={option.value}>PER {option.value} — {option.label}</option>)}
          </select>
        </div>
        <p className="section-subtitle">
          Pilih preset di samping atau ketik angka PER. Default: 10×.
        </p>
      </div>
      <div>
        <div className="field-label-row">
          <label className="input-label">Asumsi PBV</label>
        </div>
        <div className="valuation-choice-row">
          <input
            className="input-field valuation-number-input"
            type="text"
            inputMode="decimal"
            list="pbv-presets"
            aria-label="Ketik asumsi PBV atau pilih preset"
            value={pbvValue}
            onChange={(event) => handlePbvInput(event.target.value)}
            placeholder="Contoh: 1,5"
          />
          <datalist id="pbv-presets">
            {[...new Set([...knownPbvOptions, ...PBV_OPTIONS.filter((option) => option.value === 4).map((option) => option.value)])].map((value) => <option key={value} value={value} label={value === 4 ? "Custom 4–10" : sectorPbvValues.includes(value) ? "Preset sektor" : "Preset umum"} />)}
          </datalist>
          <select className="select-field valuation-preset-select" aria-label="Pilih preset PBV" value={knownPbvOptions.includes(Number(pbv)) ? pbv : ""} onChange={(event) => { onChangePbv(Number(event.target.value)); onChangeCustomPbv(""); }}>
            <option value="" disabled>Pilih preset</option>
            {PBV_OPTIONS.filter((option) => option.value !== 4).map((option) => <option key={option.value} value={option.value}>PBV {option.value} — {option.label}</option>)}
            {sectorPbvValues.filter((value) => !PBV_OPTIONS.some((option) => option.value === value)).map((value) => <option key={`sector-${value}`} value={value}>PBV {value} — acuan sektor</option>)}
            <option value={4}>PBV custom (4–10)</option>
          </select>
        </div>
        {isCustom && <p className={`section-subtitle ${customPbv && (Number(customPbv) < 4 || Number(customPbv) > 10) ? "valuation-input-error" : ""}`}>Masukkan PBV custom antara 4–10.</p>}
        <p className="section-subtitle">Pilih preset di samping atau ketik PBV; nilai custom 4–10 diperbolehkan.</p>
      </div>
    </div>
  );
}
