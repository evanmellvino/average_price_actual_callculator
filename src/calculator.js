export const PER_OPTIONS = [
  { value: 10, label: "Wajar" },
  { value: 12, label: "Apresiasi Wajar" },
  { value: 15, label: "Apresiasi Maksimal" },
  { value: 17, label: "Apresiasi Supernova" },
  { value: 20, label: "Klimaks" },
  { value: 25, label: "Gak Bisa Ngomong" },
];

export const PBV_OPTIONS = [
  { value: 1, label: "Wajar" },
  { value: 1.5, label: "Apresiasi" },
  { value: 2, label: "Growth" },
  { value: 3, label: "Premium" },
  { value: 4, label: "Tinggi (custom 4–10)" },
];

export const INPUT_FIELDS = [
  "labaTTM",
  "labaAnnual",
  "labaProyeksi",
  "ekuitas",
  "sahamBeredar",
  "dividen",
];

export const EMPTY_FORM = {
  labaTTM: "",
  labaAnnual: "",
  labaProyeksi: "",
  ekuitas: "",
  sahamBeredar: "",
  dividen: "",
  hargaSaham: "",
  marginOfSafety: "",
};

// Sector presets for quick valuation context
export const SECTOR_PRESETS = {
  banking: { name: "Perbankan", defaultPer: 10, defaultPbv: 1.2 },
  consumer: { name: "Consumer", defaultPer: 15, defaultPbv: 2.0 },
  mining: { name: "Pertambangan", defaultPer: 8, defaultPbv: 0.8 },
  technology: { name: "Teknologi", defaultPer: 20, defaultPbv: 3.5 },
  property: { name: "Property", defaultPer: 12, defaultPbv: 1.5 },
  energy: { name: "Energi", defaultPer: 9, defaultPbv: 1.0 },
};

export const EXAMPLE_DATA = {
  labaTTM: 20321,
  labaAnnual: 20041,
  labaProyeksi: 21000,
  ekuitas: 165911,
  sahamBeredar: 37.3,
  dividen: 349.41,
  hargaSaham: 4500,
  per: 10,
  pbv: 1,
};

/**
 * Parse input angka Indonesia/ISO. Titik atau koma dapat menjadi desimal.
 * Nilai negatif dan karakter lain ditolak.
 */
export function parseNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  if (value === null || value === undefined) return null;

  let normalized = String(value).trim().replace(/\s/g, "");
  if (!normalized) return null;

  if (!/^\d+(?:[.,]\d*)?$/.test(normalized)) return null;
  if (/[.,]$/.test(normalized)) normalized = normalized.slice(0, -1);
  if (!normalized) return null;
  normalized = normalized.replace(",", ".");

  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function sanitizeNumericInput(value) {
  return String(value).replace(/[^\d.,]/g, "");
}

export function formatInputNumber(value) {
  if (value === null || value === undefined || value === "") return "";
  return String(value).replace(".", ",");
}

export function convertInputValue(value, fromUnit, toUnit) {
  const parsed = parseNumber(value);
  if (parsed === null || fromUnit === toUnit) return value;

  // Semua nilai dasar disimpan dalam Miliar sebagai basis perhitungan.
  const multiplier = fromUnit === "miliar" && toUnit === "juta"
    ? 1000
    : 0.001;

  return formatInputNumber(parsed * multiplier);
}

export function toBillion(value, unit) {
  const parsed = parseNumber(value);
  if (parsed === null) return null;
  return unit === "juta" ? parsed / 1000 : parsed;
}

export function getPbvValue(pbvChoice, customPbv) {
  if (pbvChoice === 4) {
    const custom = parseNumber(customPbv);
    return custom !== null && custom >= 4 && custom <= 10 ? custom : null;
  }
  return Number.isFinite(pbvChoice) && pbvChoice >= 0 ? pbvChoice : null;
}

function safeDivide(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : null;
}

// DCF Calculation: Price = Σ (Laba ÷ PER) + (Ekuitas ÷ PBV) × (1 + pertumbuhan)^{-n}
// Simplified: gunakan PER dan PBV sebagai diskon
export function calculateDCF({ eps, growth = 0.03, years = 5, wacc = 0.1, terminalGrowth = 0.02 }) {
  if (!Number.isFinite(eps) || eps <= 0 || growth <= -1 || wacc <= terminalGrowth || years < 1) return null;
  let presentValue = 0;
  for (let year = 1; year <= years; year += 1) {
    const projectedEps = eps * (1 + growth) ** year;
    presentValue += projectedEps / (1 + wacc) ** year;
  }
  const terminalEps = eps * (1 + growth) ** years;
  const terminalValue = terminalEps * (1 + terminalGrowth) / (wacc - terminalGrowth);
  return presentValue + terminalValue / (1 + wacc) ** years;
}

export function calculateScenarios({ form, unit, per, pbvChoice, customPbv }) {
  const shares = toBillion(form.sahamBeredar, unit);
  const equity = toBillion(form.ekuitas, unit);
  const dividend = toBillion(form.dividen, unit);
  const price = parseNumber(form.hargaSaham);
  const pbv = getPbvValue(pbvChoice, customPbv);
  const mos = parseNumber(form.marginOfSafety);

  if (
    !shares ||
    shares <= 0 ||
    !equity ||
    equity <= 0 ||
    pbv === null ||
    pbv < 0
  ) {
    return [];
  }

  const profitInputs = [
    { key: "ttm", label: "Laba TTM", value: form.labaTTM },
    { key: "annual", label: "Laba Annual", value: form.labaAnnual },
    { key: "projection", label: "Proyeksi", value: form.labaProyeksi },
  ];

  return profitInputs.flatMap((input) => {
    const laba = toBillion(input.value, unit);
    if (laba === null || laba <= 0) return [];

    // Rumus wajib:
    // EPS = laba / saham; BVPS = ekuitas / saham; DPS = dividen / saham.
    const eps = safeDivide(laba, shares);
    const bvps = safeDivide(equity, shares);
    const dps = safeDivide(dividend ?? 0, shares);

    // Fair Value PER = EPS × PER; Fair Value PBV = BVPS × PBV.
    const fairValuePer = eps * per;
    const fairValuePbv = bvps * pbv;

    // Average Price = (Fair Value PER + Fair Value PBV) / 2.
    const averagePrice = (fairValuePer + fairValuePbv) / 2;
    const dcfPrice = calculateDCF({ eps });

    const actualPer = price !== null ? safeDivide(price, eps) : null;
    const actualPbv = price !== null ? safeDivide(price, bvps) : null;
    const hasDividendInput = form.dividen !== "" && dividend !== null;

    // Mengikuti rumus pada spesifikasi: total dividen / harga saat ini.
    const dividendYield =
      hasDividendInput && price !== null && price > 0
        ? (dividend / price) * 100
        : null;

    const basePrice = averagePrice;
    const mosAdjusted = mos !== null ? basePrice * (1 - mos / 100) : null;

    let status = null;
    let pctDifference = null;
    if (price !== null && basePrice > 0) {
      pctDifference = ((price - basePrice) / basePrice) * 100;
      status =
        Math.abs(price - basePrice) < 0.005
          ? "balanced"
          : price < basePrice
            ? "undervalued"
            : "overvalued";
    }

    return [
      {
        key: input.key,
        label: input.label,
        laba,
        eps,
        bvps,
        dps,
        per,
        pbv,
        fairValuePer,
        fairValuePbv,
        averagePrice,
        dcfPrice,
        marginOfSafety: mosAdjusted,
        marginOfSafetyPercent: mos,
        actualPer,
        actualPbv,
        dividendYield,
        status,
        pctDifference,
      },
    ];
  });
}

export function validateForm(form, unit, pbvChoice, customPbv) {
  const errors = {};

  for (const field of INPUT_FIELDS) {
    const raw = form[field];
    if (raw !== "" && parseNumber(raw) === null) {
      errors[field] = "Masukkan angka valid, tanpa tanda minus.";
    }
  }

  if (form.hargaSaham !== "" && parseNumber(form.hargaSaham) === null) {
    errors.hargaSaham = "Masukkan harga valid, tanpa tanda minus.";
  }

  if (form.marginOfSafety !== "") {
    const margin = parseNumber(form.marginOfSafety);
    if (margin === null || margin > 100) {
      errors.marginOfSafety = "Margin of Safety harus antara 0 dan 100%.";
    }
  }

  if (form.sahamBeredar === "" || toBillion(form.sahamBeredar, unit) === 0) {
    errors.sahamBeredar = "Jumlah saham beredar wajib lebih dari 0.";
  }

  if (form.ekuitas === "" || toBillion(form.ekuitas, unit) === 0) {
    errors.ekuitas = "Total ekuitas wajib lebih dari 0.";
  }

  if (pbvChoice === 4) {
    const custom = parseNumber(customPbv);
    if (custom === null || custom < 4 || custom > 10) {
      errors.customPbv = "PBV custom harus antara 4 dan 10.";
    }
  }

  const hasInvalidProfit = ["labaTTM", "labaAnnual", "labaProyeksi"].some(
    (field) => form[field] !== "" && parseNumber(form[field]) === null,
  );
  const hasPositiveProfit = ["labaTTM", "labaAnnual", "labaProyeksi"].some(
    (field) => (toBillion(form[field], unit) ?? 0) > 0,
  );
  const canCalculate =
    hasPositiveProfit &&
    !hasInvalidProfit &&
    toBillion(form.ekuitas, unit) > 0 &&
    toBillion(form.sahamBeredar, unit) > 0 &&
    !Object.keys(errors).some((field) => !["customPbv", "marginOfSafety"].includes(field)) &&
    !errors.customPbv &&
    !errors.marginOfSafety;

  return { errors, hasProfitInput: hasPositiveProfit, canCalculate };
}
