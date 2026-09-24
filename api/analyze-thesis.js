const MAX_THESIS_LENGTH = 2000;

function jsonResponse(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8").send(JSON.stringify(payload));
}

function isFiniteOrNull(value) {
  return value === null || value === undefined || (typeof value === "number" && Number.isFinite(value));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return jsonResponse(res, 405, { error: "Metode tidak didukung." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return jsonResponse(res, 503, { error: "Layanan AI belum dikonfigurasi. Tambahkan OPENAI_API_KEY pada environment Vercel." });

  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!token || !supabaseUrl || !supabaseAnonKey) return jsonResponse(res, 401, { error: "Silakan login untuk menggunakan analisis AI." });

  try {
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${token}` },
    });
    if (!authResponse.ok) return jsonResponse(res, 401, { error: "Sesi login tidak valid atau sudah berakhir. Silakan login kembali." });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const stock = body?.stock;
    if (!stock || typeof stock !== "object") return jsonResponse(res, 400, { error: "Data saham tidak valid." });
    if (typeof stock.name !== "string" || stock.name.length > 120) return jsonResponse(res, 400, { error: "Nama saham tidak valid." });
    if (typeof stock.thesis !== "string" || stock.thesis.length > MAX_THESIS_LENGTH) return jsonResponse(res, 400, { error: "Tesis maksimal 2.000 karakter." });
    if (stock.valuation !== null && stock.valuation !== undefined) {
      const numericFields = ["eps", "bvps", "fairValuePer", "fairValuePbv", "averagePrice", "mosPrice"];
      if (numericFields.some((key) => !isFiniteOrNull(stock.valuation[key]))) return jsonResponse(res, 400, { error: "Angka valuasi tidak valid." });
    }

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 900,
        messages: [
          {
            role: "system",
            content: "Anda adalah asisten riset ekuitas berbahasa Indonesia. Tinjau tesis secara kritis dan seimbang, bukan memberi rekomendasi beli/jual. Gunakan hanya data yang disediakan; jangan mengarang fakta, berita, laporan keuangan, atau data pasar eksternal. Sebutkan keterbatasan data manual. Berikan ringkasan tesis, poin yang kuat, risiko/kontra-argumen, asumsi yang perlu diverifikasi, dan pertanyaan lanjutan. Tekankan bahwa PER/PBV adalah pendekatan sederhana, bukan kepastian nilai intrinsik. Gunakan Markdown ringkas.",
          },
          { role: "user", content: `Tinjau tesis saham berikut menggunakan hanya data yang disertakan.\n${JSON.stringify(stock)}` },
        ],
      }),
    });
    const result = await aiResponse.json().catch(() => ({}));
    if (!aiResponse.ok) {
      const message = aiResponse.status === 429
        ? "Batas penggunaan AI sedang tercapai. Coba lagi beberapa saat."
        : "Penyedia AI gagal memproses permintaan. Coba lagi nanti.";
      return jsonResponse(res, aiResponse.status === 429 ? 429 : 502, { error: message });
    }
    const analysis = result.choices?.[0]?.message?.content?.trim();
    if (!analysis) return jsonResponse(res, 502, { error: "AI tidak mengembalikan analisis." });
    return jsonResponse(res, 200, { analysis });
  } catch {
    return jsonResponse(res, 502, { error: "Tidak dapat menghubungi layanan AI. Coba lagi nanti." });
  }
}
