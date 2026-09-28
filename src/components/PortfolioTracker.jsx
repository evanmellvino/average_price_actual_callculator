import { useMemo } from "react";
import { Briefcase, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { calculateScenarios, parseNumber } from "../calculator.js";

const fmtRp = (value) =>
  new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0);

const fmtPct = (value) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

// 1 lot = 100 lembar (Bursa Efek Indonesia)
export const SHARES_PER_LOT = 100;

export function buildPortfolioRows(stocks) {
  return stocks
    .map((stock) => {
      const holding = stock.holding ?? {};
      const lots = parseNumber(holding.lots) ?? 0;
      const buyPrice = parseNumber(holding.buyPrice);
      if (!lots || lots <= 0 || buyPrice === null || buyPrice <= 0) return null;

      const shares = lots * SHARES_PER_LOT;
      const cost = shares * buyPrice;

      const scenarios = calculateScenarios({
        form: stock.form,
        unit: stock.unit,
        per: stock.per,
        pbvChoice: stock.pbv,
        customPbv: stock.customPbv,
      });
      const scenario = scenarios[0] ?? null;

      const marketPrice = parseNumber(stock.form?.hargaSaham);
      const lastPrice =
        marketPrice && marketPrice > 0
          ? marketPrice
          : scenario
            ? scenario.averagePrice
            : buyPrice;

      const marketValue = shares * lastPrice;
      const pl = marketValue - cost;
      const plPct = cost > 0 ? (pl / cost) * 100 : 0;

      return {
        id: stock.id,
        name: stock.name?.trim() || "Tanpa nama",
        lots,
        shares,
        buyPrice,
        lastPrice,
        cost,
        marketValue,
        pl,
        plPct,
        buyDate: holding.buyDate || "",
      };
    })
    .filter(Boolean);
}

export function PortfolioTracker({ stocks, onOpen }) {
  const rows = useMemo(() => buildPortfolioRows(stocks), [stocks]);

  const totals = useMemo(() => {
    const cost = rows.reduce((sum, r) => sum + r.cost, 0);
    const marketValue = rows.reduce((sum, r) => sum + r.marketValue, 0);
    const pl = marketValue - cost;
    const plPct = cost > 0 ? (pl / cost) * 100 : 0;
    return { cost, marketValue, pl, plPct };
  }, [rows]);

  if (rows.length === 0) return null;

  const sorted = [...rows].sort((a, b) => b.marketValue - a.marketValue);
  const positive = totals.pl >= 0;

  return (
    <section className="portfolio-tracker card">
      <div className="portfolio-head">
        <div>
          <p className="summary-eyebrow">PORTOFOLIO</p>
          <h3 className="chart-title">
            <Briefcase size={16} /> Posisi &amp; laba/rugi
          </h3>
        </div>
        <span className="portfolio-count">{rows.length} posisi</span>
      </div>

      <div className="portfolio-totals">
        <div className="portfolio-total-item">
          <span className="portfolio-total-label">
            <Wallet size={13} /> Modal
          </span>
          <strong>Rp {fmtRp(totals.cost)}</strong>
        </div>
        <div className="portfolio-total-item">
          <span className="portfolio-total-label">
            <TrendingUp size={13} /> Nilai sekarang
          </span>
          <strong>Rp {fmtRp(totals.marketValue)}</strong>
        </div>
        <div className={`portfolio-total-item portfolio-total-pl ${positive ? "summary-positive" : "summary-negative"}`}>
          <span className="portfolio-total-label">
            {positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />} Laba/Rugi
          </span>
          <strong>
            {positive ? "+" : "−"}Rp {fmtRp(Math.abs(totals.pl))}
            <em> ({fmtPct(totals.plPct)})</em>
          </strong>
        </div>
      </div>

      <div className="portfolio-table-wrap">
        <table className="portfolio-table">
          <thead>
            <tr>
              <th scope="col">Saham</th>
              <th scope="col">Lot</th>
              <th scope="col">Harga beli</th>
              <th scope="col">Harga kini</th>
              <th scope="col">Modal</th>
              <th scope="col">Nilai</th>
              <th scope="col">P/L</th>
              <th scope="col">Alokasi</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const alloc = totals.marketValue > 0 ? (row.marketValue / totals.marketValue) * 100 : 0;
              const up = row.pl >= 0;
              return (
                <tr key={row.id}>
                  <th scope="row">
                    <button type="button" className="portfolio-symbol" onClick={() => onOpen?.(row.id)}>
                      {row.name}
                    </button>
                  </th>
                  <td>{fmtRp(row.lots)}</td>
                  <td>Rp {fmtRp(row.buyPrice)}</td>
                  <td>Rp {fmtRp(row.lastPrice)}</td>
                  <td>Rp {fmtRp(row.cost)}</td>
                  <td>Rp {fmtRp(row.marketValue)}</td>
                  <td className={up ? "summary-positive" : "summary-negative"}>
                    {up ? "+" : "−"}Rp {fmtRp(Math.abs(row.pl))}
                    <em className="portfolio-pl-pct"> {fmtPct(row.plPct)}</em>
                  </td>
                  <td>
                    <span className="portfolio-alloc">
                      <span className="portfolio-alloc-bar" style={{ width: `${alloc}%` }} />
                      <span className="portfolio-alloc-num">{alloc.toFixed(1)}%</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="section-subtitle portfolio-note">
        Isi jumlah lot &amp; harga beli pada form tiap saham untuk melacak P/L. 1 lot = 100 lembar.
        Bukan rekomendasi jual/beli.
      </p>
    </section>
  );
}
