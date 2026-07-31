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
  Info,
  ArrowRight,
  Link as LinkIcon,
  Trash2,
  Edit,
  ArrowUp,
  ArrowDown,
  Check,
  X
} from 'lucide-react';

interface UniversesViewProps {
  entries: RatingEntry[];
  onSelectUniverse: (universeId: string) => void;
  onAddNewUniverse: () => void;
  onUpdateUniverse?: (updatedUniverse: RatingEntry) => void;
  onNavigateToEntry?: (entryId: string) => void;
}

export default function UniversesView({ 
  entries, 
  onSelectUniverse, 
  onAddNewUniverse,
  onUpdateUniverse,
  onNavigateToEntry
}: UniversesViewProps) {
  const [selectedUniverseId, setSelectedUniverseId] = useState<string | null>(null);
  const [timelineMode, setTimelineMode] = useState<'chronological' | 'release'>('chronological');
  
  // Item level linking modal state
  const [isLinkingModalOpen, setIsLinkingModalOpen] = useState(false);
  const [targetItemCoords, setTargetItemCoords] = useState<{ phaseIdx: number; itemIdx: number } | null>(null);
  const [linkCategory, setLinkCategory] = useState<'movie' | 'show'>('movie');
  const [selectedLinkedMovieId, setSelectedLinkedMovieId] = useState<string>('');
  const [selectedLinkedShowId, setSelectedLinkedShowId] = useState<string>('');
  const [selectedLinkedSeasonNum, setSelectedLinkedSeasonNum] = useState<number>(1);
  const [selectedLinkedEpisodeNum, setSelectedLinkedEpisodeNum] = useState<number>(1);
  
  // New phase input state
  const [isAddingPhase, setIsAddingPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState('');
  
  // Custom item input state
  const [isAddingCustomItem, setIsAddingCustomItem] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemOverview, setCustomItemOverview] = useState('');
  const [customItemRating, setCustomItemRating] = useState(8.0);

  const universeEntries = entries.filter(e => e.type === 'universe');
  const availableMoviesAndShows = entries.filter(e => e.type !== 'universe');
  const activeUniverse = universeEntries.find(u => u.id === selectedUniverseId) || universeEntries[0] || null;

  // Calculate statistics for active universe
  const activeStats = React.useMemo(() => {
    if (!activeUniverse) return null;
    let totalItems = 0;
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

  // Flatten chronological timeline items across phases for the arrow timeline
  const chronologicalTimelineItems = React.useMemo(() => {
    if (!activeUniverse || !activeUniverse.seasons) return [];
    const items: {
      phaseName: string;
      phaseNumber: number;
      item: Episode;
      index: number;
    }[] = [];

    let count = 0;
    activeUniverse.seasons.forEach((phase, pIdx) => {
      phase.episodes.forEach((ep) => {
        count++;
        items.push({
          phaseName: phase.seasonName || `Faza ${phase.seasonNumber}`,
          phaseNumber: phase.seasonNumber,
          item: ep,
          index: count
        });
      });
    });

    return items;
  }, [activeUniverse]);

  // Handler to add a new phase stack
  const handleAddPhase = () => {
    if (!activeUniverse || !onUpdateUniverse) return;
    const currentSeasons = activeUniverse.seasons || [];
    const nextNum = currentSeasons.length + 1;
    const nameToUse = newPhaseName.trim() || `Faza ${nextNum}`;

    const newSeason: Season = {
      seasonNumber: nextNum,
      seasonName: nameToUse,
      episodes: []
    };

    onUpdateUniverse({
      ...activeUniverse,
      seasons: [...currentSeasons, newSeason]
    });

    setNewPhaseName('');
    setIsAddingPhase(false);
  };

  // Handler to delete a phase stack
  const handleDeletePhase = (phaseIndex: number) => {
    if (!activeUniverse || !onUpdateUniverse) return;
    const updated = (activeUniverse.seasons || [])
      .filter((_, idx) => idx !== phaseIndex)
      .map((s, idx) => ({ ...s, seasonNumber: idx + 1 }));

    onUpdateUniverse({
      ...activeUniverse,
      seasons: updated
    });
  };

  // Handler to link specific individual item in phase
  const handleLinkItemTarget = () => {
    if (!activeUniverse || !onUpdateUniverse || !targetItemCoords) return;
    const { phaseIdx, itemIdx } = targetItemCoords;
    const currentSeasons = activeUniverse.seasons || [];
    if (phaseIdx >= currentSeasons.length) return;

    let updatedName = '';
    let updatedOverview = '';
    let updatedRating = 8.0;
    let updatedImage = '';
    let updatedLinkTargetId = '';

    if (linkCategory === 'movie') {
      const selectedMovie = entries.find(e => e.id === selectedLinkedMovieId && e.type === 'movie');
      if (!selectedMovie) return alert('Molimo odaberite film!');

      updatedName = selectedMovie.name;
      updatedOverview = selectedMovie.description || `Film (${selectedMovie.year})`;
      updatedRating = selectedMovie.movieRating || 8.0;
      updatedImage = selectedMovie.posterUrl || selectedMovie.bannerUrl || '';
      updatedLinkTargetId = selectedMovie.id;
    } else {
      const selectedShow = entries.find(e => e.id === selectedLinkedShowId && e.type === 'show');
      if (!selectedShow) return alert('Molimo odaberite seriju!');

      const selectedSeason = selectedShow.seasons?.find(s => s.seasonNumber === selectedLinkedSeasonNum);
      const selectedEp = selectedSeason?.episodes?.find(ep => ep.episodeNumber === selectedLinkedEpisodeNum);

      if (selectedEp) {
        updatedName = `${selectedShow.name} - E${selectedEp.episodeNumber}: ${selectedEp.name}`;
        updatedOverview = selectedEp.overview || selectedShow.description || `Epizoda serije ${selectedShow.name}`;
        updatedRating = selectedEp.rating || 8.0;
        updatedImage = selectedEp.imageUrl || selectedShow.posterUrl || selectedShow.bannerUrl || '';
        updatedLinkTargetId = `${selectedShow.id}|${selectedLinkedSeasonNum}|${selectedLinkedEpisodeNum}`;
      } else {
        updatedName = selectedShow.name;
        updatedOverview = selectedShow.description || `Serija (${selectedShow.year})`;
        updatedRating = calculateAverageRating(selectedShow) || 8.0;
        updatedImage = selectedShow.posterUrl || selectedShow.bannerUrl || '';
        updatedLinkTargetId = selectedShow.id;
      }
    }

    const updatedSeasons = currentSeasons.map((s, pIdx) => {
      if (pIdx === phaseIdx) {
        const updatedEpisodes = s.episodes.map((ep, iIdx) => {
          if (iIdx === itemIdx) {
            return {
              ...ep,
              name: updatedName,
              overview: updatedOverview,
              rating: updatedRating,
              imageUrl: updatedImage || ep.imageUrl,
              linkTargetId: updatedLinkTargetId,
              linkText: updatedName
            };
          }
          return ep;
        });
        return { ...s, episodes: updatedEpisodes };
      }
      return s;
    });

    onUpdateUniverse({
      ...activeUniverse,
      seasons: updatedSeasons
    });

    setIsLinkingModalOpen(false);
    setTargetItemCoords(null);
  };

  // Handler to add custom item to phase
  const handleAddCustomItem = (phaseIndex: number) => {
    if (!activeUniverse || !onUpdateUniverse || !customItemName.trim()) return;
    const currentSeasons = activeUniverse.seasons || [];
    const targetSeason = currentSeasons[phaseIndex];
    if (!targetSeason) return;

    const nextEpNum = targetSeason.episodes.length + 1;
    const newEpItem: Episode = {
      id: `${activeUniverse.id}-p${targetSeason.seasonNumber}-custom${Date.now()}`,
      episodeNumber: nextEpNum,
      name: customItemName.trim(),
      rating: Number(customItemRating) || 8.0,
      overview: customItemOverview.trim() || undefined
    };

    const updatedSeasons = currentSeasons.map((s, idx) => {
      if (idx === phaseIndex) {
        return {
          ...s,
          episodes: [...s.episodes, newEpItem]
        };
      }
      return s;
    });

    onUpdateUniverse({
      ...activeUniverse,
      seasons: updatedSeasons
    });

    setCustomItemName('');
    setCustomItemOverview('');
    setCustomItemRating(8.0);
    setIsAddingCustomItem(false);
  };

  // Handler to delete item from phase
  const handleDeleteItemFromPhase = (phaseIndex: number, itemIndex: number) => {
    if (!activeUniverse || !onUpdateUniverse) return;
    const updatedSeasons = (activeUniverse.seasons || []).map((s, idx) => {
      if (idx === phaseIndex) {
        const filtered = s.episodes.filter((_, i) => i !== itemIndex)
          .map((ep, i) => ({ ...ep, episodeNumber: i + 1 }));
        return { ...s, episodes: filtered };
      }
      return s;
    });

    onUpdateUniverse({
      ...activeUniverse,
      seasons: updatedSeasons
    });
  };

  // Handler to move item in phase
  const handleMoveItemInPhase = (phaseIndex: number, itemIndex: number, direction: 'up' | 'down') => {
    if (!activeUniverse || !onUpdateUniverse) return;
    const seasons = [...(activeUniverse.seasons || [])];
    const targetSeason = seasons[phaseIndex];
    if (!targetSeason) return;

    const eps = [...targetSeason.episodes];
    const targetSwapIdx = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
    if (targetSwapIdx < 0 || targetSwapIdx >= eps.length) return;

    const temp = eps[itemIndex];
    eps[itemIndex] = eps[targetSwapIdx];
    eps[targetSwapIdx] = temp;

    // Re-index
    const reindexed = eps.map((ep, i) => ({ ...ep, episodeNumber: i + 1 }));

    seasons[phaseIndex] = {
      ...targetSeason,
      episodes: reindexed
    };

    onUpdateUniverse({
      ...activeUniverse,
      seasons
    });
  };

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
              Spajajte više povezanih filmova, serija i faza u jednu kohezivnu hronologiju. Uređujte stacke, povezujte postojeće naslove iz kataloga i pratite vizualni timeline sa strijelicama!
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

                  {/* Mode switcher: Hronologija (Lista Stavki) vs Hronološki Slijed (Timeline sa strijelicama) */}
                  <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800/80">
                    <button
                      onClick={() => setTimelineMode('chronological')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                        timelineMode === 'chronological' ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <ListOrdered size={12} /> Hronologija
                    </button>
                    <button
                      onClick={() => setTimelineMode('release')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                        timelineMode === 'release' ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <ArrowRight size={12} /> Hronološki Slijed
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

                {/* MODE 1: HRONOLOGIJA (STACKS & PHASES LIST VIEW) */}
                {timelineMode === 'chronological' ? (
                  <div className="space-y-6 relative z-10 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase text-zinc-300 tracking-wider">
                        Faze & Stackovi Univerzuma
                      </h4>

                      {onUpdateUniverse && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsAddingPhase(true)}
                            className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Plus size={12} /> Dodaj Novu Fazu
                          </button>
                        </div>
                      )}
                    </div>

                    {/* New Phase creation bar */}
                    {isAddingPhase && (
                      <div className="bg-zinc-950 p-4 rounded-2xl border border-purple-500/40 space-y-3">
                        <div className="text-xs font-bold text-purple-300 uppercase">Dodaj novu fazu ili stack</div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Naziv faze (npr. Faza 4: Multiverzum)"
                            value={newPhaseName}
                            onChange={(e) => setNewPhaseName(e.target.value)}
                            className="flex-1 bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-xl text-white focus:outline-none focus:border-purple-500"
                          />
                          <button
                            onClick={handleAddPhase}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl cursor-pointer"
                          >
                            Sačuvaj
                          </button>
                          <button
                            onClick={() => setIsAddingPhase(false)}
                            className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold text-xs rounded-xl cursor-pointer"
                          >
                            Otkaži
                          </button>
                        </div>
                      </div>
                    )}

                    {activeUniverse.seasons?.map((phase, pIdx) => (
                      <div key={`phase-block-${pIdx}`} className="space-y-3 bg-zinc-950/60 border border-zinc-850/80 p-5 rounded-2xl">
                        <div className="flex items-center justify-between border-b border-zinc-850 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                            <h4 className="font-extrabold text-sm text-zinc-100 uppercase tracking-wide">
                              {phase.seasonName || `Faza ${phase.seasonNumber}`}
                            </h4>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-zinc-400 font-bold">
                              {phase.episodes.length} Projektā
                            </span>

                            {onUpdateUniverse && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleDeletePhase(pIdx)}
                                  className="p-1 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                  title="Obriši ovu fazu"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {phase.episodes.length === 0 ? (
                          <div className="p-4 text-center border border-dashed border-zinc-850 rounded-xl text-zinc-500 text-xs">
                            Ova faza nema unesenih stavki.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {phase.episodes.map((item, iIdx) => (
                              <div
                                key={`phase-item-${pIdx}-${iIdx}`}
                                className="flex items-center justify-between gap-4 p-3 rounded-xl bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800/70 hover:border-purple-500/40 transition-all duration-200 group"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <span className="w-6 h-6 rounded-lg bg-zinc-950 text-purple-400 text-[10px] font-mono font-black flex items-center justify-center shrink-0 border border-zinc-850">
                                    #{iIdx + 1}
                                  </span>

                                  {/* ICON ONLY LINK BUTTON (CHAIN ICON) FOR INDIVIDUAL ITEM */}
                                  {onUpdateUniverse && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTargetItemCoords({ phaseIdx: pIdx, itemIdx: iIdx });
                                        setIsLinkingModalOpen(true);
                                      }}
                                      className={`p-2 rounded-lg border transition-all cursor-pointer shrink-0 ${
                                        item.linkTargetId
                                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30'
                                          : 'bg-zinc-950/80 text-zinc-400 border-zinc-800 hover:text-white hover:border-purple-500/30 hover:bg-zinc-900'
                                      }`}
                                      title="Poveži ovu stavku s filmom ili epizodom"
                                    >
                                      <LinkIcon size={13} />
                                    </button>
                                  )}

                                  {item.imageUrl && (
                                    <img 
                                      src={item.imageUrl} 
                                      alt={item.name} 
                                      className="w-8 h-10 object-cover rounded bg-zinc-950 shrink-0 border border-zinc-800 cursor-pointer"
                                      onClick={() => item.linkTargetId && onNavigateToEntry && onNavigateToEntry(item.linkTargetId)}
                                      referrerPolicy="no-referrer"
                                    />
                                  )}

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <h5 
                                        onClick={() => item.linkTargetId && onNavigateToEntry && onNavigateToEntry(item.linkTargetId)}
                                        className={`text-xs font-black truncate transition-colors ${
                                          item.linkTargetId ? 'text-white hover:text-purple-300 cursor-pointer underline underline-offset-2 decoration-purple-500/40' : 'text-zinc-200'
                                        }`}
                                      >
                                        {item.name}
                                      </h5>
                                      {item.linkTargetId && (
                                        <button
                                          onClick={() => onNavigateToEntry && onNavigateToEntry(item.linkTargetId!)}
                                          className="text-[9px] text-sky-400 bg-sky-950/60 px-1.5 py-0.2 rounded border border-sky-800/50 hover:bg-sky-900 transition flex items-center gap-1 shrink-0"
                                          title="Otvoriti u katalogu"
                                        >
                                          <ExternalLink size={9} /> Otvori
                                        </button>
                                      )}
                                    </div>
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

                                  {onUpdateUniverse && (
                                    <div className="flex items-center gap-1 border-l border-zinc-800 pl-2">
                                      <button
                                        onClick={() => handleMoveItemInPhase(pIdx, iIdx, 'up')}
                                        disabled={iIdx === 0}
                                        className="p-1 text-zinc-400 hover:text-white disabled:opacity-20 cursor-pointer"
                                        title="Pomjeri gore"
                                      >
                                        <ArrowUp size={11} />
                                      </button>
                                      <button
                                        onClick={() => handleMoveItemInPhase(pIdx, iIdx, 'down')}
                                        disabled={iIdx === phase.episodes.length - 1}
                                        className="p-1 text-zinc-400 hover:text-white disabled:opacity-20 cursor-pointer"
                                        title="Pomjeri dole"
                                      >
                                        <ArrowDown size={11} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteItemFromPhase(pIdx, iIdx)}
                                        className="p-1 text-red-400 hover:text-red-300 cursor-pointer ml-1"
                                        title="Ukloni stavku"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* MODE 2: HRONOLOŠKI SLIJED (TRUE VISUAL TIMELINE WITH ARROWS) */
                  <div className="space-y-6 relative z-10 pt-2">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <div>
                        <h4 className="text-xs font-black uppercase text-purple-300 tracking-wider flex items-center gap-2">
                          <ArrowRight size={14} className="text-yellow-400" />
                          Hronološki Vremenski Slijed Događaja
                        </h4>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          Pratite tačan redoslijed priče kroz strijelice i hronološke linije od početka do kraja.
                        </p>
                      </div>
                    </div>

                    {chronologicalTimelineItems.length === 0 ? (
                      <div className="p-8 text-center text-zinc-500 text-xs border border-dashed border-zinc-850 rounded-2xl">
                        Nema stavki u vremenskoj liniji. Prebacite se na "Hronologija" mod da dodate filmove i serije!
                      </div>
                    ) : (
                      <div className="relative pl-6 space-y-8 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-purple-500 before:via-yellow-500 before:to-purple-900">
                        {chronologicalTimelineItems.map((step, idx) => (
                          <div key={`timeline-step-${idx}`} className="relative group">
                            {/* Glowing timeline node dot */}
                            <div className="absolute -left-6 top-4 w-5 h-5 rounded-full bg-zinc-950 border-2 border-purple-500 group-hover:border-yellow-400 flex items-center justify-center transition-all shadow-[0_0_10px_rgba(168,85,247,0.5)] z-10">
                              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 group-hover:bg-yellow-400" />
                            </div>

                            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 group-hover:border-purple-500/50 shadow-xl transition-all duration-200">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  {step.item.imageUrl && (
                                    <img 
                                      src={step.item.imageUrl} 
                                      alt={step.item.name} 
                                      className="w-10 h-14 object-cover rounded-xl bg-zinc-900 shrink-0 border border-zinc-800 group-hover:border-yellow-400/50 transition-colors"
                                      referrerPolicy="no-referrer"
                                    />
                                  )}

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] font-mono font-black text-purple-400 uppercase tracking-widest bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                                        KORAK #{step.index} • {step.phaseName}
                                      </span>
                                    </div>
                                    <h5 className="font-extrabold text-sm text-white group-hover:text-yellow-400 transition-colors mt-1">
                                      {step.item.name}
                                    </h5>
                                    {step.item.overview && (
                                      <p className="text-[10px] text-zinc-400 line-clamp-2 mt-0.5">
                                        {step.item.overview}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                                  <div className="flex items-center gap-1 bg-zinc-900 px-2.5 py-1.5 rounded-xl border border-zinc-800 font-mono text-xs font-black text-yellow-400 shadow-inner">
                                    <Star size={11} className="fill-current" />
                                    <span>{step.item.rating > 0 ? step.item.rating.toFixed(1) : '—'}</span>
                                  </div>

                                  {step.item.linkTargetId && (
                                    <button
                                      onClick={() => onNavigateToEntry && onNavigateToEntry(step.item.linkTargetId!)}
                                      className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/40 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                                    >
                                      Pogledaj <ChevronRight size={12} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Directional Connection Arrow between storyline steps */}
                            {idx < chronologicalTimelineItems.length - 1 && (
                              <div className="flex justify-center my-2 text-yellow-400/60 animate-bounce">
                                <ArrowRight size={16} className="rotate-90" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

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

      {/* MODAL: LINK EXISTING MOVIE OR EPISODE TO INDIVIDUAL STAVKA */}
      <AnimatePresence>
        {isLinkingModalOpen && targetItemCoords && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-purple-500/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                <h3 className="text-sm font-black uppercase text-purple-300 flex items-center gap-2">
                  <LinkIcon size={16} className="text-yellow-400" />
                  Poveži Stavku #{targetItemCoords.itemIdx + 1} s Filmom ili Epizodom
                </h3>
                <button 
                  onClick={() => setIsLinkingModalOpen(false)}
                  className="text-zinc-400 hover:text-white p-1"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Format selection: Film vs Serija */}
                <div className="grid grid-cols-2 gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setLinkCategory('movie')}
                    className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                      linkCategory === 'movie' ? 'bg-purple-600 text-white font-black shadow' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Film size={13} /> Film
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinkCategory('show')}
                    className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                      linkCategory === 'show' ? 'bg-purple-600 text-white font-black shadow' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Tv size={13} /> Serija / Epizoda
                  </button>
                </div>

                {linkCategory === 'movie' ? (
                  /* MOVIE PICKER */
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono font-bold uppercase text-zinc-400">Izaberi Film iz Kataloga:</label>
                    <select
                      value={selectedLinkedMovieId}
                      onChange={(e) => setSelectedLinkedMovieId(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 text-white text-xs p-3 rounded-xl focus:outline-none focus:border-purple-500"
                    >
                      <option value="">-- Odaberite Film --</option>
                      {entries.filter(e => e.type === 'movie').map(item => (
                        <option key={`m-opt-${item.id}`} value={item.id}>
                          🎬 {item.name} ({item.year}) ★ {item.movieRating || '8.0'}
                        </option>
                      ))}
                    </select>

                    {selectedLinkedMovieId && (() => {
                      const m = entries.find(e => e.id === selectedLinkedMovieId);
                      if (!m) return null;
                      return (
                        <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl flex items-center gap-3 mt-2">
                          {m.posterUrl && (
                            <img src={m.posterUrl} alt={m.name} className="w-10 h-14 object-cover rounded bg-zinc-950 shrink-0" referrerPolicy="no-referrer" />
                          )}
                          <div className="min-w-0 text-xs">
                            <div className="font-bold text-white flex items-center gap-2">
                              {m.name} <span className="text-yellow-400 font-mono text-[10px]">★ {m.movieRating || '8.0'}</span>
                            </div>
                            <p className="text-[10px] text-zinc-400 line-clamp-2 mt-0.5">{m.description || 'Nema opisa'}</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  /* SERIES & EPISODE PICKER */
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-mono font-bold uppercase text-zinc-400 block mb-1">1. Izaberi Seriju:</label>
                      <select
                        value={selectedLinkedShowId}
                        onChange={(e) => {
                          const showId = e.target.value;
                          setSelectedLinkedShowId(showId);
                          const show = entries.find(s => s.id === showId);
                          if (show?.seasons?.length) {
                            setSelectedLinkedSeasonNum(show.seasons[0].seasonNumber);
                            if (show.seasons[0].episodes?.length) {
                              setSelectedLinkedEpisodeNum(show.seasons[0].episodes[0].episodeNumber);
                            }
                          }
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 text-white text-xs p-3 rounded-xl focus:outline-none focus:border-purple-500"
                      >
                        <option value="">-- Odaberite Seriju --</option>
                        {entries.filter(e => e.type === 'show').map(item => (
                          <option key={`s-opt-${item.id}`} value={item.id}>
                            📺 {item.name} ({item.year})
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedLinkedShowId && (() => {
                      const show = entries.find(e => e.id === selectedLinkedShowId);
                      if (!show || !show.seasons?.length) return null;
                      const activeSeason = show.seasons.find(s => s.seasonNumber === selectedLinkedSeasonNum) || show.seasons[0];
                      const activeEp = activeSeason?.episodes?.find(ep => ep.episodeNumber === selectedLinkedEpisodeNum) || activeSeason?.episodes?.[0];

                      return (
                        <div className="space-y-3 pt-1">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-mono font-bold uppercase text-zinc-400 block mb-1">2. Izaberi Sezonu:</label>
                              <select
                                value={selectedLinkedSeasonNum}
                                onChange={(e) => {
                                  const sNum = Number(e.target.value);
                                  setSelectedLinkedSeasonNum(sNum);
                                  const s = show.seasons?.find(sn => sn.seasonNumber === sNum);
                                  if (s?.episodes?.length) {
                                    setSelectedLinkedEpisodeNum(s.episodes[0].episodeNumber);
                                  }
                                }}
                                className="w-full bg-zinc-900 border border-zinc-800 text-white text-xs p-2.5 rounded-xl focus:outline-none"
                              >
                                {show.seasons.map(s => (
                                  <option key={`sn-opt-${s.seasonNumber}`} value={s.seasonNumber}>
                                    {s.seasonName || `Sezona ${s.seasonNumber}`} ({s.episodes.length} ep)
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] font-mono font-bold uppercase text-zinc-400 block mb-1">3. Izaberi Epizodu:</label>
                              <select
                                value={selectedLinkedEpisodeNum}
                                onChange={(e) => setSelectedLinkedEpisodeNum(Number(e.target.value))}
                                className="w-full bg-zinc-900 border border-zinc-800 text-white text-xs p-2.5 rounded-xl focus:outline-none"
                              >
                                {activeSeason?.episodes?.map(ep => (
                                  <option key={`ep-opt-${ep.episodeNumber}`} value={ep.episodeNumber}>
                                    Ep {ep.episodeNumber}: {ep.name} (★ {ep.rating})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {activeEp && (
                            <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl flex items-center gap-3">
                              {(activeEp.imageUrl || show.posterUrl) && (
                                <img src={activeEp.imageUrl || show.posterUrl} alt={activeEp.name} className="w-10 h-14 object-cover rounded bg-zinc-950 shrink-0" referrerPolicy="no-referrer" />
                              )}
                              <div className="min-w-0 text-xs">
                                <div className="font-bold text-white flex items-center gap-2">
                                  {show.name} - E{activeEp.episodeNumber}: {activeEp.name}
                                  <span className="text-yellow-400 font-mono text-[10px]">★ {activeEp.rating}</span>
                                </div>
                                <p className="text-[10px] text-zinc-400 line-clamp-2 mt-0.5">{activeEp.overview || show.description || 'Nema opisa'}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsLinkingModalOpen(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Otkaži
                </button>
                <button
                  onClick={handleLinkItemTarget}
                  disabled={linkCategory === 'movie' ? !selectedLinkedMovieId : !selectedLinkedShowId}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 shadow-lg"
                >
                  <Check size={14} /> OK (Potvrdi Povezivanje)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

