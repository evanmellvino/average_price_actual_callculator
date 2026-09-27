// Export rangkuman saham sebagai JPG — render manual ke Canvas
export async function exportSummaryAsJPG(stockData, filename = "stock-summary.jpg") {
  try {
    const { stock, scenario, currentPrice } = stockData;

    const W = 800;
    const H = 480;
    const canvas = document.createElement("canvas");
    canvas.width = W * 2;
    canvas.height = H * 2;
    const ctx = canvas.getContext("2d");
    ctx.scale(2, 2);

    const fmt = (n) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);
    const upside = currentPrice > 0 ? ((scenario.averagePrice - currentPrice) / currentPrice) * 100 : 0;
    const isPositive = upside >= 0;
    const date = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

    // Background
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, W, H);

    // Border
    ctx.strokeStyle = "#30363d";
    ctx.lineWidth = 1;
    ctx.roundRect(2, 2, W - 4, H - 4, 16);
    ctx.stroke();

    // Header bar
    ctx.fillStyle = "#161b22";
    ctx.roundRect(0, 0, W, 60, [16, 16, 0, 0]);
    ctx.fill();

    // Brand circle
    ctx.fillStyle = "#2f81f7";
    ctx.beginPath();
    ctx.arc(36, 30, 18, 0, Math.PI * 2);
    ctx.fill();

    // Brand letter
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.fillText("A", 36, 36);

    // App name
    ctx.fillStyle = "#e6edf3";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "left";
    ctx.fillText("Average Price Calculator", 62, 26);
    ctx.fillStyle = "#8b949e";
    ctx.font = "11px Arial";
    ctx.fillText("Analisis valuasi saham", 62, 42);

    // Date
    ctx.fillStyle = "#8b949e";
    ctx.font = "11px Arial";
    ctx.textAlign = "right";
    ctx.fillText(date, W - 20, 34);

    // Separator
    ctx.strokeStyle = "#30363d";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, 60);
    ctx.lineTo(W - 20, 60);
    ctx.stroke();

    // Stock name
    ctx.fillStyle = "#e6edf3";
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "left";
    ctx.fillText(stock.name, 24, 100);

    // Metric boxes
    const metrics = [
      { label: "Harga Sekarang", value: `Rp ${fmt(currentPrice)}`, color: "#e6edf3", bg: "#161b22" },
      { label: "Target Harga Wajar", value: `Rp ${fmt(scenario.averagePrice)}`, color: "#2f81f7", bg: "#1a2535" },
      { label: "Potensi", value: `${upside >= 0 ? "+" : ""}${upside.toFixed(1)}%`, color: isPositive ? "#3fb950" : "#f85149", bg: "#161b22" },
      { label: "PER / PBV", value: `${scenario.per.toFixed(1)}x / ${scenario.pbv.toFixed(2)}x`, color: "#e6edf3", bg: "#161b22" },
    ];

    const boxW = (W - 48 - 3 * 12) / 4;
    metrics.forEach((m, i) => {
      const x = 24 + i * (boxW + 12);
      const y = 118;
      ctx.fillStyle = m.bg;
      ctx.roundRect(x, y, boxW, 80, 10);
      ctx.fill();
      ctx.strokeStyle = i === 1 ? "#2f81f7" : "#30363d";
      ctx.lineWidth = 1;
      ctx.roundRect(x, y, boxW, 80, 10);
      ctx.stroke();

      ctx.fillStyle = "#8b949e";
      ctx.font = "10px Arial";
      ctx.textAlign = "left";
      ctx.fillText(m.label, x + 10, y + 20);

      ctx.fillStyle = m.color;
      ctx.font = "bold 15px Arial";
      ctx.fillText(m.value, x + 10, y + 52);
    });

    // Breakdown row
    const bItems = [
      { label: "Fair Value PER", value: `Rp ${fmt(scenario.fairValuePer)}` },
      { label: "Fair Value PBV", value: `Rp ${fmt(scenario.fairValuePbv)}` },
      { label: "DCF Price", value: `Rp ${fmt(scenario.dcfPrice)}` },
    ];
    const bW = (W - 48 - 2 * 12) / 3;
    bItems.forEach((b, i) => {
      const x = 24 + i * (bW + 12);
      const y = 218;
      ctx.fillStyle = "#161b22";
      ctx.roundRect(x, y, bW, 60, 8);
      ctx.fill();
      ctx.strokeStyle = "#30363d";
      ctx.lineWidth = 1;
      ctx.roundRect(x, y, bW, 60, 8);
      ctx.stroke();

      ctx.fillStyle = "#8b949e";
      ctx.font = "10px Arial";
      ctx.textAlign = "left";
      ctx.fillText(b.label, x + 10, y + 18);

      ctx.fillStyle = "#79c0ff";
      ctx.font = "bold 13px Arial";
      ctx.fillText(b.value, x + 10, y + 42);
    });

    // MOS
    if (scenario.marginOfSafety) {
      ctx.fillStyle = "#1a2535";
      ctx.roundRect(24, 294, W - 48, 50, 8);
      ctx.fill();
      ctx.strokeStyle = "#2f81f7";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(24, 302);
      ctx.lineTo(24, 336);
      ctx.stroke();

      ctx.fillStyle = "#8b949e";
      ctx.font = "10px Arial";
      ctx.textAlign = "left";
      ctx.fillText("Margin of Safety", 36, 312);

      ctx.fillStyle = "#2f81f7";
      ctx.font = "bold 15px Arial";
      ctx.fillText(`Rp ${fmt(scenario.marginOfSafety)}`, 36, 332);
    }

    // Footer
    ctx.fillStyle = "#30363d";
    ctx.fillRect(20, H - 42, W - 40, 1);
    ctx.fillStyle = "#8b949e";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Bukan rekomendasi jual/beli. Selalu lakukan analisis mandiri sebelum berinvestasi.", W / 2, H - 18);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
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
