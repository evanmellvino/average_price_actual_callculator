import { TrendingUp, TrendingDown } from "lucide-react";

export function ExportSummary({ stock, scenario, currentPrice }) {
  if (!scenario) return null;

  const upside = currentPrice > 0 ? ((scenario.averagePrice - currentPrice) / currentPrice) * 100 : 0;
  const isPositive = upside >= 0;

  return (
    <div className="export-summary-card">
      <div className="export-summary-header">
        <div className="export-summary-brand">
          <img src="/logo-kalkulator.svg" alt="Logo" width="40" height="40" style={{ borderRadius: 10, flex: "0 0 auto" }} />
          <div>
            <div className="export-summary-app">Average Price Calculator</div>
            <div className="export-summary-tagline">Analisis valuasi saham</div>
          </div>
        </div>
        <div className="export-summary-date">{new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</div>
      </div>

      <div className="export-summary-body">
        <div className="export-summary-ticker">
          <h2>{stock.name}</h2>
        </div>

        <div className="export-summary-grid">
          <div className="export-summary-metric">
            <div className="export-summary-label">Harga Sekarang</div>
            <div className="export-summary-value">Rp {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(currentPrice)}</div>
          </div>

          <div className="export-summary-metric export-summary-metric-highlight">
            <div className="export-summary-label">Target Harga Wajar</div>
            <div className="export-summary-value export-summary-value-primary">Rp {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(scenario.averagePrice)}</div>
          </div>

          <div className="export-summary-metric">
            <div className="export-summary-label">Potensi</div>
            <div className={`export-summary-value ${isPositive ? "export-summary-positive" : "export-summary-negative"}`}>
              {isPositive ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              {upside >= 0 ? "+" : ""}{upside.toFixed(1)}%
            </div>
          </div>

          <div className="export-summary-metric">
            <div className="export-summary-label">PER / PBV</div>
            <div className="export-summary-value">{scenario.per.toFixed(1)}× / {scenario.pbv.toFixed(2)}×</div>
          </div>
        </div>

        {scenario.marginOfSafety && (
          <div className="export-summary-mos">
            <div className="export-summary-label">Margin of Safety</div>
            <div className="export-summary-value">Rp {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(scenario.marginOfSafety)}</div>
          </div>
        )}

        <div className="export-summary-breakdown">
          <div className="export-summary-breakdown-item">
            <span>PER</span>
            <span>Rp {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(scenario.fairValuePer)}</span>
          </div>
          <div className="export-summary-breakdown-item">
            <span>PBV</span>
            <span>Rp {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(scenario.fairValuePbv)}</span>
          </div>
          <div className="export-summary-breakdown-item">
            <span>DCF</span>
            <span>Rp {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(scenario.dcfPrice)}</span>
          </div>
        </div>
      </div>

      <div className="export-summary-footer">
        <p>Bukan rekomendasi jual/beli. Selalu lakukan analisis mandiri sebelum berinvestasi.</p>
      </div>
    </div>
  );
}
