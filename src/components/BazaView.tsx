import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Actor, RatingEntry, ProjectFolder, ProjectItem } from '../types';
import { 
  Search, User, Edit3, Save, Calendar, ExternalLink, Star, Award, 
  Heart, Info, ArrowLeft, Trash, FolderPlus, Folder, Plus, X, Layers, 
  Film, Tv, CheckSquare, Square, FolderKanban, Sparkles, Filter, ChevronDown, ChevronRight, Check
} from 'lucide-react';
import ActorsView from './ActorsView';

interface BazaViewProps {
  entries: RatingEntry[];
  allActorsWithAppearances: {
    actor: Actor;
    appearances: {
      entryId: string;
      entryName: string;
      type: 'show' | 'movie' | 'universe';
      seasonNum?: number;
      epNum?: number;
      epName?: string;
      rawActor: Actor;
    }[];
  }[];
  selectedActorName: string | null;
  setSelectedActorName: (name: string | null) => void;
  onNavigateToEntry: (entryId: string, seasonNum?: number, epNum?: number) => void;
  onUpdateActorGlobalDetails: (actorName: string, fields: Partial<Actor>) => void;
  onUpdateActorAppearanceRating: (actorName: string, entryId: string, seasonNum: number | undefined, epNum: number | undefined, rating: number) => void;
}

export default function BazaView({
  entries,
  allActorsWithAppearances,
  selectedActorName,
  setSelectedActorName,
  onNavigateToEntry,
  onUpdateActorGlobalDetails,
  onUpdateActorAppearanceRating
}: BazaViewProps) {
  // Main Sub-tab state: 'glumci' | 'projekti'
  const [bazaSubTab, setBazaSubTab] = useState<'glumci' | 'projekti'>('glumci');

  // Projects State
  const [projects, setProjects] = useState<ProjectFolder[]>(() => {
    try {
      const saved = localStorage.getItem('baza_projekti_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((p: any) => ({
            ...p,
            items: Array.isArray(p.items) ? p.items.map((it: any) => ({ ...it, rating: Number(it.rating) || 0 })) : []
          }));
        }
      }
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: 'proj-1',
        name: '🎬 Kultni Klasici & Favoriti',
        description: 'Odabrane legendarne epizode i filmovi na jednom mjestu za repriziranje.',
        color: '#f59e0b',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: []
      },
      {
        id: 'proj-2',
        name: '🔥 Najbolje Ocijenjeno (9.5+)',
        description: 'Vrhunske epizode sa najvišom ocjenom u bazi.',
        color: '#10b981',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: []
      }
    ];
  });

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#f59e0b');

  // Bulk Add Modal State
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [bulkFilterType, setBulkFilterType] = useState<'all' | 'show' | 'movie'>('all');
  const [bulkSearchQuery, setBulkSearchQuery] = useState('');
  const [selectedBulkItemIds, setSelectedBulkItemIds] = useState<Set<string>>(new Set());
  const [expandedShows, setExpandedShows] = useState<Set<string>>(new Set());
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(new Set());

  // Save projects to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('baza_projekti_v1', JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to save projects to localStorage:', e);
    }
  }, [projects]);

  // Listen for external sync or JSON import updates
  useEffect(() => {
    const handleProjectsUpdated = (ev: any) => {
      try {
        const updatedProjects = ev?.detail;
        if (Array.isArray(updatedProjects)) {
          setProjects(updatedProjects);
        } else {
          const saved = localStorage.getItem('baza_projekti_v1');
          if (saved) {
            setProjects(JSON.parse(saved));
          }
        }
      } catch (e) {
        console.error('Error refreshing projects from event:', e);
      }
    };

    window.addEventListener('baza_projekti_updated', handleProjectsUpdated);
    return () => {
      window.removeEventListener('baza_projekti_updated', handleProjectsUpdated);
    };
  }, []);

  // Active Project Data
  const activeProject = useMemo(() => {
    if (!activeProjectId) return null;
    return projects.find(p => p.id === activeProjectId) || null;
  }, [projects, activeProjectId]);

  // Calculate Average Rating for a Project Folder
  const calculateProjectRating = (items?: ProjectItem[]): number => {
    if (!items || !Array.isArray(items) || items.length === 0) return 0;
    const ratedItems = items.filter(i => i && typeof i.rating !== 'undefined' && Number(i.rating) > 0);
    if (ratedItems.length === 0) return 0;
    const sum = ratedItems.reduce((acc, curr) => acc + (Number(curr.rating) || 0), 0);
    return Math.round((sum / ratedItems.length) * 10) / 10;
  };

  // Helper to get Rating Color
  const getRatingColor = (rating: number) => {
    const num = Number(rating) || 0;
    if (num >= 9.0) return 'text-amber-400 stroke-amber-400 fill-amber-400/20';
    if (num >= 8.0) return 'text-emerald-400 stroke-emerald-400 fill-emerald-400/20';
    if (num >= 7.0) return 'text-sky-400 stroke-sky-400 fill-sky-400/20';
    if (num >= 5.0) return 'text-yellow-500 stroke-yellow-500 fill-yellow-500/20';
    return 'text-rose-400 stroke-rose-400 fill-rose-400/20';
  };

  // Circular Rating Ring Component
  const CircularRatingGauge = ({ rating, size = 64, strokeWidth = 5 }: { rating: number; size?: number; strokeWidth?: number }) => {
    const numRating = Number(rating) || 0;
    const radius = (size - strokeWidth * 2) / 2;
    const circumference = radius * 2 * Math.PI;
    const progress = numRating > 0 ? (Math.min(10, numRating) / 10) * circumference : 0;
    const strokeDashoffset = circumference - progress;

    let colorClass = '#f59e0b';
    if (numRating >= 9.0) colorClass = '#fbbf24';
    else if (numRating >= 8.0) colorClass = '#34d399';
    else if (numRating >= 7.0) colorClass = '#38bdf8';
    else if (numRating >= 5.0) colorClass = '#eab308';
    else if (numRating > 0) colorClass = '#f43f5e';
    else colorClass = '#71717a';

    return (
      <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#27272a"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colorClass}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs sm:text-sm font-black font-mono tracking-tighter text-white">
            {numRating > 0 ? numRating.toFixed(1) : '—'}
          </span>
          <span className="text-[7px] font-mono text-zinc-400 uppercase leading-none">OCJENA</span>
        </div>
      </div>
    );
  };

  // Create Project
  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    const newProj: ProjectFolder = {
      id: `proj-${Date.now()}`,
      name: newProjectName.trim(),
      description: newProjectDesc.trim() || undefined,
      color: newProjectColor,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: []
    };
    setProjects(prev => [newProj, ...prev]);
    setNewProjectName('');
    setNewProjectDesc('');
    setIsCreatingProject(false);
    setActiveProjectId(newProj.id);
  };

  // Delete Project
  const handleDeleteProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjects(prev => prev.filter(p => p.id !== projectId));
    if (activeProjectId === projectId) {
      setActiveProjectId(null);
    }
  };

  // Remove Item from Project
  const handleRemoveItem = (projectId: string, itemId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          updatedAt: new Date().toISOString(),
          items: (p.items || []).filter(i => i && i.id !== itemId)
        };
      }
      return p;
    }));
  };

  // Extract all available selectable items from catalog (movies + all episodes of all seasons of all shows + universes)
  const selectableCatalogItems = useMemo(() => {
    const itemsList: {
      id: string;
      entryId: string;
      entryName: string;
      type: 'show' | 'movie' | 'universe' | 'episode';
      posterUrl?: string;
      seasonNum?: number;
      epNum?: number;
      epName?: string;
      rating: number;
      year?: string | number;
    }[] = [];

    if (!Array.isArray(entries)) return itemsList;

    entries.forEach(entry => {
      if (!entry) return;
      if (entry.type === 'movie') {
        itemsList.push({
          id: entry.id,
          entryId: entry.id,
          entryName: entry.name || 'Film',
          type: 'movie',
          posterUrl: entry.posterUrl,
          rating: Number(entry.movieRating) || 0,
          year: entry.year
        });
      } else if (entry.type === 'show') {
        (entry.seasons || []).forEach(season => {
          if (!season) return;
          (season.episodes || []).forEach(ep => {
            if (!ep) return;
            itemsList.push({
              id: `${entry.id}-s${season.seasonNumber}-e${ep.episodeNumber}`,
              entryId: entry.id,
              entryName: entry.name || 'Serija',
              type: 'episode',
              posterUrl: ep.imageUrl || entry.posterUrl,
              seasonNum: season.seasonNumber,
              epNum: ep.episodeNumber,
              epName: ep.name || `Epizoda ${ep.episodeNumber}`,
              rating: Number(ep.rating) || 0,
              year: ep.releaseYear || entry.year
            });
          });
        });
      } else if (entry.type === 'universe') {
        (entry.seasons || []).forEach(phase => {
          if (!phase) return;
          (phase.episodes || []).forEach(item => {
            if (!item) return;
            itemsList.push({
              id: `${entry.id}-f${phase.seasonNumber}-item${item.episodeNumber}`,
              entryId: entry.id,
              entryName: `${entry.name || 'Univerzum'} (${phase.seasonName || `Faza ${phase.seasonNumber}`})`,
              type: 'episode',
              posterUrl: item.imageUrl || entry.posterUrl,
              seasonNum: phase.seasonNumber,
              epNum: item.episodeNumber,
              epName: item.name || `Stavka ${item.episodeNumber}`,
              rating: Number(item.rating) || 0,
              year: item.releaseYear || entry.year
            });
          });
        });
      }
    });

    return itemsList;
  }, [entries]);

  // Filter selectable items for bulk modal
  const filteredBulkItems = useMemo(() => {
    let list = selectableCatalogItems;
    if (bulkFilterType === 'movie') {
      list = list.filter(i => i.type === 'movie');
    } else if (bulkFilterType === 'show') {
      list = list.filter(i => i.type === 'episode');
    }

    const q = bulkSearchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(i => 
      (i.entryName && i.entryName.toLowerCase().includes(q)) || 
      (i.epName && i.epName.toLowerCase().includes(q))
    );
  }, [selectableCatalogItems, bulkFilterType, bulkSearchQuery]);

  // Bulk Add Confirm
  const handleConfirmBulkAdd = () => {
    if (!activeProjectId || selectedBulkItemIds.size === 0) return;

    const itemsToAdd = selectableCatalogItems.filter(i => selectedBulkItemIds.has(i.id));

    setProjects(prev => prev.map(p => {
      if (p.id === activeProjectId) {
        // Prevent duplicates
        const existingIds = new Set((p.items || []).map(i => i?.id).filter(Boolean));
        const newItems = itemsToAdd.filter(i => !existingIds.has(i.id)).map(i => ({
          ...i,
          rating: Number(i.rating) || 0,
          addedAt: new Date().toISOString()
        }));

        return {
          ...p,
          updatedAt: new Date().toISOString(),
          items: [...(p.items || []), ...newItems]
        };
      }
      return p;
    }));

    setSelectedBulkItemIds(new Set());
    setIsBulkAddOpen(false);
  };

  // Toggle Bulk Item
  const toggleBulkItem = (id: string) => {
    setSelectedBulkItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select all in current bulk filter
  const selectAllFiltered = () => {
    setSelectedBulkItemIds(prev => {
      const next = new Set(prev);
      filteredBulkItems.forEach(i => next.add(i.id));
      return next;
    });
  };

  // Deselect all
  const deselectAllFiltered = () => {
    setSelectedBulkItemIds(new Set());
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden" id="baza-root-panel">
      
      {/* TOP SUB-TAB NAVIGATION: GLUMCI vs PROJEKTI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2.5">
              <FolderKanban className="text-emerald-400 w-5 h-5 sm:w-6 sm:h-6" /> Centralna Baza
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-zinc-400 mt-1">
            Pregledajte glumce ili kreirajte personalizovane foldere projekata sa grupnim unosom epizoda i filmova.
          </p>
        </div>

        {/* SUB-TAB TOGGLE PILLS */}
        <div className="flex items-center justify-center bg-zinc-900/90 border border-zinc-800 p-1 rounded-2xl shadow-inner shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setBazaSubTab('glumci');
              setSelectedActorName(null);
            }}
            className={`flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
              bazaSubTab === 'glumci'
                ? 'bg-emerald-500 text-zinc-955 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <User size={14} /> Glumci ({allActorsWithAppearances.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setBazaSubTab('projekti');
            }}
            className={`flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
              bazaSubTab === 'projekti'
                ? 'bg-amber-400 text-zinc-955 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Folder size={14} /> Projekti ({projects.length})
          </button>
        </div>
      </div>

      {/* RENDER ACTIVE SUB-TAB CONTENT */}
      {bazaSubTab === 'glumci' ? (
        <ActorsView
          entries={entries}
          allActorsWithAppearances={allActorsWithAppearances}
          selectedActorName={selectedActorName}
          setSelectedActorName={setSelectedActorName}
          onNavigateToEntry={onNavigateToEntry}
          onUpdateActorGlobalDetails={onUpdateActorGlobalDetails}
          onUpdateActorAppearanceRating={onUpdateActorAppearanceRating}
        />
      ) : (
        /* PROJEKTI SUB-TAB */
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {!activeProjectId ? (
              /* ALL PROJECTS FOLDER GRID VIEW */
              <motion.div
                key="projects-grid"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-6"
              >
                {/* Search & New Project Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Pretraži foldere projekata..."
                      value={projectSearchQuery}
                      onChange={(e) => setProjectSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/80 border border-zinc-800 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCreatingProject(true)}
                    className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.25)] transition-all cursor-pointer shrink-0"
                  >
                    <FolderPlus size={16} /> Novi Folder Projekta
                  </button>
                </div>

                {/* Create Project Modal/Drawer */}
                {isCreatingProject && (
                  <div className="bg-zinc-900/90 border border-amber-500/30 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <FolderPlus className="text-amber-400 w-4 h-4" /> Kreiraj Novi Folder
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsCreatingProject(false)}
                        className="text-zinc-500 hover:text-white p-1"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">Naziv Projekta *</label>
                        <input
                          type="text"
                          placeholder="npr. Marvel Faza 1, Nolan Maratoni..."
                          value={newProjectName}
                          onChange={(e) => setNewProjectName(e.target.value)}
                          className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">Tema Boje</label>
                        <div className="flex items-center gap-2 pt-1">
                          {['#f59e0b', '#10b981', '#0ea5e9', '#8b5cf6', '#f43f5e', '#ec4899'].map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setNewProjectColor(c)}
                              className={`w-6 h-6 rounded-full transition-transform ${newProjectColor === c ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'}`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">Kratki Opis</label>
                      <input
                        type="text"
                        placeholder="npr. Kolekcija svih ključnih epizoda i filmova za gledanje po hronološkom redu..."
                        value={newProjectDesc}
                        onChange={(e) => setNewProjectDesc(e.target.value)}
                        className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsCreatingProject(false)}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl"
                      >
                        Odustani
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateProject}
                        disabled={!newProjectName.trim()}
                        className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black uppercase tracking-wider rounded-xl disabled:opacity-50"
                      >
                        Kreiraj Folder
                      </button>
                    </div>
                  </div>
                )}

                {/* Projects Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {projects
                    .filter(p => p.name.toLowerCase().includes(projectSearchQuery.toLowerCase()))
                    .map(project => {
                      const avgRating = calculateProjectRating(project.items);
                      const episodeCount = project.items.filter(i => i.type === 'episode').length;
                      const movieCount = project.items.filter(i => i.type === 'movie').length;

                      return (
                        <div
                          key={project.id}
                          onClick={() => setActiveProjectId(project.id)}
                          className="bg-zinc-900/60 hover:bg-zinc-900/90 border border-zinc-800/80 hover:border-amber-500/40 rounded-3xl p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 shadow-xl group cursor-pointer relative overflow-hidden"
                        >
                          {/* Ambient Accent Color Glow */}
                          <div 
                            className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity"
                            style={{ backgroundColor: project.color || '#f59e0b' }}
                          />

                          <div className="space-y-3 relative z-10">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <div 
                                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-zinc-950 font-black shadow-md shrink-0"
                                  style={{ backgroundColor: project.color || '#f59e0b' }}
                                >
                                  <Folder size={20} className="fill-current" />
                                </div>
                                <div>
                                  <h3 className="font-extrabold text-sm sm:text-base text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                                    {project.name}
                                  </h3>
                                  <p className="text-[10px] font-mono text-zinc-400">
                                    {project.items.length} {project.items.length === 1 ? 'stavka' : 'stavki'} ({episodeCount} ep, {movieCount} film)
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => handleDeleteProject(project.id, e)}
                                className="text-zinc-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                title="Obriši ovaj folder"
                              >
                                <Trash size={14} />
                              </button>
                            </div>

                            {project.description && (
                              <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                                {project.description}
                              </p>
                            )}
                          </div>

                          {/* Bottom Row: Circular Rating Gauge & Item Preview Badges */}
                          <div className="pt-4 mt-4 border-t border-zinc-800/60 flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-3">
                              <CircularRatingGauge rating={avgRating} size={54} strokeWidth={4.5} />
                              <div>
                                <span className="text-[9px] font-mono text-zinc-400 block uppercase">Prosječna Ocjena</span>
                                <span className="text-xs font-black text-white">
                                  {avgRating > 0 ? `${avgRating} / 10` : 'Nema ocjena'}
                                </span>
                              </div>
                            </div>

                            <span className="text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
                              Otvori →
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </motion.div>
            ) : (
              /* DETAILED VIEW INSIDE A SPECIFIC PROJECT FOLDER */
              <motion.div
                key="project-details"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                className="space-y-6"
              >
                {/* Header with Back, Title, Circular Gauge & Bulk Add Button */}
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                  
                  <div className="space-y-2 relative z-10">
                    <button
                      type="button"
                      onClick={() => setActiveProjectId(null)}
                      className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1.5 mb-2 transition-colors cursor-pointer"
                    >
                      <ArrowLeft size={15} /> Nazad na sve foldere
                    </button>

                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-zinc-950 font-black shadow-lg shrink-0"
                        style={{ backgroundColor: activeProject?.color || '#f59e0b' }}
                      >
                        <Folder size={24} className="fill-current" />
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                          {activeProject?.name}
                        </h2>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {activeProject?.description || 'Nema opisa za ovaj projekat.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Rating Score Gauge */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-5 relative z-10 w-full md:w-auto">
                    <div className="flex items-center gap-2.5 sm:gap-3 bg-zinc-950/80 border border-zinc-800 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl shadow-inner flex-1 sm:flex-initial">
                      <CircularRatingGauge 
                        rating={calculateProjectRating(activeProject?.items || [])} 
                        size={52} 
                        strokeWidth={4.5} 
                      />
                      <div className="text-left">
                        <span className="text-[8px] sm:text-[9px] font-mono text-zinc-400 uppercase block">Prosječna Ocjena</span>
                        <span className="text-xs sm:text-sm font-black text-white">
                          {calculateProjectRating(activeProject?.items || []) > 0 
                            ? `${calculateProjectRating(activeProject?.items || [])} / 10` 
                            : 'Nema ocjena'
                          }
                        </span>
                        <span className="text-[8px] sm:text-[9px] text-zinc-400 block">
                          Ukupno {(activeProject?.items || []).length} stavki
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsBulkAddOpen(true)}
                      className="px-4 py-2.5 sm:py-3 bg-amber-400 hover:bg-amber-300 text-zinc-955 text-xs font-black uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all cursor-pointer flex-1 sm:flex-initial"
                    >
                      <Plus size={16} /> + Dodaj u Bulk-u
                    </button>
                  </div>
                </div>

                {/* Items List in this project */}
                {(!activeProject?.items || activeProject.items.length === 0) ? (
                  <div className="text-center py-16 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl space-y-4">
                    <Layers className="w-12 h-12 text-zinc-600 mx-auto" />
                    <div>
                      <h4 className="text-base font-bold text-white">Folder je trenutno prazan</h4>
                      <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                        Kliknite na dugme "+ Dodaj u Bulk-u" iznad da brzo izaberete i ubacite više epizoda ili filmova odjednom!
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsBulkAddOpen(true)}
                      className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black uppercase tracking-wider rounded-xl inline-flex items-center gap-2 shadow cursor-pointer"
                    >
                      <Plus size={15} /> Otvori Bulk Selektor
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(activeProject.items || []).filter(Boolean).map((item, idx) => (
                      <div
                        key={item.id || `proj-item-${idx}`}
                        className="bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 hover:border-amber-400/40 rounded-2xl p-4 flex gap-3.5 transition-all shadow-md group relative"
                      >
                        {/* Poster thumbnail */}
                        <div className="w-16 h-22 rounded-xl bg-zinc-950 overflow-hidden shrink-0 relative border border-zinc-800 shadow">
                          {item.posterUrl ? (
                            <img
                              src={item.posterUrl}
                              alt={item.entryName || ''}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-700">
                              <Film size={20} />
                            </div>
                          )}
                          <div className="absolute top-1 left-1 px-1 py-0.5 rounded bg-black/80 text-[8px] font-mono font-black text-amber-400">
                            #{idx + 1}
                          </div>
                        </div>

                        {/* Details */}
                        <div className="flex-1 flex flex-col justify-between overflow-hidden">
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                item.type === 'episode' 
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/50' 
                                  : 'bg-sky-950 text-sky-400 border border-sky-900/50'
                              }`}>
                                {item.type === 'episode' ? `S${item.seasonNum || 1} E${item.epNum || 1}` : 'Film'}
                              </span>

                              {/* Rating badge */}
                              <div className="flex items-center gap-1 text-[11px] font-mono font-black text-yellow-400">
                                <Star size={11} className="fill-current" />
                                <span>{Number(item.rating) > 0 ? Number(item.rating).toFixed(1) : '—'}</span>
                              </div>
                            </div>

                            <h4 className="text-xs font-black text-white group-hover:text-amber-300 transition-colors line-clamp-1 mt-1">
                              {item.type === 'episode' && item.epName ? item.epName : item.entryName}
                            </h4>
                            {item.type === 'episode' && item.entryName && (
                              <p className="text-[10px] text-zinc-400 line-clamp-1">
                                {item.entryName}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 mt-2">
                            <button
                              type="button"
                              onClick={() => {
                                onNavigateToEntry(item.entryId, item.seasonNum, item.epNum);
                              }}
                              className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                            >
                              <ExternalLink size={11} /> Otvori u Katalogu
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveItem(activeProject.id, item.id)}
                              className="text-zinc-600 hover:text-red-400 p-1 transition-colors"
                              title="Ukloni iz ovog foldera"
                            >
                              <Trash size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* BULK ADD MODAL */}
          {isBulkAddOpen && activeProjectId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
              <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center border border-amber-400/30">
                      <Layers size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white uppercase tracking-wider">
                        Grupni Unos Epizoda i Filmova
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Označite više stavki odjednom i dodajte ih u folder "{activeProject?.name}"
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsBulkAddOpen(false)}
                    className="text-zinc-500 hover:text-white p-2 rounded-xl hover:bg-zinc-800"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Filter Controls & Search */}
                <div className="p-3.5 sm:p-5 border-b border-zinc-800/60 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-900/40">
                  <div className="relative flex-1 max-w-full md:max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Pretraži film ili seriju po imenu..."
                      value={bulkSearchQuery}
                      onChange={(e) => setBulkSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Type Filter Pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-xl text-xs font-bold shrink-0">
                      <button
                        type="button"
                        onClick={() => setBulkFilterType('all')}
                        className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all text-[11px] sm:text-xs ${bulkFilterType === 'all' ? 'bg-amber-400 text-zinc-950 font-black' : 'text-zinc-400 hover:text-white'}`}
                      >
                        Sve
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkFilterType('show')}
                        className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all text-[11px] sm:text-xs ${bulkFilterType === 'show' ? 'bg-emerald-400 text-zinc-955 font-black' : 'text-zinc-400 hover:text-white'}`}
                      >
                        Epizode
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkFilterType('movie')}
                        className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all text-[11px] sm:text-xs ${bulkFilterType === 'movie' ? 'bg-sky-400 text-zinc-955 font-black' : 'text-zinc-400 hover:text-white'}`}
                      >
                        Filmovi
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={selectAllFiltered}
                      className="px-2.5 sm:px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-[11px] sm:text-xs font-bold"
                    >
                      Izaberi Sve
                    </button>
                    <button
                      type="button"
                      onClick={deselectAllFiltered}
                      className="px-2.5 sm:px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-[11px] sm:text-xs font-bold"
                    >
                      Poništi
                    </button>
                  </div>
                </div>

                {/* Selectable Items Grid */}
                <div className="p-6 overflow-y-auto max-h-[50vh] space-y-2">
                  {filteredBulkItems.length === 0 ? (
                    <div className="text-center py-10 text-zinc-500 text-xs font-mono">
                      Nema pronađenih stavki za zadate filtere.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {filteredBulkItems.map(item => {
                        const isSelected = selectedBulkItemIds.has(item.id);
                        return (
                          <div
                            key={item.id}
                            onClick={() => toggleBulkItem(item.id)}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                              isSelected 
                                ? 'bg-amber-400/10 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)]' 
                                : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                            }`}
                          >
                            <div className="shrink-0">
                              {isSelected ? (
                                <div className="w-5 h-5 rounded-lg bg-amber-400 text-zinc-950 flex items-center justify-center font-black">
                                  <Check size={13} strokeWidth={3} />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-lg border-2 border-zinc-700 hover:border-zinc-500" />
                              )}
                            </div>

                            <div className="w-10 h-14 rounded-lg bg-zinc-950 overflow-hidden shrink-0 border border-zinc-800">
                              {item.posterUrl ? (
                                <img src={item.posterUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">
                                  🎬
                                </div>
                              )}
                            </div>

                            <div className="flex-1 overflow-hidden">
                              <div className="flex items-center justify-between">
                                <span className={`text-[8px] font-black uppercase px-1 py-0.5 rounded ${item.type === 'episode' ? 'bg-emerald-950 text-emerald-400' : 'bg-sky-950 text-sky-400'}`}>
                                  {item.type === 'episode' ? `S${item.seasonNum || 1}E${item.epNum || 1}` : 'Film'}
                                </span>
                                <span className="text-[10px] font-mono font-bold text-yellow-400">
                                  ★ {Number(item.rating) > 0 ? Number(item.rating).toFixed(1) : '—'}
                                </span>
                              </div>
                              <h5 className="text-xs font-black text-white line-clamp-1 mt-0.5">
                                {item.type === 'episode' && item.epName ? item.epName : item.entryName}
                              </h5>
                              {item.type === 'episode' && (
                                <p className="text-[10px] text-zinc-400 line-clamp-1">{item.entryName}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Modal Footer with Selection Count & Confirm Button */}
                <div className="px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/70 flex items-center justify-between">
                  <div className="text-xs text-zinc-300 font-mono">
                    Izabrano: <strong className="text-amber-400 font-black">{selectedBulkItemIds.size}</strong> stavki
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsBulkAddOpen(false)}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl"
                    >
                      Zatvori
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmBulkAdd}
                      disabled={selectedBulkItemIds.size === 0}
                      className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus size={15} /> Dodaj ({selectedBulkItemIds.size}) u Folder
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
