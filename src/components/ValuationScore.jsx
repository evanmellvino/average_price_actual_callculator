import { Gauge } from "lucide-react";
import { calculateValuationScore } from "../calculator.js";

const BAND_TONE = {
  positive: "summary-positive",
  balanced: "status-balanced",
  negative: "summary-negative",
};

export function ValuationScore({ scenario, currentPrice }) {
  const result = calculateValuationScore(scenario, currentPrice);
  if (!result) return null;

  const { score, band, tone, factors } = result;
  const circumference = 2 * Math.PI * 42;
  const dash = (score / 100) * circumference;

  return (
    <section className="valuation-score card">
      <div className="valuation-score-head">
        <p className="summary-eyebrow">SKOR VALUASI</p>
        <span className={`valuation-band ${BAND_TONE[tone]}`}>{band}</span>
      </div>

      <div className="valuation-score-body">
        <div className="valuation-gauge" role="img" aria-label={`Skor valuasi ${score} dari 100`}>
          <svg viewBox="0 0 100 100" width="112" height="112">
            <circle className="valuation-gauge-track" cx="50" cy="50" r="42" />
            <circle
              className={`valuation-gauge-fill valuation-${tone}`}
              cx="50"
              cy="50"
              r="42"
              strokeDasharray={`${dash} ${circumference}`}
            />
          </svg>
          <div className="valuation-gauge-center">
            <span className="valuation-gauge-score">{score}</span>
            <span className="valuation-gauge-max">/ 100</span>
          </div>
        </div>

        <ul className="valuation-factors">
          {factors.map((f) => (
            <li key={f.key} className="valuation-factor">
              <div className="valuation-factor-top">
                <span className="valuation-factor-label">{f.label}</span>
                <span className="valuation-factor-points">{Math.round(f.points)}/{f.max}</span>
              </div>
              <div className="valuation-factor-bar">
                <span style={{ width: `${(f.points / f.max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="valuation-score-note">
        <Gauge size={13} /> Skor kuantitatif dari potensi harga, buffer DCF, MOS, dan PER.
        Bukan rekomendasi jual/beli.
      </p>
    </section>
  );
}
