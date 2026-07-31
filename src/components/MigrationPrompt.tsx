import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, TriangleAlert as AlertTriangle, Check, ArrowRight, Database, Loader as Loader2 } from 'lucide-react';
import { RatingEntry } from '../types';
import { saveEntriesToDB } from '../db';

interface MigrationPromptProps {
  entries: RatingEntry[];
  onProceed: () => void;
  onSkip: () => void;
}

export default function MigrationPrompt({ entries, onProceed, onSkip }: MigrationPromptProps) {
  const [step, setStep] = useState<'intro' | 'exported' | 'confirm'>('intro');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Save locally first
      await saveEntriesToDB(entries);
      try {
        localStorage.setItem('rating-grid-entries', JSON.stringify(entries));
      } catch (e) {
        // Silent quota error
      }

      // Download JSON backup
      const dataStr = JSON.stringify(entries, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const timestamp = new Date().toISOString().split('T')[0];
      const link = document.createElement('a');
      link.setAttribute('href', dataUri);
      link.setAttribute('download', `cinemagrafik-backup-${timestamp}.json`);
      link.click();

      setStep('exported');
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const entryCount = entries.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 24 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="relative w-full max-w-lg bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: 'linear-gradient(135deg, rgba(24,24,27,0.92) 0%, rgba(9,9,11,0.96) 100%)' }}
      >
        {/* Glow accents */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 p-6 border-b border-white/10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center shadow-lg">
                <Database size={22} className="text-amber-400" />
              </div>
              <div>
                <h2 className="font-black text-lg uppercase tracking-tight text-white">Sinhronizacija Baze</h2>
                <p className="text-zinc-400 text-xs mt-0.5">Prije prelaska na cloud, spasi svoje podatke</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 p-6 space-y-5">
          <AnimatePresence mode="wait">
            {step === 'intro' && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex items-start gap-3">
                  <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="text-sm font-bold text-amber-300">Pronađeno {entryCount} lokalnih naslova</p>
                    <p className="text-xs text-zinc-300 leading-relaxed mt-1">
                      Ovo je nova verzija aplikacije koja koristi cloud bazu podataka. Prije nego što se tvoji lokalni podaci sinhronizuju sa cloudom, <strong className="text-white">preporučujemo da spasiš backup kopiju</strong> svoje baze kao JSON fajl na slučaj da nešto pođe po zlu.
                    </p>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Lokalnih naslova</p>
                      <p className="text-2xl font-black text-white font-mono mt-1">{entryCount}</p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-xl">
                      <Database size={14} className="text-amber-400" />
                      <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Lokalna Baza</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-zinc-950 font-black text-sm uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50"
                  >
                    {isExporting ? (
                      <><Loader2 size={18} className="animate-spin" /> Preuzimam...</>
                    ) : (
                      <><Download size={18} /> Spasi Backup (JSON)</>
                    )}
                  </button>
                  <button
                    onClick={onSkip}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-zinc-400 hover:text-zinc-200 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Preskoči i nastavi
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'exported' && (
              <motion.div
                key="exported"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex flex-col items-center justify-center py-4 gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                    <Check size={32} className="text-emerald-400" />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-base text-white">Backup uspješno preuzet!</p>
                    <p className="text-xs text-zinc-400 mt-1">Tvoj JSON fajl je sačuvan. Sada možeš sigurno nastaviti.</p>
                  </div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-4">
                  <p className="text-xs text-emerald-300 leading-relaxed text-left">
                    <strong>Šta sada?</strong> Klikni "Nastavi na Cloud Sync" da bi se tvoji podaci prebacili na cloud bazu. Uvijek možeš vratiti svoje podatke iz backup fajla preko Izvoz alata u aplikaciji.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setStep('confirm')}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-zinc-950 font-black text-sm uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                  >
                    <ArrowRight size={18} /> Nastavi na Cloud Sync
                  </button>
                  <button
                    onClick={() => setStep('intro')}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-zinc-400 hover:text-zinc-200 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Nazad
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'confirm' && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="bg-sky-500/10 border border-sky-500/25 rounded-2xl p-4 flex items-start gap-3">
                  <ArrowRight size={18} className="text-sky-400 shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="text-sm font-bold text-sky-300">Spreman za sinhronizaciju</p>
                    <p className="text-xs text-zinc-300 leading-relaxed mt-1">
                      Tvojih <strong className="text-white">{entryCount} naslova</strong> će biti prebačeno na cloud bazu podataka. Nakon ovoga, svi registrovani korisnici će vidjeti isti katalog. Ovo će zamijeniti sve postojeće lokalne podatke sa cloud verzijom.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={onProceed}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-white font-black text-sm uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-sky-500/20"
                  >
                    <Check size={18} /> Potvrdi i Sinhronizuj
                  </button>
                  <button
                    onClick={() => setStep('exported')}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-zinc-400 hover:text-zinc-200 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Nazad
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
