import { useState, useMemo, useCallback, useEffect } from "react";
import { Calculator, RefreshCw, FileText, Sun, Moon, TrendingUp, Plus, Trash2, Copy, Share2, Download, HelpCircle, History, BookmarkPlus } from "lucide-react";
import { useStore } from "./store.js";
import { EXAMPLE_DATA, parseNumber, validateForm, calculateScenarios, SECTOR_PRESETS } from "./calculator.js";
import { generateShareURL, parseShareURL, copyToClipboard, exportAsPNG } from "./exportUtils.js";
import { UnitSwitcher } from "./components/UnitSwitcher.jsx";
import { NumericField } from "./components/NumericField.jsx";
import { PerPbvSelector } from "./components/PerPbvSelector.jsx";
import { ResultCard } from "./components/ResultCard.jsx";
import { ComparisonChart } from "./components/ComparisonChart.jsx";
import { HistoryPanel } from "./components/HistoryPanel.jsx";
import { AuthScreen } from "./components/AuthScreen.jsx";
import { hasSupabaseConfig, supabase } from "./lib/supabase.js";
import "./index.css";

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(!hasSupabaseConfig);
  const [authNotice, setAuthNotice] = useState("");
  const [loadedUserId, setLoadedUserId] = useState(null);
  // Global state
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const stocks = useStore((s) => s.stocks);
  const history = useStore((s) => s.history ?? []);
  const saveHistorySnapshot = useStore((s) => s.saveHistorySnapshot);
  const removeHistorySnapshot = useStore((s) => s.removeHistorySnapshot);
  const replaceUserData = useStore((s) => s.replaceUserData);
  const clearUserData = useStore((s) => s.clearUserData);
  const activeStockId = useStore((s) => s.activeStockId);
  const addStock = useStore((s) => s.addStock);
  const setActiveStock = useStore((s) => s.setActiveStock);
  const deleteStock = useStore((s) => s.deleteStock);
  const duplicateStock = useStore((s) => s.duplicateStock);
  const renameStock = useStore((s) => s.renameStock);
  const updateStock = useStore((s) => s.updateStock);
  const updateStockForm = useStore((s) => s.updateStockForm);
  const updateStockUnit = useStore((s) => s.updateStockUnit);
  const updateStockPer = useStore((s) => s.updateStockPer);
  const updateStockPbv = useStore((s) => s.updateStockPbv);
  const updateStockCustomPbv = useStore((s) => s.updateStockCustomPbv);

  // Local state
  const [editingName, setEditingName] = useState(null);
  const [editNameValue, setEditNameValue] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [sectorByStock, setSectorByStock] = useState({});
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyNotice, setHistoryNotice] = useState("");

  useEffect(() => {
    if (!hasSupabaseConfig) {
      return undefined;
    }
    let alive = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error) setAuthNotice(error.message);
      setSession(data.session);
      setAuthReady(true);
      if (!data.session) setLoadedUserId(null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
      if (!nextSession) setLoadedUserId(null);
      if (!nextSession) {
        clearUserData();
        setLoadedUserId(null);
      }
    });
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [clearUserData]);

  useEffect(() => {
    if (!session?.user?.id || !supabase) return undefined;
    let alive = true;
    Promise.all([
      supabase.from("user_stocks").select("id,name,data,created_at,updated_at").eq("user_id", session.user.id),
      supabase.from("calculation_history").select("id,stock_id,stock_name,snapshot,created_at").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(100),
    ]).then(async ([stocksResult, historyResult]) => {
      if (!alive) return;
      if (stocksResult.error || historyResult.error) {
        setAuthNotice(`Gagal memuat data akun: ${stocksResult.error?.message || historyResult.error?.message}`);
        return;
      }
      const cloudStocks = (stocksResult.data ?? []).map((row) => ({ ...row.data, id: row.id, name: row.name }));
      const cloudHistory = (historyResult.data ?? []).map((row) => ({ ...row.snapshot, id: row.id, stockId: row.stock_id, stockName: row.stock_name, createdAt: row.created_at }));
      const localStocks = useStore.getState().stocks;
      const localHistory = useStore.getState().history ?? [];
      if (cloudHistory.length === 0 && localHistory.length === 0) {
        setAuthNotice("Belum ada riwayat tersimpan. Hitung saham, lalu tekan ‘Simpan riwayat’.");
      } else {
        setAuthNotice("");
      }
      replaceUserData({
        stocks: cloudStocks.length ? cloudStocks : localStocks,
        history: cloudHistory.length ? cloudHistory : localHistory,
      });
      if (cloudStocks.length === 0 && localStocks.length > 0) {
        const { error: importError } = await supabase.from("user_stocks").upsert(
          localStocks.map((stock) => ({
            id: stock.id,
            user_id: session.user.id,
            name: stock.name,
            data: { ...stock, id: undefined, name: undefined },
            updated_at: new Date().toISOString(),
          })),
          { onConflict: "id" },
        );
        if (importError) setAuthNotice(`Gagal memindahkan data lokal ke akun: ${importError.message}`);
      }
    if (cloudHistory.length === 0 && localHistory.length > 0) {
        const { error: importHistoryError } = await supabase.from("calculation_history").insert(
        localHistory.map((item) => ({
            id: globalThis.crypto?.randomUUID?.(),
            user_id: session.user.id,
            stock_id: null,
            stock_name: item.stockName,
            snapshot: item,
            created_at: item.createdAt,
          })),
        );
        if (importHistoryError) setAuthNotice(`Gagal memindahkan riwayat lokal: ${importHistoryError.message}`);
        else {
          const { data: importedHistory } = await supabase.from("calculation_history").select("id,stock_id,stock_name,snapshot,created_at").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(100);
          if (importedHistory) {
            replaceUserData({
              stocks: cloudStocks.length ? cloudStocks : localStocks,
              history: importedHistory.map((row) => ({ ...row.snapshot, id: row.id, stockId: row.stock_id, stockName: row.stock_name, createdAt: row.created_at })),
            });
          }
        }
      }
      setLoadedUserId(session.user.id);
    });
    return () => { alive = false; };
  }, [session?.user?.id, replaceUserData]);

  useEffect(() => {
    if (!session?.user?.id || loadedUserId !== session.user.id || !supabase) return;
    const timer = window.setTimeout(async () => {
      let hasSyncError = false;
      const { data: existingRows, error: selectError } = await supabase
        .from("user_stocks")
        .select("id")
        .eq("user_id", session.user.id);
      if (selectError) {
        hasSyncError = true;
        setAuthNotice(`Gagal menyinkronkan data: ${selectError.message}`);
        return;
      }
      const localIds = new Set(stocks.map((stock) => stock.id));
      const removedIds = (existingRows ?? []).map((row) => row.id).filter((id) => !localIds.has(id));
      if (removedIds.length) {
        const { error: deleteError } = await supabase.from("user_stocks").delete().in("id", removedIds).eq("user_id", session.user.id);
        if (deleteError) {
          hasSyncError = true;
          setAuthNotice(`Gagal menghapus saham cloud: ${deleteError.message}`);
          return;
        }
      }
      if (stocks.length === 0) return;
      const { error } = await supabase.from("user_stocks").upsert(
        stocks.map((stock) => ({
          id: stock.id,
          user_id: session.user.id,
          name: stock.name,
          data: { ...stock, id: undefined, name: undefined },
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "id" },
      );
      if (error) {
        hasSyncError = true;
        setAuthNotice(`Gagal menyimpan saham: ${error.message}`);
      }
      if (!hasSyncError) setAuthNotice("");
    }, 700);
    return () => window.clearTimeout(timer);
  }, [stocks, session?.user?.id, loadedUserId]);

  const activeStock = stocks.find((s) => s.id === activeStockId);
  const selectedSector = activeStock ? sectorByStock[activeStock.id] ?? "" : "";

  useEffect(() => {
    const sharedStock = parseShareURL();
    if (!sharedStock) return;
    const id = addStock();
    updateStock(id, sharedStock);
    window.history.replaceState({}, "", window.location.pathname);
  }, [addStock, updateStock]);

  // Load example BBNI
  const loadExample = useCallback(() => {
    const id = activeStock ? activeStockId : addStock();
    updateStock(id, {
      name: "BBNI (Contoh)",
      form: {
        labaTTM: String(EXAMPLE_DATA.labaTTM),
        labaAnnual: String(EXAMPLE_DATA.labaAnnual),
        labaProyeksi: String(EXAMPLE_DATA.labaProyeksi),
        ekuitas: String(EXAMPLE_DATA.ekuitas),
        sahamBeredar: String(EXAMPLE_DATA.sahamBeredar),
        dividen: String(EXAMPLE_DATA.dividen),
        hargaSaham: String(EXAMPLE_DATA.hargaSaham),
        marginOfSafety: "",
      },
      per: EXAMPLE_DATA.per,
      pbv: EXAMPLE_DATA.pbv,
      customPbv: "",
    });
  }, [activeStock, addStock, activeStockId, updateStock]);

  // Reset active stock
  const resetActive = useCallback(() => {
    if (activeStock) {
      updateStock(activeStockId, {
        form: {
          labaTTM: "",
          labaAnnual: "",
          labaProyeksi: "",
          ekuitas: "",
          sahamBeredar: "",
          dividen: "",
          hargaSaham: "",
          marginOfSafety: "",
        },
        per: 10,
        pbv: 1,
        customPbv: "",
      });
    }
  }, [activeStock, activeStockId, updateStock]);

  // Calculate active stock
  const { scenarios, errors, canCalculate } = useMemo(() => {
    if (!activeStock) return { scenarios: [], errors: {}, canCalculate: false };
    const customPbvMode = Number(activeStock.pbv) === 4;
    const rawPbv = Number(activeStock.pbv);
    const validationPbvChoice = customPbvMode || rawPbv < 1 || rawPbv > 3 ? 4 : rawPbv;
    const validationCustomPbv = customPbvMode ? activeStock.customPbv : String(rawPbv);
    const { errors, canCalculate } = validateForm(
      activeStock.form,
      activeStock.unit,
      validationPbvChoice,
      validationCustomPbv
    );
    const calculationPbv = customPbvMode || rawPbv < 1 || rawPbv > 3 ? 4 : rawPbv;
    const calculationCustomPbv = customPbvMode ? activeStock.customPbv : String(rawPbv);
    const scenarios = calculateScenarios({
      form: activeStock.form,
      unit: activeStock.unit ?? "miliar",
      per: Number(activeStock.per) || 10,
      pbvChoice: calculationPbv,
      customPbv: calculationCustomPbv,
    });
    return { scenarios, errors, canCalculate };
  }, [activeStock]);

  const currentPrice = activeStock ? parseNumber(activeStock.form.hargaSaham) || 0 : 0;
  const saveActiveHistory = useCallback(() => {
    if (!activeStock || !scenarios[0]) return;
    const scenario = scenarios[0];
    const localId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const snapshot = {
      id: localId,
      stockId: activeStock.id,
      stockName: activeStock.name,
      createdAt: new Date().toISOString(),
      scenarioLabel: scenario.label,
      averagePrice: scenario.averagePrice,
      currentPrice,
      mosPrice: scenario.marginOfSafety,
      per: scenario.per,
      pbv: scenario.pbv,
    };
    saveHistorySnapshot(snapshot);
    if (supabase && session?.user?.id) {
      supabase.from("calculation_history").insert({
        id: localId,
        user_id: session.user.id,
        stock_id: activeStock.id,
        stock_name: activeStock.name,
        snapshot,
        created_at: snapshot.createdAt,
      }).select("id,stock_id,stock_name,snapshot,created_at").single().then(({ data, error }) => {
        if (error) setHistoryNotice(`Riwayat lokal tersimpan, tetapi cloud gagal: ${error.message}`);
        else {
          useStore.getState().removeHistorySnapshot(localId);
          useStore.getState().saveHistorySnapshot({ ...data.snapshot, id: data.id, stockId: data.stock_id, stockName: data.stock_name, createdAt: data.created_at });
          setHistoryNotice("Hasil tersimpan di akun Anda.");
        }
      });
    } else {
      setHistoryNotice("Hasil tersimpan lokal di perangkat ini.");
    }
    window.setTimeout(() => setHistoryNotice(""), 5000);
  }, [activeStock, scenarios, saveHistorySnapshot, currentPrice, session]);
  const summaryScenario = scenarios[0];
  const marketComparison = summaryScenario && currentPrice > 0
    ? {
        difference: currentPrice - summaryScenario.averagePrice,
        upsidePercent: ((summaryScenario.averagePrice - currentPrice) / currentPrice) * 100,
        mosPercent: ((summaryScenario.averagePrice - currentPrice) / summaryScenario.averagePrice) * 100,
        status: currentPrice < summaryScenario.averagePrice ? "Di bawah nilai wajar" : currentPrice > summaryScenario.averagePrice ? "Di atas nilai wajar" : "Setara nilai wajar",
      }
    : null;

  const formatCurrency = (value) => new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 2,
  }).format(value || 0);

  // Share handler
  const handleShare = useCallback(() => {
    if (!activeStock) return;
    const url = generateShareURL(activeStock);
    if (!url) {
      setShareMessage("Tidak dapat membuat tautan share.");
      return;
    }
    setShareLink(url);
    copyToClipboard(url).then((success) => {
      setShareMessage(success ? "Link berhasil disalin." : "Link dibuat. Salin dari kolom di bawah.");
    });
  }, [activeStock]);

  // Export handler
  const handleExport = useCallback(() => {
    if (!activeStock) return;
    exportAsPNG("results-container", `${activeStock.name}.png`);
  }, [activeStock]);

  // Rename handler
  const startRename = (id, currentName) => {
    setEditingName(id);
    setEditNameValue(currentName);
  };

  const finishRename = (id) => {
    if (editNameValue.trim()) {
      renameStock(id, editNameValue.trim());
    }
    setEditingName(null);
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setAuthNotice(error.message);
  };

  if (!authReady) {
    return <main className="auth-page"><div className="auth-loading">Memeriksa sesi akun...</div></main>;
  }
  if (!hasSupabaseConfig) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-brand-icon"><Calculator size={25} /></div>
          <p className="summary-eyebrow">KONFIGURASI DIPERLUKAN</p>
          <h1>Hubungkan Supabase</h1>
          <p className="auth-description">Buat file <code>.env.local</code> di <code>C:\calculator\app</code> dan isi URL serta anon/publishable key project Anda. Setelah itu jalankan file <code>supabase/schema.sql</code> di SQL Editor Supabase, lalu restart server.</p>
        </section>
      </main>
    );
  }
  if (!session) {
    return <AuthScreen supabase={supabase} notice={authNotice} onDismissNotice={() => setAuthNotice("")} />;
  }
  if (!session || loadedUserId !== session.user.id) {
    return <main className="auth-page"><div className="auth-loading">Memuat data akun...</div></main>;
  }

  return (
    <div className={`app-shell theme-${theme}`}>
      {/* Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-icon">
              <Calculator size={20} />
            </div>
            <div>
              <h1 className="brand-title">Average Price Calculator</h1>
              <p className="brand-subtitle">Kalkulator Harga Wajar Saham — Metode PER & PBV</p>
            </div>
          </div>
          <div className="header-actions">
            <span className="account-email">{session.user.email}</span>
            <button type="button" className="action-btn-secondary signout-btn" onClick={handleSignOut}>Keluar</button>
            <button
              type="button"
              className="header-btn"
              title="Panduan singkat"
              onClick={() => setTutorialOpen(true)}
            >
              <HelpCircle size={18} />
            </button>
            <button
              type="button"
              className="header-btn"
              onClick={toggleTheme}
              aria-label={`Ganti tema ke ${theme === "dark" ? "terang" : "gelap"}`}
            >
              {theme === "dark" ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-gray-700" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container-main">
        {/* Disclaimer */}
        <div className="disclaimer">
          <p className="font-semibold mb-1">⚠️ Disclaimer</p>
          <p>
            Bukan ajakan jual/beli saham. Keputusan dan risiko sepenuhnya di tangan Anda.
            Selalu lakukan analisis mandiri. Investasi saham memiliki risiko tinggi.
          </p>
        </div>

        {/* Stock Tabs */}
        {authNotice && <p className="auth-notice global-auth-notice" role="status">{authNotice}</p>}
        <div className="stock-tabs">
          <div className="tabs-scroll">
      {stocks.map((stock) => (
              <div key={stock.id} className={`stock-tab ${activeStockId === stock.id ? "active" : ""}`}>
                <button
                  type="button"
                  onClick={() => setActiveStock(stock.id)}
                  className="tab-label"
                >
                  {stock.name}
                </button>
                <div className="tab-actions">
                  <button
                    type="button"
                    title="Rename"
                    onClick={() => startRename(stock.id, stock.name)}
                    className="tab-icon"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    title="Duplicate"
                    onClick={() => duplicateStock(stock.id)}
                    className="tab-icon"
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    type="button"
                    title="Delete"
                    onClick={() => deleteStock(stock.id)}
                    className="tab-icon danger"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="stock-tabs-actions">
            <button type="button" onClick={addStock} className="action-btn" title="Add new stock">
              <Plus size={16} />
              <span className="hidden sm:inline">Stock Baru</span>
            </button>
            <button type="button" onClick={() => setHistoryOpen((open) => !open)} className="action-btn-secondary" title="Lihat riwayat">
              <History size={16} />
              <span>Riwayat ({history.length})</span>
            </button>
          </div>
        </div>

        {historyOpen && <HistoryPanel history={history} onDelete={async (id) => {
          const { error } = await supabase.from("calculation_history").delete().eq("id", id).eq("user_id", session.user.id);
          if (error) {
            setHistoryNotice(`Gagal menghapus riwayat: ${error.message}`);
            return;
          }
          removeHistorySnapshot(id);
        }} />}

        {/* Rename Modal */}
        {editingName && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Rename Stock</h3>
              <input
                type="text"
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                className="input-field"
                placeholder="New name..."
              />
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => finishRename(editingName)}
                  className="action-btn"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingName(null)}
                  className="action-btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {!activeStock ? (
          <div className="card p-8 text-center">
            <Calculator size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-muted">Tambahkan stock baru untuk mulai kalkulasi.</p>
            <button
              type="button"
              onClick={addStock}
              className="action-btn mt-4"
            >
              <Plus size={16} />
              Tambah Stock
            </button>
          </div>
        ) : (
          <div className="grid-form-results">
            {/* LEFT: Input Form */}
            <div>
              {/* Step 1: Laba */}
              <section className="card">
                <h2 className="section-title">
                  <TrendingUp size={18} />
                  Step 1 — Data Dasar
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <NumericField
                    label="Laba TTM"
                    tooltip="Trailing Twelve Months — dalam Miliar Rupiah"
                    value={activeStock.form.labaTTM}
                    onChange={(val) => updateStockForm(activeStockId, "labaTTM", val)}
                    error={errors.labaTTM}
                    unit={activeStock.unit}
                  />
                  <NumericField
                    label="Laba Annual"
                    tooltip="Tahun terakhir — dalam Miliar Rupiah"
                    value={activeStock.form.labaAnnual}
                    onChange={(val) => updateStockForm(activeStockId, "labaAnnual", val)}
                    error={errors.labaAnnual}
                    unit={activeStock.unit}
                  />
                  <NumericField
                    label="Laba Proyeksi"
                    tooltip="Opsional — skenario custom — dalam Miliar Rupiah"
                    value={activeStock.form.labaProyeksi}
                    onChange={(val) => updateStockForm(activeStockId, "labaProyeksi", val)}
                    error={errors.labaProyeksi}
                    unit={activeStock.unit}
                  />
                  <NumericField
                    label="Total Ekuitas"
                    tooltip="Dalam Miliar Rupiah"
                    value={activeStock.form.ekuitas}
                    onChange={(val) => updateStockForm(activeStockId, "ekuitas", val)}
                    error={errors.ekuitas}
                    unit={activeStock.unit}
                  />
                </div>
                <div className="mt-4">
                  <div className="field-label-row">
                    <span className="input-label">Satuan Input</span>
                  </div>
                  <div className="mt-2">
                    <UnitSwitcher
                      unit={activeStock.unit}
                      onChange={(unit) => updateStockUnit(activeStockId, unit)}
                    />
                  </div>
                </div>
              </section>

              {/* Step 2: Saham & Dividen */}
              <section className="card">
                <h2 className="section-title">
                  <FileText size={18} />
                  Step 2 — Saham & Dividen
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <NumericField
                    label="Jumlah Saham Beredar"
                    tooltip="Dalam Miliar lembar"
                    value={activeStock.form.sahamBeredar}
                    onChange={(val) => updateStockForm(activeStockId, "sahamBeredar", val)}
                    error={errors.sahamBeredar}
                    unit={activeStock.unit}
                  />
                  <NumericField
                    label="Total Dividen"
                    tooltip="Opsional — dalam Miliar Rupiah"
                    value={activeStock.form.dividen}
                    onChange={(val) => updateStockForm(activeStockId, "dividen", val)}
                    error={errors.dividen}
                    unit={activeStock.unit}
                  />
                  <NumericField
                    label="Harga Saham Saat Ini"
                    tooltip="Opsional — untuk PER/PBV aktual & div yield"
                    value={activeStock.form.hargaSaham}
                    onChange={(val) => updateStockForm(activeStockId, "hargaSaham", val)}
                    error={errors.hargaSaham}
                    unit={activeStock.unit}
                    suffix="Rp/saham"
                  />
                </div>
              </section>

              <section className="card">
                <h2 className="section-title">Margin of Safety</h2>
                <p className="section-subtitle mb-3">
                  Tentukan diskon dari Average Price untuk mendapatkan batas harga beli.
                </p>
                <NumericField
                  label="Margin of Safety"
                  tooltip="Isi persentase 0–100. Contoh 20 berarti batas harga beli 20% di bawah harga wajar rata-rata."
                  value={activeStock.form.marginOfSafety}
                  onChange={(val) => updateStockForm(activeStockId, "marginOfSafety", val)}
                  error={errors.marginOfSafety}
                  unit={activeStock.unit}
                  suffix="%"
                />
                {scenarios[0] && activeStock.form.marginOfSafety !== "" && !errors.marginOfSafety && (
                  <div className="avg-price-card mt-4">
                    <p className="avg-label">Batas Harga Beli (Average Price − MOS)</p>
                    <p className="average-price-amount">
                      Rp {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(scenarios[0].marginOfSafety)}
                    </p>
                  </div>
                )}
              </section>

              {/* Step 3: PER & PBV */}
              <section className="card">
                <h2 className="section-title">
                  <TrendingUp size={18} />
                  Step 3 — Asumsi PER & PBV
                </h2>
                <div className="field-wrap mb-4">
                  <div className="field-label-row">
                    <label className="input-label">Preset Sektor (Opsional)</label>
                  </div>
                  <select
                    className="select-field"
                    value={selectedSector || ""}
                    onChange={(e) => {
                      const val = e.target.value || null;
                      setSectorByStock((current) => ({ ...current, [activeStockId]: val }));
                      if (val && SECTOR_PRESETS[val]) {
                        updateStockPer(activeStockId, SECTOR_PRESETS[val].defaultPer);
                        const pbvPreset = SECTOR_PRESETS[val].defaultPbv;
                        updateStockPbv(activeStockId, pbvPreset);
                      }
                    }}
                  >
                    <option value="">Manual (tanpa preset)</option>
                    {Object.entries(SECTOR_PRESETS).map(([key, s]) => (
                      <option key={key} value={key}>
                        {s.name} — PER {s.defaultPer} / PBV {s.defaultPbv}
                      </option>
                    ))}
                  </select>
                  <p className="section-subtitle">
                    Pilih sektor untuk auto-isi PER/PBV wajar sektor tersebut.
                  </p>
                </div>
                <PerPbvSelector
                  per={activeStock.per}
                  pbv={activeStock.pbv}
                  customPbv={activeStock.customPbv}
                  onChangePer={(val) => updateStockPer(activeStockId, val)}
                  onChangePbv={(val) => updateStockPbv(activeStockId, val)}
                  onChangeCustomPbv={(val) => updateStockCustomPbv(activeStockId, val)}
                  sectorPbvValues={Object.values(SECTOR_PRESETS).map((sector) => sector.defaultPbv)}
                />
                {selectedSector && SECTOR_PRESETS[selectedSector] && (
                  <p className="section-subtitle mt-3">
                    Acuan {SECTOR_PRESETS[selectedSector].name}: PER {SECTOR_PRESETS[selectedSector].defaultPer}× dan PBV {SECTOR_PRESETS[selectedSector].defaultPbv}×. Nilai PBV pecahan tetap dipakai persis.
                  </p>
                )}
              </section>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  type="button"
                  className="action-btn flex-1"
                  onClick={loadExample}
                  title="Muat data contoh BBNI"
                >
                  <FileText size={16} />
                  <span>Load Contoh</span>
                </button>
                <button
                  type="button"
                  className="action-btn-secondary flex-1"
                  onClick={resetActive}
                >
                  <RefreshCw size={16} />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* RIGHT: Results */}
            <div id="results-container">
              {scenarios.length === 0 ? (
                <div className="card p-8 text-center">
                  <Calculator size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="text-muted">
                    {!activeStock.form.labaTTM && !activeStock.form.labaAnnual && !activeStock.form.labaProyeksi
                      ? "Isi salah satu data laba (TTM, Annual, atau Proyeksi) dengan nilai lebih dari 0."
                      : !activeStock.form.ekuitas || !activeStock.form.sahamBeredar
                        ? "Lengkapi Total Ekuitas dan Jumlah Saham Beredar dengan nilai lebih dari 0."
                        : Object.keys(errors).length > 0
                          ? "Data belum valid. Periksa pesan validasi pada bagian input."
                          : "Hasil belum dapat dihitung. Periksa format angka dan pilihan PBV."}
                  </p>
                  {!canCalculate && Object.values(errors).filter(Boolean).length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm text-left" style={{ color: "var(--text-red)" }}>
                      {[...new Set(Object.values(errors).filter(Boolean))].map((error) => <li key={error}>• {error}</li>)}
                    </ul>
                  )}
                </div>
              ) : (
                <>
                  <section className="valuation-summary card">
                    <div className="valuation-summary-heading">
                      <div>
                        <p className="summary-eyebrow">RINGKASAN VALUASI</p>
                        <h2 className="summary-title">{activeStock.name}</h2>
                      </div>
                      <span className="summary-scenario-tag">Acuan: {summaryScenario.label}</span>
                    </div>
                    <div className="summary-metrics">
                      <article className="summary-metric summary-fair-value">
                        <span>Harga Wajar Rata-rata</span>
                        <strong>{formatCurrency(summaryScenario.averagePrice)}</strong>
                      </article>
                      <article className="summary-metric">
                        <span>Harga Pasar</span>
                        <strong>{currentPrice > 0 ? formatCurrency(currentPrice) : "Belum diisi"}</strong>
                      </article>
                      <article className={`summary-metric ${marketComparison ? (marketComparison.upsidePercent >= 0 ? "summary-positive" : "summary-negative") : ""}`}>
                        <span>Potensi ke Harga Wajar</span>
                        <strong>{marketComparison ? `${marketComparison.upsidePercent >= 0 ? "+" : ""}${marketComparison.upsidePercent.toFixed(2)}%` : "Isi harga pasar"}</strong>
                      </article>
                      <article className="summary-metric summary-mos">
                        <span>Target Beli setelah MOS{summaryScenario.marginOfSafetyPercent !== null ? ` ${summaryScenario.marginOfSafetyPercent}%` : ""}</span>
                        <strong>{summaryScenario.marginOfSafety !== null ? formatCurrency(summaryScenario.marginOfSafety) : "Isi MOS"}</strong>
                      </article>
                    </div>
                  </section>

                  {marketComparison && (
                    <section className="market-comparison card">
                      <div className="market-comparison-heading">
                        <div>
                          <p className="summary-eyebrow">HARGA PASAR VS NILAI WAJAR</p>
                          <h3>{marketComparison.status}</h3>
                        </div>
                        <span className={`market-status-pill ${marketComparison.upsidePercent >= 0 ? "summary-positive" : "summary-negative"}`}>
                          {marketComparison.upsidePercent >= 0 ? "Potensi naik" : "Potensi turun"} {Math.abs(marketComparison.upsidePercent).toFixed(2)}%
                        </span>
                      </div>
                      <div className="market-price-track" aria-label="Perbandingan harga pasar dan harga wajar">
                        <div className="market-price-fill" style={{ width: `${Math.max(4, Math.min(100, currentPrice / Math.max(currentPrice, summaryScenario.averagePrice) * 100))}%` }} />
                        <span className="market-price-marker" style={{ left: `${Math.max(0, Math.min(100, currentPrice / Math.max(currentPrice, summaryScenario.averagePrice) * 100))}%` }} />
                      </div>
                      <div className="market-price-labels">
                        <span>Pasar: <strong>{formatCurrency(currentPrice)}</strong></span>
                        <span>Wajar: <strong>{formatCurrency(summaryScenario.averagePrice)}</strong></span>
                      </div>
                      <p className="market-comparison-note">
                        Selisih harga pasar terhadap nilai wajar: {formatCurrency(Math.abs(marketComparison.difference))}.
                        {activeStock.form.marginOfSafety && summaryScenario.marginOfSafety !== null
                          ? currentPrice <= summaryScenario.marginOfSafety
                            ? " Harga pasar sudah berada pada atau di bawah target MOS."
                            : " Harga pasar masih di atas target MOS."
                          : " Isi Margin of Safety untuk melihat target harga beli."}
                      </p>
                    </section>
                  )}

                  {scenarios.map((s) => (
                    <ResultCard key={s.key} scenario={s} />
                  ))}

                  {/* Chart */}
                  <ComparisonChart scenarios={scenarios} currentPrice={currentPrice} />

                  <div className="card result-actions">
                    <button type="button" className="action-btn flex-1" onClick={saveActiveHistory}>
                      <BookmarkPlus size={16} />
                      Simpan riwayat
                    </button>
                    <button type="button" className="action-btn-secondary" onClick={() => setHistoryOpen((open) => !open)}>
                      <History size={16} />
                      Buka riwayat
                    </button>
                  </div>
                  {historyNotice && <p className="history-notice" role="status">{historyNotice}</p>}

                  {/* Export & Share */}
                  <div className="card flex gap-2">
                    <button
                      type="button"
                      className="action-btn flex-1"
                      onClick={handleExport}
                    >
                      <Download size={16} />
                      Export PNG
                    </button>
                    <button
                      type="button"
                      className="action-btn flex-1"
                      onClick={handleShare}
                    >
                      <Share2 size={16} />
                      Share Link
                    </button>
                  </div>

                  {shareMessage && (
                    <div className="card share-result">
                      <p className="share-message">{shareMessage}</p>
                      <div className="share-link-row">
                        <input className="input-field share-link-input" readOnly value={shareLink} aria-label="Tautan share" />
                        <button type="button" className="action-btn" onClick={() => copyToClipboard(shareLink).then((copied) => setShareMessage(copied ? "Link berhasil disalin." : "Gagal menyalin link."))}>
                          Salin lagi
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        Average Price Calculator — Dibuat untuk investor profesional muda Indonesia.
      </footer>
      {tutorialOpen && (
        <div className="modal-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setTutorialOpen(false)}>
          <section className="modal-content tutorial-modal" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
            <h2 id="tutorial-title" className="section-title">Panduan singkat</h2>
            <ol className="tutorial-steps">
              <li>Masukkan laba (TTM/tahunan/proyeksi), total ekuitas dan saham beredar sesuai satuan yang dipilih.</li>
              <li>Isi harga saham untuk melihat PER/PBV aktual dan status valuasi.</li>
              <li>Pilih asumsi PER/PBV atau preset sektor. PBV preset pecahan digunakan persis dalam perhitungan.</li>
              <li>Isi MOS 0–100% untuk harga setelah diskon. DCF yang ditampilkan adalah estimasi EPS terdiskonto, bukan DCF arus kas bebas.</li>
              <li>Data tersimpan lokal di browser. Tombol Share membuat tautan berisi data kalkulasi.</li>
            </ol>
            <button type="button" className="action-btn" autoFocus onClick={() => setTutorialOpen(false)}>Mengerti</button>
          </section>
        </div>
      )}
    </div>
  );
}
