import { Trash2 } from "lucide-react";

const formatRp = (value) => new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 2,
}).format(value || 0);

export function HistoryPanel({ history, onDelete, onOpen }) {
  return (
    <section className="card history-panel">
      <div className="history-heading">
        <div>
          <p className="summary-eyebrow">TERSIMPAN DI AKUN ANDA</p>
          <h2 className="section-title">Riwayat Penghitungan</h2>
        </div>
        <span className="history-count">{history.length} catatan</span>
      </div>
      {history.length === 0 ? (
          <p className="history-empty">Belum ada riwayat. Hasil valuasi yang valid akan tersimpan otomatis.</p>
      ) : (
        <div className="history-list">
          {history.map((item) => (
            <article
              className={`history-item ${onOpen ? "history-item-clickable" : ""}`}
              key={item.id}
              onClick={() => onOpen?.(item)}
              onKeyDown={(event) => {
                if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  onOpen?.(item);
                }
              }}
              role={onOpen ? "button" : undefined}
              tabIndex={onOpen ? 0 : undefined}
              aria-label={onOpen ? `Buka hasil perhitungan ${item.stockName}` : undefined}
            >
              <div className="history-item-main">
                <div className="history-item-title">
                  <strong>{item.stockName}</strong>
                  {onOpen && <span className="history-open-hint">Klik untuk membuka hitungan ini</span>}
                  <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</time>
                </div>
                <div className="history-values">
                  <span>{item.scenarioLabel}</span>
                  <span>Wajar <strong>{formatRp(item.averagePrice)}</strong></span>
                  {item.currentPrice > 0 && <span>Pasar <strong>{formatRp(item.currentPrice)}</strong></span>}
                  {item.mosPrice !== null && <span>Target MOS <strong>{formatRp(item.mosPrice)}</strong></span>}
                </div>
              </div>
              <button type="button" className="tab-icon danger" aria-label={`Hapus riwayat ${item.stockName}`} onClick={(event) => { event.stopPropagation(); onDelete(item.id); }}>
                <Trash2 size={16} />
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
