// Export rangkuman saham sebagai JPG — render manual ke Canvas
export async function exportSummaryAsJPG(stockData, filename = "stock-summary.jpg") {
  try {
    const { stock, scenario, currentPrice } = stockData;

    const W = 600;
    const H = 400;
    const canvas = document.createElement("canvas");
    canvas.width = W * 2;
    canvas.height = H * 2;
    const ctx = canvas.getContext("2d");
    ctx.scale(2, 2);

    const fmt = (n) => "Rp " + new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);
    const upside = currentPrice > 0 ? ((scenario.averagePrice - currentPrice) / currentPrice) * 100 : null;
    const date = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

    // BG
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, W, H);

    // Top accent bar
    ctx.fillStyle = "#2f81f7";
    ctx.fillRect(0, 0, W, 5);

    // App label
    ctx.fillStyle = "#8b949e";
    ctx.font = "11px Arial";
    ctx.textAlign = "left";
    ctx.fillText("AVERAGE PRICE CALCULATOR", 24, 28);

    // Date
    ctx.textAlign = "right";
    ctx.fillText(date, W - 24, 28);

    // Stock name
    ctx.fillStyle = "#e6edf3";
    ctx.font = "bold 34px Arial";
    ctx.textAlign = "left";
    ctx.fillText(stock.name, 24, 72);

    // Divider
    ctx.strokeStyle = "#30363d";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(24, 84);
    ctx.lineTo(W - 24, 84);
    ctx.stroke();

    // Row 1: Harga sekarang + Target
    const row1y = 120;
    // Harga sekarang
    ctx.fillStyle = "#8b949e";
    ctx.font = "11px Arial";
    ctx.textAlign = "left";
    ctx.fillText("HARGA SEKARANG", 24, row1y - 16);
    ctx.fillStyle = "#e6edf3";
    ctx.font = "bold 22px Arial";
    ctx.fillText(currentPrice > 0 ? fmt(currentPrice) : "—", 24, row1y + 8);

    // Target harga wajar
    ctx.fillStyle = "#8b949e";
    ctx.font = "11px Arial";
    ctx.fillText("TARGET HARGA WAJAR", W / 2, row1y - 16);
    ctx.fillStyle = "#2f81f7";
    ctx.font = "bold 22px Arial";
    ctx.fillText(fmt(scenario.averagePrice), W / 2, row1y + 8);

    // Upside
    if (upside !== null) {
      const upsideText = (upside >= 0 ? "+" : "") + upside.toFixed(1) + "%";
      ctx.fillStyle = upside >= 0 ? "#3fb950" : "#f85149";
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "right";
      ctx.fillText(upsideText, W - 24, row1y + 8);
      ctx.fillStyle = "#8b949e";
      ctx.font = "11px Arial";
      ctx.fillText("POTENSI", W - 24, row1y - 16);
    }

    // Divider 2
    ctx.strokeStyle = "#30363d";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(24, row1y + 30);
    ctx.lineTo(W - 24, row1y + 30);
    ctx.stroke();

    // Row 2: PER, PBV, DCF
    const row2y = row1y + 80;
    const cols = [
      { label: "FAIR VALUE PER", value: fmt(scenario.fairValuePer) },
      { label: "FAIR VALUE PBV", value: fmt(scenario.fairValuePbv) },
      { label: "DCF PRICE", value: fmt(scenario.dcfPrice) },
    ];
    const colW = (W - 48) / 3;
    cols.forEach((col, i) => {
      const x = 24 + i * colW;
      ctx.fillStyle = "#8b949e";
      ctx.font = "11px Arial";
      ctx.textAlign = "left";
      ctx.fillText(col.label, x, row2y - 16);
      ctx.fillStyle = "#79c0ff";
      ctx.font = "bold 16px Arial";
      ctx.fillText(col.value, x, row2y + 6);
    });

    // PER x PBV assumption
    ctx.fillStyle = "#8b949e";
    ctx.font = "11px Arial";
    ctx.textAlign = "right";
    ctx.fillText(`PER ${scenario.per.toFixed(0)}× · PBV ${scenario.pbv.toFixed(2)}×`, W - 24, row2y + 6);

    // MOS (jika ada)
    if (scenario.marginOfSafety) {
      const mosY = row2y + 40;
      ctx.fillStyle = "#163356";
      ctx.fillRect(24, mosY, W - 48, 36);
      ctx.fillStyle = "#2f81f7";
      ctx.fillRect(24, mosY, 4, 36);
      ctx.fillStyle = "#8b949e";
      ctx.font = "10px Arial";
      ctx.textAlign = "left";
      ctx.fillText("MARGIN OF SAFETY", 36, mosY + 14);
      ctx.fillStyle = "#e6edf3";
      ctx.font = "bold 14px Arial";
      ctx.fillText(fmt(scenario.marginOfSafety), 36, mosY + 30);
    }

    // Footer
    ctx.fillStyle = "#8b949e";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Bukan rekomendasi investasi. Selalu lakukan analisis mandiri.", W / 2, H - 14);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    link.remove();

    return true;
  } catch (error) {
    console.error("Export JPG error:", error);
    return false;
  }
}

// Generate shareable URL dengan encoded data
export function generateShareURL(stockData) {
  try {
    const payload = {
      n: stockData.name,
      t: stockData.form.labaTTM ?? "",
      a: stockData.form.labaAnnual ?? "",
      p: stockData.form.labaProyeksi ?? "",
      e: stockData.form.ekuitas ?? "",
      s: stockData.form.sahamBeredar ?? "",
      d: stockData.form.dividen ?? "",
      h: stockData.form.hargaSaham ?? "",
      mos: stockData.form.marginOfSafety ?? "",
      per: stockData.per,
      pbv: stockData.pbv,
      cpbv: stockData.customPbv || "",
      u: stockData.unit || "miliar",
    };

    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    let binary = "";
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    const encoded = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?data=${encodeURIComponent(encoded)}`;
  } catch (error) {
    console.error("Generate share URL error:", error);
    return null;
  }
}

// Parse shareable URL
export function parseShareURL() {
  try {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("data");
    if (!encoded) return null;

    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const decoded = JSON.parse(new TextDecoder().decode(bytes));
    return {
      name: decoded.n || "Imported Stock",
      unit: decoded.u || "miliar",
      form: {
        labaTTM: decoded.t || "",
        labaAnnual: decoded.a || "",
        labaProyeksi: decoded.p || "",
        ekuitas: decoded.e || "",
        sahamBeredar: decoded.s || "",
        dividen: decoded.d || "",
        hargaSaham: decoded.h || "",
        marginOfSafety: decoded.mos || "",
      },
      per: decoded.per ?? 10,
      pbv: decoded.pbv ?? 1,
      customPbv: decoded.cpbv || "",
    };
  } catch (error) {
    console.error("Parse share URL error:", error);
    return null;
  }
}

// Copy text to clipboard
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback untuk browser lama
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    return success;
  }
}

// Format data untuk print
export function preparePrintView() {
  window.print();
}