import React, { useState, useEffect } from 'react';
import { RatingEntry, Season, Episode } from '../types';
import { X, Save, AlertCircle, HelpCircle, Film, Star, Link, ListCollapse, ChevronRight } from 'lucide-react';

interface BulkEditModalProps {
  entry: RatingEntry;
  onClose: () => void;
  onSaveAll: (updatedSeasons: Season[]) => void;
}

export default function BulkEditModal({ entry, onClose, onSaveAll }: BulkEditModalProps) {
  const seasons = entry.seasons || [];
  
  // State for active season to design in bulk
  const [selectedSeasonNum, setSelectedSeasonNum] = useState<number>(() => {
    return seasons.length > 0 ? seasons[0].seasonNumber : 1;
  });

  // Local copy of all seasons so user can jump between seasons and save everything at the end
  const [localSeasons, setLocalSeasons] = useState<Season[]>(() => JSON.parse(JSON.stringify(seasons)));

  // Active season state being edited in bulk
  const activeSeason = localSeasons.find(s => s.seasonNumber === selectedSeasonNum);
  const activeEpisodes = activeSeason ? activeSeason.episodes : [];

  // Update original seasons if entry changes
  useEffect(() => {
    setLocalSeasons(JSON.parse(JSON.stringify(entry.seasons || [])));
    if (entry.seasons && entry.seasons.length > 0 && !entry.seasons.some(s => s.seasonNumber === selectedSeasonNum)) {
      setSelectedSeasonNum(entry.seasons[0].seasonNumber);
    }
  }, [entry, selectedSeasonNum]);

  // Method to handle cell changes
  const handleEpisodeChange = (episodeId: string, field: keyof Episode, value: any) => {
    setLocalSeasons(prevSeasons => {
      return prevSeasons.map(s => {
        if (s.seasonNumber === selectedSeasonNum) {
          const updatedEpisodes = s.episodes.map(ep => {
            if (ep.id === episodeId) {
              return {
                ...ep,
                [field]: field === 'rating' ? (isNaN(Number(value)) ? 0 : Number(value)) : value
              };
            }
            return ep;
          });
          return { ...s, episodes: updatedEpisodes };
        }
        return s;
      });
    });
  };

  const handleSave = () => {
    onSaveAll(localSeasons);
  };

  // Helper colors for rating cell indicators
  const getRatingInputBg = (rating: number) => {
    if (rating >= 9.5) return 'bg-emerald-950/40 border-emerald-500 text-emerald-400';
    if (rating >= 9.0) return 'bg-teal-950/40 border-teal-500 text-teal-400';
    if (rating >= 8.0) return 'bg-green-950/40 border-green-500 text-green-400';
    if (rating >= 7.0) return 'bg-lime-950/40 border-yellow-500 text-yellow-400';
    if (rating >= 6.0) return 'bg-amber-950/40 border-amber-500 text-amber-500';
    if (rating >= 4.0) return 'bg-orange-950/40 border-orange-500 text-orange-500';
    if (rating > 0) return 'bg-red-950/40 border-red-500 text-red-400';
    return 'bg-zinc-950 border-zinc-800 text-zinc-500';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md" id="bulk-edit-modal-backdrop">
      <div className="relative w-full max-w-5xl bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 text-zinc-300 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-fade-in">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-zinc-800 pb-4 mb-4 shrink-0">
          <div className="text-left">
            <h2 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
              <ListCollapse className="text-yellow-400" size={18} />
              Brzo i masovno uređivanje epizoda (Bulk Edit)
            </h2>
            <p className="text-[11px] text-zinc-500 mt-1 max-w-xl">
              Uređujte nazive, ocjene, opise i linkove za sve epizode u tabeli na jednom mjestu. Pritisnite dugme "Spremi sve" ispod kako biste zadržali promjene u bazi.
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white p-1.5 rounded-full shrink-0 transition"
          >
            <X size={15} />
          </button>
        </div>

        {/* Action Topbar Selection */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-950/40 border border-zinc-850 p-3 rounded-2xl mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              {entry.type === 'universe' ? 'Odaberi fazu:' : 'Odaberi sezonu za uređivanje:'}
            </span>
            <div className="flex flex-wrap gap-1">
              {localSeasons.map((s) => (
                <button
                  key={`bulk-tab-s-${s.seasonNumber}`}
                  type="button"
                  onClick={() => setSelectedSeasonNum(s.seasonNumber)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    selectedSeasonNum === s.seasonNumber
                      ? 'bg-yellow-400 text-zinc-950 shadow-md'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {entry.type === 'universe' ? (s.seasonName || `Faza ${s.seasonNumber}`) : `Sezona ${s.seasonNumber}`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-zinc-500 bg-zinc-900 px-3 py-1.5 rounded-lg">
            <AlertCircle size={12} className="text-yellow-500 shrink-0" />
            <span>Broj epizoda u ovoj sezoni: <strong className="text-zinc-200">{activeEpisodes.length}</strong></span>
          </div>
        </div>

        {/* Central interactive grid list table */}
        <div className="flex-1 overflow-y-auto pr-1 min-h-[250px]">
          {activeEpisodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-zinc-800 rounded-2xl h-full">
              <Film size={32} className="text-zinc-650 mb-2" />
              <p className="text-sm text-zinc-500">Ova sezona trenutno nema registrovanih epizoda ili stavki.</p>
              <p className="text-xs text-zinc-600 mt-1">U zatvorenom prozoru dodajte epizode u matricu na "+St" ili "Vel".</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Desktop Table Layout for extremely speed entry */}
              <div className="hidden md:block w-full text-left">
                <table className="w-full text-xs text-zinc-300 border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 text-[9px] uppercase tracking-wider">
                      <th className="py-2.5 px-2 font-bold w-12 text-center">EP</th>
                      <th className="py-2.5 px-2 font-bold w-48">NAZIV EPIZODE / STAVKE</th>
                      <th className="py-2.5 px-3 font-bold w-24 text-center">OCJENA</th>
                      <th className="py-2.5 px-2 font-bold">OPIS / OVERVIEW</th>
                      <th className="py-2.5 px-2 font-bold w-48">TRAILER / YOUTUBE URL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850">
                    {activeEpisodes.map((ep) => (
                      <tr key={`bulk-row-${ep.id}`} className="hover:bg-zinc-850/25 transition">
                        {/* Ep num */}
                        <td className="py-3 px-2 font-mono font-bold text-center text-zinc-500 text-xs">
                          E{ep.episodeNumber}
                        </td>
                        
                        {/* Title input */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={ep.name}
                            onChange={(e) => handleEpisodeChange(ep.id, 'name', e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 roundedpx-2 px-2 py-1.5 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-yellow-450 focus:bg-zinc-950/90"
                            placeholder={`npr. Epizoda ${ep.episodeNumber}`}
                          />
                        </td>

                        {/* Rating block (recolors dynamically based on values, like original) */}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0.0}
                              max={10.0}
                              step={0.1}
                              value={ep.rating === 0 ? '' : ep.rating}
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                if (!isNaN(val)) {
                                  const clamped = Math.min(10.0, Math.max(0.0, val));
                                  handleEpisodeChange(ep.id, 'rating', clamped);
                                }
                              }}
                              className={`w-14 text-center font-mono font-black border rounded px-1.5 py-1 text-xs focus:outline-none ${getRatingInputBg(ep.rating)}`}
                              placeholder="0.0"
                            />
                            <span className="text-[10px] text-zinc-550 font-mono">/10</span>
                          </div>
                        </td>

                        {/* Overview description box */}
                        <td className="py-2 px-2">
                          <textarea
                            value={ep.overview || ''}
                            onChange={(e) => handleEpisodeChange(ep.id, 'overview', e.target.value)}
                            rows={1}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-yellow-450 resize-y min-h-[34px] max-h-20"
                            placeholder="Unesite kratki opis radnje, bitne događaje ili prekretnice..."
                          />
                        </td>

                        {/* YouTube URL link */}
                        <td className="py-2 px-2">
                          <div className="relative">
                            <span className="absolute inset-y-0 left-2 flex items-center text-zinc-600">
                              <Link size={10} />
                            </span>
                            <input
                              type="text"
                              value={ep.youtubeUrl || ''}
                              onChange={(e) => handleEpisodeChange(ep.id, 'youtubeUrl', e.target.value)}
                              className="w-full pl-6 pr-2 bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-yellow-450"
                              placeholder="https://www.youtube.com/watch?..."
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card-Based Layout for ease on phones/tablets */}
              <div className="block md:hidden space-y-3">
                {activeEpisodes.map((ep) => (
                  <div key={`bulk-card-${ep.id}`} className="bg-zinc-950/40 p-4 border border-zinc-850 rounded-xl space-y-3 text-left">
                    <div className="flex justify-between items-center bg-zinc-950 p-2 rounded-lg">
                      <span className="text-xs font-mono font-black text-yellow-405">EPIZODA E{ep.episodeNumber}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase">Ocjena:</span>
                        <input
                          type="number"
                          min={0.0}
                          max={10.0}
                          step={0.1}
                          value={ep.rating === 0 ? '' : ep.rating}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              handleEpisodeChange(ep.id, 'rating', Math.min(10.0, Math.max(0.0, val)));
                            }
                          }}
                          className={`w-14 text-center font-mono font-black border rounded px-1.5 py-0.5 text-xs focus:outline-none ${getRatingInputBg(ep.rating)}`}
                          placeholder="0.0"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[9px] uppercase font-bold text-zinc-500">Ime / Naziv epizode</label>
                      <input
                        type="text"
                        value={ep.name}
                        onChange={(e) => handleEpisodeChange(ep.id, 'name', e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white"
                        placeholder="npr. Pilot"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[9px] uppercase font-bold text-zinc-500">Opis radnje epizode (Overview)</label>
                      <textarea
                        value={ep.overview || ''}
                        onChange={(e) => handleEpisodeChange(ep.id, 'overview', e.target.value)}
                        rows={2}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-300 resize-none"
                        placeholder="Kratki sinopsis..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[9px] uppercase font-bold text-zinc-500">Video Link / YouTube URL</label>
                      <input
                        type="text"
                        value={ep.youtubeUrl || ''}
                        onChange={(e) => handleEpisodeChange(ep.id, 'youtubeUrl', e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-300"
                        placeholder="Link klipa/najave"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="pt-4 border-t border-zinc-800 flex justify-between items-center shrink-0 mt-3.5">
          <button
            type="button"
            onClick={onClose}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold text-xs uppercase px-4 py-2.5 rounded-xl cursor-pointer transition"
          >
            Odustani
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 bg-yellow-405 hover:bg-yellow-500 text-zinc-950 font-black text-xs uppercase px-5 py-3 rounded-xl cursor-pointer transition shadow-lg shadow-yellow-500/5 active:scale-95"
          >
            <Save size={14} /> Spremi sve izmjene
          </button>
        </div>

      </div>
    </div>
  );
}
