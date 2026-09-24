// Mock IDX API — real implementation butuh API key dari IDX/Yahoo Finance
// Untuk demo: return mock data atau redirect ke actual API

const SECTOR_PRESETS = {
  banking: {
    name: "Perbankan",
    defaultPer: 10,
    defaultPbv: 1.2,
    description: "Sektor Perbankan — Stabilitas tinggi, pertumbuhan moderat",
  },
  consumer: {
    name: "Consumer",
    defaultPer: 15,
    defaultPbv: 2.0,
    description: "Sektor Konsumer — Growth moderat, margin sehat",
  },
  mining: {
    name: "Pertambangan",
    defaultPer: 8,
    defaultPbv: 0.8,
    description: "Sektor Pertambangan — Siklikal, valuasi rendah",
  },
  technology: {
    name: "Teknologi",
    defaultPer: 20,
    defaultPbv: 3.5,
    description: "Sektor Teknologi — Growth tinggi, PER premium",
  },
  property: {
    name: "Property",
    defaultPer: 12,
    defaultPbv: 1.5,
    description: "Sektor Property — Siklus real estate",
  },
  energy: {
    name: "Energi",
    defaultPer: 9,
    defaultPbv: 1.0,
    description: "Sektor Energi — Komersial, valuasi rendah",
  },
};

// Fetch stock data dari IDX API (mock)
export async function fetchStockData(_ticker) {
  try {
    // Real implementation: fetch from IDX API / Yahoo Finance
    // const response = await fetch(`https://api.example.com/stock/${ticker}`);
    
    // Mock: return placeholder
    return null;
  } catch (error) {
    console.error("Fetch stock error:", error);
    return null;
  }
}

// Get sector preset
export function getSectorPreset(sector) {
  return SECTOR_PRESETS[sector] || null;
}

// Get all sectors
export function getAllSectors() {
  return Object.entries(SECTOR_PRESETS).map(([key, value]) => ({
    id: key,
    ...value,
  }));
}

// Validate ticker format (IDX: 4 chars uppercase)
export function isValidIdxTicker(ticker) {
  return /^[A-Z]{4}$/.test(String(ticker).toUpperCase());
}

// Format ticker
export function formatTicker(ticker) {
  return String(ticker).toUpperCase().substring(0, 4);
}
