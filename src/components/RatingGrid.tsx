import React, { useState } from 'react';
import { motion } from 'motion/react';
import { RatingEntry, Episode } from '../types';
import { getRatingColorClass } from '../utils';
import { Grid, Layers, Plus, TrendingUp, Edit } from 'lucide-react';

interface RatingGridProps {
  entry: RatingEntry;
  onEpisodeClick: (seasonNumber: number, episode: Episode) => void;
  onAddEpisodeToSeason: (seasonNumber: number) => void;
  onAddSeason: () => void;
  onSetSeasonEpisodeCount?: (seasonNumber: number, count: number) => void;
  onBulkEdit: () => void;
}

export default function RatingGrid({
  entry,
  onEpisodeClick,
  onAddEpisodeToSeason,
  onAddSeason,
  onSetSeasonEpisodeCount,
  onBulkEdit
}: RatingGridProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'inverted'>('grid');
  const [editingSeasonNum, setEditingSeasonNum] = useState<number | null>(null);
  const [customEpValue, setCustomEpValue] = useState<number>(0);
  
  if (!entry.seasons || entry.seasons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-zinc-900/40 rounded-xl border border-zinc-800">
        <p className="text-zinc-400 mb-4 text-center">No seasons defined yet for this series.</p>
        <button
          onClick={onAddSeason}
          id="btn-add-first-season"
          className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-555 text-zinc-950 px-4 py-2 rounded-lg font-semibold transitionTime active:scale-95 text-xs font-bold uppercase tracking-wider"
        >
          <Plus size={18} /> First Season
        </button>
      </div>
    );
  }

  // Calculate grid layout sizes
  const seasons = entry.seasons || [];
  const maxEpisodes = Math.max(...seasons.map(s => (s.episodes || []).length), 0);
  
  // Calculate counts for legend stats
  const stats = {
    cinema: 0,
    awesome: 0,
    great: 0,
    good: 0,
    average: 0,
    bad: 0,
    garbage: 0
  };

  seasons.forEach(s => {
    (s.episodes || []).forEach(e => {
      const r = e.rating;
      if (r >= 9.5) stats.cinema++;
      else if (r >= 9.0) stats.awesome++;
      else if (r >= 8.0) stats.great++;
      else if (r >= 7.0) stats.good++;
      else if (r >= 6.0) stats.average++;
      else if (r >= 4.0) stats.bad++;
      else if (r > 0) stats.garbage++;
    });
  });

  return (
    <div className="w-full bg-zinc-950 text-slate-100 rounded-2xl p-4 sm:p-6 border border-zinc-900 mt-6" id={`rating-grid-${entry.id}`}>
      {/* View Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-zinc-805 pb-4">
        <div className="flex items-center gap-3">
          <Layers className="text-yellow-400" size={20} />
          <h3 className="font-semibold text-lg tracking-wide text-zinc-100 uppercase text-xs font-mono animate-pulse">
            {entry.type === 'universe' ? 'Matrica ocjena faza i stavki' : 'Matrica ocjena sezona i epizoda'}
          </h3>
        </div>
        
        <div className="flex items-center gap-2" id="grid-view-toggles">
          <button
            onClick={() => setViewMode('grid')}
            id="toggle-grid-standard"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-zinc-800 text-yellow-405 border border-zinc-700'
                : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200'
            }`}
          >
            <Grid size={14} /> Grid (Mreža)
          </button>
          <button
            onClick={() => setViewMode('inverted')}
            id="toggle-grid-inverted"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              viewMode === 'inverted'
                ? 'bg-zinc-800 text-yellow-405 border border-zinc-700'
                : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200'
            }`}
          >
            <TrendingUp size={14} /> Inverted (Obrnuto)
          </button>
          
          <button
            onClick={onAddSeason}
            id="btn-quick-add-season"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
            title={entry.type === 'universe' ? "Dodaj novu fazu/kategoriju" : "Dodaj novu sezonu"}
          >
            <Plus size={14} /> {entry.type === 'universe' ? 'Dodaj Fazu' : 'Dodaj Sezonu'}
          </button>

          <button
            onClick={onBulkEdit}
            id="btn-bulk-edit-episodes"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
            title="Masovni i brzi unos opisa, linkova te ocjena za sve epizode odjednom"
          >
            <Edit size={12} /> Brzi Unos (Bulk)
          </button>
        </div>
      </div>

      {/* Grid container with responsive horizontal scroll */}
      <div className="w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-805 scrollbar-track-transparent">
        {viewMode === 'grid' ? (
          /* STANDARD GRID: Columns = Seasons, Rows = Episode Indices */
          <div className="min-w-[450px] select-none">
            {/* Header: Seasons cols S1, S2, ... */}
            <div className="grid gap-2 mb-3 items-center text-center" style={{ gridTemplateColumns: `3.5rem repeat(${seasons.length || 1}, minmax(3.5rem, 1fr))` }}>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-left pl-1 font-mono">
                {entry.type === 'universe' ? 'ST' : 'EP'}
              </span>
              {seasons.map(s => (
                <div key={`col-sh-${s.seasonNumber}`} className="flex flex-col items-center justify-center relative min-h-[4.2rem] px-1">
                  {editingSeasonNum === s.seasonNumber ? (
                    <div className="flex flex-col items-center gap-1 bg-zinc-900 px-2 py-1.5 rounded-xl border border-zinc-800 absolute z-10 w-28 shadow-xl top-0">
                      <span className="text-[9px] uppercase font-bold text-zinc-400">
                        {entry.type === 'universe' ? `Vel.:` : `S${s.seasonNumber} Ep:`}
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={35}
                        value={customEpValue}
                        onChange={e => setCustomEpValue(Math.max(1, Number(e.target.value)))}
                        className="w-12 bg-zinc-950 text-yellow-450 font-mono text-center font-bold text-xs rounded border border-zinc-800 px-1 py-0.5 focus:outline-none"
                      />
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (onSetSeasonEpisodeCount) {
                              onSetSeasonEpisodeCount(s.seasonNumber, customEpValue);
                            }
                            setEditingSeasonNum(null);
                          }}
                          className="px-1.5 py-0.5 bg-yellow-405 hover:bg-yellow-500 text-zinc-950 font-black rounded text-[9px] uppercase cursor-pointer"
                        >
                          Postavi
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSeasonNum(null)}
                          className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-350 rounded text-[9px] cursor-pointer"
                        >
                          X
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="text-[10px] sm:text-xs font-extrabold text-zinc-200 tracking-wider truncate max-w-full block" title={s.seasonName || `S${s.seasonNumber}`}>
                        {entry.type === 'universe' ? (s.seasonName || `Faza ${s.seasonNumber}`) : (s.seasonName || `Sezona ${s.seasonNumber}`)}
                      </span>
                      <div className="flex items-center gap-1 mt-0.5 shrink-0">
                        <button
                          onClick={() => onAddEpisodeToSeason(s.seasonNumber)}
                          className="px-1.5 py-0.5 text-[8px] font-bold text-emerald-400 hover:bg-zinc-900 rounded transition-colors cursor-pointer border border-zinc-800/40"
                          title={entry.type === 'universe' ? "Dodaj stavku" : "Dodaj epizodu"}
                        >
                          +St
                        </button>
                        <button
                          onClick={() => {
                            setCustomEpValue((s.episodes || []).length);
                            setEditingSeasonNum(s.seasonNumber);
                          }}
                          className="px-1.5 py-0.5 text-[8px] font-bold text-yellow-405 hover:bg-zinc-900 rounded transition-colors cursor-pointer border border-zinc-800/40"
                          title="Promijeni broj stavki"
                        >
                          Vel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Rows: Each row represent an Episode Index (1 to maxEpisodes) */}
            <div className="space-y-2">
              {Array.from({ length: maxEpisodes }).map((_, epIndex) => {
                const epNum = epIndex + 1;
                return (
                  <div key={`row-ep-${epNum}`} className="grid gap-2 items-center text-center" style={{ gridTemplateColumns: `3.5rem repeat(${seasons.length || 1}, minmax(3rem, 1fr))` }}>
                    {/* Index label (E1, E2, ...) */}
                    <span className="text-xs font-mono font-bold text-zinc-500 text-left pl-1">E{epNum}</span>
                    
                    {/* Cells for seasons */}
                    {seasons.map(s => {
                      const episode = (s.episodes || []).find(e => e.episodeNumber === epNum);
                      
                      if (!episode) {
                        return (
                          <div
                            key={`cell-${s.seasonNumber}-${epNum}`}
                            className="h-11 rounded-lg border border-zinc-900 bg-zinc-950/20 flex items-center justify-center text-zinc-700 text-xs font-mono"
                          >
                            -
                          </div>
                        );
                      }
                      
                      return (
                        <motion.button
                          key={`cell-${s.seasonNumber}-${epNum}`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onEpisodeClick(s.seasonNumber, episode)}
                          id={`episode-cell-s${s.seasonNumber}e${epNum}`}
                          className={`h-11 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer font-sans font-extrabold ${getRatingColorClass(episode.rating)}`}
                        >
                          <span className="text-sm tracking-tighter">{episode.rating.toFixed(1)}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* INVERTED GRID: Columns = Episodes, Rows = Seasons */
          <div className="min-w-[450px] select-none space-y-2">
            {/* Header: Episodes cols E1, E2, E3 */}
            <div className="grid gap-2 mb-3 items-center text-center" style={{ gridTemplateColumns: `3.5rem repeat(${maxEpisodes || 1}, minmax(3.5rem, 1fr))` }}>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest text-left pl-1 font-mono">
                {entry.type === 'universe' ? 'KP' : 'SZ'}
              </span>
              {Array.from({ length: maxEpisodes }).map((_, epIndex) => (
                <span key={`col-eh-${epIndex}`} className="text-xs font-extrabold text-zinc-400 tracking-wider">
                  {entry.type === 'universe' ? `ST${epIndex + 1}` : `E${epIndex + 1}`}
                </span>
              ))}
            </div>

            {/* Rows: Each row is a Season */}
            {seasons.map(s => (
              <div key={`row-seas-${s.seasonNumber}`} className="grid gap-2 items-center text-center" style={{ gridTemplateColumns: `3.5rem repeat(${maxEpisodes || 1}, minmax(3.5rem, 1fr))` }}>
                <div className="flex flex-col items-start pl-1 text-left min-w-[3.5rem] relative">
                  {editingSeasonNum === s.seasonNumber ? (
                    <div className="flex flex-col items-center gap-1 bg-zinc-900 p-2 rounded-xl border border-zinc-800 absolute z-10 w-28 shadow-xl left-0 top-0">
                      <span className="text-[8px] uppercase font-black text-zinc-400">Izmjena:</span>
                      <input
                        type="number"
                        min={1}
                        max={35}
                        value={customEpValue}
                        onChange={e => setCustomEpValue(Math.max(1, Number(e.target.value)))}
                        className="w-12 bg-zinc-950 text-yellow-405 font-mono text-center font-bold text-xs rounded border border-zinc-800 px-1 py-0.5 focus:outline-none"
                      />
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (onSetSeasonEpisodeCount) {
                              onSetSeasonEpisodeCount(s.seasonNumber, customEpValue);
                            }
                            setEditingSeasonNum(null);
                          }}
                          className="px-1.5 py-0.5 bg-yellow-405 hover:bg-yellow-500 text-zinc-950 font-black rounded text-[8px] uppercase cursor-pointer"
                        >
                          Snimi
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSeasonNum(null)}
                          className="px-1.5 py-0.5 bg-zinc-850 hover:bg-zinc-700 text-zinc-350 rounded text-[8px] cursor-pointer"
                        >
                          X
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="text-[10px] sm:text-xs font-extrabold text-zinc-300 truncate max-w-full block" title={s.seasonName || `S${s.seasonNumber}`}>
                        {entry.type === 'universe' ? (s.seasonName || `Faza ${s.seasonNumber}`) : (s.seasonName || `Sezona ${s.seasonNumber}`)}
                      </span>
                      <div className="flex flex-col gap-0.5 mt-0.5 text-[8px] font-bold text-zinc-550">
                        <button
                          onClick={() => onAddEpisodeToSeason(s.seasonNumber)}
                          className="hover:text-emerald-400 hover:underline text-left transition-colors font-extrabold uppercase cursor-pointer"
                        >
                          + Dodaj
                        </button>
                        <button
                          onClick={() => {
                            setCustomEpValue((s.episodes || []).length);
                            setEditingSeasonNum(s.seasonNumber);
                          }}
                          className="hover:text-yellow-455 hover:underline text-left transition-colors font-extrabold uppercase cursor-pointer"
                        >
                          Vel.
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {Array.from({ length: maxEpisodes }).map((_, epIndex) => {
                  const epNum = epIndex + 1;
                  const episode = (s.episodes || []).find(e => e.episodeNumber === epNum);

                  if (!episode) {
                    return (
                      <div
                        key={`cell-inv-${s.seasonNumber}-${epNum}`}
                        className="h-11 rounded-lg border border-zinc-900 bg-zinc-950/20 flex items-center justify-center text-zinc-700 text-xs font-mono"
                      >
                        -
                      </div>
                    );
                  }

                  return (
                    <motion.button
                      key={`cell-inv-${s.seasonNumber}-${epNum}`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onEpisodeClick(s.seasonNumber, episode)}
                      id={`episode-cell-inv-s${s.seasonNumber}e${epNum}`}
                      className={`h-11 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer font-sans font-extrabold ${getRatingColorClass(episode.rating)}`}
                    >
                      <span className="text-sm tracking-tighter">{episode.rating.toFixed(1)}</span>
                    </motion.button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grid Legend & Statistical breakdowns (matches styling of the user image) */}
      <div className="mt-8 border-t border-zinc-808/60 pt-6">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4 font-mono">
          Vodič kroz ocjene i statistika unosa
        </h4>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
          <div className="flex items-center gap-2 text-zinc-300">
            <span className="w-3 h-3 rounded-full bg-sky-500 block shrink-0" />
            <div>
              <p className="font-semibold text-zinc-200">Absolute Cinema</p>
              <p className="text-[10px] text-zinc-550">9.5 - 10 ({stats.cinema})</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-zinc-300">
            <span className="w-3 h-3 rounded-full bg-emerald-600 block shrink-0" />
            <div>
              <p className="font-semibold text-zinc-200 font-sans">Sjajno</p>
              <p className="text-[10px] text-zinc-550">9.0 - 9.4 ({stats.awesome})</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-zinc-300">
            <span className="w-3 h-3 rounded-full bg-emerald-500 block shrink-0" />
            <div>
              <p className="font-semibold text-zinc-200">Odlično</p>
              <p className="text-[10px] text-zinc-550">8.0 - 8.9 ({stats.great})</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-zinc-300">
            <span className="w-3 h-3 rounded-full bg-amber-400 block shrink-0" />
            <div>
              <p className="font-semibold text-zinc-200">Dobro</p>
              <p className="text-[10px] text-zinc-550">7.0 - 7.9 ({stats.good})</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-zinc-300">
            <span className="w-3 h-3 rounded-full bg-orange-500 block shrink-0" />
            <div>
              <p className="font-semibold text-zinc-200">Prosječno</p>
              <p className="text-[10px] text-zinc-550">6.0 - 6.9 ({stats.average})</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-zinc-300">
            <span className="w-3 h-3 rounded-full bg-red-500 block shrink-0" />
            <div>
              <p className="font-semibold text-zinc-200 font-sans">Loše</p>
              <p className="text-[10px] text-zinc-550">4.0 - 5.9 ({stats.bad})</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-zinc-300">
            <span className="w-3 h-3 rounded-full bg-purple-600 block shrink-0" />
            <div>
              <p className="font-semibold text-zinc-200">Smeće</p>
              <p className="text-[10px] text-zinc-550">&lt; 4.0 ({stats.garbage})</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
