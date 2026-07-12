import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RatingEntry, Episode, Season, SortKey, SortOrder, Actor } from './types';
import { DEFAULT_ENTRIES } from './data';
import { getEntriesFromDB, saveEntriesToDB } from './db';
import { calculateAverageRating, calculatePersonalRating, calculateTotalVotes, calculateCombinedAverageRating, getRatingColorClass, getShowDynamicColors } from './utils';
import RatingGrid from './components/RatingGrid';
import DetailPopup from './components/DetailPopup';
import AddEntryModal from './components/AddEntryModal';
import EditEntryModal from './components/EditEntryModal';
import StatsModal from './components/StatsModal';
import ExportModal from './components/ExportModal';
import SurpriseMeModal from './components/SurpriseMeModal';
import BulkEditModal from './components/BulkEditModal';
import { 
  Tv, 
  Film, 
  Plus, 
  Search, 
  Sun, 
  Moon, 
  Star, 
  RotateCcw, 
  Trash2, 
  Play, 
  Grid as GridIcon, 
  Clock, 
  Info,
  ChevronDown,
  ArrowUpDown,
  BarChart2,
  Download,
  Edit,
  X,
  Sparkles,
  Save,
  Check,
  Database
} from 'lucide-react';

export default function App() {
  // Theme state: Forced permanently to true (IMDb identical native dark mode) as requested by user
  const isDarkMode = true;

  // Main Entries database state
  const [entries, setEntries] = useState<RatingEntry[]>(() => {
    const saved = localStorage.getItem('rating-grid-entries');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed) return parsed;
      } catch (e) {
        console.error('Error reading localStorage entries:', e);
      }
    }
    return DEFAULT_ENTRIES;
  });

  // Selected active item
  const [activeId, setActiveId] = useState<string>(() => {
    const savedActiveId = localStorage.getItem('rating-grid-active-id');
    if (savedActiveId) return savedActiveId;

    const saved = localStorage.getItem('rating-grid-entries');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed[0].id;
      } catch (e) {}
    }
    return '';
  });

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('rating');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterType, setFilterType] = useState<'all' | 'show' | 'movie' | 'universe'>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportInitialTab, setExportInitialTab] = useState<'web-html' | 'json-backup'>('web-html');
  const [isSurpriseOpen, setIsSurpriseOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<{ seasonNum: number; episode: Episode } | null>(null);

  // Custom dialog & edit interaction boundaries
  const [deleteTarget, setDeleteTarget] = useState<'all' | 'entry' | null>(null);
  const [isMovieRatingEditing, setIsMovieRatingEditing] = useState(false);
  const [tempMovieRating, setTempMovieRating] = useState<number | null>(null);
  const [voterNameInput, setVoterNameInput] = useState('');
  const [voterRatingInput, setVoterRatingInput] = useState(8.0);
  
  // 1. Asynchronously load from standard IndexedDB on mount & perform migration if IndexedDB is currently empty
  useEffect(() => {
    const loadAuthoritativeData = async () => {
      try {
        const dbEntries = await getEntriesFromDB();
        if (dbEntries && dbEntries.length > 0) {
          setEntries(dbEntries);
        } else {
          // If IndexedDB is empty, check if we have data inside legacy localStorage
          const legacySaved = localStorage.getItem('rating-grid-entries');
          if (legacySaved) {
            try {
              const parsed = JSON.parse(legacySaved);
              if (parsed && parsed.length > 0) {
                setEntries(parsed);
                // Migrate to IndexedDB immediately so we are safe
                await saveEntriesToDB(parsed);
              }
            } catch (err) {
              console.error('Failed to parse legacy localStorage backup:', err);
            }
          }
        }
      } catch (err) {
        console.error('Error loading authoritative database from IndexedDB:', err);
      }
    };
    loadAuthoritativeData();
  }, []);

  // 2. Synchronize database state to IndexedDB automatically, with a silent best-effort localStorage copy
  useEffect(() => {
    const persistData = async () => {
      try {
        await saveEntriesToDB(entries);
        
        // Silent best-effort localStorage backup (ignores QuotaExceeded errors)
        try {
          localStorage.setItem('rating-grid-entries', JSON.stringify(entries));
        } catch (quotaError) {
          // Silently caught: database is successfully and securely saved in IndexedDB!
        }
      } catch (err) {
        console.error('Error auto-saving entries to IndexedDB:', err);
      }
    };
    persistData();
  }, [entries]);

  useEffect(() => {
    try {
      if (activeId) {
        localStorage.setItem('rating-grid-active-id', activeId);
      } else {
        localStorage.removeItem('rating-grid-active-id');
      }
    } catch (e) {
      console.error('Error saving active ID to localStorage:', e);
    }
  }, [activeId]);

  useEffect(() => {
    try {
      localStorage.setItem('rating-grid-theme', isDarkMode ? 'dark' : 'light');
    } catch (e) {
      console.error('Error saving theme to localStorage:', e);
    }
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Derive calculated active item
  const activeEntry = useMemo(() => {
    const found = entries.find(e => e.id === activeId);
    if (found) return found;
    if (entries.length > 0) return entries[0];
    return null;
  }, [entries, activeId]);

  const activeTheme = useMemo(() => {
    if (!activeEntry) return null;
    return getShowDynamicColors(activeEntry.name);
  }, [activeEntry]);

  // Synchronize activeId boundaries
  useEffect(() => {
    if (activeEntry && activeId !== activeEntry.id) {
      setActiveId(activeEntry.id);
    } else if (!activeEntry && activeId !== '') {
      setActiveId('');
    }
    setIsMovieRatingEditing(false);
    setTempMovieRating(null);
  }, [activeEntry, activeId]);

  // Sort and filter calculations
  const processedEntries = useMemo(() => {
    let list = [...entries];

    // Text filtration
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(e => e.name.toLowerCase().includes(query) || e.description.toLowerCase().includes(query));
    }

    // Type filter
    if (filterType !== 'all') {
      list = list.filter(e => e.type === filterType);
    }

    // Sorting algorithm
    list.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      if (sortBy === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortBy === 'year') {
        valA = a.year;
        valB = b.year;
      } else if (sortBy === 'rating') {
        valA = calculateAverageRating(a);
        valB = calculateAverageRating(b);
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [entries, searchQuery, sortBy, sortOrder, filterType]);

  // Reset to original default database values
  const handleResetToDefaults = () => {
    setDeleteTarget('all');
  };

  // Switch Selected item
  const handleSelectEntry = (id: string) => {
    setActiveId(id);
  };

  // Add highly modular completely new entry
  const handleAddEntry = (newEntry: RatingEntry) => {
    setEntries(prev => [newEntry, ...prev]);
    setActiveId(newEntry.id);
    setIsAddModalOpen(false);
  };

  // Remove active show or movie
  const handleDeleteActiveEntry = () => {
    if (!activeEntry) return;
    setDeleteTarget('entry');
  };

  // Season & Episode Addition Helpers
  const handleAddSeason = () => {
    if (!activeEntry || activeEntry.type !== 'show') return;
    
    const currentSeasons = activeEntry.seasons || [];
    const nextSeasonNum = currentSeasons.length + 1;
    
    // Automatically pre-populate with 5 episodes for convenience
    const newEpisodes: Episode[] = Array.from({ length: 5 }).map((_, i) => ({
      id: `${activeEntry.id}-s${nextSeasonNum}e${i + 1}`,
      episodeNumber: i + 1,
      name: `Episode ${i + 1}`,
      rating: 8.0,
      overview: `A thrilling development in Season ${nextSeasonNum}. Tap to update!`,
      imageUrl: activeEntry.bannerUrl || undefined
    }));

    const newSeason: Season = {
      seasonNumber: nextSeasonNum,
      episodes: newEpisodes
    };

    setEntries(prev => prev.map(e => {
      if (e.id === activeEntry.id) {
        return {
          ...e,
          seasons: [...(e.seasons || []), newSeason]
        };
      }
      return e;
    }));
  };

  const handleAddEpisodeToSeason = (seasonNumber: number) => {
    if (!activeEntry || !activeEntry.seasons) return;

    setEntries(prev => prev.map(e => {
      if (e.id === activeEntry.id) {
        const seasons = e.seasons || [];
        const updatedSeasons = seasons.map(s => {
          if (s.seasonNumber === seasonNumber) {
            const nextEpNumber = s.episodes.length + 1;
            return {
              ...s,
              episodes: [
                ...s.episodes,
                {
                  id: `${e.id}-s${seasonNumber}e${nextEpNumber}`,
                  episodeNumber: nextEpNumber,
                  name: `Episode ${nextEpNumber}`,
                  rating: 8.0,
                  overview: `This is dynamic Episode ${nextEpNumber} of Season ${seasonNumber}. Tap to change rating or customize highlights!`,
                  imageUrl: e.bannerUrl || undefined
                }
              ]
            };
          }
          return s;
        });
        return { ...e, seasons: updatedSeasons };
      }
      return e;
    }));
  };

  const handleSetSeasonEpisodeCount = (seasonNumber: number, targetCount: number) => {
    if (!activeEntry || !activeEntry.seasons) return;
    const cleanCount = Math.max(1, targetCount);

    setEntries(prev => prev.map(e => {
      if (e.id === activeEntry.id) {
        const seasons = e.seasons || [];
        const updatedSeasons = seasons.map(s => {
          if (s.seasonNumber === seasonNumber) {
            const currentCount = s.episodes.length;
            if (cleanCount === currentCount) return s;

            let updatedEpisodes = [...s.episodes];
            if (cleanCount > currentCount) {
              // Add episodes up to cleanCount
              for (let ep = currentCount + 1; ep <= cleanCount; ep++) {
                updatedEpisodes.push({
                  id: `${e.id}-s${seasonNumber}e${ep}`,
                  episodeNumber: ep,
                  name: `Episode ${ep}`,
                  rating: 8.0,
                  overview: `This is season ${seasonNumber} episode ${ep} of ${e.name}. Tap to change rating or custom highlights!`,
                  imageUrl: e.bannerUrl || undefined
                });
              }
            } else {
              // Truncate to cleanCount
              updatedEpisodes = updatedEpisodes.slice(0, cleanCount);
            }

            return {
              ...s,
              episodes: updatedEpisodes
            };
          }
          return s;
        });
        return { ...e, seasons: updatedSeasons };
      }
      return e;
    }));
  };

  // Save specific episode modifications
  const handleSaveEpisode = (updatedEp: Episode, keepOpen: boolean = true) => {
    if (!activeEntry || !activeEntry.seasons || !selectedEpisode) return;

    // Detect if any actor was updated inside the saved episode
    const prevActors = selectedEpisode.episode.actors || [];
    const newActors = updatedEp.actors || [];
    
    let changedActor: Actor | null = null;
    let originalName: string = '';

    for (const newAct of newActors) {
      const oldAct = prevActors.find(a => a.id === newAct.id);
      if (oldAct) {
        if (
          oldAct.name !== newAct.name ||
          oldAct.characterName !== newAct.characterName ||
          oldAct.photoUrl !== newAct.photoUrl ||
          oldAct.bio !== newAct.bio ||
          oldAct.age !== newAct.age ||
          oldAct.otherInfo !== newAct.otherInfo
        ) {
          changedActor = newAct;
          originalName = oldAct.name;
          break;
        }
      }
    }

    let nextEpToOpen = updatedEp;

    if (changedActor) {
      const targetOriginalName = originalName.toLowerCase().trim();
      const targetNewName = changedActor.name.toLowerCase().trim();
      const targetId = changedActor.id;

      // Sync edited actor to finalEp representation
      if (updatedEp.actors) {
        nextEpToOpen = {
          ...updatedEp,
          actors: updatedEp.actors.map(act => {
            const actName = (act.name || '').toLowerCase().trim();
            if (act.id === targetId || actName === targetOriginalName || actName === targetNewName) {
              return {
                ...act,
                name: changedActor!.name,
                characterName: changedActor!.characterName !== undefined ? changedActor!.characterName : act.characterName,
                photoUrl: changedActor!.photoUrl !== undefined ? changedActor!.photoUrl : act.photoUrl,
                bio: changedActor!.bio !== undefined ? changedActor!.bio : act.bio,
                age: changedActor!.age !== undefined ? changedActor!.age : act.age,
                otherInfo: changedActor!.otherInfo !== undefined ? changedActor!.otherInfo : act.otherInfo
              };
            }
            return act;
          })
        };
      }

      setEntries(prev => prev.map(e => {
        let entryChanged = false;
        
        let updatedMovieActors = e.movieActors;
        if (e.movieActors && e.movieActors.length > 0) {
          updatedMovieActors = e.movieActors.map(act => {
            const actName = (act.name || '').toLowerCase().trim();
            if (act.id === targetId || actName === targetOriginalName || actName === targetNewName) {
              entryChanged = true;
              return {
                ...act,
                name: changedActor!.name,
                characterName: changedActor!.characterName !== undefined ? changedActor!.characterName : act.characterName,
                photoUrl: changedActor!.photoUrl !== undefined ? changedActor!.photoUrl : act.photoUrl,
                bio: changedActor!.bio !== undefined ? changedActor!.bio : act.bio,
                age: changedActor!.age !== undefined ? changedActor!.age : act.age,
                otherInfo: changedActor!.otherInfo !== undefined ? changedActor!.otherInfo : act.otherInfo
              };
            }
            return act;
          });
        }

        let updatedSeasons = e.seasons;
        if (e.seasons && e.seasons.length > 0) {
          updatedSeasons = e.seasons.map(season => {
            let seasonChanged = false;
            const updatedEpisodes = season.episodes.map(ep => {
              let episodeChanged = false;
              let currentEpActors = ep.id === updatedEp.id ? nextEpToOpen.actors : ep.actors;
              
              let updatedEpActors = currentEpActors;
              if (currentEpActors && currentEpActors.length > 0) {
                updatedEpActors = currentEpActors.map(act => {
                  const actName = (act.name || '').toLowerCase().trim();
                  if (act.id === targetId || actName === targetOriginalName || actName === targetNewName) {
                    episodeChanged = true;
                    return {
                      ...act,
                      name: changedActor!.name,
                      characterName: changedActor!.characterName !== undefined ? changedActor!.characterName : act.characterName,
                      photoUrl: changedActor!.photoUrl !== undefined ? changedActor!.photoUrl : act.photoUrl,
                      bio: changedActor!.bio !== undefined ? changedActor!.bio : act.bio,
                      age: changedActor!.age !== undefined ? changedActor!.age : act.age,
                      otherInfo: changedActor!.otherInfo !== undefined ? changedActor!.otherInfo : act.otherInfo
                    };
                  }
                  return act;
                });
              }

              if (episodeChanged || ep.id === updatedEp.id) {
                seasonChanged = true;
                return {
                  ...(ep.id === updatedEp.id ? nextEpToOpen : ep),
                  actors: updatedEpActors
                };
              }
              return ep;
            });

            if (seasonChanged) {
              entryChanged = true;
              return {
                ...season,
                episodes: updatedEpisodes
              };
            }
            return season;
          });
        }

        if (entryChanged || e.id === activeEntry.id) {
          return {
            ...e,
            movieActors: updatedMovieActors,
            seasons: updatedSeasons
          };
        }
        return e;
      }));
    } else {
      // Standard save
      setEntries(prev => prev.map(e => {
        if (e.id === activeEntry.id) {
          const seasons = e.seasons || [];
          const updatedSeasons = seasons.map(s => {
            if (s.seasonNumber === selectedEpisode.seasonNum) {
              const updatedEps = s.episodes.map(ep => {
                if (ep.id === updatedEp.id) {
                  return updatedEp;
                }
                return ep;
              });
              return { ...s, episodes: updatedEps };
            }
            return s;
          });
          return { ...e, seasons: updatedSeasons };
        }
        return e;
      }));
    }

    if (keepOpen) {
      setSelectedEpisode({
        seasonNum: selectedEpisode.seasonNum,
        episode: nextEpToOpen
      });
    } else {
      setSelectedEpisode(null);
    }
  };

  const handleManualSave = async () => {
    try {
      // Save primarily and securely to IndexedDB
      await saveEntriesToDB(entries);
      
      // Best effort localStorage backup
      try {
        localStorage.setItem('rating-grid-entries', JSON.stringify(entries));
        localStorage.setItem('rating-grid-theme', isDarkMode ? 'dark' : 'light');
        if (activeId) {
          localStorage.setItem('rating-grid-active-id', activeId);
        }
      } catch (quotaError) {
        // Silently caught: Rating entries were stored correctly in IndexedDB. Keep other fields.
        try {
          localStorage.setItem('rating-grid-theme', isDarkMode ? 'dark' : 'light');
          if (activeId) {
            localStorage.setItem('rating-grid-active-id', activeId);
          }
        } catch (e) {}
      }
      
      setShowSaveToast(true);
      setTimeout(() => {
        setShowSaveToast(false);
      }, 3000);
    } catch (e) {
      console.error('Error during manual save:', e);
    }
  };

  // Bulk save seasons
  const handleSaveBulkSeasons = (updatedSeasons: Season[]) => {
    if (!activeEntry) return;
    setEntries(prev => prev.map(e => {
      if (e.id === activeEntry.id) {
        return {
          ...e,
          seasons: updatedSeasons
        };
      }
      return e;
    }));
    setIsBulkEditOpen(false);
  };

  const handleDeleteEpisode = () => {
    if (!activeEntry || !activeEntry.seasons || !selectedEpisode) return;

    const { seasonNum, episode } = selectedEpisode;

    setEntries(prev => prev.map(e => {
      if (e.id === activeEntry.id) {
        const seasons = e.seasons || [];
        const updatedSeasons = seasons.map(s => {
          if (s.seasonNumber === seasonNum) {
            const filteredEps = s.episodes.filter(ep => ep.id !== episode.id)
              // Re-index episode numbers so they remain sequential
              .map((ep, idx) => ({ ...ep, episodeNumber: idx + 1 }));
            return { ...s, episodes: filteredEps };
          }
          return s;
        });
        return { ...e, seasons: updatedSeasons };
      }
      return e;
    }));

    setSelectedEpisode(null);
  };

  // Navigate from Actor bio catalogue references directly to another episode or movie
  const handleNavigateFromActorCatalog = (entryId: string, seasonNum?: number, episodeNum?: number) => {
    setActiveId(entryId);
    if (seasonNum && episodeNum) {
      // Find the entry that matches
      const matchedEntry = entries.find(e => e.id === entryId);
      if (matchedEntry && matchedEntry.seasons) {
        const matchedSeason = matchedEntry.seasons.find(s => s.seasonNumber === seasonNum);
        const matchedEpisode = matchedSeason?.episodes.find(ep => ep.episodeNumber === episodeNum);
        if (matchedEpisode) {
          setSelectedEpisode({
            seasonNum,
            episode: matchedEpisode
          });
        }
      }
    } else {
      setSelectedEpisode(null);
    }
  };

  // Movie specific changes (quick rate overall)
  const handleUpdateMovieRating = (newRating: number) => {
    if (!activeEntry || activeEntry.type !== 'movie') return;
    setEntries(prev => prev.map(e => {
      if (e.id === activeEntry.id) {
        return { ...e, movieRating: newRating };
      }
      return e;
    }));
  };

  // Save edited characteristics of show/movie
  const handleSaveEditEntry = (updatedEntry: RatingEntry) => {
    setEntries(prev => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e));
    setIsEditModalOpen(false);
  };

  // Add guest vote
  const handleAddGuestVote = (entryId: string, voterName: string, rating: number) => {
    setEntries(prev => prev.map(e => {
      if (e.id === entryId) {
        const guestVotes = e.guestVotes || [];
        const newVote = {
          id: `vote-${Date.now()}-${Math.random().toString().slice(-4)}`,
          voterName: voterName || 'Anonymous',
          rating: Number(rating),
          createdAt: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        };
        return {
          ...e,
          guestVotes: [...guestVotes, newVote]
        };
      }
      return e;
    }));
  };

  // Delete guest vote
  const handleDeleteGuestVote = (entryId: string, voteId: string) => {
    setEntries(prev => prev.map(e => {
      if (e.id === entryId) {
        const guestVotes = e.guestVotes || [];
        return {
          ...e,
          guestVotes: guestVotes.filter(v => v.id !== voteId)
        };
      }
      return e;
    }));
  };

  return (
    <div id="rating-app-root" className={`min-h-screen transition-all duration-300 ${isDarkMode ? 'bg-zinc-950 text-slate-100' : 'bg-slate-50 text-zinc-900'}`}>
      
      {/* HEADER BAR */}
      <header id="app-navbar" className={`sticky top-0 z-40 px-4 sm:px-6 py-4 shadow-md backdrop-blur-md border-b transition-colors ${isDarkMode ? 'bg-zinc-950/90 border-zinc-900' : 'bg-white/95 border-zinc-200'}`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
            <div className="flex items-center gap-2">
              <span className="bg-yellow-400 text-zinc-950 font-black px-2.5 py-1 rounded text-sm tracking-tighter uppercase font-sans">
                Cinema
              </span>
              <span className="font-sans font-extrabold text-lg tracking-tight uppercase tracking-wider text-zinc-100 dark:text-zinc-100">
                Grafik
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 font-bold border-l border-zinc-800/80 pl-3 hidden sm:inline uppercase tracking-widest font-mono">
              Izradio Ahmed
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Surprise Me - Iznenadi me! */}
            <button
              onClick={() => setIsSurpriseOpen(true)}
              id="btn-surprise-me"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-black bg-purple-600/15 text-purple-400 border border-purple-500/35 rounded-lg hover:bg-purple-600/25 active:scale-95 transition-all cursor-pointer"
              title="Izaberite nasumičnu epizodu ili film sa slavljeničkim efektom"
            >
              <Sparkles size={14} className="animate-pulse" />
              <span>Iznenadi me!</span>
            </button>            {/* HTML Export Button */}
            <button
              onClick={() => {
                setExportInitialTab('web-html');
                setIsExportModalOpen(true);
              }}
              id="btn-open-export-hub"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-zinc-800 text-zinc-300 bg-zinc-900/40 hover:bg-zinc-900 hover:text-white rounded-lg transition-all active:scale-95 cursor-pointer font-sans"
              title="Preuzmite samostalni HTML katalog"
            >
              <Download size={14} />
              <span className="hidden sm:inline">HTML Izvoz</span>
            </button>

            {/* Direct JSON Database backup button */}
            <button
              onClick={() => {
                setExportInitialTab('json-backup');
                setIsExportModalOpen(true);
              }}
              id="btn-open-json-db"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-zinc-800 text-zinc-300 bg-zinc-900/40 hover:bg-zinc-900 hover:text-white rounded-lg transition-all active:scale-95 cursor-pointer font-sans"
              title="Uvoz i izvoz JSON baze podataka"
            >
              <Database size={14} />
              <span className="hidden sm:inline">JSON Baza</span>
            </button>

            {/* Manual Local Save button */}
            <button
              onClick={handleManualSave}
              id="btn-manual-sync-save"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold bg-emerald-600/15 text-emerald-400 border border-emerald-500/35 rounded-lg hover:bg-emerald-600/25 active:scale-95 transition-all cursor-pointer"
              title="Ručno spremi i osiguraj sve promjene u pregledniku"
            >
              <Save size={14} />
              <span>Spasi Sve</span>
            </button>

            {/* Reset presets button */}
            <button
              onClick={handleResetToDefaults}
              id="btn-reset-data"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-zinc-800 text-zinc-400 bg-zinc-900/40 hover:bg-zinc-900 hover:text-white rounded-lg transition-all active:scale-95 cursor-pointer"
              title="Isprazni sve podatke"
            >
              <RotateCcw size={14} /> <span className="hidden sm:inline">Očisti Sve</span>
            </button>

            {/* Add Custom Title block - compact plus icon only as requested */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              id="btn-open-add-slate"
              className="flex items-center justify-center bg-yellow-400 hover:bg-yellow-500 text-zinc-950 font-black p-2 rounded-lg shadow-md shadow-yellow-500/10 active:scale-95 transition-all cursor-pointer"
              title="Dodaj Novi Naslov (Film, Serija ili Univerzum)"
            >
              <Plus size={16} strokeWidth={3} />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main id="app-main-view" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8 pb-16">
        
        {entries.length === 0 ? (
          <div className={`p-16 text-center border-2 border-dashed rounded-3xl max-w-2xl mx-auto flex flex-col items-center justify-center space-y-4 transition-all ${
            isDarkMode ? 'bg-zinc-900/10 border-zinc-800/80' : 'bg-white border-slate-200 shadow-sm'
          }`} id="empty-workspace-state">
            <div className="w-16 h-16 rounded-2xl bg-yellow-400/10 flex items-center justify-center text-yellow-400 mb-2">
              <Film className="w-8 h-8" />
            </div>
            <h3 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-zinc-200' : 'text-zinc-900'}`}>
              Cinema Grafik — Ahmed
            </h3>
            <p className="text-zinc-500 text-xs sm:text-sm max-w-sm leading-relaxed">
              Dobrodošli u Cinema Grafik! Vaša lična baza ocjena je prazna. Započnite kreiranjem nove TV serije, filma ili Cinematic Universuma za praćenje i vizualizaciju. Svi podaci se čuvaju u memoriji vašeg pretraživača.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              id="btn-add-first-title"
              className="mt-2 flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-500 text-zinc-950 font-black px-5 py-3 rounded-xl text-xs tracking-wider uppercase shadow-md shadow-yellow-500/10 active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={14} /> Dodaj Prvi Naslov
            </button>
          </div>
        ) : (
          <>
            {/* FILTERS & SEARCH LINE */}
            <section id="search-filter-controls" className={`p-4 rounded-xl border transition-colors ${isDarkMode ? 'bg-zinc-900/30 border-zinc-900' : 'bg-white border-zinc-200 shadow-sm'}`}>
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            
            {/* Search input */}
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Pretraži filme, serije ili univerzume po nazivu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                id="search-input-field"
                className={`w-full pl-9 pr-4 py-2 rounded-lg text-sm transition-all focus:outline-none ${
                  isDarkMode 
                    ? 'bg-zinc-950/80 border border-zinc-800 text-slate-100 focus:border-yellow-500' 
                    : 'bg-slate-100 border border-slate-200 text-slate-900 focus:border-yellow-600 focus:bg-white'
                }`}
              />
            </div>

            {/* Quick Sorters and Choice Row */}
            <div className="flex flex-wrap items-center gap-3">
              
              {/* Type Category Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'show' | 'movie' | 'universe')}
                id="dropdown-type-filter"
                className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border focus:outline-none ${
                  isDarkMode 
                    ? 'bg-zinc-950 border-zinc-805 text-zinc-300' 
                    : 'bg-white border-slate-200 text-zinc-700'
                }`}
              >
                <option value="all">🍿 Svi Formati</option>
                <option value="show">📺 Samo Serije</option>
                <option value="movie">🎬 Samo Filmovi</option>
                <option value="universe">🌌 Cinematic Universe</option>
              </select>

              {/* Sorting Attributes Selector */}
              <div className="flex items-center gap-1">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  id="dropdown-sort-by"
                  className={`px-3 py-2 rounded-l-lg text-xs font-bold uppercase tracking-wider border-y border-l focus:outline-none ${
                    isDarkMode 
                      ? 'bg-zinc-950 border-zinc-808 text-zinc-300' 
                      : 'bg-white border-slate-200 text-zinc-700'
                  }`}
                >
                  <option value="rating">🏆 Poredaj po ocjeni</option>
                  <option value="name">🔤 Poredaj po nazivu</option>
                  <option value="year">📅 Poredaj po godini</option>
                </select>
                <button
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  id="btn-toggle-sort-order"
                  className={`p-2 rounded-r-lg border transitionTime ${
                    isDarkMode 
                      ? 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-900' 
                      : 'bg-white border-slate-200 text-zinc-700 hover:bg-slate-50'
                  }`}
                  title={`Uzlazno vs Silazno (Trenutno: ${sortOrder.toUpperCase()})`}
                >
                  <ArrowUpDown size={14} />
                </button>
              </div>

            </div>
          </div>
        </section>

        {/* SELECTABLE ENTRIES HORIZONTAL SLIDE POSTER LIST */}
        <section id="selectable-entries-panel" className="relative">
          <h3 className="text-xs font-bold uppercase text-zinc-400 tracking-widest mb-3 flex items-center justify-between">
            <span>Kolekcija Biblioteke ({processedEntries.length})</span>
            {searchQuery && <span className="text-yellow-500">Uključeno pretraživanje</span>}
          </h3>

          {processedEntries.length === 0 ? (
            <div className={`p-8 text-center rounded-xl border ${isDarkMode ? 'bg-zinc-900/20 border-zinc-900 text-zinc-500' : 'bg-white border-zinc-100 text-zinc-400'}`}>
              <p className="text-sm font-semibold">Nijedan naslov ne odgovara vašim parametrima pretrage.</p>
              <button
                onClick={() => { setSearchQuery(''); setFilterType('all'); }}
                className="text-xs text-yellow-500 hover:underline mt-2 font-bold focus:outline-none"
              >
                Poništi pretragu i filtere
              </button>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent snap-x">
              {processedEntries.map(e => {
                const isSelected = e.id === activeEntry?.id;
                const calculatedAvg = calculateAverageRating(e);
                
                return (
                  <button
                    key={`selection-card-${e.id}`}
                    onClick={() => handleSelectEntry(e.id)}
                    id={`entry-selector-btn-${e.id}`}
                    className={`flex-none w-64 snap-start text-left rounded-xl border overflow-hidden p-3 transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? isDarkMode
                          ? 'bg-zinc-900 border-yellow-400/80 shadow-lg shadow-yellow-500/5 translate-y-[-2px]'
                          : 'bg-white border-yellow-500 shadow-md shadow-slate-200 translate-y-[-2px]'
                        : isDarkMode
                          ? 'bg-zinc-900/50 border-zinc-900 hover:bg-zinc-900/85 hover:border-zinc-800'
                          : 'bg-white border-zinc-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Thumbnail mini-poster */}
                      <div className="w-14 h-20 bg-zinc-950 rounded-lg overflow-hidden shrink-0 border border-zinc-800/20">
                        <img
                          src={e.posterUrl}
                          alt={e.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      
                      {/* Text details */}
                      <div className="flex flex-col justify-between overflow-hidden min-h-[5rem]">
                        <div>
                          <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            e.type === 'show' 
                              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' 
                              : e.type === 'universe'
                                ? 'bg-purple-950/40 text-purple-400 border border-purple-900/30'
                                : 'bg-sky-950/40 text-sky-400 border border-sky-900/30'
                          }`}>
                            {e.type === 'show' ? <Tv size={8} /> : e.type === 'universe' ? <Star size={8} /> : <Film size={8} />}
                            {e.type === 'show' ? 'Serija' : e.type === 'universe' ? 'Univerzum' : 'Film'}
                          </span>
                          
                          <h4 className={`font-extrabold text-sm tracking-tight mt-1 truncate ${
                            isSelected ? 'text-yellow-400' : isDarkMode ? 'text-zinc-100' : 'text-zinc-950'
                          }`}>
                            {e.name}
                          </h4>
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-zinc-500 font-mono font-medium">{e.year}</span>
                          <span className="text-zinc-600 font-mono text-[10px]">•</span>
                          {calculatedAvg > 0 ? (
                            <span className="flex items-center gap-0.5 text-xs font-bold text-yellow-500">
                              <Star size={11} className="fill-yellow-500 text-yellow-500" />
                              {calculatedAvg.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-500 italic">Unrated</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ACTIVE ENTRY DETAILED DASHBOARD CARD */}
        {activeEntry && (
          <section id="active-entry-presentation-dashboard" className="space-y-6">
            
            {/* Cinematic banner card background */}
            <div className={`relative rounded-3xl overflow-hidden border transition-all duration-500 ${
              isDarkMode 
                ? `bg-zinc-950 border-zinc-900 ${activeTheme?.glowShadow || 'shadow-[0_0_50px_-12px_rgba(255,255,255,0.05)]'}` 
                : 'bg-white border-zinc-200 shadow-md'
            }`}>
              
              {/* Widescreen Cinema Banner (completely visible on all viewports, including Android) */}
              <div className="relative h-44 sm:h-60 md:h-72 w-full overflow-hidden select-none bg-zinc-950">
                <img
                  src={activeEntry.bannerUrl || activeEntry.posterUrl}
                  alt={activeEntry.name}
                  className="w-full h-full object-cover object-center transform opacity-90 transition-all duration-700 hover:scale-[1.01]"
                  referrerPolicy="no-referrer"
                />
                
                {/* Cinema grading overlay vignette details */}
                <div className={`absolute inset-0 bg-gradient-to-t ${
                  isDarkMode 
                    ? 'from-zinc-950 via-zinc-950/40 to-transparent' 
                    : 'from-white via-white/40 to-transparent'
                }`} />

                {/* Tinted dynamic brand stripe representing our active color scheme */}
                <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-yellow-505/85 to-transparent" style={{ backgroundImage: `linear-gradient(to right, transparent, ${activeTheme?.accentColor || '#f59e0b'}, transparent)` }} />
              </div>

              {/* Main content layer */}
              <div className="relative p-6 sm:p-8 flex flex-col md:flex-row gap-6 sm:gap-8 pt-4 md:pt-6">
                
                {/* Interactive Big Poster Overlay (floats beautifully over banner) */}
                <div className={`-mt-20 sm:-mt-28 md:-mt-32 w-40 sm:w-48 aspect-[2/3] bg-zinc-950 rounded-2xl overflow-hidden shadow-2xl shrink-0 self-center md:self-start z-10 border-4 ${
                  isDarkMode ? 'border-zinc-955' : 'border-white'
                }`} style={{ borderColor: isDarkMode ? (activeTheme?.accentColor ? `${activeTheme.accentColor}40` : '#18181b') : '#ffffff' }}>
                  <img
                    src={activeEntry.posterUrl}
                    alt={activeEntry.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Cover info */}
                <div className="flex-1 flex flex-col justify-between py-1 text-center md:text-left">
                  <div className="space-y-4">
                    
                    {/* Categories and actions */}
                    <div className="flex flex-wrap items-center justify-center md:justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5 ${
                          activeEntry.type === 'show' 
                            ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-900/50' 
                            : activeEntry.type === 'universe'
                              ? 'bg-purple-950/70 text-purple-400 border border-purple-900/50'
                              : 'bg-sky-950/70 text-sky-400 border border-sky-900/50'
                        }`}>
                          {activeEntry.type === 'show' ? <Tv size={10} /> : activeEntry.type === 'universe' ? <Star size={10} /> : <Film size={10} />}
                          {activeEntry.type === 'show' ? 'Serijski program' : activeEntry.type === 'universe' ? 'Cinematic Universe' : 'Igrani film'}
                        </span>
                        <span className={`text-[11px] font-mono font-bold ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                          {activeEntry.year}
                        </span>
                      </div>
                      
                      {/* Actions toolbar */}
                      <div className="flex flex-wrap items-center gap-2">
                        {(activeEntry.type === 'show' || activeEntry.type === 'universe') && (
                          <button
                            onClick={() => setIsStatsModalOpen(true)}
                            id="btn-open-analytics-modal"
                            className="flex items-center gap-1.5 text-xs text-yellow-500 hover:text-yellow-400 font-bold hover:bg-yellow-500/10 px-2.5 py-1.5 rounded-lg border border-yellow-500/20 transition-all cursor-pointer"
                            title="Prikaz detaljne Recharts statistike"
                          >
                            <BarChart2 size={13} /> Analitika i Trendovi
                          </button>
                        )}

                        {/* Edit Specifications Icon */}
                        <button
                          onClick={() => setIsEditModalOpen(true)}
                          id="btn-edit-active-attributes"
                          className={`flex items-center gap-1 text-xs font-bold hover:bg-yellow-500/10 border px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                            isDarkMode 
                              ? 'text-zinc-300 bg-zinc-900 border-zinc-850 hover:text-yellow-400 hover:border-yellow-400/30' 
                              : 'text-zinc-700 bg-white border-zinc-200 hover:text-yellow-600 hover:border-yellow-500/30 shadow-sm'
                          }`}
                          title="Uredi naslov, opis i slike"
                        >
                          <Edit size={13} /> Uredi Detalje
                        </button>

                        {/* Delete this title icon */}
                        <button
                          onClick={handleDeleteActiveEntry}
                          id="btn-delete-active-slate"
                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-400 font-bold hover:bg-red-500/10 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Obrišite ovaj naslov i sve njegove faza ili sezone"
                        >
                          <Trash2 size={13} /> Obriši Naslov
                        </button>
                      </div>
                    </div>

                    {/* Show Name */}
                    <h1 className={`text-3xl sm:text-4.5xl font-black tracking-tight ${
                      isDarkMode ? 'text-white' : 'text-zinc-900'
                    }`}>
                      {activeEntry.name}
                    </h1>

                    {/* Overall Summary Stats rating box (matches color scheme, stars, votes counts of your screenshot) */}
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                      
                      {/* Dynamically recalculated Rating numbers */}
                      <div className="flex items-center gap-1.5">
                        <Star className="text-yellow-400 fill-yellow-400" size={24} />
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className={`text-2xl font-black ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>
                              {calculateAverageRating(activeEntry) > 0 ? calculateAverageRating(activeEntry).toFixed(1) : '—'}
                            </span>
                            <span className="text-xs text-zinc-500 font-medium">/10</span>
                            {calculateAverageRating(activeEntry) === 0 && (
                              <span className="text-[10px] text-zinc-400 font-mono font-bold bg-zinc-800 px-2 py-0.5 rounded ml-2 border border-zinc-700">
                                Dolazi uskoro / Neocijenjeno
                              </span>
                            )}
                          </div>
                          <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-extrabold flex items-center gap-1">
                            <span>Prosjek ocjena</span>
                            {calculatePersonalRating(activeEntry) > 0 && (
                              <span className="text-yellow-500 font-bold font-mono">
                                (Moja: {calculatePersonalRating(activeEntry).toFixed(1)})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className={`w-px h-8 hidden sm:block ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-200'}`} />

                      {/* Overall votes summary calculated */}
                      <div>
                        <span className={`text-sm font-extrabold block ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                          {calculateTotalVotes(activeEntry).toLocaleString()} glasova
                        </span>
                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-extrabold">Popularnost</span>
                      </div>

                      {activeEntry.movieDuration && (
                        <>
                          <div className={`w-px h-8 hidden sm:block ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                          <div>
                            <span className={`text-sm font-extrabold block flex items-center gap-1 ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                              <Clock size={12} /> {activeEntry.movieDuration}
                            </span>
                            <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-extrabold">Trajanje fima</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Brief description */}
                    <p className={`text-sm leading-relaxed max-w-2xl ${isDarkMode ? 'text-zinc-400' : 'text-zinc-650'}`}>
                      {activeEntry.description}
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* LOWER RATING INTERACTIVE ZONE */}
            <div id="ratings-interactive-matrix-panel">
              {activeEntry.type === 'show' || activeEntry.type === 'universe' ? (
                /* SHOW TV OR CE EPISODES GRID */
                <RatingGrid
                  entry={activeEntry}
                  onEpisodeClick={(seasonNum, episode) => setSelectedEpisode({ seasonNum, episode })}
                  onAddEpisodeToSeason={handleAddEpisodeToSeason}
                  onAddSeason={handleAddSeason}
                  onSetSeasonEpisodeCount={handleSetSeasonEpisodeCount}
                  onBulkEdit={() => setIsBulkEditOpen(true)}
                />
              ) : (
                /* MOVIE SPECIFIC CONTROL BOARD (Single Rating box) */
                <div className={`p-6 sm:p-8 rounded-2xl border transition-colors ${
                  isDarkMode ? 'bg-zinc-900/40 border-zinc-900 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-950 shadow-sm'
                }`} id="movie-rating-board">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Slider modifier section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <GridIcon className="text-yellow-400" size={18} />
                        <h3 className="font-extrabold text-sm uppercase tracking-wide text-zinc-400">
                          Single Rating Configuration
                        </h3>
                      </div>

                      <div className="bg-zinc-950/40 border border-zinc-900 p-5 rounded-xl space-y-4">
                        <div className="flex justify-between items-center bg-zinc-950/80 px-4 py-2 rounded-lg">
                          <span className="text-xs uppercase font-extrabold text-zinc-500">Selected Rating:</span>
                          <span className="text-yellow-400 font-mono font-black text-sm sm:text-base">
                            {(() => {
                              const score = isMovieRatingEditing ? (tempMovieRating ?? activeEntry.movieRating ?? 8.0) : (activeEntry.movieRating ?? 0.0);
                              return score === 0 ? '0.0 (Upcoming / Unrated)' : `${score.toFixed(1)}/10`;
                            })()}
                          </span>
                        </div>

                        {isMovieRatingEditing ? (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <input
                                type="range"
                                min="0.0"
                                max="10.0"
                                step="0.1"
                                value={tempMovieRating ?? activeEntry.movieRating ?? 8.0}
                                onChange={(e) => setTempMovieRating(Number(e.target.value))}
                                className="w-full accent-yellow-400 cursor-pointer h-2 bg-zinc-850 rounded-lg appearance-none"
                                id="movie-main-rating-slider"
                              />
                              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                                <span>0.0 (Upcoming)</span>
                                <span>5.0 (Average)</span>
                                <span>10.0 (Cinema)</span>
                              </div>
                            </div>
                            <div className="flex gap-2.5">
                              <button
                                onClick={() => {
                                  setIsMovieRatingEditing(false);
                                  setTempMovieRating(null);
                                }}
                                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-350 text-xs font-bold py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  const finalRating = tempMovieRating ?? activeEntry.movieRating ?? 8.0;
                                  handleUpdateMovieRating(finalRating);
                                  setIsMovieRatingEditing(false);
                                  setTempMovieRating(null);
                                }}
                                className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-zinc-950 text-xs font-black py-1.5 rounded-lg transition-colors uppercase tracking-wider cursor-pointer shadow-md"
                              >
                                Confirm
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4 text-center">
                            <div className="py-2">
                              <p className="text-zinc-500 text-xs italic">Rating locked to avoid accidental adjustments.</p>
                            </div>
                            <button
                              onClick={() => {
                                setTempMovieRating(activeEntry.movieRating ?? 8.0);
                                setIsMovieRatingEditing(true);
                              }}
                              className="w-full bg-yellow-400 hover:bg-yellow-500 text-zinc-950 font-black py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                            >
                              ★ Rate Movie
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="bg-yellow-400/5 p-4 rounded-xl border border-yellow-400/10 flex gap-3 text-xs leading-relaxed text-zinc-400">
                        <Info size={18} className="text-yellow-400 shrink-0 mt-0.5" />
                        <p>
                          Unlike dynamic series shows, single feature movies do not require multi-season episode tables. Toggle the slider overall metric to score your cinematic response instantly!
                        </p>
                      </div>
                    </div>

                    {/* Movie Player section (if YouTube URL exists) */}
                    <div>
                      {activeEntry.movieYoutubeUrl ? (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                            <Play size={14} className="fill-red-500 text-red-500" /> Embedded Movie Trailer
                          </h4>
                          <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-zinc-800">
                            <iframe
                              src={activeEntry.movieYoutubeUrl}
                              title={`${activeEntry.name} Trailer video`}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-8 bg-zinc-950/30 rounded-xl border border-dashed border-zinc-800 border-zinc-700 min-h-[160px] text-center">
                          <p className="text-xs text-zinc-500">No official trailer URL configured for this feature.</p>
                          <p className="text-[11px] text-zinc-600 mt-1">To connect trailers, recreate the card and paste a YouTube clip embed link.</p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* CO-VOTERS & EXTERNAL REVIEWS PANEL */}
              <div className={`mt-8 p-6 sm:p-8 rounded-2xl border transition-colors ${
                isDarkMode ? 'bg-zinc-900/40 border-zinc-900 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-950 shadow-sm'
              }`} id="integrated-co-voters-panel">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-805 pb-4 mb-6 animate-fade-in">
                  <div>
                    <h3 className="font-extrabold text-base flex items-center gap-2">
                      <Star className="text-yellow-400 fill-yellow-400 animate-pulse" size={18} />
                      Crowd & Guest Reviewers Votes
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      Allow friends, family, or critical platform aggregates (IMDb, Metacritic) to weigh in. Averages are calculated realistically!
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 self-start sm:self-center bg-zinc-950/80 px-3 py-1.5 rounded-lg border border-zinc-850">
                    <span className="text-[10px] text-zinc-500 font-extrabold uppercase">Calculated Votes:</span>
                    <span className="text-sm font-black text-yellow-400 font-mono">
                      {calculateTotalVotes(activeEntry)}
                    </span>
                  </div>
                </div>

                {/* Inline Form to Add a New Vote */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!voterNameInput.trim()) return alert('Please enter a critic or voter name!');
                    handleAddGuestVote(activeEntry.id, voterNameInput, voterRatingInput);
                    setVoterNameInput('');
                    setVoterRatingInput(8.0);
                  }}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end bg-zinc-950/20 p-4 rounded-xl border border-zinc-850"
                >
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-extrabold uppercase text-zinc-400 mb-1.5 tracking-wider font-sans">
                      Voter / Platform Title
                    </label>
                    <input
                      type="text"
                      value={voterNameInput}
                      onChange={(e) => setVoterNameInput(e.target.value)}
                      placeholder="e.g. IMDb User Avg, IGN, Greg, Mom, Letterboxd"
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg px-3 py-1.5 text-zinc-100 placeholder-zinc-700 text-xs focus:outline-none focus:border-yellow-400"
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-[10px] font-extrabold uppercase text-zinc-400 mb-1.5 tracking-wider flex justify-between font-sans">
                      <span>Assigned Score:</span>
                      <span className="text-yellow-400 font-mono font-bold">
                        {voterRatingInput === 0 ? '0.0 (Unrated / Upcoming)' : voterRatingInput.toFixed(1)}/10
                      </span>
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0.0"
                        max="10.0"
                        step="0.1"
                        value={voterRatingInput}
                        onChange={(e) => setVoterRatingInput(Number(e.target.value))}
                        className="flex-1 accent-yellow-400 cursor-pointer h-1 bg-zinc-850 rounded-lg appearance-none"
                      />
                      <span className="text-xs font-mono font-black text-yellow-400 shrink-0 w-8 text-right">
                        {voterRatingInput.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <button
                      type="submit"
                      className="w-full h-[38px] flex items-center justify-center gap-1 bg-yellow-400 hover:bg-yellow-500 text-zinc-950 text-xs font-black uppercase tracking-wider py-2 rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus size={14} /> Record Score
                    </button>
                  </div>
                </form>

                {/* List of custom registered votes */}
                <div className="mt-6">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">
                    Registered Ballots & Co-Reviews
                  </h4>
                  {activeEntry.guestVotes && activeEntry.guestVotes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {activeEntry.guestVotes.map((vote) => (
                        <div 
                          key={vote.id}
                          className="bg-zinc-950/40 border border-zinc-855 rounded-xl p-3 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-zinc-200 truncate">{vote.voterName}</p>
                            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{vote.createdAt || 'Just now'}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2.5 py-1 rounded text-xs font-bold font-mono ${getRatingColorClass(vote.rating)}`}>
                              {vote.rating === 0 ? 'Unrated' : vote.rating.toFixed(1)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteGuestVote(activeEntry.id, vote.id)}
                              className="text-zinc-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors cursor-pointer"
                              title="Delete this score vote"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 bg-zinc-950/10 border border-dashed border-zinc-850 rounded-xl text-center">
                      <p className="text-xs text-zinc-500">No companion co-votes registered yet for this title.</p>
                      <p className="text-[10px] text-zinc-600 mt-1 max-w-sm">
                        Input your friends ratings or critic platform score aggregates in the builder above to formulate full movie averages!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
          </>
        )}
      </main>

      {/* FOOTER credit line */}
      <footer className={`py-8 text-center border-t text-xs transition-colors mt-12 ${
        isDarkMode ? 'border-zinc-900 text-zinc-600 bg-zinc-950' : 'border-zinc-200 text-zinc-400 bg-white'
      }`}>
        <p>© 2026 IMDb Grid Rater - Structured Episode Rating Matrix & local storage synchronization.</p>
      </footer>

      {/* RATING DETAIL POPUP MODAL (EDITING/YOUTUBE STREAMING) */}
      {selectedEpisode && activeEntry?.seasons && (
        <DetailPopup
          episode={selectedEpisode.episode}
          seasonNumber={selectedEpisode.seasonNum}
          onClose={() => setSelectedEpisode(null)}
          onSave={handleSaveEpisode}
          onDelete={handleDeleteEpisode}
          allEntriesAvailable={entries}
          onNavigateToEntry={handleNavigateFromActorCatalog}
        />
      )}

      {/* ADD BRAND NEW SLATE ITEM MODAL */}
      {isAddModalOpen && (
        <AddEntryModal
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddEntry}
        />
      )}

      {/* BULK EDIT MODAL */}
      {isBulkEditOpen && activeEntry && (
        <BulkEditModal
          entry={activeEntry}
          onClose={() => setIsBulkEditOpen(false)}
          onSaveAll={handleSaveBulkSeasons}
        />
      )}

      {/* EDIT TITLE SPECIFICATION MODAL */}
      {isEditModalOpen && activeEntry && (
        <EditEntryModal
          entry={activeEntry}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveEditEntry}
        />
      )}

      {/* STATS ANALYTICS OVERVIEW MODAL */}
      {isStatsModalOpen && activeEntry && (
        <StatsModal
          entry={activeEntry}
          onClose={() => setIsStatsModalOpen(false)}
        />
      )}

      {/* PORTOPOLIO EXPORT WORKSPACE CENTER MODAL */}
      {isExportModalOpen && (
        <ExportModal
          entries={entries}
          onClose={() => setIsExportModalOpen(false)}
          onImportJSON={setEntries}
          initialTab={exportInitialTab}
        />
      )}

      {/* SURPRISE ME CELEBRATION MODAL */}
      {isSurpriseOpen && (
        <SurpriseMeModal
          entries={entries}
          onClose={() => setIsSurpriseOpen(false)}
          onNavigateToEntry={handleNavigateFromActorCatalog}
        />
      )}

      {/* BEAUTIFUL CUSTOM DISCRETE IFRAME-SAFE DELETE MODAL */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md" id="delete-alert-overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto text-xl font-bold">⚠️</div>
              <h3 className="text-lg font-extrabold text-white uppercase tracking-tight">Are you absolutely sure?</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {deleteTarget === 'all'
                  ? 'This will clear your entire workspace, removing all TV shows, movies, and custom ratings. This action is irreversible.'
                  : `This will permanently delete "${activeEntry?.name}" and all of its season grids from local memory.`}
              </p>
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 bg-zinc-850 hover:bg-zinc-800 text-zinc-350 text-zinc-300 font-bold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  No, Cancel
                </button>
                <button
                  onClick={() => {
                    if (deleteTarget === 'all') {
                      setEntries([]);
                      setActiveId('');
                    } else if (deleteTarget === 'entry' && activeEntry) {
                      const remaining = entries.filter(e => e.id !== activeEntry.id);
                      setEntries(remaining);
                      if (remaining.length > 0) {
                        setActiveId(remaining[0].id);
                      } else {
                        setActiveId('');
                      }
                    }
                    setDeleteTarget(null);
                  }}
                  className="flex-1 bg-red-550 hover:bg-red-600 text-white font-black py-2 px-4 rounded-xl text-xs transition-colors uppercase cursor-pointer"
                >
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* MANUAL SAVE TOAST NOTIFICATION */}
      <AnimatePresence>
        {showSaveToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            id="toast-manual-save-success"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-emerald-500 text-zinc-950 font-sans font-black text-xs uppercase px-5 py-3 rounded-full shadow-2xl shadow-emerald-500/20 pointer-events-none"
          >
            <Check size={14} strokeWidth={3} />
            <span>Sve promjene su uspješno spremljene lokalno!</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
