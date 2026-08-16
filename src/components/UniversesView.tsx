import React, { useState, useMemo } from 'react';
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
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
  ArrowRight,
  Link as LinkIcon,
  Trash2,
  Edit,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Eye,
  FoldVertical,
  UnfoldVertical
} from 'lucide-react';

interface UniversesViewProps {
  entries: RatingEntry[];
  onSelectUniverse: (universeId: string) => void;
  onAddNewUniverse: () => void;
  onUpdateUniverse?: (updatedUniverse: RatingEntry) => void;
  onNavigateToEntry?: (entryId: string, seasonNum?: number, episodeNum?: number) => void;
  onDeleteUniverse?: (universeId: string) => void;
}

export default function UniversesView({ 
  entries, 
  onSelectUniverse, 
  onAddNewUniverse,
  onUpdateUniverse,
  onNavigateToEntry,
  onDeleteUniverse
}: UniversesViewProps) {
  const [selectedUniverseId, setSelectedUniverseId] = useState<string | null>(null);
  const [timelineMode, setTimelineMode] = useState<'chronological' | 'release'>('chronological');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  // Search & Filter state for universe items
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<'all' | number>('all');
  const [viewDensity, setViewDensity] = useState<'compact' | 'detailed'>('compact');
  const [collapsedPhases, setCollapsedPhases] = useState<Set<number>>(new Set());

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
  
  // Dedicated adding item to phase state modal
  const [addingToPhaseIndex, setAddingToPhaseIndex] = useState<number | null>(null);
  const [addItemSource, setAddItemSource] = useState<'catalog' | 'custom'>('catalog');
  const [addItemCatalogType, setAddItemCatalogType] = useState<'movie' | 'show'>('movie');
  const [addItemMovieId, setAddItemMovieId] = useState<string>('');
  const [addItemShowId, setAddItemShowId] = useState<string>('');
  const [addItemSeasonNum, setAddItemSeasonNum] = useState<number>(1);
  const [addItemEpisodeNum, setAddItemEpisodeNum] = useState<number>(1);

  const [addItemCustomName, setAddItemCustomName] = useState<string>('');
  const [addItemCustomOverview, setAddItemCustomOverview] = useState<string>('');
  const [addItemCustomRating, setAddItemCustomRating] = useState<number>(8.0);
  const [addItemCustomImage, setAddItemCustomImage] = useState<string>('');

  const MAX_ITEMS_PER_PHASE = 50;

  const universeEntries = useMemo(() => entries.filter(e => e.type === 'universe'), [entries]);
  const activeUniverse = universeEntries.find(u => u.id === selectedUniverseId) || universeEntries[0] || null;

  // Toggle single phase collapse
  const togglePhaseCollapse = (seasonNumber: number) => {
    setCollapsedPhases(prev => {
      const next = new Set(prev);
      if (next.has(seasonNumber)) {
        next.delete(seasonNumber);
      } else {
        next.add(seasonNumber);
      }
      return next;
    });
  };

  // Collapse or expand all
  const toggleCollapseAll = () => {
    if (!activeUniverse?.seasons) return;
    if (collapsedPhases.size === activeUniverse.seasons.length) {
      setCollapsedPhases(new Set());
    } else {
      setCollapsedPhases(new Set(activeUniverse.seasons.map(s => s.seasonNumber)));
    }
  };

  const handleConfirmAddItemToPhase = () => {
    if (!activeUniverse || !onUpdateUniverse || addingToPhaseIndex === null) return;
    const currentSeasons = activeUniverse.seasons || [];
    const targetSeason = currentSeasons[addingToPhaseIndex];
    if (!targetSeason) return;

    // Check for maximum 50 items limit per phase
    if (targetSeason.episodes.length >= MAX_ITEMS_PER_PHASE) {
      alert(`Maksimalan broj stavki po fazi je ${MAX_ITEMS_PER_PHASE}! Ova faza je već popunjena.`);
      return;
    }

    let newItemName = '';
    let newItemOverview = '';
    let newItemRating = 8.0;
    let newItemImage = '';
    let newItemLinkTargetId = '';

    if (addItemSource === 'catalog') {
      if (addItemCatalogType === 'movie') {
        const movie = entries.find(e => e.id === addItemMovieId && e.type === 'movie');
        if (!movie) return alert('Molimo odaberite film iz kataloga!');
        newItemName = movie.name;
        newItemOverview = movie.description || `Film (${movie.year})`;
        newItemRating = movie.movieRating || 8.0;
        newItemImage = movie.posterUrl || movie.bannerUrl || '';
        newItemLinkTargetId = movie.id;
      } else {
        const show = entries.find(e => e.id === addItemShowId && e.type === 'show');
        if (!show) return alert('Molimo odaberite seriju iz kataloga!');
        const s = show.seasons?.find(sn => sn.seasonNumber === addItemSeasonNum);
        const ep = s?.episodes?.find(e => e.episodeNumber === addItemEpisodeNum);
        if (ep) {
          newItemName = `${show.name} - E${ep.episodeNumber}: ${ep.name}`;
          newItemOverview = ep.overview || show.description || `Epizoda ${ep.episodeNumber} serije ${show.name}`;
          newItemRating = ep.rating || 8.0;
          newItemImage = ep.imageUrl || show.posterUrl || show.bannerUrl || '';
          newItemLinkTargetId = `${show.id}|${addItemSeasonNum}|${addItemEpisodeNum}`;
        } else {
          newItemName = show.name;
          newItemOverview = show.description || `Serija (${show.year})`;
          newItemRating = calculateAverageRating(show) || 8.0;
          newItemImage = show.posterUrl || show.bannerUrl || '';
          newItemLinkTargetId = show.id;
        }
      }
    } else {
      if (!addItemCustomName.trim()) return alert('Molimo unesite naziv stavke!');
      newItemName = addItemCustomName.trim();
      newItemOverview = addItemCustomOverview.trim();
      newItemRating = Number(addItemCustomRating) || 8.0;
      newItemImage = addItemCustomImage.trim();
    }

    const nextEpNum = targetSeason.episodes.length + 1;
    const newEpisode: Episode = {
      id: `${activeUniverse.id}-p${targetSeason.seasonNumber}-ep${Date.now()}`,
      episodeNumber: nextEpNum,
      name: newItemName,
      rating: newItemRating,
      overview: newItemOverview || undefined,
      imageUrl: newItemImage || undefined,
      linkTargetId: newItemLinkTargetId || undefined,
      linkText: newItemName
    };

    const updatedSeasons = currentSeasons.map((s, idx) => {
      if (idx === addingToPhaseIndex) {
        return {
          ...s,
          episodes: [...s.episodes, newEpisode]
        };
      }
      return s;
    });

    onUpdateUniverse({
      ...activeUniverse,
      seasons: updatedSeasons
    });

    // Reset state & close modal
    setAddingToPhaseIndex(null);
    setAddItemCustomName('');
    setAddItemCustomOverview('');
    setAddItemCustomRating(8.0);
    setAddItemCustomImage('');
    setAddItemMovieId('');
    setAddItemShowId('');
  };

  const handleNavigateTarget = (targetId?: string) => {
    if (!onNavigateToEntry || !targetId) return;
    if (targetId.includes('|')) {
      const [entryId, sNum, eNum] = targetId.split('|');
      onNavigateToEntry(entryId, Number(sNum), Number(eNum));
    } else {
      onNavigateToEntry(targetId);
    }
  };

  // Calculate statistics for active universe
  const activeStats = useMemo(() => {
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

  // Flatten chronological timeline items across phases for the arrow timeline with search and phase filter
  const chronologicalTimelineItems = useMemo(() => {
    if (!activeUniverse || !activeUniverse.seasons) return [];
    const items: {
      phaseName: string;
      phaseNumber: number;
      phaseIndex: number;
      item: Episode;
      index: number;
    }[] = [];

    let count = 0;
    activeUniverse.seasons.forEach((phase, pIdx) => {
      if (selectedPhaseFilter !== 'all' && phase.seasonNumber !== selectedPhaseFilter) {
        return;
      }
      phase.episodes.forEach((ep) => {
        count++;
        const matchesQuery = !searchQuery.trim() || 
          ep.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (ep.overview && ep.overview.toLowerCase().includes(searchQuery.toLowerCase()));

        if (matchesQuery) {
          items.push({
            phaseName: phase.seasonName || `Faza ${phase.seasonNumber}`,
            phaseNumber: phase.seasonNumber,
            phaseIndex: pIdx,
            item: ep,
            index: count
          });
        }
      });
    });

    return items;
  }, [activeUniverse, selectedPhaseFilter, searchQuery]);

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
              Spajajte više povezanih filmova, serija i faza u kohezivnu hronologiju do 50 stavki po fazi. Uređujte stackove, povezujte postojeće naslove i pratite hronologiju priče.
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
                    onClick={() => {
                      setSelectedUniverseId(universe.id);
                      setSelectedPhaseFilter('all');
                      setSearchQuery('');
                    }}
                    className={`group relative p-4 rounded-2xl border backdrop-blur-md cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.15)] -translate-y-0.5'
                        : 'bg-zinc-900/60 hover:bg-zinc-900/90 border-zinc-800/80 hover:border-purple-500/40 hover:-translate-y-0.5'
                    }`}
                  >
                    <div className="flex gap-4 items-center">
                      <img
                        src={universe.posterUrl || universe.bannerUrl}
                        alt={universe.name}
                        className="w-16 h-22 object-cover rounded-xl bg-zinc-950 shrink-0 border border-zinc-800/80 group-hover:border-purple-500/50 transition-colors"
                        referrerPolicy="no-referrer"
                      />

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            {universe.seasons?.length || 0} FAZA
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-yellow-400 text-xs font-mono font-black">
                              <Star size={11} className="fill-current" />
                              <span>{score > 0 ? score.toFixed(1) : '—'}</span>
                            </div>
                            {onDeleteUniverse && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirmDeleteId === universe.id) {
                                    onDeleteUniverse(universe.id);
                                    setConfirmDeleteId(null);
                                    if (selectedUniverseId === universe.id) {
                                      setSelectedUniverseId(null);
                                    }
                                  } else {
                                    setConfirmDeleteId(universe.id);
                                    setTimeout(() => setConfirmDeleteId(null), 4000);
                                  }
                                }}
                                className={`p-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                                  confirmDeleteId === universe.id
                                    ? 'bg-red-500 text-white font-bold animate-pulse'
                                    : 'text-zinc-500 hover:text-red-400 hover:bg-red-500/10'
                                }`}
                                title={confirmDeleteId === universe.id ? "Klikni ponovo za brisanje!" : "Obriši univerzum"}
                              >
                                <Trash2 size={13} />
                                {confirmDeleteId === universe.id && (
                                  <span className="text-[9px] uppercase tracking-wider font-extrabold">Potvrdi?</span>
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        <h4 className="font-black text-sm text-white truncate group-hover:text-purple-300 transition-colors">
                          {universe.name}
                        </h4>

                        <p className="text-[10px] text-zinc-400 line-clamp-1">
                          {universe.year} • {itemCount} Naslova/Projektā
                        </p>
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
              <div className="relative rounded-3xl overflow-hidden border border-zinc-800/80 bg-zinc-900/70 backdrop-blur-md p-5 sm:p-7 space-y-5 shadow-2xl">
                {/* Background Banner Blur */}
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-20 blur-xl pointer-events-none"
                  style={{ backgroundImage: `url(${activeUniverse.bannerUrl || activeUniverse.posterUrl})` }}
                />
                
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                    <div>
                      <span className="text-[10px] font-mono font-black text-purple-400 uppercase tracking-widest bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full">
                        Aktivni Univerzum • {activeUniverse.year}
                      </span>
                      <div className="flex items-center gap-3 mt-2">
                        <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                          {activeUniverse.name}
                        </h3>
                        {onDeleteUniverse && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirmDeleteId === activeUniverse.id) {
                                onDeleteUniverse(activeUniverse.id);
                                setConfirmDeleteId(null);
                                setSelectedUniverseId(null);
                              } else {
                                setConfirmDeleteId(activeUniverse.id);
                                setTimeout(() => setConfirmDeleteId(null), 4000);
                              }
                            }}
                            className={`p-2 rounded-xl border transition cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                              confirmDeleteId === activeUniverse.id
                                ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-500/30 animate-pulse'
                                : 'text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border-zinc-800 hover:border-red-500/30'
                            }`}
                            title={confirmDeleteId === activeUniverse.id ? "Klikni ponovo za potvrdu brisanja!" : "Obriši univerzum"}
                          >
                            <Trash2 size={14} />
                            <span>
                              {confirmDeleteId === activeUniverse.id ? "Potvrdi brisanje?" : "Obriši"}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mode switcher: Hronologija (Lista Stavki) vs Hronološki Slijed (Timeline sa strijelicama) */}
                  <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800/80 shrink-0">
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
                      <span className="text-[9px] uppercase font-bold text-zinc-400">Ukupno Stavki</span>
                      <p className="text-base sm:text-lg font-mono font-black text-purple-300">
                        {activeStats.totalItems} <span className="text-[10px] text-zinc-500 font-normal">naslova</span>
                      </p>
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

                {/* TOOLBAR: SEARCH & PHASE FILTER PILLS & VIEW DENSITY CONTROLS */}
                <div className="relative z-10 space-y-3 pt-2 border-t border-zinc-800/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Search inside universe */}
                    <div className="relative flex-1">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Pretraži filmove, serije i projekte u ovom univerzumu..."
                        className="w-full bg-zinc-950/90 border border-zinc-800/80 rounded-xl pl-8 pr-8 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/60"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* View density and expand/collapse controls */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={toggleCollapseAll}
                        className="px-2.5 py-1.5 bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] font-bold text-zinc-300 hover:text-white flex items-center gap-1 transition-all cursor-pointer"
                        title={collapsedPhases.size === (activeUniverse.seasons?.length || 0) ? "Proširi sve faze" : "Skupi sve faze"}
                      >
                        {collapsedPhases.size === (activeUniverse.seasons?.length || 0) ? (
                          <>
                            <UnfoldVertical size={11} className="text-purple-400" /> Proširi sve
                          </>
                        ) : (
                          <>
                            <FoldVertical size={11} className="text-purple-400" /> Skupi sve
                          </>
                        )}
                      </button>

                      <div className="flex items-center bg-zinc-950 p-0.5 rounded-xl border border-zinc-800">
                        <button
                          type="button"
                          onClick={() => setViewDensity('compact')}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                            viewDensity === 'compact' ? 'bg-purple-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                          }`}
                          title="Kompaktan prikaz za pregled velikog broja stavki"
                        >
                          <List size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewDensity('detailed')}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                            viewDensity === 'detailed' ? 'bg-purple-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                          }`}
                          title="Detaljan prikaz sa sinopsisom i opisom"
                        >
                          <LayoutGrid size={13} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Phase jump pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                    <button
                      type="button"
                      onClick={() => setSelectedPhaseFilter('all')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                        selectedPhaseFilter === 'all'
                          ? 'bg-purple-600 text-white font-extrabold shadow-sm'
                          : 'bg-zinc-950/60 text-zinc-400 hover:text-zinc-200 border border-zinc-850'
                      }`}
                    >
                      Sve Faze ({activeStats?.totalItems || 0})
                    </button>
                    {activeUniverse.seasons?.map((phase) => {
                      const isFiltered = selectedPhaseFilter === phase.seasonNumber;
                      return (
                        <button
                          key={`phase-pill-${phase.seasonNumber}`}
                          type="button"
                          onClick={() => setSelectedPhaseFilter(phase.seasonNumber)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                            isFiltered
                              ? 'bg-purple-600 text-white font-extrabold shadow-sm'
                              : 'bg-zinc-950/60 text-zinc-400 hover:text-zinc-200 border border-zinc-850'
                          }`}
                        >
                          <span>{phase.seasonName || `Faza ${phase.seasonNumber}`}</span>
                          <span className={`px-1 py-0.2 rounded font-mono text-[9px] ${isFiltered ? 'bg-purple-900/60 text-purple-200' : 'bg-zinc-900 text-zinc-500'}`}>
                            {phase.episodes.length}/50
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* MODE 1: HRONOLOGIJA (STACKS & PHASES LIST VIEW) */}
                {timelineMode === 'chronological' ? (
                  <div className="space-y-4 relative z-10 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase text-zinc-300 tracking-wider">
                        Faze & Hronologija Naslova
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
                        <div className="text-xs font-bold text-purple-300 uppercase">Dodaj novu fazu ili stack (do 50 stavki po fazi)</div>
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

                    {activeUniverse.seasons?.filter(p => selectedPhaseFilter === 'all' || p.seasonNumber === selectedPhaseFilter).map((phase, pIdx) => {
                      const actualPhaseIdx = activeUniverse.seasons?.findIndex(s => s.seasonNumber === phase.seasonNumber) ?? pIdx;
                      const isCollapsed = collapsedPhases.has(phase.seasonNumber);
                      const phaseAvg = phase.episodes.length > 0
                        ? (phase.episodes.reduce((acc, ep) => acc + (ep.rating || 0), 0) / phase.episodes.length).toFixed(1)
                        : '—';

                      // Filter items by search query
                      const visibleEpisodes = phase.episodes.filter(ep => {
                        if (!searchQuery.trim()) return true;
                        const q = searchQuery.toLowerCase();
                        return ep.name.toLowerCase().includes(q) || (ep.overview && ep.overview.toLowerCase().includes(q));
                      });

                      return (
                        <div key={`phase-block-${phase.seasonNumber}`} className="space-y-3 bg-zinc-950/70 border border-zinc-850/90 p-4 sm:p-5 rounded-2xl shadow-lg transition-all">
                          <div 
                            onClick={() => togglePhaseCollapse(phase.seasonNumber)}
                            className="flex items-center justify-between border-b border-zinc-850/80 pb-2.5 cursor-pointer select-none group"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                              <h4 className="font-extrabold text-sm text-zinc-100 uppercase tracking-wide group-hover:text-purple-300 transition-colors">
                                {phase.seasonName || `Faza ${phase.seasonNumber}`}
                              </h4>
                              <span className="text-[10px] font-mono font-black text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                                {phase.episodes.length}/50 stavki
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1 text-yellow-400 text-xs font-mono font-black">
                                <Star size={11} className="fill-current" />
                                <span>{phaseAvg}</span>
                              </div>

                              {onUpdateUniverse && (
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (phase.episodes.length >= MAX_ITEMS_PER_PHASE) {
                                        alert(`Maksimalan broj stavki po fazi je ${MAX_ITEMS_PER_PHASE}! Ova faza je već popunjena.`);
                                        return;
                                      }
                                      setAddingToPhaseIndex(actualPhaseIdx);
                                    }}
                                    className="px-2.5 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 rounded-lg text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                                    title="Dodaj novu stavku u ovu fazu"
                                  >
                                    <Plus size={11} /> Dodaj ({phase.episodes.length}/50)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePhase(actualPhaseIdx)}
                                    className="p-1 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                    title="Obriši ovu fazu"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              )}

                              <div className="text-zinc-500 group-hover:text-zinc-300 transition-colors">
                                {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                              </div>
                            </div>
                          </div>

                          {!isCollapsed && (
                            <div className="space-y-2 pt-1 animate-fade-in">
                              {phase.episodes.length === 0 ? (
                                <div className="p-5 text-center border border-dashed border-zinc-850 rounded-xl text-zinc-500 text-xs">
                                  Ova faza nema unesenih stavki. Kliknite "Dodaj stavku" za unos (do 50 stavki).
                                </div>
                              ) : visibleEpisodes.length === 0 ? (
                                <div className="p-4 text-center border border-zinc-850/50 rounded-xl text-zinc-500 text-xs">
                                  Nema stavki koje odgovaraju pretrazi "{searchQuery}".
                                </div>
                              ) : (
                                <div className={viewDensity === 'compact' ? 'space-y-1.5' : 'grid grid-cols-1 sm:grid-cols-2 gap-2.5'}>
                                  {visibleEpisodes.map((item, iIdx) => {
                                    const rawItemIdx = phase.episodes.findIndex(e => e.id === item.id);

                                    if (viewDensity === 'compact') {
                                      return (
                                        <div
                                          key={`phase-item-${phase.seasonNumber}-${item.id || iIdx}`}
                                          className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800/80 hover:border-purple-500/40 transition-all duration-150 group"
                                        >
                                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                            <span className="w-6 h-6 rounded-lg bg-zinc-950 text-purple-400 text-[10px] font-mono font-black flex items-center justify-center shrink-0 border border-zinc-850">
                                              #{item.episodeNumber}
                                            </span>

                                            {/* Link Chain Icon */}
                                            {onUpdateUniverse && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setTargetItemCoords({ phaseIdx: actualPhaseIdx, itemIdx: rawItemIdx });
                                                  setIsLinkingModalOpen(true);
                                                }}
                                                className={`p-1.5 rounded-lg border transition-all cursor-pointer shrink-0 ${
                                                  item.linkTargetId
                                                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30'
                                                    : 'bg-zinc-950/80 text-zinc-400 border-zinc-800 hover:text-white hover:border-purple-500/30 hover:bg-zinc-900'
                                                }`}
                                                title={item.linkTargetId ? "Stavka je povezana. Klikni za promjenu" : "Poveži ovu stavku s filmom ili epizodom"}
                                              >
                                                <LinkIcon size={12} />
                                              </button>
                                            )}

                                            {item.imageUrl && (
                                              <img 
                                                src={item.imageUrl} 
                                                alt={item.name} 
                                                className="w-7 h-9 object-cover rounded bg-zinc-950 shrink-0 border border-zinc-800 cursor-pointer"
                                                onClick={() => handleNavigateTarget(item.linkTargetId)}
                                                referrerPolicy="no-referrer"
                                              />
                                            )}

                                            <div className="min-w-0 flex-1 flex items-center gap-2">
                                              <h5 
                                                onClick={() => handleNavigateTarget(item.linkTargetId)}
                                                className={`text-xs font-black truncate transition-colors ${
                                                  item.linkTargetId ? 'text-white hover:text-purple-300 cursor-pointer underline underline-offset-2 decoration-purple-500/40' : 'text-zinc-200'
                                                }`}
                                              >
                                                {item.name}
                                              </h5>
                                              {item.linkTargetId && (
                                                <button
                                                  onClick={() => handleNavigateTarget(item.linkTargetId)}
                                                  className="text-[9px] text-sky-400 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800/50 hover:bg-sky-900 transition flex items-center gap-1 shrink-0"
                                                  title="Otvoriti u katalogu"
                                                >
                                                  <ExternalLink size={9} /> Otvori
                                                </button>
                                              )}
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-2.5 shrink-0">
                                            <div className="flex items-center gap-1 bg-zinc-950 px-2 py-0.5 rounded-lg border border-zinc-850 font-mono text-xs font-black text-yellow-400">
                                              <Star size={10} className="fill-current" />
                                              <span>{item.rating > 0 ? item.rating.toFixed(1) : '—'}</span>
                                            </div>

                                            {onUpdateUniverse && (
                                              <div className="flex items-center gap-1 border-l border-zinc-800 pl-2">
                                                <button
                                                  onClick={() => handleMoveItemInPhase(actualPhaseIdx, rawItemIdx, 'up')}
                                                  disabled={rawItemIdx === 0}
                                                  className="p-1 text-zinc-400 hover:text-white disabled:opacity-20 cursor-pointer"
                                                  title="Pomjeri gore"
                                                >
                                                  <ArrowUp size={11} />
                                                </button>
                                                <button
                                                  onClick={() => handleMoveItemInPhase(actualPhaseIdx, rawItemIdx, 'down')}
                                                  disabled={rawItemIdx === phase.episodes.length - 1}
                                                  className="p-1 text-zinc-400 hover:text-white disabled:opacity-20 cursor-pointer"
                                                  title="Pomjeri dole"
                                                >
                                                  <ArrowDown size={11} />
                                                </button>
                                                <button
                                                  onClick={() => handleDeleteItemFromPhase(actualPhaseIdx, rawItemIdx)}
                                                  className="p-1 text-red-400 hover:text-red-300 cursor-pointer ml-1"
                                                  title="Ukloni stavku"
                                                >
                                                  <Trash2 size={11} />
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    }

                                    // Detailed layout
                                    return (
                                      <div
                                        key={`phase-item-detailed-${phase.seasonNumber}-${item.id || iIdx}`}
                                        className="p-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800/80 hover:border-purple-500/40 transition-all duration-150 flex flex-col justify-between gap-2"
                                      >
                                        <div className="flex items-start gap-3">
                                          {item.imageUrl && (
                                            <img 
                                              src={item.imageUrl} 
                                              alt={item.name} 
                                              className="w-10 h-14 object-cover rounded-lg bg-zinc-950 shrink-0 border border-zinc-800"
                                              onClick={() => handleNavigateTarget(item.linkTargetId)}
                                              referrerPolicy="no-referrer"
                                            />
                                          )}
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-[9px] font-mono font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.2 rounded">
                                                #{item.episodeNumber}
                                              </span>
                                              <h5 
                                                onClick={() => handleNavigateTarget(item.linkTargetId)}
                                                className={`text-xs font-black truncate ${
                                                  item.linkTargetId ? 'text-white hover:text-purple-300 cursor-pointer' : 'text-zinc-200'
                                                }`}
                                              >
                                                {item.name}
                                              </h5>
                                            </div>
                                            {item.overview && (
                                              <p className="text-[10px] text-zinc-400 line-clamp-2 mt-1">
                                                {item.overview}
                                              </p>
                                            )}
                                          </div>
                                        </div>

                                        <div className="flex items-center justify-between border-t border-zinc-850 pt-2 mt-1">
                                          <div className="flex items-center gap-1 text-yellow-400 font-mono text-xs font-bold">
                                            <Star size={11} className="fill-current" />
                                            <span>{item.rating > 0 ? item.rating.toFixed(1) : '—'}</span>
                                          </div>

                                          <div className="flex items-center gap-1.5">
                                            {item.linkTargetId && (
                                              <button
                                                onClick={() => handleNavigateTarget(item.linkTargetId)}
                                                className="text-[9px] text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/50 hover:bg-sky-900 transition flex items-center gap-1"
                                              >
                                                <ExternalLink size={9} /> Otvori
                                              </button>
                                            )}
                                            {onUpdateUniverse && (
                                              <>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setTargetItemCoords({ phaseIdx: actualPhaseIdx, itemIdx: rawItemIdx });
                                                    setIsLinkingModalOpen(true);
                                                  }}
                                                  className="p-1 text-zinc-400 hover:text-purple-300 cursor-pointer"
                                                  title="Poveži stavku"
                                                >
                                                  <LinkIcon size={12} />
                                                </button>
                                                <button
                                                  onClick={() => handleDeleteItemFromPhase(actualPhaseIdx, rawItemIdx)}
                                                  className="p-1 text-red-400 hover:text-red-300 cursor-pointer"
                                                  title="Ukloni stavku"
                                                >
                                                  <Trash2 size={12} />
                                                </button>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {onUpdateUniverse && phase.episodes.length < MAX_ITEMS_PER_PHASE && (
                                <button
                                  type="button"
                                  onClick={() => setAddingToPhaseIndex(actualPhaseIdx)}
                                  className="w-full py-2 border border-dashed border-zinc-800 hover:border-purple-500/50 bg-zinc-900/30 hover:bg-zinc-900/80 rounded-xl text-zinc-400 hover:text-purple-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                                >
                                  <Plus size={13} /> Dodaj novu stavku u {phase.seasonName || `Fazu ${phase.seasonNumber}`} ({phase.episodes.length}/50)
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
                          Pratite tačan redoslijed priče kroz strijelice i hronološke linije od početka do kraja ({chronologicalTimelineItems.length} prikazano).
                        </p>
                      </div>
                    </div>

                    {chronologicalTimelineItems.length === 0 ? (
                      <div className="p-8 text-center text-zinc-500 text-xs border border-dashed border-zinc-850 rounded-2xl">
                        Nema stavki koje odgovaraju odabranom filteru. Prebacite se na "Hronologija" mod da dodate filmove i serije!
                      </div>
                    ) : (
                      <div className="relative pl-6 space-y-6 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-purple-500 before:via-yellow-500 before:to-purple-900">
                        {chronologicalTimelineItems.map((step, idx) => (
                          <div key={`timeline-step-${idx}`} className="relative group">
                            {/* Glowing timeline node dot */}
                            <div className="absolute -left-6 top-4 w-5 h-5 rounded-full bg-zinc-950 border-2 border-purple-500 group-hover:border-yellow-400 flex items-center justify-center transition-all shadow-[0_0_10px_rgba(168,85,247,0.5)] z-10">
                              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 group-hover:bg-yellow-400" />
                            </div>

                            <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 group-hover:border-purple-500/50 shadow-xl transition-all duration-200">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  {step.item.imageUrl && (
                                    <img 
                                      src={step.item.imageUrl} 
                                      alt={step.item.name} 
                                      className="w-10 h-14 object-cover rounded-xl bg-zinc-900 shrink-0 border border-zinc-800 group-hover:border-yellow-400/50 transition-colors cursor-pointer"
                                      onClick={() => handleNavigateTarget(step.item.linkTargetId)}
                                      referrerPolicy="no-referrer"
                                    />
                                  )}

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] font-mono font-black text-purple-400 uppercase tracking-widest bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                                        KORAK #{step.index} • {step.phaseName}
                                      </span>
                                    </div>
                                    <h5 
                                      onClick={() => handleNavigateTarget(step.item.linkTargetId)}
                                      className="font-extrabold text-sm text-white group-hover:text-yellow-400 transition-colors mt-1 cursor-pointer"
                                    >
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
                                      onClick={() => handleNavigateTarget(step.item.linkTargetId)}
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
                  /* MOVIE PICKER (strictly movies) */
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
                  /* SERIES & EPISODE PICKER (strictly shows) */
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

        {/* DEDICATED MODAL TO ADD ITEM TO A SPECIFIC PHASE */}
        {addingToPhaseIndex !== null && activeUniverse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-950 border border-purple-500/40 w-full max-w-lg rounded-2xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                    <Plus size={16} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">
                      Dodaj Stavku u Fazu #{addingToPhaseIndex + 1}
                    </h3>
                    <p className="text-[10px] text-zinc-400">
                      {activeUniverse.seasons?.[addingToPhaseIndex]?.seasonName || `Faza ${addingToPhaseIndex + 1}`} • Max 50 stavki ({activeUniverse.seasons?.[addingToPhaseIndex]?.episodes.length || 0}/50)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAddingToPhaseIndex(null)}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Source Mode Toggle */}
              <div className="grid grid-cols-2 gap-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setAddItemSource('catalog')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    addItemSource === 'catalog' ? 'bg-purple-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  🍿 Iz Kataloga
                </button>
                <button
                  type="button"
                  onClick={() => setAddItemSource('custom')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    addItemSource === 'custom' ? 'bg-purple-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  ✏️ Prilagođeno
                </button>
              </div>

              {addItemSource === 'catalog' ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAddItemCatalogType('movie')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        addItemCatalogType === 'movie' ? 'bg-zinc-800 text-yellow-400 border-yellow-500/40' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      Film
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddItemCatalogType('show')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        addItemCatalogType === 'show' ? 'bg-zinc-800 text-yellow-400 border-yellow-500/40' : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      Serija / Epizoda
                    </button>
                  </div>

                  {addItemCatalogType === 'movie' ? (
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Odaberi film:</label>
                      <select
                        value={addItemMovieId}
                        onChange={(e) => setAddItemMovieId(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                      >
                        <option value="">-- Odaberi film --</option>
                        {entries.filter(e => e.type === 'movie').map(m => (
                          <option key={m.id} value={m.id}>{m.name} ({m.year}) - ★ {m.movieRating || '8.0'}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Odaberi seriju:</label>
                        <select
                          value={addItemShowId}
                          onChange={(e) => {
                            const showId = e.target.value;
                            setAddItemShowId(showId);
                            const show = entries.find(s => s.id === showId);
                            if (show?.seasons?.length) {
                              setAddItemSeasonNum(show.seasons[0].seasonNumber);
                              if (show.seasons[0].episodes?.length) {
                                setAddItemEpisodeNum(show.seasons[0].episodes[0].episodeNumber);
                              }
                            }
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                        >
                          <option value="">-- Odaberi seriju --</option>
                          {entries.filter(e => e.type === 'show').map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.year})</option>
                          ))}
                        </select>
                      </div>

                      {addItemShowId && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Sezona:</label>
                            <select
                              value={addItemSeasonNum}
                              onChange={(e) => {
                                const sNum = Number(e.target.value);
                                setAddItemSeasonNum(sNum);
                                const show = entries.find(s => s.id === addItemShowId);
                                const season = show?.seasons?.find(sn => sn.seasonNumber === sNum);
                                if (season?.episodes?.length) {
                                  setAddItemEpisodeNum(season.episodes[0].episodeNumber);
                                }
                              }}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                            >
                              {entries.find(e => e.id === addItemShowId)?.seasons?.map(s => (
                                <option key={s.seasonNumber} value={s.seasonNumber}>Sezona {s.seasonNumber}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Epizoda:</label>
                            <select
                              value={addItemEpisodeNum}
                              onChange={(e) => setAddItemEpisodeNum(Number(e.target.value))}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                            >
                              {entries.find(e => e.id === addItemShowId)?.seasons?.find(s => s.seasonNumber === addItemSeasonNum)?.episodes?.map(ep => (
                                <option key={ep.episodeNumber} value={ep.episodeNumber}>Ep. {ep.episodeNumber}: {ep.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Naziv naslova/projekta *</label>
                    <input
                      type="text"
                      value={addItemCustomName}
                      onChange={(e) => setAddItemCustomName(e.target.value)}
                      placeholder="npr. Iron Man (2008)"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Ocjena (1.0 - 10.0)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="10"
                      value={addItemCustomRating}
                      onChange={(e) => setAddItemCustomRating(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Opis / Napomena</label>
                    <textarea
                      value={addItemCustomOverview}
                      onChange={(e) => setAddItemCustomOverview(e.target.value)}
                      placeholder="Hronološke napomene u radnji..."
                      rows={2}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-zinc-850 pt-3">
                <button
                  type="button"
                  onClick={() => setAddingToPhaseIndex(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 transition-all cursor-pointer"
                >
                  Otkaži
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAddItemToPhase}
                  className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-purple-600 hover:bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all cursor-pointer"
                >
                  Dodaj u Fazu
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
