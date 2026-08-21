import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RatingEntry, Episode } from '../types';
import { getRatingColorClass } from '../utils';
import { Grid, Layers, Plus, TrendingUp, Edit, Edit2, Trash2, List, LayoutGrid, Star, ChevronRight } from 'lucide-react';

interface RatingGridProps {
  entry: RatingEntry;
  onEpisodeClick: (seasonNumber: number, episode: Episode) => void;
  onAddEpisodeToSeason: (seasonNumber: number) => void;
  onAddSeason: () => void;
  onSetSeasonEpisodeCount?: (seasonNumber: number, count: number) => void;
  onBulkEdit: () => void;
  onDeleteSeason?: (seasonNumber: number) => void;
}

export default function RatingGrid({
  entry,
  onEpisodeClick,
  onAddEpisodeToSeason,
  onAddSeason,
  onSetSeasonEpisodeCount,
  onBulkEdit,
  onDeleteSeason
}: RatingGridProps) {
  const seasons = entry.seasons || [];
  const [selectedSeasonNum, setSelectedSeasonNum] = useState<number>(seasons[0]?.seasonNumber || 1);
  const [viewMode, setViewMode] = useState<'season' | 'grid' | 'inverted'>('grid');
  const [mobileSubView, setMobileSubView] = useState<'grid' | 'list'>('grid');
  const [editingSeasonNum, setEditingSeasonNum] = useState<number | null>(null);
  const [customEpValue, setCustomEpValue] = useState<number>(0);

  if (!entry.seasons || entry.seasons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-zinc-900/40 rounded-2xl border border-zinc-800 text-center">
        <p className="text-zinc-400 mb-4 text-xs sm:text-sm">
          {entry.type === 'universe' ? 'Još uvijek nema definisanih faza/kategorija za ovaj univerzum.' : 'Još uvijek nema definisanih sezona za ovu seriju.'}
        </p>
        <button
          onClick={onAddSeason}
          id="btn-add-first-season"
          className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-950 px-4 py-2.5 rounded-xl font-bold transition active:scale-95 text-xs uppercase tracking-wider shadow-md cursor-pointer"
        >
          <Plus size={16} /> {entry.type === 'universe' ? 'Dodaj Prvu Fazu' : 'Dodaj Prvu Sezonu'}
        </button>
      </div>
    );
  }

  // Ensure active selected season exists
  const activeSeason = seasons.find(s => s.seasonNumber === selectedSeasonNum) || seasons[0];
  const maxEpisodes = Math.max(...seasons.map(s => (s.episodes || []).length), 0);

  // Calculate statistics
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

  const calculateSeasonAvg = (s: typeof seasons[0]) => {
    const eps = s.episodes || [];
    if (eps.length === 0) return 0;
    const sum = eps.reduce((acc, curr) => acc + curr.rating, 0);
    return sum / eps.length;
  };

  return (
    <div className="w-full bg-zinc-950/60 backdrop-blur-xl text-slate-100 rounded-2xl sm:rounded-3xl p-3 sm:p-6 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] mt-4 sm:mt-6 relative overflow-hidden" id={`rating-grid-${entry.id}`}>
      {/* Background glow */}
      <div className="absolute -top-24 -left-24 w-60 h-60 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* TOP CONTROLS & VIEW TOGGLES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 mb-4 sm:mb-6 border-b border-zinc-800/80 pb-3 sm:pb-4">
        <div className="flex items-center gap-2">
          <Layers className="text-yellow-400 shrink-0" size={16} />
          <h3 className="font-bold text-xs sm:text-base tracking-wide text-zinc-100 uppercase font-mono truncate">
            {entry.type === 'universe' ? 'Faze i stavke' : 'Sezone i epizode'}
          </h3>
        </div>
        
        {/* View Mode Switcher */}
        <div className="flex flex-wrap items-center gap-1.5" id="grid-view-toggles">
          <div className="flex items-center bg-zinc-900/90 p-0.5 rounded-xl border border-zinc-800">
            <button
              onClick={() => setViewMode('season')}
              id="toggle-grid-season"
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === 'season'
                  ? 'bg-yellow-400 text-zinc-955 shadow-sm font-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Mobilni optimizovan prikaz po sezonama"
            >
              <LayoutGrid size={11} />
              <span>Sezone</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              id="toggle-grid-standard"
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-yellow-400 text-zinc-955 shadow-sm font-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Klasična matrica u punoj širini"
            >
              <Grid size={11} />
              <span>Matrica</span>
            </button>
            <button
              onClick={() => setViewMode('inverted')}
              id="toggle-grid-inverted"
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === 'inverted'
                  ? 'bg-yellow-400 text-zinc-955 shadow-sm font-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Obrnuti tabelarni prikaz"
            >
              <TrendingUp size={11} />
              <span className="hidden xs:inline">Obrnuto</span>
            </button>
          </div>
          
          <button
            onClick={onAddSeason}
            id="btn-quick-add-season"
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition active:scale-95 cursor-pointer ml-auto sm:ml-0"
            title={entry.type === 'universe' ? "Dodaj novu fazu/kategoriju" : "Dodaj novu sezonu"}
          >
            <Plus size={11} /> {entry.type === 'universe' ? '+ Faza' : '+ Sezona'}
          </button>

          <button
            onClick={onBulkEdit}
            id="btn-bulk-edit-episodes"
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition active:scale-95 cursor-pointer"
            title="Masovni unos ocjena i naziva"
          >
            <Edit size={11} /> <span className="hidden xs:inline">Bulk</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: MOBILE-FIRST SEASON TABS VIEW (Perfect for Samsung S23 & Phones) */}
      {/* ========================================================================= */}
      {viewMode === 'season' && (
        <div className="space-y-4 select-none">
          
          {/* Horizontal Scrollable Season Navigation Pills */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            {seasons.map(s => {
              const isCurrent = s.seasonNumber === activeSeason.seasonNumber;
              const epCount = (s.episodes || []).length;
              const avg = calculateSeasonAvg(s);
              const label = entry.type === 'universe' 
                ? (s.seasonName || `Faza ${s.seasonNumber}`) 
                : (s.seasonName || `Sezona ${s.seasonNumber}`);

              return (
                <button
                  key={`season-tab-${s.seasonNumber}`}
                  onClick={() => setSelectedSeasonNum(s.seasonNumber)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                    isCurrent
                      ? 'bg-zinc-800 text-yellow-400 border-yellow-400/50 shadow-md ring-1 ring-yellow-400/30 font-black'
                      : 'bg-zinc-900/80 text-zinc-400 border-zinc-800/80 hover:bg-zinc-800/80 hover:text-zinc-200'
                  }`}
                >
                  <span>{label}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-zinc-950/70 rounded-md text-zinc-300 border border-zinc-800">
                    {epCount} ep
                  </span>
                  {avg > 0 && (
                    <span className="text-[10px] font-mono font-black text-yellow-400 flex items-center gap-0.5">
                      ★ {avg.toFixed(1)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ACTIVE SEASON CONTROL & INFO BAR */}
          <div className="bg-zinc-900/60 rounded-2xl p-3 border border-zinc-800/80 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <div>
                <h4 className="text-xs sm:text-sm font-black text-white">
                  {entry.type === 'universe' ? (activeSeason.seasonName || `Faza ${activeSeason.seasonNumber}`) : (activeSeason.seasonName || `Sezona ${activeSeason.seasonNumber}`)}
                </h4>
                <p className="text-[10px] text-zinc-400 font-mono">
                  Ukupno {(activeSeason.episodes || []).length} {entry.type === 'universe' ? 'stavki' : 'epizoda'} • Prosjek sezone: <span className="text-yellow-400 font-bold">★ {calculateSeasonAvg(activeSeason).toFixed(1)}</span>
                </p>
              </div>
            </div>

            {/* Quick Season Actions */}
            <div className="flex items-center gap-1.5">
              {/* Toggle grid vs list inside season */}
              <div className="flex items-center bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
                <button
                  onClick={() => setMobileSubView('grid')}
                  className={`p-1.5 rounded-md transition cursor-pointer ${
                    mobileSubView === 'grid' ? 'bg-zinc-800 text-yellow-400' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  title="Prikaz u mreži bedževa"
                >
                  <Grid size={13} />
                </button>
                <button
                  onClick={() => setMobileSubView('list')}
                  className={`p-1.5 rounded-md transition cursor-pointer ${
                    mobileSubView === 'list' ? 'bg-zinc-800 text-yellow-400' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  title="Prikaz u listi s opisima"
                >
                  <List size={13} />
                </button>
              </div>

              {/* Add episode */}
              <button
                onClick={() => onAddEpisodeToSeason(activeSeason.seasonNumber)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold transition cursor-pointer"
                title="Dodaj novu epizodu u ovu sezonu"
              >
                <Plus size={12} /> <span className="hidden xs:inline">Epizoda</span>
              </button>

              {/* Edit Season Count / Title */}
              <button
                onClick={() => {
                  setCustomEpValue((activeSeason.episodes || []).length);
                  setEditingSeasonNum(activeSeason.seasonNumber);
                }}
                className="flex items-center gap-1 px-2 py-1.5 bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-400 border border-yellow-500/30 rounded-lg text-[10px] font-bold transition cursor-pointer"
                title="Promijeni broj epizoda"
              >
                <Edit2 size={12} />
              </button>

              {/* Delete Season */}
              <button
                onClick={() => {
                  if (confirm(entry.type === 'universe' ? "Da li ste sigurni da želite obrisati ovu fazu?" : "Da li ste sigurni da želite obrisati ovu sezonu sa svim epizodama?")) {
                    onDeleteSeason?.(activeSeason.seasonNumber);
                  }
                }}
                className="flex items-center gap-1 px-2 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 rounded-lg text-[10px] font-bold transition cursor-pointer"
                title="Obriši ovu sezonu"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          {/* Edit Season Popover if active */}
          {editingSeasonNum === activeSeason.seasonNumber && (
            <div className="p-3 bg-zinc-900 rounded-xl border border-yellow-500/40 flex flex-wrap items-center justify-between gap-2 shadow-xl">
              <span className="text-xs font-bold text-zinc-300">Broj epizoda za ovu sezonu:</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={customEpValue}
                  onChange={e => setCustomEpValue(Math.max(1, Number(e.target.value)))}
                  className="w-16 bg-zinc-950 text-yellow-400 font-mono text-center font-bold text-xs rounded-lg border border-zinc-700 px-2 py-1.5 focus:outline-none"
                />
                <button
                  onClick={() => {
                    if (onSetSeasonEpisodeCount) {
                      onSetSeasonEpisodeCount(activeSeason.seasonNumber, customEpValue);
                    }
                    setEditingSeasonNum(null);
                  }}
                  className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-zinc-955 font-black rounded-lg text-xs uppercase cursor-pointer"
                >
                  Snimi
                </button>
                <button
                  onClick={() => setEditingSeasonNum(null)}
                  className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs cursor-pointer"
                >
                  Otkaži
                </button>
              </div>
            </div>
          )}

          {/* SEASON EPISODES DISPLAY */}
          {mobileSubView === 'grid' ? (
            /* COMPACT RESPONSIVE EPISODE BADGES GRID (4 to 6 cols, fits S23 width cleanly) */
            <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {(activeSeason.episodes || []).map((episode) => {
                const epNum = episode.episodeNumber;
                const epLabel = `E${epNum < 10 ? `0${epNum}` : epNum}`;
                const epTitle = episode.name || `Epizoda ${epNum}`;

                return (
                  <motion.button
                    key={`mob-ep-${activeSeason.seasonNumber}-${epNum}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => onEpisodeClick(activeSeason.seasonNumber, episode)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer border border-white/5 shadow-md ${getRatingColorClass(episode.rating)}`}
                  >
                    <span className="text-[10px] font-mono font-bold text-zinc-950/70 tracking-wider">
                      {epLabel}
                    </span>
                    <span className="text-sm font-mono font-black tracking-tight">
                      {episode.rating.toFixed(1)}
                    </span>
                    <span className="text-[9px] font-medium truncate max-w-full text-zinc-950/80 px-0.5 line-clamp-1 mt-0.5">
                      {epTitle}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          ) : (
            /* DETAILED LIST VIEW FOR MOBILE */
            <div className="space-y-2">
              {(activeSeason.episodes || []).map((episode) => {
                const epNum = episode.episodeNumber;
                const epLabel = `E${epNum < 10 ? `0${epNum}` : epNum}`;
                const epTitle = episode.name || `Epizoda ${epNum}`;

                return (
                  <div
                    key={`mob-list-ep-${activeSeason.seasonNumber}-${epNum}`}
                    onClick={() => onEpisodeClick(activeSeason.seasonNumber, episode)}
                    className="p-3 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition shadow-sm group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono font-black text-yellow-400 bg-zinc-950 px-2 py-1 rounded-md border border-zinc-800 shrink-0">
                        {epLabel}
                      </span>
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-white group-hover:text-yellow-400 transition truncate">
                          {epTitle}
                        </h5>
                        {episode.overview && (
                          <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                            {episode.overview}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className={`px-2.5 py-1 rounded-lg font-mono font-black text-xs shadow border border-white/10 ${getRatingColorClass(episode.rating)}`}>
                        ★ {episode.rating.toFixed(1)}
                      </div>
                      <ChevronRight size={14} className="text-zinc-600 group-hover:text-zinc-300 transition" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: CLASSIC 2D MATRIX (Responsive Full Width on Desktop, Scroll on Mobile) */}
      {/* ========================================================================= */}
      {viewMode === 'grid' && (
        <div className="w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent select-none">
          <div className="w-full min-w-full" style={{ minWidth: seasons.length > 8 ? `${seasons.length * 4.6 + 3.5}rem` : '100%' }}>
            {/* Header: Seasons cols */}
            <div 
              className="grid gap-1.5 sm:gap-2 mb-3 items-center text-center w-full" 
              style={{ 
                gridTemplateColumns: seasons.length <= 8 
                  ? `2.5rem repeat(${seasons.length || 1}, minmax(3.5rem, 1fr))` 
                  : `2.5rem repeat(${seasons.length || 1}, minmax(4.2rem, 6rem))` 
              }}
            >
              <span className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest text-left pl-0.5 font-mono">
                {entry.type === 'universe' ? 'ST' : 'EP'}
              </span>
              {seasons.map(s => (
                <div key={`col-sh-${s.seasonNumber}`} className="group flex flex-col items-center justify-center relative min-h-[3.6rem] px-0.5">
                  {editingSeasonNum === s.seasonNumber ? (
                    <div className="flex flex-col items-center gap-1 bg-zinc-900 px-2.5 py-2 rounded-2xl border border-zinc-800 absolute z-20 w-32 shadow-2xl top-0 backdrop-blur-xl">
                      <span className="text-[9px] uppercase font-mono font-black text-zinc-400">
                        {entry.type === 'universe' ? `Vel.:` : `S${s.seasonNumber} Ep:`}
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={35}
                        value={customEpValue}
                        onChange={e => setCustomEpValue(Math.max(1, Number(e.target.value)))}
                        className="w-14 bg-zinc-950 text-yellow-400 font-mono text-center font-bold text-xs rounded-lg border border-zinc-800 px-1.5 py-1 focus:outline-none"
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
                          className="px-2 py-0.5 bg-yellow-400 hover:bg-yellow-300 text-zinc-955 font-black rounded-md text-[9px] uppercase cursor-pointer"
                        >
                          Snimi
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSeasonNum(null)}
                          className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-[9px] cursor-pointer"
                        >
                          X
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="text-[10px] sm:text-xs font-black text-zinc-200 tracking-wider truncate max-w-full block" title={s.seasonName || `S${s.seasonNumber}`}>
                        {entry.type === 'universe' ? (s.seasonName || `Faza ${s.seasonNumber}`) : (s.seasonName || `S${s.seasonNumber}`)}
                      </span>

                      {/* Hover Season Control Icons */}
                      <div className="flex items-center gap-0.5 sm:gap-1 mt-1 opacity-70 group-hover:opacity-100 transition-opacity bg-zinc-900/90 px-1 sm:px-1.5 py-0.5 rounded-lg border border-zinc-800/80 shadow-md">
                        <button
                          onClick={() => onAddEpisodeToSeason(s.seasonNumber)}
                          className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 rounded transition-all cursor-pointer"
                          title={entry.type === 'universe' ? "Dodaj stavku" : "Dodaj epizodu"}
                        >
                          <Plus size={10} strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={() => {
                            setCustomEpValue((s.episodes || []).length);
                            setEditingSeasonNum(s.seasonNumber);
                          }}
                          className="p-1 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-950/40 rounded transition-all cursor-pointer"
                          title="Promijeni broj epizoda"
                        >
                          <Edit2 size={10} strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(entry.type === 'universe' ? "Da li ste sigurni da želite obrisati ovu fazu sa svim stavkama?" : "Da li ste sigurni da želite obrisati ovu sezonu sa svim epizodama?")) {
                              onDeleteSeason?.(s.seasonNumber);
                            }
                          }}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-955/40 rounded transition-all cursor-pointer"
                          title={entry.type === 'universe' ? "Obriši fazu" : "Obriši sezonu"}
                        >
                          <Trash2 size={10} strokeWidth={2.5} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Rows: Each row represent an Episode Index (1 to maxEpisodes) */}
            <div className="space-y-1.5 w-full">
              {Array.from({ length: maxEpisodes }).map((_, epIndex) => {
                const epNum = epIndex + 1;
                return (
                  <div 
                    key={`row-ep-${epNum}`} 
                    className="grid gap-1.5 sm:gap-2 items-center text-center w-full" 
                    style={{ 
                      gridTemplateColumns: seasons.length <= 8 
                        ? `2.5rem repeat(${seasons.length || 1}, minmax(3.5rem, 1fr))` 
                        : `2.5rem repeat(${seasons.length || 1}, minmax(4.2rem, 6rem))` 
                    }}
                  >
                    {/* Index label (E1, E2, ...) */}
                    <span className="text-[10px] sm:text-xs font-mono font-bold text-zinc-500 text-left pl-0.5">E{epNum}</span>
                    
                    {/* Cells for seasons */}
                    {seasons.map(s => {
                      const episode = (s.episodes || []).find(e => e.episodeNumber === epNum);
                      
                      if (!episode) {
                        return (
                          <div
                            key={`cell-${s.seasonNumber}-${epNum}`}
                            className="h-7 sm:h-8 rounded-xl border border-zinc-900/60 bg-zinc-950/20 flex items-center justify-center text-zinc-700 text-[10px] font-mono"
                          >
                            -
                          </div>
                        );
                      }
                      
                      const epLabel = `E${epNum < 10 ? `0${epNum}` : epNum}`;
                      const epTitle = episode.name || `Epizoda ${epNum}`;

                      return (
                        <div key={`cell-${s.seasonNumber}-${epNum}`} className="relative group z-10 hover:z-30">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onEpisodeClick(s.seasonNumber, episode)}
                            id={`episode-cell-s${s.seasonNumber}e${epNum}`}
                            className={`w-full h-7 sm:h-8 text-[11px] sm:text-xs mx-auto rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer font-mono font-black shadow-md border border-white/5 ${getRatingColorClass(episode.rating)}`}
                          >
                            <span>{episode.rating.toFixed(1)}</span>
                          </motion.button>

                          {/* Hover Tooltip Card */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2.5 bg-zinc-950/95 border border-zinc-800 rounded-xl shadow-2xl backdrop-blur-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 transform group-hover:-translate-y-1 text-left">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-[10px] font-mono font-black text-yellow-400 uppercase">
                                S{s.seasonNumber < 10 ? `0${s.seasonNumber}` : s.seasonNumber}{epLabel}
                              </span>
                              <span className="px-1 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[9px] font-black text-zinc-300">
                                ★ {episode.rating.toFixed(1)}
                              </span>
                            </div>
                            <div className="text-xs font-bold text-white line-clamp-1">
                              {epTitle}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 3: INVERTED 2D GRID (Columns = Episodes, Rows = Seasons)             */}
      {/* ========================================================================= */}
      {viewMode === 'inverted' && (
        <div className="w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent select-none">
          <div className="w-full min-w-full space-y-2" style={{ minWidth: maxEpisodes > 10 ? `${maxEpisodes * 2.8 + 4.5}rem` : '100%' }}>
            {/* Header: Episodes cols */}
            <div 
              className="grid gap-1.5 sm:gap-2 mb-3 items-center text-center w-full" 
              style={{ 
                gridTemplateColumns: maxEpisodes <= 10 
                  ? `4rem repeat(${maxEpisodes || 1}, minmax(2.4rem, 1fr))` 
                  : `4rem repeat(${maxEpisodes || 1}, minmax(2.4rem, 3.4rem))` 
              }}
            >
              <span className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest text-left pl-1 font-mono">
                {entry.type === 'universe' ? 'KP' : 'SZ'}
              </span>
              {Array.from({ length: maxEpisodes }).map((_, epIndex) => (
                <span key={`col-eh-${epIndex}`} className="text-[10px] sm:text-xs font-mono font-bold text-zinc-500">
                  {entry.type === 'universe' ? `ST${epIndex + 1}` : `E${epIndex + 1}`}
                </span>
              ))}
            </div>

            {/* Rows: Each row is a Season */}
            {seasons.map(s => (
              <div 
                key={`row-seas-${s.seasonNumber}`} 
                className="grid gap-1.5 sm:gap-2 items-center text-center w-full" 
                style={{ 
                  gridTemplateColumns: maxEpisodes <= 10 
                    ? `4rem repeat(${maxEpisodes || 1}, minmax(2.4rem, 1fr))` 
                    : `4rem repeat(${maxEpisodes || 1}, minmax(2.4rem, 3.4rem))` 
                }}
              >
                <div className="flex flex-col items-start pl-1 text-left min-w-[3.5rem] relative group">
                  <span className="text-[10px] sm:text-xs font-black text-zinc-300 truncate max-w-full block" title={s.seasonName || `S${s.seasonNumber}`}>
                    {entry.type === 'universe' ? (s.seasonName || `F${s.seasonNumber}`) : (s.seasonName || `S${s.seasonNumber}`)}
                  </span>
                </div>

                {Array.from({ length: maxEpisodes }).map((_, epIndex) => {
                  const epNum = epIndex + 1;
                  const episode = (s.episodes || []).find(e => e.episodeNumber === epNum);

                  if (!episode) {
                    return (
                      <div
                        key={`cell-inv-${s.seasonNumber}-${epNum}`}
                        className="h-7 sm:h-8 rounded-xl border border-zinc-900/60 bg-zinc-950/20 flex items-center justify-center text-zinc-700 text-[10px] font-mono"
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
                      className={`w-full h-7 sm:h-8 text-[11px] sm:text-xs mx-auto rounded-xl flex items-center justify-center transition-all cursor-pointer font-mono font-black shadow-md border border-white/5 ${getRatingColorClass(episode.rating)}`}
                    >
                      <span>{episode.rating.toFixed(1)}</span>
                    </motion.button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid Legend & Statistical breakdowns */}
      <div className="mt-6 border-t border-zinc-800/80 pt-4">
        <h4 className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 font-mono">
          Vodič kroz ocjene i statistika
        </h4>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-300">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 block shrink-0" />
            <div>
              <p className="font-semibold text-zinc-200 text-[11px]">Cinema</p>
              <p className="text-[9px] text-zinc-500 font-mono">9.5 - 10 ({stats.cinema})</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 block shrink-0" />
            <div>
              <p className="font-semibold text-zinc-200 text-[11px]">Sjajno</p>
              <p className="text-[9px] text-zinc-500 font-mono">9.0 - 9.4 ({stats.awesome})</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-zinc-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block shrink-0" />
            <div>
              <p className="font-semibold text-zinc-200 text-[11px]">Odlično</p>
              <p className="text-[9px] text-zinc-500 font-mono">8.0 - 8.9 ({stats.great})</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 block shrink-0" />
            <div>
              <p className="font-semibold text-zinc-200 text-[11px]">Dobro</p>
              <p className="text-[9px] text-zinc-500 font-mono">7.0 - 7.9 ({stats.good})</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-300">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 block shrink-0" />
            <div>
              <p className="font-semibold text-zinc-200 text-[11px]">Prosječno</p>
              <p className="text-[9px] text-zinc-500 font-mono">6.0 - 6.9 ({stats.average})</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-300">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 block shrink-0" />
            <div>
              <p className="font-semibold text-zinc-200 text-[11px]">Loše</p>
              <p className="text-[9px] text-zinc-500 font-mono">4.0 - 5.9 ({stats.bad})</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-300">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 block shrink-0" />
            <div>
              <p className="font-semibold text-zinc-200 text-[11px]">Smeće</p>
              <p className="text-[9px] text-zinc-500 font-mono">&lt; 4.0 ({stats.garbage})</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
