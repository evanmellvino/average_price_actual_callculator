import { useMemo, useState } from "react";
import { Coins } from "lucide-react";
import { parseNumber } from "../calculator.js";
import { SHARES_PER_LOT } from "./PortfolioTracker.jsx";

const fmtRp = (value) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(
    Number.isFinite(Number(value)) ? Number(value) : 0,
  );

const DEFAULT_GROWTH = "5";
const PROJECTION_YEARS = 5;

export function DividendCalculator({ scenario, name, holding }) {
  const [growthInput, setGrowthInput] = useState("");

  const hasDividend = scenario && Number.isFinite(scenario.dps) && scenario.dps > 0;

  const result = useMemo(() => {
    if (!hasDividend) return null;

    const lots = parseNumber(holding?.lots) ?? 0;
    const buyPrice = parseNumber(holding?.buyPrice);
    // Kalau belum isi lot, pakai 1 lot sebagai ilustrasi.
    const shares = (lots > 0 ? lots : 1) * SHARES_PER_LOT;
    const isIllustration = !(lots > 0);

    const dps = scenario.dps;
    const annualIncome = shares * dps;

    const avgCost = buyPrice && buyPrice > 0 ? buyPrice : null;
    const yieldOnCost = avgCost ? (dps / avgCost) * 100 : null;

    const growthPct = growthInput !== "" ? parseNumber(growthInput) : parseNumber(DEFAULT_GROWTH);
    const growth = growthPct !== null && growthPct >= 0 ? growthPct / 100 : 0.05;

    const projections = [];
    let cumulative = 0;
    let currentDps = dps;
    for (let year = 1; year <= PROJECTION_YEARS; year += 1) {
      const income = shares * currentDps;
      cumulative += income;
      projections.push({ year, dps: currentDps, income, cumulative });
      currentDps *= 1 + growth;
    }

    return {
      shares,
      isIllustration,
      dps,
      annualIncome,
      yieldOnCost,
      growthPct: growth * 100,
      projections,
      cumulative,
    };
  }, [hasDividend, scenario, holding, growthInput]);

  if (!result) return null;

  return (
    <section className="dividend-calc card">
      <div className="dividend-head">
        <div>
          <p className="summary-eyebrow">DIVIDEN</p>
          <h3 className="chart-title">
            <Coins size={16} /> Proyeksi pendapatan dividen
          </h3>
        </div>
        {result.yieldOnCost !== null && (
          <span className="dividend-yoc">
            YoC <strong>{result.yieldOnCost.toFixed(2)}%</strong>
          </span>
        )}
      </div>

      <div className="dividend-stats">
        <div className="dividend-stat">
          <span className="dividend-stat-label">Dividen / saham (DPS)</span>
          <strong>Rp {fmtRp(result.dps)}</strong>
        </div>
        <div className="dividend-stat">
          <span className="dividend-stat-label">
            Pendapatan / tahun {result.isIllustration && <em>(ilustrasi 1 lot)</em>}
          </span>
          <strong>Rp {fmtRp(result.annualIncome)}</strong>
        </div>
        <div className="dividend-stat">
          <span className="dividend-stat-label">Akumulasi {PROJECTION_YEARS} tahun</span>
          <strong>Rp {fmtRp(result.cumulative)}</strong>
        </div>
      </div>

      <div className="dividend-growth">
        <label className="field-wrap">
          <span className="field-label">Asumsi pertumbuhan dividen / tahun</span>
          <span className="dividend-growth-input">
            <input
              type="text"
              inputMode="decimal"
              className="input-field"
              placeholder={DEFAULT_GROWTH}
              value={growthInput}
              onChange={(e) => setGrowthInput(e.target.value.replace(/[^\d.,]/g, ""))}
            />
            <span className="field-suffix">%</span>
          </span>
        </label>
      </div>

      <div className="dividend-table-wrap">
        <table className="dividend-table">
          <thead>
            <tr>
              <th scope="col">Tahun</th>
              <th scope="col">DPS</th>
              <th scope="col">Pendapatan</th>
              <th scope="col">Akumulasi</th>
            </tr>
          </thead>
          <tbody>
            {result.projections.map((p) => (
              <tr key={p.year}>
                <th scope="row">Tahun {p.year}</th>
                <td>Rp {fmtRp(p.dps)}</td>
                <td>Rp {fmtRp(p.income)}</td>
                <td className="dividend-cumulative">Rp {fmtRp(p.cumulative)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="section-subtitle dividend-note">
        Perkiraan pendapatan dividen {name?.trim() || "saham ini"} dengan asumsi pertumbuhan {result.growthPct.toFixed(1)}%/tahun.
        Bukan jaminan — angka dapat berubah.
      </p>
    </section>
  );
}
