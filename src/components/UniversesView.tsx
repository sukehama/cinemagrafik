import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RatingEntry, Season, Episode } from '../types';
import { calculateAverageRating } from '../utils';
import { 
  Sparkles, 
  Film, 
  Tv, 
  Star, 
  Clock, 
  Calendar, 
  Plus, 
  Layers, 
  ListOrdered, 
  ChevronRight,
  ExternalLink,
  Info
} from 'lucide-react';

interface UniversesViewProps {
  entries: RatingEntry[];
  onSelectUniverse: (universeId: string) => void;
  onAddNewUniverse: () => void;
}

export default function UniversesView({ entries, onSelectUniverse, onAddNewUniverse }: UniversesViewProps) {
  const [selectedUniverseId, setSelectedUniverseId] = useState<string | null>(null);
  const [timelineMode, setTimelineMode] = useState<'chronological' | 'release'>('chronological');

  const universeEntries = entries.filter(e => e.type === 'universe');
  const activeUniverse = universeEntries.find(u => u.id === selectedUniverseId) || universeEntries[0] || null;

  // Calculate statistics for active universe
  const activeStats = React.useMemo(() => {
    if (!activeUniverse) return null;
    let totalItems = 0;
    let totalRuntimeMins = 0;
    let ratedItemsCount = 0;

    activeUniverse.seasons?.forEach(phase => {
      phase.episodes.forEach(item => {
        totalItems++;
        if (item.rating > 0) ratedItemsCount++;
      });
    });

    const avgScore = calculateAverageRating(activeUniverse);

    return {
      totalPhases: activeUniverse.seasons?.length || 0,
      totalItems,
      ratedItemsCount,
      avgScore,
    };
  }, [activeUniverse]);

  return (
    <div className="space-y-8 animate-fade-in" id="universes-view-hub">
      {/* HEADER BANNER FOR UNIVERSES */}
      <div className="relative p-6 sm:p-8 rounded-3xl overflow-hidden border border-purple-900/40 bg-gradient-to-br from-zinc-950 via-zinc-900/90 to-purple-950/40 shadow-2xl backdrop-blur-md">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-purple-500/15 text-purple-300 px-3 py-1 rounded-full border border-purple-400/30 text-[10px] font-black uppercase tracking-widest shadow-sm">
              <Sparkles size={11} className="animate-spin-slow text-yellow-400" />
              <span>Cinematic Universes Engine</span>
            </div>
            <h2 className="text-2xl sm:text-3.5xl font-black text-white tracking-tight">
              Cinematic Univerzumi & Hronološke Franšize
            </h2>
            <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed">
              Spajajte više povezanih filmova, serija i faza u jednu kohezivnu hronologiju. Pratite hronološki slijed događaja, ocjene faza i glumačku postavu unutar vaših omiljenih multiverzuma.
            </p>
          </div>

          <button
            onClick={onAddNewUniverse}
            className="shrink-0 flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-zinc-955 font-black px-5 py-3 rounded-2xl text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(250,204,21,0.22)] hover:shadow-[0_0_25px_rgba(250,204,21,0.35)] hover:-translate-y-0.5 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <Plus size={16} strokeWidth={3} />
            <span>Kreiraj Novi Univerzum</span>
          </button>
        </div>
      </div>

      {universeEntries.length === 0 ? (
        <div className="p-12 text-center border border-zinc-800/80 rounded-3xl bg-zinc-900/40 backdrop-blur-md max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mx-auto">
            <Layers className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black uppercase tracking-wider text-zinc-200">
            Nema Kreiranih Univerzuma
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-md mx-auto">
            Trenutno nemate nijedan Cinematic Univerzum u bazi. Kreirajte svoj prvi multiverzum (npr. Marvel Cinematic Universe, Star Wars Saga ili Dune Timeline) i povežite sve dijelove priče!
          </p>
          <button
            onClick={onAddNewUniverse}
            className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-zinc-950 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
          >
            <Plus size={14} /> DODAJ PRVI UNIVERZUM
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* UNIVERSE SELECTOR SIDEBAR (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Layers size={14} className="text-purple-400" />
                Dostupni Univerzumi ({universeEntries.length})
              </h3>
            </div>

            <div className="space-y-3">
              {universeEntries.map(universe => {
                const isSelected = activeUniverse?.id === universe.id;
                const score = calculateAverageRating(universe);
                const itemCount = universe.seasons?.reduce((acc, s) => acc + s.episodes.length, 0) || 0;

                return (
                  <div
                    key={`universe-card-${universe.id}`}
                    onClick={() => setSelectedUniverseId(universe.id)}
                    className={`group relative p-4 rounded-2xl border backdrop-blur-md cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.15)] -translate-y-0.5'
                        : 'bg-zinc-900/60 hover:bg-zinc-900/90 border-zinc-800/80 hover:border-purple-500/40 hover:-translate-y-0.5'
                    }`}
                  >
                    <div className="flex gap-4 items-center">
                      <img
                        src={universe.posterUrl}
                        alt={universe.name}
                        className="w-16 h-22 object-cover rounded-xl bg-zinc-950 shrink-0 border border-zinc-800/80 group-hover:border-purple-500/50 transition-colors"
                        referrerPolicy="no-referrer"
                      />

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            {universe.seasons?.length || 0} FAZA
                          </span>
                          <div className="flex items-center gap-1 text-yellow-400 text-xs font-mono font-black">
                            <Star size={11} className="fill-current" />
                            <span>{score > 0 ? score.toFixed(1) : '—'}</span>
                          </div>
                        </div>

                        <h4 className="font-black text-sm text-white truncate group-hover:text-purple-300 transition-colors">
                          {universe.name}
                        </h4>

                        <p className="text-[10px] text-zinc-400 line-clamp-1">
                          {universe.year} • {itemCount} Naslova/Projektā
                        </p>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectUniverse(universe.id);
                          }}
                          className="pt-1 text-[10px] font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
                        >
                          Otvoriti Detalje i Grafik <ChevronRight size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ACTIVE UNIVERSE DETAILED TIMELINE & PHASES (8 cols) */}
          {activeUniverse && (
            <div className="lg:col-span-8 space-y-6">
              {/* Universe Banner Card */}
              <div className="relative rounded-3xl overflow-hidden border border-zinc-800/80 bg-zinc-900/70 backdrop-blur-md p-6 sm:p-8 space-y-6 shadow-2xl">
                {/* Background Banner Blur */}
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-20 blur-xl pointer-events-none"
                  style={{ backgroundImage: `url(${activeUniverse.bannerUrl || activeUniverse.posterUrl})` }}
                />
                
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
                  <div>
                    <span className="text-[10px] font-mono font-black text-purple-400 uppercase tracking-widest bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full">
                      Aktivni Univerzum • {activeUniverse.year}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2">
                      {activeUniverse.name}
                    </h3>
                  </div>

                  {/* Mode switcher */}
                  <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800/80">
                    <button
                      onClick={() => setTimelineMode('chronological')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                        timelineMode === 'chronological' ? 'bg-purple-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Hronologija
                    </button>
                    <button
                      onClick={() => setTimelineMode('release')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                        timelineMode === 'release' ? 'bg-purple-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Hronološki Slijed
                    </button>
                  </div>
                </div>

                {/* Universe Stats Quick Summary */}
                {activeStats && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-zinc-950/70 border border-zinc-850 p-3 rounded-xl text-center space-y-0.5">
                      <span className="text-[9px] uppercase font-bold text-zinc-400">Ukupno Faza</span>
                      <p className="text-base sm:text-lg font-mono font-black text-white">{activeStats.totalPhases}</p>
                    </div>

                    <div className="bg-zinc-950/70 border border-zinc-850 p-3 rounded-xl text-center space-y-0.5">
                      <span className="text-[9px] uppercase font-bold text-zinc-400">Naslova u Priči</span>
                      <p className="text-base sm:text-lg font-mono font-black text-purple-300">{activeStats.totalItems}</p>
                    </div>

                    <div className="bg-zinc-950/70 border border-zinc-850 p-3 rounded-xl text-center space-y-0.5">
                      <span className="text-[9px] uppercase font-bold text-zinc-400">Prosječna Ocjena</span>
                      <p className="text-base sm:text-lg font-mono font-black text-yellow-400">★ {activeStats.avgScore.toFixed(1)}</p>
                    </div>
                  </div>
                )}

                {/* Description */}
                {activeUniverse.description && (
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed relative z-10">
                    {activeUniverse.description}
                  </p>
                )}

                {/* Phases and Items Breakdown */}
                <div className="space-y-6 relative z-10 pt-2">
                  {activeUniverse.seasons?.map((phase, pIdx) => (
                    <div key={`phase-block-${pIdx}`} className="space-y-3 bg-zinc-950/60 border border-zinc-850/80 p-5 rounded-2xl">
                      <div className="flex items-center justify-between border-b border-zinc-850 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                          <h4 className="font-extrabold text-sm text-zinc-100 uppercase tracking-wide">
                            {phase.seasonName || `Faza ${phase.seasonNumber}`}
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400 font-bold">
                          {phase.episodes.length} Poglavlja/Projektā
                        </span>
                      </div>

                      <div className="space-y-2">
                        {phase.episodes.map((item, iIdx) => (
                          <div
                            key={`phase-item-${pIdx}-${iIdx}`}
                            className="flex items-center justify-between gap-4 p-3 rounded-xl bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800/70 hover:border-purple-500/40 transition-all duration-200 group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-zinc-950 text-purple-400 text-[10px] font-mono font-black flex items-center justify-center shrink-0 border border-zinc-850">
                                #{iIdx + 1}
                              </span>
                              <div className="min-w-0">
                                <h5 className="text-xs font-black text-white truncate group-hover:text-purple-300 transition-colors">
                                  {item.name}
                                </h5>
                                {item.overview && (
                                  <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                                    {item.overview}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="flex items-center gap-1 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-850 font-mono text-xs font-black text-yellow-400">
                                <Star size={11} className="fill-current" />
                                <span>{item.rating > 0 ? item.rating.toFixed(1) : '—'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action button to open full grid for active universe */}
                <div className="pt-2">
                  <button
                    onClick={() => onSelectUniverse(activeUniverse.id)}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Layers size={14} /> Otvori Puni Grafik i Ocjene Univerzuma
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
