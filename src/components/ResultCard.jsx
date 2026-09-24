import { useState } from "react";
import { ChevronDown, ChevronUp, ArrowDown, ArrowUp } from "lucide-react";

export function ResultCard({ scenario }) {
  const [expanded, setExpanded] = useState(false);
  const status =
    scenario.status === "undervalued"
      ? "undervalued"
      : scenario.status === "overvalued"
      ? "overvalued"
      : scenario.status === "balanced"
      ? "balanced"
      : null;

  const statusLabel =
    status === "undervalued"
      ? `UNDERVALUED (Harga ${Math.abs(scenario.pctDifference).toFixed(1)}% di bawah avg)`
      : status === "overvalued"
      ? `OVERVALUED (Harga ${Math.abs(scenario.pctDifference).toFixed(1)}% di atas avg)`
      : "HARGA SEIMBANG";

  const StatusIcon = status === "undervalued" ? ArrowDown : status === "overvalued" ? ArrowUp : null;

  const formatRp = (val) =>
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(Number(val)) ? Number(val) : 0);

  return (
    <div className="scenario-card">
      <div className="results-header">
        <h3 className="results-title">{scenario.label}</h3>
        <span className="results-subtitle">Laba: Rp {formatRp(scenario.laba)}M</span>
      </div>

      <div className="per-saham-grid">
        <div className="per-saham-item">
          <p className="per-saham-label">EPS</p>
          <p className="per-saham-value">Rp {formatRp(scenario.eps)}</p>
        </div>
        <div className="per-saham-item">
          <p className="per-saham-label">BVPS</p>
          <p className="per-saham-value">Rp {formatRp(scenario.bvps)}</p>
        </div>
        <div className="per-saham-item">
          <p className="per-saham-label">DPS</p>
          <p className="per-saham-value">Rp {formatRp(scenario.dps)}</p>
        </div>
      </div>

      <div className="fair-value-grid">
        <div className="fv-card fv-per">
          <p className="fv-label">Fair Value (PER × {scenario.per})</p>
          <p className="fv-value">{formatRp(scenario.fairValuePer)}</p>
        </div>
        <div className="fv-card fv-pbv">
          <p className="fv-label">Fair Value (PBV × {scenario.pbv})</p>
          <p className="fv-value">{formatRp(scenario.fairValuePbv)}</p>
        </div>
      </div>

      <div className="avg-price-card">
        <p className="avg-label">Average Price (Hasil Akhir)</p>
        <p className="average-price-amount" data-testid="average-price">Rp {formatRp(scenario.averagePrice)}</p>
      </div>

      <div className="metrics-grid valuation-extras">
        <div className="metric-item">
          <p className="metric-label">DCF (estimasi per saham)</p>
          <p className="metric-value">{scenario.dcfPrice === null ? "—" : `Rp ${formatRp(scenario.dcfPrice)}`}</p>
        </div>
        {scenario.marginOfSafety !== null && scenario.marginOfSafetyPercent !== null && (
          <div className="avg-price-card mos-price-card">
            <p className="avg-label">Harga dengan Margin of Safety {scenario.marginOfSafetyPercent}%</p>
            <p className="average-price-amount" data-testid="mos-price">Rp {formatRp(scenario.marginOfSafety)}</p>
          </div>
        )}
      </div>

      {scenario.actualPer !== null && (
        <div className="metrics-grid">
          <div className="metric-item">
            <p className="metric-label">PER Aktual</p>
            <p className="metric-value">{scenario.actualPer.toFixed(1)}x</p>
          </div>
          <div className="metric-item">
            <p className="metric-label">PBV Aktual</p>
            <p className="metric-value">{scenario.actualPbv?.toFixed(2)}x</p>
          </div>
          <div className="metric-item">
            <p className="metric-label">Div Yield</p>
            <p className="metric-value">{scenario.dividendYield?.toFixed(2)}%</p>
          </div>
          {status && (
            <div className="metric-item status-row">
              <span className="status-label">Status</span>
              <span className={`status-badge ${status === "undervalued" ? "status-positive" : status === "overvalued" ? "status-negative" : "status-balanced"}`}>
                {StatusIcon && <StatusIcon size={14} />}
                {statusLabel}
              </span>
            </div>
          )}
        </div>
      )}

      {expanded && (
        <div className="details-panel">
          <div className="detail-row">
            <span className="detail-label">Laba (Miliar)</span>
            <span className="detail-value">{formatRp(scenario.laba)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">EPS</span>
            <span className="detail-value">{formatRp(scenario.eps)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">BVPS</span>
            <span className="detail-value">{formatRp(scenario.bvps)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">DPS</span>
            <span className="detail-value">{formatRp(scenario.dps)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">PER</span>
            <span className="detail-value">{scenario.per}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">PBV</span>
            <span className="detail-value">{scenario.pbv}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Fair Value PER</span>
            <span className="detail-value">{formatRp(scenario.fairValuePer)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Fair Value PBV</span>
            <span className="detail-value">{formatRp(scenario.fairValuePbv)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">DCF (estimasi per saham)</span>
            <span className="detail-value">{formatRp(scenario.dcfPrice)}</span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="details-toggle"
      >
        {expanded ? "Sembunyikan detail" : "Tampilkan detail"}{" "}
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
    </div>
  );
}
