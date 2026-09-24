import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useStore = create(
  persist(
    (set, get) => ({
      // Theme
      theme: "dark",
      toggleTheme: () => set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),

      // Stocks array — each stock has unique ID + form data
      stocks: [],
      activeStockId: null,
      history: [],

      // Add new stock
      addStock: () => {
        const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const newStock = {
          id,
          name: "",
          unit: "miliar",
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
          thesis: "",
          watchlistReason: "",
          isWatched: false,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          stocks: [...state.stocks, newStock],
          activeStockId: id,
        }));
        return id;
      },

      // Update active stock
      setActiveStock: (id) => set({ activeStockId: id }),

      // Delete stock
      deleteStock: (id) => {
        set((state) => {
          const filtered = state.stocks.filter((s) => s.id !== id);
          return {
            stocks: filtered,
            activeStockId: state.activeStockId === id ? filtered[0]?.id || null : state.activeStockId,
          };
        });
      },

      // Rename stock
      renameStock: (id, name) => {
        set((state) => ({
          stocks: state.stocks.map((s) => (s.id === id ? { ...s, name } : s)),
        }));
      },

      // Update stock data
      updateStock: (id, updates) => {
        set((state) => ({
          stocks: state.stocks.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        }));
      },

      // Update stock form field
      updateStockForm: (id, field, value) => {
        set((state) => ({
          stocks: state.stocks.map((s) =>
            s.id === id ? { ...s, form: { ...s.form, [field]: value } } : s
          ),
        }));
      },

      // Update stock unit
      updateStockUnit: (id, unit) => {
        set((state) => ({
          stocks: state.stocks.map((s) => (s.id === id ? { ...s, unit } : s)),
        }));
      },

      // Update PER/PBV
      updateStockPer: (id, per) => {
        set((state) => ({
          stocks: state.stocks.map((s) => (s.id === id ? { ...s, per } : s)),
        }));
      },

      updateStockPbv: (id, pbv) => {
        set((state) => ({
          stocks: state.stocks.map((s) => (s.id === id ? { ...s, pbv } : s)),
        }));
      },

      updateStockCustomPbv: (id, customPbv) => {
        set((state) => ({
          stocks: state.stocks.map((s) => (s.id === id ? { ...s, customPbv } : s)),
        }));
      },

      saveHistorySnapshot: (snapshot) => set((state) => ({
        history: [snapshot, ...state.history].slice(0, 100),
      })),

      removeHistorySnapshot: (id) => set((state) => ({
        history: state.history.filter((item) => item.id !== id),
      })),

      deleteHistorySnapshot: (id) => set((state) => ({
        history: state.history.filter((item) => item.id !== id),
      })),

      replaceUserData: ({ stocks, history }) => set({
        stocks,
        history,
        activeStockId: stocks.some((stock) => stock.id === get().activeStockId)
          ? get().activeStockId
          : stocks[0]?.id ?? null,
      }),

      clearUserData: () => set({ stocks: [], activeStockId: null, history: [] }),

      // Duplicate stock
      duplicateStock: (id) => {
        const source = get().stocks.find((s) => s.id === id);
        if (!source) return;
        const newId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const duplicate = {
          ...source,
          id: newId,
          name: `${source.name} (Copy)`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          stocks: [...state.stocks, duplicate],
          activeStockId: newId,
        }));
      },

      // Clear all
      clearAll: () => set({ stocks: [], activeStockId: null }),

      // Get active stock
      getActiveStock: () => {
        const state = get();
        return state.stocks.find((s) => s.id === state.activeStockId);
      },
    }),
    {
      name: "calculator-store",
      version: 6,
      migrate: (persistedState) => ({
        ...persistedState,
        activeStockId: persistedState?.stocks?.some((stock) => stock.id === persistedState.activeStockId)
          ? persistedState.activeStockId
          : persistedState?.stocks?.[0]?.id ?? null,
        stocks: (persistedState?.stocks ?? []).map((stock) => ({
          ...stock,
          form: {
            labaTTM: "",
            labaAnnual: "",
            labaProyeksi: "",
            ekuitas: "",
            sahamBeredar: "",
            dividen: "",
            hargaSaham: "",
            marginOfSafety: "",
            ...stock.form,
          },
          per: stock.per ?? 10,
          pbv: stock.pbv ?? 1,
          customPbv: stock.customPbv ?? "",
          unit: stock.unit ?? "miliar",
          thesis: stock.thesis ?? "",
          watchlistReason: stock.watchlistReason ?? "",
          isWatched: stock.isWatched ?? false,
        })),
        history: persistedState?.history ?? [],
        version: 6,
      }),
    }
  )
);
