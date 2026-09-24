import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const SERIES = [
  { key: "Fair Value PER", color: "var(--text-accent)" },
  { key: "Fair Value PBV", color: "var(--text-muted)" },
  { key: "Average Price", color: "var(--text-blue)" },
  { key: "Harga Saham", color: "var(--text-red)" },
];

const formatRp = (value) =>
  new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatAxis = (value) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}rb`;
  return String(Math.round(value));
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-title">{label}</p>
      {payload.map((item) => (
        <div className="chart-tooltip-row" key={item.dataKey}>
          <span className="chart-tooltip-name">
            <span className="chart-tooltip-dot" style={{ backgroundColor: item.color }} />
            {item.name}
          </span>
          <strong>Rp {formatRp(item.value)}</strong>
        </div>
      ))}
    </div>
  );
}

export function ComparisonChart({ scenarios, currentPrice }) {
  const chartData = scenarios.map((scenario) => ({
    name: scenario.label,
    "Fair Value PER": scenario.fairValuePer,
    "Fair Value PBV": scenario.fairValuePbv,
    "Average Price": scenario.averagePrice,
    "Harga Saham": currentPrice > 0 ? currentPrice : null,
  }));

  return (
    <section className="chart-card" aria-label="Diagram perbandingan harga saham">
      <div className="chart-heading">
        <div>
          <h3 className="chart-title">Perbandingan Valuasi</h3>
          <p className="chart-subtitle">Nilai wajar per saham berdasarkan tiap skenario laba</p>
        </div>
        <span className="chart-unit">Rupiah / saham</span>
      </div>

      <div className="chart-legend" aria-label="Legenda diagram">
        {SERIES.map((series) => (
          <span className="chart-legend-item" key={series.key}>
            <span className="chart-legend-swatch" style={{ backgroundColor: series.color }} />
            {series.key}
          </span>
        ))}
      </div>

      <div className="chart-plot">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 18, right: 12, left: 4, bottom: 4 }} barGap={5}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--text-muted)", fontSize: 12, fontWeight: 600 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={54}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              tickFormatter={formatAxis}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--chart-cursor)" }} />
            {currentPrice > 0 && (
              <ReferenceLine
                y={currentPrice}
                stroke="var(--text-red)"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{ value: `Market Rp ${formatRp(currentPrice)}`, position: "insideTopRight", fill: "var(--text-red)", fontSize: 11 }}
              />
            )}
            {SERIES.map((series) => (
              <Bar
                key={series.key}
                dataKey={series.key}
                name={series.key}
                fill={series.color}
                radius={[5, 5, 0, 0]}
                maxBarSize={30}
                isAnimationActive
                animationDuration={500}
              >
                {chartData.map((row) => (
                  <Cell key={`${series.key}-${row.name}`} fill={series.color} />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="chart-footnote">Garis putus-putus menunjukkan harga saham saat ini.</p>
    </section>
  );
}
