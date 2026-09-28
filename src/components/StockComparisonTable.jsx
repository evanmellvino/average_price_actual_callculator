import { calculateScenarios, parseNumber, calculateValuationScore } from "../calculator.js";

const fmt = (value) =>
  value === null || value === undefined || !Number.isFinite(Number(value))
    ? "—"
    : new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Number(value));

export function StockComparisonTable({ stocks, onOpen }) {
  const rows = stocks
    .map((stock) => {
      const scenarios = calculateScenarios({
        form: stock.form,
        unit: stock.unit,
        per: stock.per,
        pbvChoice: stock.pbv,
        customPbv: stock.customPbv,
      });
      const scenario = scenarios[0] ?? null;
      const currentPrice = parseNumber(stock.form?.hargaSaham);
      const upside =
        scenario && currentPrice > 0
          ? ((scenario.averagePrice - currentPrice) / currentPrice) * 100
          : null;
      const score = scenario ? calculateValuationScore(scenario, currentPrice > 0 ? currentPrice : 0) : null;
      return { stock, scenario, currentPrice: currentPrice > 0 ? currentPrice : null, upside, score };
    })
    .filter((row) => row.stock.name?.trim());

  if (rows.length < 2) return null;

  const sorted = [...rows].sort((a, b) => (b.score?.score ?? -1) - (a.score?.score ?? -1));

  return (
    <section className="comparison-table card">
      <div className="comparison-table-head">
        <div>
          <p className="summary-eyebrow">PERBANDINGAN SAHAM</p>
          <h3 className="chart-title">Bandingkan valuasi seluruh saham</h3>
        </div>
        <span className="comparison-count">{rows.length} saham</span>
      </div>

      <div className="comparison-table-wrap">
        <table className="comparison-table-el">
          <thead>
            <tr>
              <th scope="col">Saham</th>
              <th scope="col">Harga</th>
              <th scope="col">Wajar</th>
              <th scope="col">Potensi</th>
              <th scope="col">PER</th>
              <th scope="col">PBV</th>
              <th scope="col">Skor</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ stock, scenario, currentPrice, upside, score }) => (
              <tr key={stock.id}>
                <th scope="row">
                  <button type="button" className="comparison-symbol" onClick={() => onOpen?.(stock.id)}>
                    {stock.name}
                  </button>
                </th>
                <td>{currentPrice !== null ? `Rp ${fmt(currentPrice)}` : "—"}</td>
                <td>{scenario ? `Rp ${fmt(scenario.averagePrice)}` : "—"}</td>
                <td className={upside === null ? "" : upside >= 0 ? "summary-positive" : "summary-negative"}>
                  {upside === null ? "—" : `${upside >= 0 ? "+" : ""}${upside.toFixed(1)}%`}
                </td>
                <td>{scenario?.actualPer != null ? `${scenario.actualPer.toFixed(1)}×` : "—"}</td>
                <td>{scenario?.actualPbv != null ? `${scenario.actualPbv.toFixed(2)}×` : "—"}</td>
                <td>
                  {score ? (
                    <span className={`comparison-score comparison-score-${score.tone}`}>
                      <span className="comparison-score-bar" style={{ width: `${score.score}%` }} />
                      <span className="comparison-score-num">{score.score}</span>
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="section-subtitle comparison-table-note">
        Skor 0–100 dari potensi harga, buffer DCF, MOS, dan PER. Urut dari skor tertinggi.
        Bukan rekomendasi jual/beli.
      </p>
    </section>
  );
}
