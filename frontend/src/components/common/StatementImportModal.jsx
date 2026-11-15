import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { formatCurrency } from '../../utils/format';
import {
  FileSpreadsheet,
  Upload,
  X,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function StatementImportModal({ isOpen, onClose, onImportComplete }) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);

  const [csvText, setCsvText] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewRows, setPreviewRows] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  if (!isOpen) return null;

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setCsvText(text);
      fetchPreview(text);
    };
    reader.readAsText(file);
  }

  async function fetchPreview(text) {
    if (!text || !text.trim()) return;
    setLoading(true);
    try {
      const res = await api.post('/import/preview', { csv_text: text });
      setPreviewRows(res.data.rows || []);
    } catch (err) {
      alert('Could not parse CSV. Please ensure it has Date, Amount, and Description columns.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmImport() {
    if (!csvText) return;
    setImporting(true);
    try {
      const res = await api.post('/import/csv', { csv_text: csvText });
      setImportResult(res.data);
      if (onImportComplete) onImportComplete();
    } catch (err) {
      alert('Import failed. Please try again.');
    } finally {
      setImporting(false);
    }
  }

  function handleReset() {
    setCsvText('');
    setPreviewRows(null);
    setImportResult(null);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card-brutal w-full max-w-lg bg-surface border-3 border-border shadow-sticker-lg overflow-hidden animate-scale-in max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b-2 border-border flex items-center justify-between bg-bg shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">📄</span>
            <div>
              <h3 className="text-sm font-heading font-black text-text">Statement Import</h3>
              <p className="text-[10px] font-bold text-text-muted">CSV bank/wallet statement autodetection</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-border bg-surface flex items-center justify-center text-text-muted hover:text-text"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {importResult ? (
            <div className="p-6 text-center space-y-3 animate-scale-in">
              <div className="w-14 h-14 rounded-2xl border-2 border-border bg-primary/20 text-primary mx-auto flex items-center justify-center text-2xl">
                ✓
              </div>
              <h4 className="text-base font-heading font-black text-text">Import Complete!</h4>
              <p className="text-xs font-bold text-text-muted">
                Successfully imported {importResult.imported} transactions into your personal tracker ({importResult.skipped} duplicate/invalid entries skipped).
              </p>
              <button
                type="button"
                onClick={onClose}
                className="btn-brutal py-2.5 px-6 text-xs font-heading font-black"
              >
                View in Activity
              </button>
            </div>
          ) : !previewRows ? (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 border-2 border-dashed border-border rounded-2xl bg-bg text-center cursor-pointer hover:border-primary transition-colors space-y-2"
              >
                <Upload size={28} className="mx-auto text-primary" />
                <div>
                  <p className="text-xs font-heading font-black text-text">
                    Upload Bank or UPI Statement (.csv)
                  </p>
                  <p className="text-[10px] text-text-muted font-medium mt-0.5">
                    Supports Paytm, Google Pay, SBI, HDFC, ICICI, Kotak, Axis exports
                  </p>
                </div>
              </div>

              <div className="text-center text-xs font-heading font-black text-text-muted">
                — OR PASTE CSV TEXT —
              </div>

              <textarea
                rows={3}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Date,Description,Amount&#10;2026-11-15,Swiggy,340&#10;2026-11-14,Metro Recharge,200"
                className="w-full bg-bg border-2 border-border rounded-xl p-2.5 text-xs font-mono font-bold text-text focus:outline-none"
              />

              <button
                type="button"
                disabled={loading || !csvText.trim()}
                onClick={() => fetchPreview(csvText)}
                className="btn-brutal w-full py-2.5 text-xs font-heading font-black"
              >
                {loading ? 'Analyzing Statement...' : 'Preview Detected Spends'}
              </button>
            </div>
          ) : (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between text-xs font-heading font-bold">
                <span>Detected {previewRows.length} Spends</span>
                <span className="text-[10px] text-text-muted">Review before saving</span>
              </div>

              {/* Review Table */}
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {previewRows.map((row, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-xl border text-xs flex items-center justify-between ${
                      row.is_duplicate ? 'bg-accent/10 border-accent/40' : 'bg-surface border-border'
                    }`}
                  >
                    <div className="truncate mr-2">
                      <p className="font-heading font-bold text-text truncate">
                        {row.merchant}
                      </p>
                      <p className="text-[10px] text-text-muted flex items-center gap-1">
                        <span>{row.date}</span>
                        <span>•</span>
                        <span className="capitalize">{row.category_id}</span>
                        {row.is_duplicate && (
                          <span className="text-accent font-black">⚠️ Possible Duplicate</span>
                        )}
                      </p>
                    </div>

                    <span className="font-heading font-black text-expense shrink-0">
                      ₹{row.amount}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-2.5 rounded-xl border border-border bg-surface text-xs font-bold text-text flex-1"
                >
                  Upload Different File
                </button>
                <button
                  type="button"
                  disabled={importing}
                  onClick={handleConfirmImport}
                  className="btn-brutal py-2.5 px-4 text-xs font-heading font-black flex-1"
                >
                  {importing ? 'Importing...' : `Import ${previewRows.length} Spends ✓`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
