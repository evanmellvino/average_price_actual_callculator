import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Calculator, RefreshCw, FileText, Sun, Moon, TrendingUp, Plus, Share2, Download, HelpCircle, History, BookmarkPlus, ShieldCheck, Star, FlaskConical } from "lucide-react";
import { useStore } from "./store.js";
import { EXAMPLE_DATA, EMPTY_FORM, parseNumber, validateForm, calculateScenarios, SECTOR_PRESETS } from "./calculator.js";
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
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [authReady, setAuthReady] = useState(!hasSupabaseConfig);
  const [authNotice, setAuthNotice] = useState("");
  const [loadedUserId, setLoadedUserId] = useState(null);
  const [cloudLoadError, setCloudLoadError] = useState({ userId: null, message: "" });
  const [retryCloudLoad, setRetryCloudLoad] = useState(0);
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
  const updateStock = useStore((s) => s.updateStock);
  const renameStock = useStore((s) => s.renameStock);
  const updateStockForm = useStore((s) => s.updateStockForm);
  const updateStockUnit = useStore((s) => s.updateStockUnit);
  const updateStockPer = useStore((s) => s.updateStockPer);
  const updateStockPbv = useStore((s) => s.updateStockPbv);
  const updateStockCustomPbv = useStore((s) => s.updateStockCustomPbv);
  const watchlist = stocks.filter((stock) => stock.isWatched);
  const namedStocks = stocks.filter((stock) => stock.name.trim());

  // Local state
  const [shareMessage, setShareMessage] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [sectorByStock, setSectorByStock] = useState({});
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [historyNotice, setHistoryNotice] = useState("");
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [scenarioPer, setScenarioPer] = useState("");
  const [scenarioPbv, setScenarioPbv] = useState("");
  const [scenarioGrowth, setScenarioGrowth] = useState("0");
  const [calculationNotice, setCalculationNotice] = useState("");
  const [watchlistReasonOpen, setWatchlistReasonOpen] = useState(false);
  const [watchlistReason, setWatchlistReason] = useState("");
  const lastHistorySignature = useRef("");

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
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
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
    supabase.from("user_stocks").select("id,name,data,created_at,updated_at").eq("user_id", session.user.id)
    .then(async (stocksResult) => {
      if (!alive) return;
      if (stocksResult.error) {
        setCloudLoadError({ userId: session.user.id, message: `Gagal memuat data saham: ${stocksResult.error.message}` });
        return;
      }
      const cloudStocks = (stocksResult.data ?? []).map((row) => ({ ...row.data, id: row.id, name: row.name }));
      const { data: historyRows, error: historyError } = await supabase.from("calculation_history").select("id,stock_id,stock_name,snapshot,created_at").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(100);
      const cloudHistory = (historyRows ?? []).map((row) => ({ ...row.snapshot, id: row.id, stockId: row.stock_id, stockName: row.stock_name, createdAt: row.created_at }));
      const localStocks = useStore.getState().stocks;
      const localHistory = useStore.getState().history ?? [];
      replaceUserData({
        stocks: cloudStocks.length ? cloudStocks : localStocks,
        history: historyError ? localHistory : cloudHistory.length ? cloudHistory : localHistory,
      });
      if (historyError) setAuthNotice(`Riwayat belum bisa dimuat: ${historyError.message}`);
      else if (cloudHistory.length === 0 && localHistory.length === 0) setAuthNotice("Belum ada riwayat tersimpan. Hitung saham, lalu tekan ‘Simpan riwayat’.");
      else setAuthNotice("");
      if (cloudStocks.length === 0 && localStocks.length > 0) {
        const { error: importError } = await supabase.from("user_stocks").upsert(
          localStocks.map((stock) => ({
            user_id: session.user.id,
            name: stock.name,
            data: { ...stock, id: undefined, name: undefined },
            updated_at: new Date().toISOString(),
          })),
        );
        if (importError) setAuthNotice(`Gagal memindahkan data lokal ke akun: ${importError.message}`);
        else {
          const { data: importedStocks } = await supabase.from("user_stocks").select("id,name,data,created_at,updated_at").eq("user_id", session.user.id);
          if (importedStocks) {
            replaceUserData({
              stocks: importedStocks.map((row) => ({ ...row.data, id: row.id, name: row.name })),
              history: historyError ? localHistory : cloudHistory,
            });
          }
        }
      }
      if (!historyError && cloudHistory.length === 0 && localHistory.length > 0) {
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
      if (alive) setLoadedUserId(session.user.id);
    }).catch((error) => {
      if (alive) setCloudLoadError({ userId: session.user.id, message: `Tidak dapat memuat data akun: ${error.message || "Periksa koneksi internet."}` });
    });
    return () => { alive = false; };
  }, [session?.user?.id, replaceUserData, retryCloudLoad]);

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
    const rawPbv = parseNumber(activeStock.pbv);
    const isSectorPbv = Object.values(SECTOR_PRESETS).some((preset) => preset.defaultPbv === rawPbv);
    const customPbvMode = rawPbv === 4 && !isSectorPbv;
    const validationPbvChoice = customPbvMode ? 4 : rawPbv;
    const validationCustomPbv = customPbvMode ? activeStock.customPbv : String(rawPbv);
    const { errors, canCalculate } = validateForm(
      activeStock.form,
      activeStock.unit,
      validationPbvChoice,
      validationCustomPbv
    );
    const calculationPbv = customPbvMode ? 4 : rawPbv;
    const calculationCustomPbv = customPbvMode ? activeStock.customPbv : String(rawPbv);
    const scenarios = calculateScenarios({
      form: activeStock.form,
      unit: activeStock.unit ?? "miliar",
      per: parseNumber(activeStock.per) || 10,
      pbvChoice: calculationPbv,
      customPbv: calculationCustomPbv,
    });
    return { scenarios, errors, canCalculate };
  }, [activeStock]);

  const currentPrice = activeStock ? parseNumber(activeStock.form.hargaSaham) || 0 : 0;
  const toggleWatchlist = () => {
    if (!activeStock) return;
    if (activeStock.isWatched) {
      updateStock(activeStockId, { isWatched: false });
      return;
    }
    setWatchlistReason(activeStock.watchlistReason ?? "");
    setWatchlistReasonOpen(true);
  };

  const saveWatchlistReason = () => {
    if (!activeStock) return;
    updateStock(activeStockId, {
      isWatched: true,
      watchlistReason: watchlistReason.trim(),
    });
    setWatchlistReasonOpen(false);
  };
  const saveActiveHistory = useCallback(() => {
    if (!activeStock || !scenarios[0]) return false;
    const scenario = scenarios[0];
    const createdAt = new Date().toISOString();
    const signature = JSON.stringify({
      stockId: activeStock.id,
      stockName: activeStock.name,
      scenarioLabel: scenario.label,
      averagePrice: scenario.averagePrice,
      currentPrice,
      mosPrice: scenario.marginOfSafety,
      per: scenario.per,
      pbv: scenario.pbv,
      form: activeStock.form,
      unit: activeStock.unit ?? "miliar",
      customPbv: activeStock.customPbv ?? "",
    });
    if (lastHistorySignature.current === signature) {
      setHistoryNotice("Hasil dengan input dan asumsi yang sama sudah ada di riwayat.");
      window.setTimeout(() => setHistoryNotice(""), 5000);
      return false;
    }
    lastHistorySignature.current = signature;
    const localId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const snapshot = {
      id: localId,
      stockId: activeStock.id,
      stockName: activeStock.name,
      createdAt,
      scenarioLabel: scenario.label,
      averagePrice: scenario.averagePrice,
      currentPrice,
      mosPrice: scenario.marginOfSafety,
      per: scenario.per,
      pbv: scenario.pbv,
      form: { ...activeStock.form },
      unit: activeStock.unit ?? "miliar",
      customPbv: activeStock.customPbv ?? "",
      perAssumption: activeStock.per,
      pbvAssumption: activeStock.pbv,
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
      window.setTimeout(() => setHistoryNotice(""), 5000);
    }
    window.setTimeout(() => setHistoryNotice(""), 5000);
    return true;
  }, [activeStock, scenarios, saveHistorySnapshot, currentPrice, session]);

  const handleCalculate = () => {
    if (!canCalculate || !scenarios.length) {
      setCalculationNotice("Periksa kembali data wajib dan asumsi valuasi yang belum valid.");
      return;
    }
    setCalculationNotice("Valuasi berhasil dihitung. Jika ingin menyimpannya, tekan ‘Simpan riwayat’ di bawah hasil.");
    document.getElementById("results-container")?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => setCalculationNotice(""), 4500);
  };
  const summaryScenario = scenarios[0];
  const scenarioResult = useMemo(() => {
    if (!summaryScenario) return null;
    const per = parseNumber(scenarioPer);
    const pbv = parseNumber(scenarioPbv);
    const growth = parseNumber(scenarioGrowth);
    if (per === null || per <= 0 || pbv === null || pbv <= 0 || growth === null) return null;
    const projectedEps = summaryScenario.eps * (1 + growth / 100);
    if (projectedEps <= 0) return null;
    const fairValuePer = projectedEps * per;
    const fairValuePbv = summaryScenario.bvps * pbv;
    return { fairValuePer, fairValuePbv, averagePrice: (fairValuePer + fairValuePbv) / 2 };
  }, [summaryScenario, scenarioPer, scenarioPbv, scenarioGrowth]);
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

  const openStockCalculation = (stockId) => {
    const exists = useStore.getState().stocks.some((stock) => stock.id === stockId);
    if (exists) {
      setActiveStock(stockId);
      setWatchlistOpen(false);
      setHistoryOpen(false);
      window.setTimeout(() => document.getElementById("results-container")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }
  };

  const openHistoryCalculation = (item) => {
    const stock = useStore.getState().stocks.find((entry) => entry.id === item.stockId);
    const savedForm = item.form;
    if (stock && !savedForm) {
      openStockCalculation(stock.id);
      return;
    }
    if (stock && savedForm) {
      updateStock(stock.id, {
        name: item.stockName || stock.name,
        per: item.perAssumption ?? item.per ?? stock.per,
        pbv: item.pbvAssumption ?? item.pbv ?? stock.pbv,
        customPbv: item.customPbv ?? stock.customPbv ?? "",
        form: { ...EMPTY_FORM, ...(item.form ?? {}) },
        unit: item.unit ?? stock.unit ?? "miliar",
      });
      lastHistorySignature.current = "";
    }
    const id = stock?.id ?? addStock();
    if (!stock) {
      updateStock(id, {
        name: item.stockName || "Saham dari riwayat",
        per: item.perAssumption ?? item.per ?? 10,
        pbv: item.pbvAssumption ?? item.pbv ?? 1,
        customPbv: item.customPbv ?? (item.pbv >= 4 ? String(item.pbv) : ""),
        form: { ...EMPTY_FORM, ...(item.form ?? {}) },
        unit: item.unit ?? "miliar",
      });
      lastHistorySignature.current = "";
    }
    setActiveStock(id);
    setHistoryOpen(false);
    window.setTimeout(() => document.getElementById("results-container")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  };

  const watchlistComparisons = useMemo(() => watchlist.map((stock) => {
    const customPbvMode = Number(stock.pbv) === 4;
    const rawPbv = parseNumber(stock.pbv);
    const pbvChoice = customPbvMode ? 4 : rawPbv;
    const customPbv = customPbvMode ? stock.customPbv : String(rawPbv);
    const stockScenarios = calculateScenarios({
      form: stock.form,
      unit: stock.unit ?? "miliar",
      per: Number(stock.per) || 10,
      pbvChoice,
      customPbv,
    });
    const baseScenario = stockScenarios[0];
    const price = parseNumber(stock.form?.hargaSaham) || 0;
    return {
      id: stock.id,
      name: stock.name,
      currentPrice: price,
      scenario: baseScenario,
      upsidePercent: baseScenario && price > 0 ? ((baseScenario.averagePrice - price) / price) * 100 : null,
      mosPrice: baseScenario?.marginOfSafety ?? null,
      per: baseScenario?.per ?? (Number(stock.per) || null),
      pbv: baseScenario?.pbv ?? null,
    };
  }).sort((a, b) => (b.upsidePercent ?? -Infinity) - (a.upsidePercent ?? -Infinity)), [watchlist]);

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

  const handleSignOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setAuthNotice(error.message);
  };

  const retryAccountLoad = () => {
    setCloudLoadError({ userId: null, message: "" });
    setRetryCloudLoad((value) => value + 1);
  };

  const handlePasswordUpdate = async (event) => {
    event.preventDefault();
    setRecoveryBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setRecoveryBusy(false);
    if (error) setAuthNotice(error.message);
    else {
      setAuthNotice("Password berhasil diperbarui.");
      setPasswordRecovery(false);
      setNewPassword("");
    }
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
  if (passwordRecovery) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-brand-icon"><Calculator size={25} /></div>
          <h1>Buat password baru</h1>
          <p className="auth-description">Masukkan password baru untuk akun Anda.</p>
          <form className="auth-form" onSubmit={handlePasswordUpdate}>
            <label className="auth-label" htmlFor="recovery-password">Password baru</label>
            <input id="recovery-password" className="input-field" type="password" minLength={8} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" />
            {authNotice && <p className="auth-message" role="status">{authNotice}</p>}
            <button className="action-btn auth-submit" type="submit" disabled={recoveryBusy}>{recoveryBusy ? "Memperbarui..." : "Simpan password baru"}</button>
          </form>
        </section>
      </main>
    );
  }
  if (!session || (loadedUserId !== session.user.id && cloudLoadError.userId !== session.user.id)) {
    return <main className="auth-page"><div className="auth-loading">Memuat data akun...</div></main>;
  }
  if (cloudLoadError.userId === session?.user?.id && cloudLoadError.message) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p className="summary-eyebrow">SINKRONISASI DATA</p>
          <h1>Data belum termuat</h1>
          <p className="auth-description">{cloudLoadError.message}</p>
          <button type="button" className="action-btn auth-submit" onClick={retryAccountLoad}>Coba lagi</button>
          <button type="button" className="action-btn-secondary auth-submit" onClick={handleSignOut}>Keluar</button>
        </section>
      </main>
    );
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
              <p className="brand-subtitle">Analisis valuasi saham Indonesia</p>
            </div>
          </div>
          <div className="header-actions">
            <span className="account-email"><ShieldCheck size={14} />{session.user.email}</span>
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
        <section className="page-intro">
          <div>
            <p className="page-kicker">WORKSPACE INVESTASI</p>
            <h2>Temukan harga wajar, <span>lebih terukur.</span></h2>
            <p>Hitung estimasi nilai saham dengan pendekatan PER dan PBV.</p>
          </div>
          <button type="button" className="action-btn-secondary signout-btn" onClick={handleSignOut}>Keluar akun</button>
        </section>
        {/* Disclaimer */}
        <div className="disclaimer">
          <p className="disclaimer-title">Informasi risiko</p>
          <p className="disclaimer-copy">
            Bukan ajakan jual/beli saham. Keputusan dan risiko sepenuhnya di tangan Anda.
            Selalu lakukan analisis mandiri. Investasi saham memiliki risiko tinggi.
          </p>
        </div>

        {/* Stock Tabs */}
        {authNotice && <p className="auth-notice global-auth-notice" role="status">{authNotice}</p>}
        <div className={`stock-tabs ${namedStocks.length === 0 ? "stock-tabs-no-names" : ""}`}>
          <div className="tabs-scroll">
            {namedStocks.map((stock) => (
              <div key={stock.id} className={`stock-tab ${activeStockId === stock.id ? "active" : ""}`}>
                <button
                  type="button"
                  onClick={() => setActiveStock(stock.id)}
                  className="tab-label"
                >
                  {stock.name}
                </button>
              </div>
            ))}
          </div>
          <div className="stock-tabs-actions">
            <button type="button" onClick={addStock} className="action-btn" title="Add new stock">
              <Plus size={16} />
              <span className="hidden sm:inline">Tambah saham</span>
            </button>
            <button type="button" onClick={() => setHistoryOpen((open) => !open)} className="action-btn-secondary" title="Lihat riwayat">
              <History size={16} />
              <span>{historyOpen ? "Sembunyikan" : "Tampilkan"} riwayat ({history.length})</span>
            </button>
          </div>
        </div>

        <section className="workspace-tools card" aria-labelledby="workspace-tools-title">
          <div className="workspace-tools-heading">
            <div>
              <p className="summary-eyebrow">RISET PERSONAL</p>
          <h2 id="workspace-tools-title" className="workspace-tools-title">Watchlist</h2>
            </div>
            <button
              type="button"
              className={activeStock?.isWatched ? "action-btn" : "action-btn-secondary"}
              onClick={toggleWatchlist}
              disabled={!activeStock}
            >
              <Star size={16} fill={activeStock?.isWatched ? "currentColor" : "none"} />
              {activeStock?.isWatched ? "Sudah di watchlist" : "Tambahkan ke watchlist"}
            </button>
          </div>
          <div className="watchlist-row">
            <div className="watchlist-heading-row">
              <div>
                <h3><Star size={15} /> Watchlist ({watchlist.length})</h3>
                <p className="section-subtitle">Daftar saham pantauan, terpisah dari riwayat kalkulasi.</p>
              </div>
              <button
                type="button"
                className="action-btn-secondary"
                onClick={() => setWatchlistOpen((open) => !open)}
                aria-expanded={watchlistOpen}
                disabled={watchlist.length === 0}
              >
                {watchlistOpen ? "Tutup watchlist" : "Tampilkan watchlist"}
              </button>
            </div>
            {watchlistOpen && (watchlist.length === 0 ? (
              <p className="section-subtitle">Belum ada saham. Tandai saham aktif untuk memasukkannya.</p>
            ) : (
              <>
                <div className="watchlist-items">
                  {watchlist.map((stock) => (
                    <button
                      type="button"
                      key={stock.id}
                    className={`watchlist-item ${stock.id === activeStockId ? "active" : ""}`}
                    onClick={() => openStockCalculation(stock.id)}
                  >
                    <span>{stock.name}</span>
                    {stock.watchlistReason && <span className="watchlist-reason">Alasan: {stock.watchlistReason}</span>}
                    <span className="watchlist-price-details">
                      <span>Harga sekarang <strong>{parseNumber(stock.form?.hargaSaham) > 0 ? formatCurrency(parseNumber(stock.form.hargaSaham)) : "Belum diisi"}</strong></span>
                      <span>Harga aktual <strong>{(() => {
                        const rawPbv = parseNumber(stock.pbv);
                        const customPbvMode = rawPbv === 4 && !Object.values(SECTOR_PRESETS).some((preset) => preset.defaultPbv === rawPbv);
                        const rowScenarios = calculateScenarios({ form: stock.form, unit: stock.unit ?? "miliar", per: parseNumber(stock.per) || 10, pbvChoice: customPbvMode ? 4 : rawPbv, customPbv: customPbvMode ? stock.customPbv : String(rawPbv) });
                        return rowScenarios[0] ? formatCurrency(rowScenarios[0].averagePrice) : "Belum bisa dihitung";
                      })()}</strong></span>
                    </span>
                    </button>
                  ))}
                </div>
                {watchlist.length > 1 && (
                  <div className="watchlist-compare">
                    <div className="watchlist-compare-heading">
                      <div>
                        <p className="summary-eyebrow">PERBANDINGAN SAHAM</p>
                        <h4>Ringkasan valuasi watchlist</h4>
                      </div>
                      <span>{watchlistComparisons.length} saham</span>
                    </div>
                    <div className="watchlist-table-wrap">
                      <table className="watchlist-table">
                        <thead>
                          <tr>
                            <th scope="col">Saham</th>
                            <th scope="col">Harga pasar</th>
                            <th scope="col">Harga wajar</th>
                            <th scope="col">Potensi</th>
                            <th scope="col">Target MOS</th>
                            <th scope="col">PER / PBV</th>
                          </tr>
                        </thead>
                        <tbody>
                          {watchlistComparisons.map((item) => (
                            <tr key={item.id}>
                              <th scope="row">
                              <button type="button" className="watchlist-symbol-button" onClick={() => openStockCalculation(item.id)}>{item.name}</button>
                              </th>
                              <td>{item.currentPrice > 0 ? formatCurrency(item.currentPrice) : "—"}</td>
                              <td>{item.scenario ? formatCurrency(item.scenario.averagePrice) : "Data belum lengkap"}</td>
                              <td className={item.upsidePercent === null ? "" : item.upsidePercent >= 0 ? "summary-positive" : "summary-negative"}>
                                {item.upsidePercent === null ? "—" : `${item.upsidePercent >= 0 ? "+" : ""}${item.upsidePercent.toFixed(2)}%`}
                              </td>
                              <td>{item.mosPrice !== null ? formatCurrency(item.mosPrice) : "—"}</td>
                              <td>{item.scenario ? `${item.per}× / ${item.pbv}×` : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="section-subtitle watchlist-compare-note">Potensi dihitung dari harga wajar rata-rata dibanding harga pasar. Data kosong atau belum cukup ditampilkan sebagai —.</p>
                  </div>
                )}
              </>
            ))}
          </div>
        </section>

        {watchlistReasonOpen && activeStock && (
          <div className="modal-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setWatchlistReasonOpen(false)}>
            <section className="modal-content watchlist-reason-modal" role="dialog" aria-modal="true" aria-labelledby="watchlist-reason-title">
              <p className="summary-eyebrow">WATCHLIST</p>
              <h2 id="watchlist-reason-title">Kenapa memasukkan {activeStock.name}?</h2>
              <p className="section-subtitle">Catat alasan singkat agar Anda ingat apa yang ingin dipantau. Boleh dikosongkan.</p>
              <label className="watchlist-reason-field">
                <span className="input-label">Alasan dipantau</span>
                <textarea
                  className="input-field watchlist-reason-textarea"
                  value={watchlistReason}
                  onChange={(event) => setWatchlistReason(event.target.value)}
                  maxLength={500}
                  placeholder="Contoh: valuasi terlihat menarik, menunggu laporan kuartal berikutnya…"
                  autoFocus
                />
                <span className="thesis-counter">{watchlistReason.length}/500</span>
              </label>
              <div className="modal-actions">
                <button type="button" className="action-btn" onClick={saveWatchlistReason}>Konfirmasi & simpan</button>
                <button type="button" className="action-btn-secondary" onClick={() => setWatchlistReasonOpen(false)}>Batal</button>
              </div>
            </section>
          </div>
        )}

        {activeStock && (
          <section className="card issuer-name-card">
            <h2 className="section-title"><FileText size={18} /> Nama emiten</h2>
            <label className="field-wrap">
              <span className="input-label">Nama / kode saham</span>
              <input
                className="input-field"
                type="text"
                maxLength={80}
                value={activeStock.name}
                onChange={(event) => {
                  const name = event.target.value;
                  updateStock(activeStockId, { name });
                  if (name.trim() && name !== activeStock.name) renameStock(activeStockId, name.trim());
                }}
                placeholder="Contoh: BBCA atau Bank Central Asia"
              />
            </label>
          </section>
        )}

        {historyOpen && <HistoryPanel history={history} onOpen={openHistoryCalculation} onDelete={async (id) => {
          const { error } = await supabase.from("calculation_history").delete().eq("id", id).eq("user_id", session.user.id);
          if (error) {
            setHistoryNotice(`Gagal menghapus riwayat: ${error.message}`);
            return;
          }
          removeHistorySnapshot(id);
        }} />}

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
                  1. Data fundamental
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
                  2. Saham & dividen
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
                  3. Asumsi valuasi
                </h2>
                <div className="field-wrap mb-4">
                  <div className="field-label-row">
                    <label className="input-label">Preset sektor <span className="optional-label">Opsional</span></label>
                  </div>
                  <select
                    className="select-field"
                    value={selectedSector || ""}
                    onChange={(e) => {
                      const val = e.target.value || null;
                      setSectorByStock((current) => ({ ...current, [activeStockId]: val }));
                      if (val && SECTOR_PRESETS[val]) {
                        const preset = SECTOR_PRESETS[val];
                        updateStock(activeStockId, {
                          per: preset.defaultPer,
                          pbv: preset.defaultPbv,
                          customPbv: "",
                        });
                      }
                    }}
                  >
                    <option value="">Pilih sektor (opsional)</option>
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
              <button
                type="button"
                className="action-btn calculate-button"
                onClick={handleCalculate}
                disabled={!canCalculate || !scenarios.length}
              >
                <Calculator size={18} />
                <span>Hitung valuasi</span>
              </button>
              {calculationNotice && <p className="calculation-notice" role="status">{calculationNotice}</p>}
              <div className="flex gap-2">
                <button type="button" className="action-btn-secondary flex-1" onClick={loadExample} title="Muat data contoh BBNI">
                  <FileText size={16} />
                  <span>Load Contoh</span>
                </button>
                <button type="button" className="action-btn-secondary flex-1" onClick={resetActive}>
                  <RefreshCw size={16} />
                  <span>Reset</span>
                </button>
              </div>
              {!activeStock.isWatched && (
                <button
                  type="button"
                  className="action-btn watchlist-save-button"
                  onClick={toggleWatchlist}
                >
                  <Star size={17} />
                  Simpan ke watchlist
                </button>
              )}
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
                  <span className="summary-scenario-tag">Skenario acuan · {summaryScenario.label}</span>
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
                      <span>Potensi dari harga pasar</span>
                        <strong>{marketComparison ? `${marketComparison.upsidePercent >= 0 ? "+" : ""}${marketComparison.upsidePercent.toFixed(2)}%` : "Isi harga pasar"}</strong>
                      </article>
                      <article className="summary-metric summary-mos">
                      <span>Target harga dengan MOS{summaryScenario.marginOfSafetyPercent !== null ? ` · ${summaryScenario.marginOfSafetyPercent}%` : ""}</span>
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

                  <section className="card scenario-lab">
                    <div className="scenario-lab-heading">
                      <div>
                        <p className="summary-eyebrow">ANALISIS SENSITIVITAS</p>
                        <h2 className="workspace-tools-title"><FlaskConical size={18} /> Scenario Lab</h2>
                        <p className="section-subtitle">Uji asumsi alternatif tanpa mengubah valuasi utama.</p>
                      </div>
                      <button type="button" className="action-btn-secondary" onClick={() => setScenarioOpen((open) => !open)} aria-expanded={scenarioOpen}>
                        {scenarioOpen ? "Tutup skenario" : "Uji skenario"}
                      </button>
                    </div>
                    {scenarioOpen && (
                      <div className="scenario-lab-content">
                        <label className="scenario-input-label">
                          <span>PER alternatif</span>
                          <input className="input-field" type="text" inputMode="decimal" value={scenarioPer} onChange={(event) => setScenarioPer(event.target.value)} placeholder={`${summaryScenario.per}`} />
                        </label>
                        <label className="scenario-input-label">
                          <span>PBV alternatif</span>
                          <input className="input-field" type="text" inputMode="decimal" value={scenarioPbv} onChange={(event) => setScenarioPbv(event.target.value)} placeholder={`${summaryScenario.pbv}`} />
                        </label>
                        <label className="scenario-input-label">
                          <span>Pertumbuhan EPS (%)</span>
                          <input className="input-field" type="text" inputMode="decimal" value={scenarioGrowth} onChange={(event) => setScenarioGrowth(event.target.value)} placeholder="0" />
                        </label>
                        {scenarioResult ? (
                          <div className="scenario-output" aria-live="polite">
                            <div><span>Nilai PER</span><strong>{formatCurrency(scenarioResult.fairValuePer)}</strong></div>
                            <div><span>Nilai PBV</span><strong>{formatCurrency(scenarioResult.fairValuePbv)}</strong></div>
                            <div className="scenario-output-average"><span>Harga wajar rata-rata skenario</span><strong>{formatCurrency(scenarioResult.averagePrice)}</strong></div>
                            <p>EPS dasar {formatCurrency(summaryScenario.eps)} disesuaikan dengan pertumbuhan {parseNumber(scenarioGrowth)}% · BVPS tetap {formatCurrency(summaryScenario.bvps)}.</p>
                          </div>
                        ) : (
                          <p className="section-subtitle scenario-validation">Masukkan PER dan PBV positif serta pertumbuhan EPS valid agar hasil skenario muncul.</p>
                        )}
                        <button type="button" className="action-btn-secondary scenario-reset" onClick={() => { setScenarioPer(""); setScenarioPbv(""); setScenarioGrowth("0"); }}>
                          Gunakan ulang asumsi utama
                        </button>
                      </div>
                    )}
                  </section>

                   {scenarios.map((s) => (
                    <ResultCard key={s.key} scenario={s} />
                  ))}

                  {/* Chart */}
                  <ComparisonChart scenarios={scenarios} currentPrice={currentPrice} />

                  <div className="card result-actions">
                    <button type="button" className="action-btn flex-1" onClick={saveActiveHistory} disabled={!canCalculate || !scenarios.length}>
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
            <button type="button" className="action-btn" autoFocus onClick={() => setTutorialOpen(false)}>Saya mengerti</button>
          </section>
        </div>
      )}
    </div>
  );
}
