import html2canvas from "html2canvas";

// Export hasil sebagai gambar PNG
export async function exportAsPNG(elementId, filename = "stock-valuation.png") {
  try {
    const element = document.getElementById(elementId);
    if (!element) throw new Error("Element not found");

    const canvas = await html2canvas(element, {
      backgroundColor: getComputedStyle(element).getPropertyValue("--page-elevated").trim() || "#ffffff",
      scale: 2,
      logging: false,
    });

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    link.remove();

    return true;
  } catch (error) {
    console.error("Export PNG error:", error);
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
