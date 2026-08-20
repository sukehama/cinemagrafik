import React, { useState } from 'react';
import { motion } from 'motion/react';
import { RatingEntry } from '../types';
import { saveEntriesToDB } from '../db';
import { X, Download, Monitor, Smartphone, Globe, Copy, Check, CheckCircle2, Database, Upload, AlertTriangle, ArrowRightLeft, Save } from 'lucide-react';

interface ExportModalProps {
  entries: RatingEntry[];
  onClose: () => void;
  onImportJSON?: (importedEntries: RatingEntry[]) => void;
  initialTab?: 'web-html' | 'json-backup';
}

type TabType = 'web-html' | 'json-backup';

export default function ExportModal({ entries, onClose, onImportJSON, initialTab = 'web-html' }: ExportModalProps) {
  const [activeTab, setActiveTab] = React.useState<TabType>(initialTab);

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  const [copiedTextId, setCopiedTextId] = useState<string | null>(null);

  // JSON Import & Export state
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState<string>('');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [isSavedManually, setIsSavedManually] = useState(false);
  const [pastedJSON, setPastedJSON] = useState('');

  const handleLocalForceSave = async () => {
    try {
      await saveEntriesToDB(entries);
      try {
        localStorage.setItem('rating-grid-entries', JSON.stringify(entries));
      } catch (quotaError) {
        // Silently caught: successfully stored in IndexedDB
      }
      setIsSavedManually(true);
      setTimeout(() => {
        setIsSavedManually(false);
      }, 3000);
    } catch (err) {
      console.error('Manual local save failed inside ExportModal:', err);
    }
  };

  // File drag & drop support handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const fileReader = new FileReader();
      fileReader.readAsText(file, "UTF-8");
      fileReader.onload = (event) => {
        if (event.target?.result) {
          validateAndImportJSON(event.target.result as string);
        }
      };
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      fileReader.readAsText(file, "UTF-8");
      fileReader.onload = (event) => {
        if (event.target?.result) {
          validateAndImportJSON(event.target.result as string);
        }
      };
    }
  };

  const getComprehensiveBackupObject = () => {
    let projectFolders: any[] = [];
    let actorFolders: any[] = [];
    let actorGlobalProfiles: any = {};
    try {
      const savedProjects = localStorage.getItem('baza_projekti_v1');
      if (savedProjects) projectFolders = JSON.parse(savedProjects);
    } catch (e) {
      console.error('Error reading projects for export:', e);
    }

    try {
      const savedActorFolders = localStorage.getItem('actor_folders_v1');
      if (savedActorFolders) actorFolders = JSON.parse(savedActorFolders);
    } catch (e) {
      console.error('Error reading actor folders for export:', e);
    }

    try {
      const savedActorProfiles = localStorage.getItem('actor_global_profiles_v1');
      if (savedActorProfiles) actorGlobalProfiles = JSON.parse(savedActorProfiles);
    } catch (e) {
      console.error('Error reading actor profiles for export:', e);
    }

    return {
      version: 2,
      appName: 'CinemaGrafik',
      exportedAt: new Date().toISOString(),
      entries: entries,
      projects: projectFolders,
      actorFolders: actorFolders,
      actorProfiles: actorGlobalProfiles
    };
  };

  const validateAndImportJSON = (fileText: string) => {
    try {
      const parsed = JSON.parse(fileText);
      let rawEntries: any[] = [];
      let importedProjects: any[] | null = null;
      let importedActorFolders: any[] | null = null;
      let importedActorProfiles: any | null = null;

      if (Array.isArray(parsed)) {
        // Legacy format: direct array of entries
        rawEntries = parsed;
      } else if (typeof parsed === 'object' && parsed !== null) {
        if (Array.isArray(parsed.entries)) {
          rawEntries = parsed.entries;
        } else {
          throw new Error('Uvezeni JSON objekat mora sadržavati listu naslova pod ključem "entries".');
        }

        if (Array.isArray(parsed.projects)) {
          importedProjects = parsed.projects;
        }
        if (Array.isArray(parsed.actorFolders)) {
          importedActorFolders = parsed.actorFolders;
        }
        if (typeof parsed.actorProfiles === 'object' && parsed.actorProfiles !== null) {
          importedActorProfiles = parsed.actorProfiles;
        }
      } else {
        throw new Error('Uvezeni dokument mora biti validan CinemaGrafik JSON.');
      }
      
      const isValid = rawEntries.every((item: any) => {
        return typeof item === 'object' && item !== null && typeof item.id === 'string' && typeof item.name === 'string';
      });

      if (!isValid && rawEntries.length > 0) {
        throw new Error('Neki od elemenata nemaju ispravan format (nedostaje jedinstveni ID ili Naziv).');
      }

      if (onImportJSON) {
        let finalEntries: RatingEntry[] = [];
        if (importMode === 'replace') {
          finalEntries = rawEntries as RatingEntry[];
        } else {
          // Merge strategy: update existing, add new ones
          const mergedMap = new Map<string, RatingEntry>();
          entries.forEach(e => mergedMap.set(e.id, e));
          (rawEntries as RatingEntry[]).forEach(e => mergedMap.set(e.id, e));
          finalEntries = Array.from(mergedMap.values());
        }

        // Restore custom projects / baze if present
        if (importedProjects) {
          try {
            if (importMode === 'replace') {
              localStorage.setItem('baza_projekti_v1', JSON.stringify(importedProjects));
              window.dispatchEvent(new CustomEvent('baza_projekti_updated', { detail: importedProjects }));
            } else {
              let existingProjects: any[] = [];
              const savedProj = localStorage.getItem('baza_projekti_v1');
              if (savedProj) existingProjects = JSON.parse(savedProj);
              const pMap = new Map<string, any>();
              existingProjects.forEach(p => pMap.set(p.id, p));
              importedProjects.forEach(p => pMap.set(p.id, p));
              const mergedProjects = Array.from(pMap.values());
              localStorage.setItem('baza_projekti_v1', JSON.stringify(mergedProjects));
              window.dispatchEvent(new CustomEvent('baza_projekti_updated', { detail: mergedProjects }));
            }
          } catch (projErr) {
            console.error('Error restoring project folders:', projErr);
          }
        }

        // Restore actor folders if present
        if (importedActorFolders) {
          try {
            if (importMode === 'replace') {
              localStorage.setItem('actor_folders_v1', JSON.stringify(importedActorFolders));
              window.dispatchEvent(new CustomEvent('actor_folders_updated', { detail: importedActorFolders }));
            } else {
              let existingFolders: any[] = [];
              const savedF = localStorage.getItem('actor_folders_v1');
              if (savedF) existingFolders = JSON.parse(savedF);
              const fMap = new Map<string, any>();
              existingFolders.forEach(f => fMap.set(f.id, f));
              importedActorFolders.forEach(f => fMap.set(f.id, f));
              const mergedFolders = Array.from(fMap.values());
              localStorage.setItem('actor_folders_v1', JSON.stringify(mergedFolders));
              window.dispatchEvent(new CustomEvent('actor_folders_updated', { detail: mergedFolders }));
            }
          } catch (fErr) {
            console.error('Error restoring actor folders:', fErr);
          }
        }

        // Restore actor profiles if present
        if (importedActorProfiles) {
          try {
            let existingProfiles: any = {};
            if (importMode === 'merge') {
              const savedP = localStorage.getItem('actor_global_profiles_v1');
              if (savedP) existingProfiles = JSON.parse(savedP);
            }
            const mergedProfiles = { ...existingProfiles, ...importedActorProfiles };
            localStorage.setItem('actor_global_profiles_v1', JSON.stringify(mergedProfiles));
            window.dispatchEvent(new CustomEvent('actor_profiles_updated', { detail: mergedProfiles }));
          } catch (pErr) {
            console.error('Error restoring actor profiles:', pErr);
          }
        }

        onImportJSON(finalEntries);
        setImportStatus('success');
        const projCountMsg = importedProjects ? ` i ${importedProjects.length} dodatnih projekata/baza` : '';
        setImportMessage(`Uspješno uvezeno i sinhronizovano ${rawEntries.length} naslova${projCountMsg}! ${importMode === 'replace' ? 'Svi prethodni podaci su zamijenjeni.' : 'Novi i postojeći podaci su spojeni.'}`);
      } else {
        throw new Error('Sistemska greška: Funkcija uvoza nije ispravno povezana sa jezgrom aplikacije.');
      }
    } catch (err: any) {
      setImportStatus('error');
      setImportMessage(err.message || 'Neispravan JSON fajl.');
    }
  };

  const handleJSONExport = () => {
    try {
      const backupData = getComprehensiveBackupObject();
      const dataStr = JSON.stringify(backupData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const timestamp = new Date().toISOString().split('T')[0];
      const exportFileDefaultName = `cinemagrafik-kompletna-baza-${timestamp}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (e) {
      console.error('Došlo je do greške prilikom izvoza JSON-a:', e);
    }
  };

  const handleCopyJSONToClipboard = () => {
    try {
      const backupData = getComprehensiveBackupObject();
      navigator.clipboard.writeText(JSON.stringify(backupData, null, 2));
      setCopiedTextId('json-backup-copy');
      setTimeout(() => {
        setCopiedTextId(null);
      }, 2500);
    } catch (e) {
      console.error('Došlo je do greške prilikom kopiranja baze:', e);
    }
  };

  const handleImportPastedJSON = () => {
    if (!pastedJSON.trim()) {
      setImportStatus('error');
      setImportMessage('Molimo zalijepite ispravan JSON tekst kako biste obavili uvoz.');
      return;
    }
    validateAndImportJSON(pastedJSON);
  };

  const triggerCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTextId(id);
    setTimeout(() => {
      setCopiedTextId(null);
    }, 2000);
  };

  // Generate a standalone interactive raw HTML file that embeds user's entire database, projects, and actors
  const generateStandaloneHTML = () => {
    const backupObj = getComprehensiveBackupObject();
    const serializedData = JSON.stringify(backupObj, null, 2);

    return `<!DOCTYPE html>
<html lang="bs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cinema Grafik — Offline Katalog & Baze</title>
    <!-- Tailwind CSS Script -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        zinc: {
                            850: '#1a1a1f',
                            900: '#121215',
                            950: '#08080c',
                        }
                    }
                }
            }
        }
    </script>
    <style>
        body { background-color: #08080c; color: #f4f4f5; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; }
        .rating-95 { background: linear-gradient(135deg, #0284c7, #0369a1); color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
        .rating-90 { background: linear-gradient(135deg, #059669, #047857); color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
        .rating-80 { background: linear-gradient(135deg, #10b981, #059669); color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
        .rating-70 { background: linear-gradient(135deg, #eab308, #ca8a04); color: #000; font-weight: 900; }
        .rating-60 { background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; }
        .rating-40 { background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; }
        .rating-0  { background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #fff; }
        
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        ::-webkit-scrollbar-track {
            background: #08080c;
        }
        ::-webkit-scrollbar-thumb {
            background: #272730;
            border-radius: 999px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #3f3f4e;
        }

        .transition-all {
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .animate-fade-in {
            animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .popup-animate {
            transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
        }
    </style>
</head>
<body class="p-4 sm:p-6 md:p-10 font-sans selection:bg-yellow-500/30 min-h-screen bg-zinc-950 text-zinc-100">

    <div class="max-w-7xl mx-auto space-y-6">
        <!-- Main Top Bar -->
        <header class="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-zinc-800/80 pb-6 gap-4">
            <div>
                <div class="flex items-center gap-2 mb-1.5">
                    <span class="bg-yellow-400 text-zinc-950 font-black px-2 py-0.5 rounded text-[11px] uppercase tracking-wider">IMDb</span>
                    <span class="text-[10px] font-black uppercase text-yellow-500 tracking-widest bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">
                        OFFLINE KATALOG &amp; PROJEKTI
                    </span>
                </div>
                <h1 class="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">Cinema Grafik</h1>
                <p class="text-zinc-400 text-xs sm:text-sm mt-0.5">
                    Interaktivni katalog naslova, ocjena, sezona, video najava, glumačke baze i projekata
                </p>
            </div>

            <!-- Stats Bar -->
            <div class="flex items-center gap-3">
                <div class="bg-zinc-900/90 border border-zinc-800 px-4 py-2.5 rounded-2xl flex items-center gap-3">
                    <span class="text-2xl font-black font-mono text-yellow-400" id="total-count-badge">0</span>
                    <div class="text-left text-xs">
                        <p class="text-zinc-200 font-black">Naslova</p>
                        <p class="text-zinc-500 text-[10px]" id="projects-count-badge">0 Baza</p>
                    </div>
                </div>
                <div class="bg-zinc-900/90 border border-zinc-800 px-4 py-2.5 rounded-2xl flex items-center gap-3">
                    <span class="text-2xl font-black font-mono text-emerald-400" id="total-actors-badge">0</span>
                    <div class="text-left text-xs">
                        <p class="text-zinc-200 font-black">Glumaca</p>
                        <p class="text-zinc-500 text-[10px]">Povezano</p>
                    </div>
                </div>
            </div>
        </header>

        <!-- Navigation Tabs: Katalog | Baze & Plejliste | Glumci -->
        <nav class="flex border-b border-zinc-800 bg-zinc-900/60 p-1.5 rounded-2xl gap-2 text-xs font-black uppercase tracking-wider">
            <button id="nav-btn-catalog" onclick="switchMainView('catalog')" class="flex-1 py-2.5 rounded-xl text-center bg-yellow-400 text-zinc-950 font-black transition cursor-pointer flex items-center justify-center gap-2">
                <span>🍿 Glavni Katalog Naslova</span>
            </button>
            <button id="nav-btn-projects" onclick="switchMainView('projects')" class="flex-1 py-2.5 rounded-xl text-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition cursor-pointer flex items-center justify-center gap-2">
                <span>📂 Baze &amp; Plejliste Projekata</span>
            </button>
            <button id="nav-btn-actors" onclick="switchMainView('actors')" class="flex-1 py-2.5 rounded-xl text-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition cursor-pointer flex items-center justify-center gap-2">
                <span>👥 Baza Glumaca &amp; Uloga</span>
            </button>
        </nav>

        <!-- VIEW 1: CATALOG VIEW -->
        <div id="view-catalog-section" class="space-y-6">
            <!-- Search & Filters -->
            <section class="bg-zinc-900/60 p-3 sm:p-4 rounded-2xl border border-zinc-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                <div class="relative flex-1">
                    <input 
                        type="text" 
                        id="html-search-input" 
                        placeholder="Pretražite naslove, sezone, glumce, uloge, sinopsis..." 
                        oninput="handleSearchFilterChange()"
                        class="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 text-white rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none pl-10"
                    />
                    <span class="absolute left-3.5 top-3 text-zinc-500 text-xs">🔍</span>
                </div>
                <div class="flex items-center gap-2">
                    <select 
                        id="html-filter-type" 
                        onchange="handleSearchFilterChange()"
                        class="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs font-bold rounded-xl px-3 py-2.5 uppercase tracking-wide cursor-pointer outline-none focus:border-yellow-400"
                    >
                        <option value="all">🍿 Svi Formati</option>
                        <option value="show">📺 Serije</option>
                        <option value="movie">🎬 Filmovi</option>
                        <option value="universe">🌌 Univerzumi</option>
                    </select>
                </div>
            </section>

            <!-- Grid Split: Sidebar Items List + Wide Dashboard Slate -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <!-- Sidebar Titles -->
                <div class="lg:col-span-4 space-y-3">
                    <div class="flex items-center justify-between border-b border-zinc-800 pb-2">
                        <span class="text-[10px] uppercase font-black text-zinc-400 tracking-wider">Biblioteka Naslova</span>
                        <span id="filtered-count" class="text-[10px] text-zinc-500 font-mono font-bold"></span>
                    </div>
                    <div class="space-y-2 max-h-[680px] overflow-y-auto pr-1" id="sidebar-titles">
                        <!-- Titles dynamically injected -->
                    </div>
                </div>

                <!-- Active Slate Display -->
                <div class="lg:col-span-8">
                    <div class="bg-zinc-900/60 border border-zinc-800 p-6 rounded-3xl space-y-6 min-h-[500px] text-left" id="dashboard-slate">
                        <!-- Active show/movie content injected here -->
                    </div>
                </div>
            </div>
        </div>

        <!-- VIEW 2: PROJECTS & PLAYLISTS VIEW -->
        <div id="view-projects-section" class="space-y-6 hidden">
            <div class="border-b border-zinc-800 pb-3 flex items-center justify-between">
                <div>
                    <h3 class="text-lg font-black text-white uppercase">📂 Korisničke Baze &amp; Plejliste</h3>
                    <p class="text-xs text-zinc-400">Tematski projekti, liste za gledanje i personalizovane baze</p>
                </div>
                <span id="projects-total-label" class="text-xs font-mono font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-500/20 px-3 py-1 rounded-xl"></span>
            </div>

            <div id="projects-grid-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <!-- Project cards injected here -->
            </div>
        </div>

        <!-- VIEW 3: ACTORS VIEW -->
        <div id="view-actors-section" class="space-y-6 hidden">
            <div class="border-b border-zinc-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h3 class="text-lg font-black text-white uppercase">👥 Glumački Leksikon &amp; Uloge</h3>
                    <p class="text-xs text-zinc-400">Svi glumci, uloge, nagrade i njihovi nastupi u ovom katalogu</p>
                </div>
                <input 
                    type="text" 
                    id="actors-search-input"
                    placeholder="Pretraži glumce ili likove..."
                    oninput="renderActorsView()"
                    class="bg-zinc-950 border border-zinc-800 focus:border-yellow-400 text-white rounded-xl px-4 py-2 text-xs focus:outline-none w-full sm:w-64"
                />
            </div>

            <div id="actors-grid-container" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <!-- Actors injected here -->
            </div>
        </div>

    </div>

    <!-- REWORKED EXPANSIVE CINEMATIC DETAILS MODAL (EPISODES & MOVIES) -->
    <div id="popup-overlay" class="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 hidden opacity-0 transition-opacity duration-300" onclick="closeDetailsPopup()">
        <div class="bg-zinc-900 border border-zinc-700/80 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl relative max-h-[92vh] flex flex-col popup-animate transform scale-95" onclick="event.stopPropagation()">
            
            <!-- Large Banner with Poster & Title Overlay -->
            <div id="popup-img-container" class="h-52 sm:h-64 bg-zinc-950 relative overflow-hidden flex items-end shrink-0">
                <img id="popup-image" src="" class="w-full h-full object-cover opacity-35 absolute inset-0" referrerPolicy="no-referrer" />
                <div class="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/60 to-transparent"></div>
                
                <button onclick="closeDetailsPopup()" class="absolute top-4 right-4 bg-zinc-950/80 border border-zinc-700 text-zinc-400 hover:text-white p-2.5 rounded-full transition-colors cursor-pointer text-xs z-30 shadow-lg">✕</button>
                
                <div class="p-6 relative z-10 flex items-end justify-between w-full text-left gap-4">
                    <div class="space-y-1 min-w-0 flex-1">
                        <span id="popup-season-ep" class="text-[9px] sm:text-[10px] font-mono uppercase text-yellow-400 font-black bg-yellow-400/15 px-2.5 py-1 rounded-lg border border-yellow-500/30 inline-block"></span>
                        <h3 id="popup-name" class="text-xl sm:text-3xl font-black text-white truncate drop-shadow-md"></h3>
                        <p id="popup-meta-subtitle" class="text-xs text-zinc-300 font-medium"></p>
                    </div>

                    <!-- Dynamic Rating Badge -->
                    <div class="shrink-0">
                        <span id="popup-rating" class="px-4 py-2 rounded-2xl text-base sm:text-lg font-black font-mono shadow-xl block text-center"></span>
                    </div>
                </div>
            </div>
            
            <!-- Modal Tabs Switcher -->
            <div class="flex border-b border-zinc-800 bg-zinc-950/90 p-1.5 shrink-0 gap-1 text-[11px] uppercase font-black tracking-wider">
                <button id="popup-tab-details" onclick="switchPopupTab('details')" class="flex-1 py-2 rounded-xl text-center bg-zinc-800 text-white font-black border border-zinc-700 transition cursor-pointer">
                    📝 Sinopsis &amp; Detalji
                </button>
                <button id="popup-tab-video" onclick="switchPopupTab('video')" class="flex-1 py-2 rounded-xl text-center text-zinc-400 hover:text-zinc-200 transition cursor-pointer">
                    🎬 YouTube Video Najava
                </button>
                <button id="popup-tab-actors" onclick="switchPopupTab('actors')" class="flex-1 py-2 rounded-xl text-center text-zinc-400 hover:text-zinc-200 transition cursor-pointer">
                    👥 Glumci &amp; Uloge
                </button>
                <button id="popup-tab-reviews" onclick="switchPopupTab('reviews')" class="flex-1 py-2 rounded-xl text-center text-zinc-400 hover:text-zinc-200 transition cursor-pointer">
                    ⭐ Recenzije &amp; Ocjene
                </button>
            </div>

            <!-- Scrollable Content View Area -->
            <div class="p-6 overflow-y-auto flex-1 space-y-6 text-xs text-left" id="popup-tab-content">
                <!-- Content dynamically populated -->
            </div>
            
            <!-- Modal Footer -->
            <div class="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500 shrink-0">
                <span id="popup-footer-info">Cinema Grafik • Baza Podataka</span>
                <button onclick="closeDetailsPopup()" class="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 rounded-xl font-bold transition cursor-pointer">
                    Zatvori Pregled
                </button>
            </div>
        </div>
    </div>

    <!-- REWORKED ACTOR BIO OVERLAY -->
    <div id="actor-overlay" class="fixed inset-0 bg-black/92 backdrop-blur-md z-50 flex items-center justify-center p-4 hidden opacity-0 transition-opacity duration-300" onclick="closeActorPopup()">
        <div class="bg-zinc-900 border border-zinc-750 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col p-6 popup-animate transform scale-95 text-left" onclick="event.stopPropagation()">
            
            <div class="flex justify-between items-start border-b border-zinc-800 pb-4 mb-4 shrink-0">
                <div>
                    <h3 id="actor-detail-name" class="font-black text-lg text-white"></h3>
                    <span id="actor-detail-char" class="text-xs text-yellow-400 font-black block mt-0.5 uppercase tracking-wider"></span>
                </div>
                <button onclick="closeActorPopup()" class="bg-zinc-800 text-zinc-300 hover:text-white p-2 rounded-full shrink-0 text-xs font-bold leading-none w-7 h-7 flex items-center justify-center cursor-pointer">✕</button>
            </div>

            <div class="overflow-y-auto flex-1 space-y-4 pr-1 text-xs font-sans">
                <div class="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                    <img id="actor-detail-photo" src="" class="w-24 h-24 rounded-2xl object-cover shadow-xl shrink-0 border border-zinc-700" referrerPolicy="no-referrer" />
                    <div class="space-y-2 flex-1 w-full">
                        <div class="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800">
                            <span class="text-[9px] text-yellow-400 uppercase tracking-widest block font-black">🏅 Nagrade, Priznanja &amp; Uloge</span>
                            <p id="actor-detail-awards" class="text-xs text-zinc-200 mt-1 leading-relaxed"></p>
                        </div>
                    </div>
                </div>

                <div class="space-y-1 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                    <span class="text-[9px] text-emerald-400 uppercase tracking-wider block font-black">📝 Biografija &amp; Zanimljivosti</span>
                    <p id="actor-detail-bio" class="text-zinc-300 leading-relaxed mt-1 text-xs"></p>
                </div>

                <!-- Appearances in Database -->
                <div class="space-y-2 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                    <span class="text-[9px] text-yellow-500 uppercase tracking-widest block font-black">🎬 Svi Nastupi i Uloge u ovom Katalogu</span>
                    <div id="actor-appearances-list" class="space-y-2 max-h-48 overflow-y-auto pr-1 mt-2 divide-y divide-zinc-900">
                        <!-- Dynamic appearances -->
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Script Logic for Standalone Interactive Application -->
    <script>
        const DB_RAW = ${serializedData};
        const DB_ENTRIES = Array.isArray(DB_RAW.entries) ? DB_RAW.entries : (Array.isArray(DB_RAW) ? DB_RAW : []);
        const DB_PROJECTS = Array.isArray(DB_RAW.projects) ? DB_RAW.projects : [];
        const DB_ACTOR_FOLDERS = Array.isArray(DB_RAW.actorFolders) ? DB_RAW.actorFolders : [];
        const DB_ACTOR_PROFILES = (typeof DB_RAW.actorProfiles === 'object' && DB_RAW.actorProfiles !== null) ? DB_RAW.actorProfiles : {};

        let currentMainView = 'catalog';
        let activeId = DB_ENTRIES.length > 0 ? DB_ENTRIES[0].id : null;

        // Rating Color Utilities
        function getRatingColorClass(rating) {
            if (rating >= 9.5) return 'rating-95';
            if (rating >= 9.0) return 'rating-90';
            if (rating >= 8.0) return 'rating-80';
            if (rating >= 7.0) return 'rating-70';
            if (rating >= 6.0) return 'rating-60';
            if (rating >= 4.0) return 'rating-40';
            return 'rating-0';
        }

        // Helper to construct YouTube embed iframe
        function getYouTubeEmbedUrl(url) {
            if (!url) return '';
            if (url.includes('youtube.com/embed/')) return url;
            const regExp = /^.*(youtu.be\\/|v\\/|u\\/\\w\\/|embed\\/|watch\\?v=|\\&v=|shorts\\/)([^#\\&\\?]*).*/;
            const match = url.match(regExp);
            if (match && match[2].length >= 11) {
                return 'https://www.youtube.com/embed/' + match[2].substring(0, 11);
            }
            return '';
        }

        // Switch main views: Catalog / Projects / Actors
        function switchMainView(view) {
            currentMainView = view;
            const btnCat = document.getElementById('nav-btn-catalog');
            const btnProj = document.getElementById('nav-btn-projects');
            const btnAct = document.getElementById('nav-btn-actors');

            const secCat = document.getElementById('view-catalog-section');
            const secProj = document.getElementById('view-projects-section');
            const secAct = document.getElementById('view-actors-section');

            const activeClass = 'bg-yellow-400 text-zinc-950 font-black shadow';
            const inactiveClass = 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 font-bold';

            if (view === 'catalog') {
                btnCat.className = 'flex-1 py-2.5 rounded-xl text-center ' + activeClass + ' transition cursor-pointer flex items-center justify-center gap-2';
                btnProj.className = 'flex-1 py-2.5 rounded-xl text-center ' + inactiveClass + ' transition cursor-pointer flex items-center justify-center gap-2';
                btnAct.className = 'flex-1 py-2.5 rounded-xl text-center ' + inactiveClass + ' transition cursor-pointer flex items-center justify-center gap-2';
                secCat.classList.remove('hidden');
                secProj.classList.add('hidden');
                secAct.classList.add('hidden');
                renderSidebar();
                renderActiveSlate();
            } else if (view === 'projects') {
                btnCat.className = 'flex-1 py-2.5 rounded-xl text-center ' + inactiveClass + ' transition cursor-pointer flex items-center justify-center gap-2';
                btnProj.className = 'flex-1 py-2.5 rounded-xl text-center ' + activeClass + ' transition cursor-pointer flex items-center justify-center gap-2';
                btnAct.className = 'flex-1 py-2.5 rounded-xl text-center ' + inactiveClass + ' transition cursor-pointer flex items-center justify-center gap-2';
                secCat.classList.add('hidden');
                secProj.classList.remove('hidden');
                secAct.classList.add('hidden');
                renderProjectsView();
            } else if (view === 'actors') {
                btnCat.className = 'flex-1 py-2.5 rounded-xl text-center ' + inactiveClass + ' transition cursor-pointer flex items-center justify-center gap-2';
                btnProj.className = 'flex-1 py-2.5 rounded-xl text-center ' + inactiveClass + ' transition cursor-pointer flex items-center justify-center gap-2';
                btnAct.className = 'flex-1 py-2.5 rounded-xl text-center ' + activeClass + ' transition cursor-pointer flex items-center justify-center gap-2';
                secCat.classList.add('hidden');
                secProj.classList.add('hidden');
                secAct.classList.remove('hidden');
                renderActorsView();
            }
        }

        // Render Sidebar Catalog List
        function renderSidebar() {
            const query = document.getElementById('html-search-input').value.toLowerCase().trim();
            const format = document.getElementById('html-filter-type').value;
            
            const filtered = DB_ENTRIES.filter(item => {
                const matchesType = format === 'all' || item.type === format;
                if (!matchesType) return false;
                if (!query) return true;
                
                const matchesBasic = item.name.toLowerCase().includes(query) || (item.description || '').toLowerCase().includes(query);
                if (matchesBasic) return true;
                
                if (item.movieActors && item.movieActors.some(a => a.name.toLowerCase().includes(query) || (a.characterName || '').toLowerCase().includes(query))) {
                    return true;
                }
                if (item.seasons) {
                    const hasMatch = item.seasons.some(s => 
                        (s.episodes || []).some(ep => 
                            ep.name.toLowerCase().includes(query) || 
                            (ep.overview || '').toLowerCase().includes(query) ||
                            (ep.actors || []).some(a => a.name.toLowerCase().includes(query) || (a.characterName || '').toLowerCase().includes(query))
                        )
                    );
                    if (hasMatch) return true;
                }
                return false;
            });

            document.getElementById('filtered-count').textContent = filtered.length + ' od ' + DB_ENTRIES.length;

            const container = document.getElementById('sidebar-titles');
            container.innerHTML = '';

            filtered.forEach(item => {
                const isSelected = item.id === activeId;
                const card = document.createElement('button');
                card.className = 'w-full text-left p-3 rounded-2xl border transition-all flex items-center gap-3.5 cursor-pointer ' + (
                    isSelected 
                        ? 'bg-zinc-900 border-yellow-400 shadow-md ring-1 ring-yellow-400/30' 
                        : 'bg-zinc-950/60 border-zinc-850 hover:bg-zinc-900 hover:border-zinc-700'
                );
                card.onclick = () => {
                    activeId = item.id;
                    renderSidebar();
                    renderActiveSlate();
                };

                const badges = item.type === 'show' ? '📺 Serija' : item.type === 'universe' ? '🌌 Univerzum' : '🎬 Film';
                const scoreStr = item.type === 'movie' ? (item.movieRating ? item.movieRating.toFixed(1) : 'TBA') : getAverageRating(item);

                card.innerHTML = \`
                    <div class="w-11 h-15 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0">
                        <img src="\${item.posterUrl}" class="w-full h-full object-cover" referrerPolicy="no-referrer">
                    </div>
                    <div class="flex-1 min-w-0 text-left">
                        <span class="text-[9px] text-zinc-400 font-bold block uppercase">\${badges} • \${item.year}</span>
                        <h4 class="font-black text-sm text-zinc-100 truncate mt-0.5">\${item.name}</h4>
                    </div>
                    <div class="text-right shrink-0">
                        <span class="text-xs font-mono font-black text-yellow-400 bg-yellow-400/10 border border-yellow-500/20 px-2.5 py-1 rounded-xl">\${scoreStr}</span>
                    </div>
                \`;
                container.appendChild(card);
            });
        }

        function getAverageRating(entry) {
            if (!entry.seasons || entry.seasons.length === 0) return '0.0';
            let sum = 0;
            let count = 0;
            entry.seasons.forEach(s => {
                (s.episodes || []).forEach(e => {
                    sum += e.rating;
                    count++;
                });
            });
            return count > 0 ? (sum / count).toFixed(1) : '0.0';
        }

        // Render Active Title Presentation
        function renderActiveSlate() {
            const container = document.getElementById('dashboard-slate');
            container.innerHTML = '';

            const entry = DB_ENTRIES.find(item => item.id === activeId);
            if (!entry) {
                renderEmptySlate();
                return;
            }

            const isMovie = entry.type === 'movie';
            const avgRating = isMovie ? (entry.movieRating ? entry.movieRating.toFixed(1) : 'TBA') : getAverageRating(entry);

            const headHtml = \`
                <div class="h-48 sm:h-56 bg-zinc-950 rounded-3xl overflow-hidden relative flex items-end shadow-2xl border border-zinc-800">
                    <img src="\${entry.bannerUrl || entry.posterUrl}" class="w-full h-full object-cover opacity-35 absolute inset-0" referrerPolicy="no-referrer">
                    <div class="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/50 to-transparent"></div>
                    <div class="p-6 relative z-10 flex gap-4 sm:gap-6 items-end">
                        <div class="w-16 sm:w-20 aspect-[2/3] rounded-xl overflow-hidden bg-zinc-950 shadow-2xl border-2 border-zinc-700 shrink-0">
                            <img src="\${entry.posterUrl}" class="w-full h-full object-cover" referrerPolicy="no-referrer">
                        </div>
                        <div class="text-left font-sans animate-fade-in">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="text-[9px] font-mono uppercase bg-yellow-400 text-zinc-955 px-2 py-0.5 rounded font-black">\${entry.year}</span>
                                <span class="text-[9px] font-mono uppercase bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700 font-bold">\${entry.type.toUpperCase()}</span>
                                <span class="text-xs font-mono font-black text-yellow-400 bg-yellow-400/10 border border-yellow-500/25 px-2.5 py-0.5 rounded-lg">★ \${avgRating}</span>
                            </div>
                            <h2 class="text-2xl sm:text-3xl font-black text-white mt-1.5 leading-tight">\${entry.name}</h2>
                        </div>
                    </div>
                </div>

                <div class="text-xs text-zinc-300 leading-relaxed bg-zinc-950/80 p-4 border border-zinc-850 rounded-2xl italic animate-fade-in">
                    "\${entry.description || 'Nema unesenog opisa.'}"
                </div>
            \`;

            let mainContent = '';

            if (isMovie) {
                const scoreVal = entry.movieRating ? entry.movieRating.toFixed(1) : '0.0';
                const durationLabel = entry.movieDuration || 'Nije navedeno';
                const colorCls = getRatingColorClass(entry.movieRating || 0);

                mainContent = \`
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="bg-zinc-950 p-6 rounded-2xl border border-zinc-850 space-y-4 flex flex-col justify-center items-center text-center">
                            <h3 class="text-[10px] uppercase font-black tracking-widest text-zinc-400">LIČNA OCJENA FILMA</h3>
                            <div class="inline-flex items-center gap-2 px-8 py-3 rounded-2xl \${colorCls} text-zinc-950 shadow-xl">
                                <span class="text-4xl font-black font-mono">\${scoreVal}</span>
                                <span class="text-xs font-bold">/ 10</span>
                            </div>
                            <p class="text-zinc-400 text-xs font-mono">Trajanje: \${durationLabel}</p>
                        </div>
                \`;

                // Movie YouTube Video Trailer
                const yEmbed = getYouTubeEmbedUrl(entry.movieYoutubeUrl);
                if (yEmbed) {
                    mainContent += \`
                        <div class="bg-zinc-950 p-3 rounded-2xl border border-zinc-850 space-y-2">
                            <span class="text-[10px] font-black text-zinc-400 uppercase tracking-wider block pl-1">🎬 Zvanična Video Najava</span>
                            <div class="relative w-full aspect-video rounded-xl overflow-hidden border border-zinc-800 bg-black">
                                <iframe src="\${yEmbed}" class="absolute top-0 left-0 w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                            </div>
                        </div>
                    \`;
                } else if (entry.movieYoutubeUrl) {
                    mainContent += \`
                        <div class="bg-zinc-950 p-6 rounded-2xl border border-zinc-850 flex flex-col items-center justify-center text-center space-y-3">
                            <span class="text-xs text-zinc-400">Priložen je video link:</span>
                            <a href="\${entry.movieYoutubeUrl}" target="_blank" rel="noreferrer" class="px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition">
                                ▶ Otvori na YouTube
                            </a>
                        </div>
                    \`;
                } else {
                    mainContent += \`
                        <div class="bg-zinc-950 p-6 rounded-2xl border border-zinc-850 flex items-center justify-center text-zinc-500 italic text-xs">
                            Nema priloženog video trailera za ovaj film.
                        </div>
                    \`;
                }

                mainContent += '</div>';

                // Movie Cast
                const mActors = entry.movieActors || [];
                if (mActors.length > 0) {
                    mainContent += \`
                        <div class="bg-zinc-950/80 p-5 rounded-2xl border border-zinc-850 space-y-3">
                            <span class="text-[10px] text-yellow-400 font-black tracking-widest uppercase block">👥 GLUMAČKI ANSAMBL / CAST FILMA</span>
                            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                                \${mActors.map(act => {
                                    const pic = act.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop';
                                    return \`
                                        <div onclick="showActorProfileBio('\${act.id}', '\${entry.id}', 'null', 'null')" class="bg-zinc-900 hover:bg-zinc-850 p-3 rounded-xl border border-zinc-800 flex items-center gap-3 transition cursor-pointer hover:border-yellow-400/40 group">
                                            <img src="\${pic}" class="w-10 h-10 rounded-xl object-cover border border-zinc-700 shrink-0" referrerPolicy="no-referrer">
                                            <div class="min-w-0 flex-1 text-left">
                                                <span class="font-black text-xs text-white group-hover:text-yellow-400 block truncate transition">\${act.name}</span>
                                                <span class="text-[10px] text-zinc-400 block truncate">uloga: \${act.characterName || 'Nema'}</span>
                                            </div>
                                        </div>
                                    \`;
                                }).join('')}
                            </div>
                        </div>
                    \`;
                }

                // Movie Reviews
                const mReviews = entry.movieReviews || [];
                if (mReviews.length > 0) {
                    mainContent += \`
                        <div class="bg-zinc-950/80 p-5 rounded-2xl border border-zinc-850 space-y-3">
                            <span class="text-[10px] text-emerald-400 font-black tracking-widest uppercase block">⭐ RECENZIJE I OCJENE KRITIKE</span>
                            <div class="space-y-3">
                                \${mReviews.map(rev => {
                                    const pic = rev.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop';
                                    return \`
                                        <div class="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-2">
                                            <div class="flex items-center justify-between">
                                                <div class="flex items-center gap-2">
                                                    <img src="\${pic}" class="w-7 h-7 rounded-full object-cover border border-zinc-700" referrerPolicy="no-referrer">
                                                    <span class="font-bold text-zinc-200 text-xs">\${rev.voterName}</span>
                                                </div>
                                                <span class="text-yellow-400 text-xs font-mono font-black bg-yellow-400/10 border border-yellow-500/20 px-2.5 py-1 rounded-lg">★ \${rev.rating.toFixed(1)}</span>
                                            </div>
                                            <p class="text-zinc-300 text-xs italic bg-zinc-950 p-3 rounded-lg border border-zinc-850 leading-relaxed">"\${rev.reviewText}"</p>
                                        </div>
                                    \`;
                                }).join('')}
                            </div>
                        </div>
                    \`;
                }

            } else {
                mainContent = renderSeasonsGrid(entry);
            }

            container.innerHTML = headHtml + mainContent;
        }

        // Render Show Seasons & Episode Matrix
        function renderSeasonsGrid(show) {
            let htmlStr = '<div class="space-y-6">';
            if (!show.seasons || show.seasons.length === 0) {
                return '<p class="text-zinc-500 text-xs italic">Nema unesenih faza ili sezona.</p>';
            }

            htmlStr += \`<div class="flex items-center gap-2 text-zinc-400 text-xs font-bold pl-1">
                <span>💡 Kliknite na bilo koju epizodu za puni pregled, video najavu, uloge i recenzije!</span>
            </div>\`;

            show.seasons.forEach(season => {
                let episodeGridHtml = '';
                const seasonLabel = show.type === 'universe' ? (season.seasonName || \`Faza \${season.seasonNumber}\`) : (season.seasonName || \`Sezona \${season.seasonNumber}\`);
                
                season.episodes.forEach(ep => {
                    const colorCls = getRatingColorClass(ep.rating);
                    episodeGridHtml += \`<button 
                        onclick="showEpisodeDetails('\${show.id}', \${season.seasonNumber}, \${ep.episodeNumber})"
                        class="\${colorCls} w-11 h-11 rounded-xl font-black font-mono transition-transform hover:scale-105 active:scale-95 flex items-center justify-center text-sm shadow-md hover:shadow-xl cursor-pointer shrink-0"
                        title="Ep \${ep.episodeNumber}: \${ep.name} (\${ep.rating.toFixed(1)})"
                    >\${ep.rating.toFixed(1)}</button>\`;
                });

                htmlStr += \`<div class="bg-zinc-950/80 p-5 rounded-2xl border border-zinc-850 space-y-3.5 text-left">
                    <div class="flex items-center justify-between">
                        <h4 class="font-black text-xs sm:text-sm text-zinc-200 uppercase tracking-wider">\${seasonLabel}</h4>
                        <span class="text-[10px] uppercase font-mono font-bold text-zinc-400 bg-zinc-900 px-3 py-1 rounded-lg border border-zinc-800">\${season.episodes.length} Epizoda</span>
                    </div>
                    <div class="flex flex-wrap gap-2.5">
                        \${episodeGridHtml}
                    </div>
                </div>\`;
            });

            // Color Guide Bar
            htmlStr += \`<div class="border-t border-zinc-800 pt-5 mt-4">
                <p class="text-[10px] uppercase text-zinc-400 font-black tracking-widest mb-3">Vodič Ocjena i Boja:</p>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-zinc-300">
                    <div class="flex items-center gap-2"><span class="w-8 h-4 rounded rating-95"></span> <span>Cinema (9.5+)</span></div>
                    <div class="flex items-center gap-2"><span class="w-8 h-4 rounded rating-90"></span> <span>Sjajno (9.0+)</span></div>
                    <div class="flex items-center gap-2"><span class="w-8 h-4 rounded rating-80"></span> <span>Odlično (8.0+)</span></div>
                    <div class="flex items-center gap-2"><span class="w-8 h-4 rounded rating-70 text-zinc-950 text-[10px] font-black flex items-center justify-center">★</span> <span>Dobro (7.0+)</span></div>
                </div>
            </div>\`;

            htmlStr += '</div>';
            return htmlStr;
        }

        // POPUP MODAL LOGIC (EPISODES & MOVIES)
        let activePopupShowId = null;
        let activePopupSeasonNum = null;
        let activePopupEpNum = null;
        let activePopupTab = 'details';

        function showEpisodeDetails(showId, seasonNum, epNum) {
            activePopupShowId = showId;
            activePopupSeasonNum = seasonNum;
            activePopupEpNum = epNum;
            activePopupTab = 'details';

            const entry = DB_ENTRIES.find(item => item.id === showId);
            if (!entry) return;
            const season = entry.seasons.find(s => s.seasonNumber === seasonNum);
            if (!season) return;
            const ep = season.episodes.find(e => e.episodeNumber === epNum);
            if (!ep) return;

            const categoryLabel = entry.type === 'universe' ? 'Faza' : 'Sezona';
            const itemLabel = entry.type === 'universe' ? 'Stavka' : 'Epizoda';

            document.getElementById('popup-season-ep').textContent = categoryLabel + ' ' + seasonNum + ' — ' + itemLabel + ' ' + epNum;
            document.getElementById('popup-name').textContent = ep.name || ('Epizoda ' + epNum);
            document.getElementById('popup-meta-subtitle').textContent = entry.name + (ep.releaseYear ? ' (' + ep.releaseYear + ')' : '');
            
            const badge = document.getElementById('popup-rating');
            badge.textContent = '★ ' + ep.rating.toFixed(1);
            badge.className = 'px-4 py-2 rounded-2xl text-base font-black font-mono shadow-xl text-zinc-950 ' + getRatingColorClass(ep.rating);

            const imgElement = document.getElementById('popup-image');
            imgElement.src = ep.imageUrl || entry.bannerUrl || entry.posterUrl || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800';

            switchPopupTab('details');

            const popup = document.getElementById('popup-overlay');
            popup.classList.remove('hidden');
            popup.offsetHeight;
            popup.classList.add('opacity-100');
            popup.querySelector('.max-w-4xl').classList.remove('scale-95');
            popup.querySelector('.max-w-4xl').classList.add('scale-100');
        }

        function switchPopupTab(tabName) {
            activePopupTab = tabName;
            
            const tabs = ['details', 'video', 'actors', 'reviews'];
            tabs.forEach(t => {
                const btn = document.getElementById('popup-tab-' + t);
                if (btn) {
                    if (t === tabName) {
                        btn.className = 'flex-1 py-2 rounded-xl text-center bg-zinc-800 text-white font-black border border-zinc-700 transition cursor-pointer shadow';
                    } else {
                        btn.className = 'flex-1 py-2 rounded-xl text-center text-zinc-400 hover:text-zinc-200 transition cursor-pointer';
                    }
                }
            });

            const contentDiv = document.getElementById('popup-tab-content');
            contentDiv.innerHTML = '';

            const entry = DB_ENTRIES.find(item => item.id === activePopupShowId);
            if (!entry) return;
            const season = entry.seasons?.find(s => s.seasonNumber === activePopupSeasonNum);
            const ep = season?.episodes?.find(e => e.episodeNumber === activePopupEpNum);
            if (!ep) return;

            if (tabName === 'details') {
                let html = \`
                    <div class="space-y-4">
                        <div class="bg-zinc-950 p-5 border border-zinc-800 rounded-2xl space-y-2">
                            <span class="text-[10px] font-black text-yellow-400 uppercase tracking-wider block">Sinopsis &amp; Detalji Radnje</span>
                            <p class="text-zinc-200 leading-relaxed text-sm italic">"\${ep.overview || 'Nema unesenog opisa za ovu epizodu.'}"</p>
                        </div>
                \`;

                // Alternate Cut / Hyperlink navigation check
                if (ep.linkText && ep.linkTargetId) {
                    html += \`
                        <div onclick="navigateToEntry('\${ep.linkTargetId}')" class="bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-500/30 p-4 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition">
                            <div class="flex items-center gap-2 text-yellow-400 font-black text-xs uppercase">
                                🔗 Povezani Naslov ili Alternativna Verzija
                            </div>
                            <span class="text-xs text-white font-bold hover:underline">\${ep.linkText} ➔</span>
                        </div>
                    \`;
                }

                html += '</div>';
                contentDiv.innerHTML = html;

            } else if (tabName === 'video') {
                const yUrl = ep.youtubeUrl || ep.youtubeLink;
                const yEmbed = getYouTubeEmbedUrl(yUrl);

                if (yEmbed) {
                    contentDiv.innerHTML = \`
                        <div class="space-y-3">
                            <span class="text-xs font-black text-yellow-400 uppercase tracking-wider block">🎬 Zvanični YouTube Video Isječak / Trailer</span>
                            <div class="relative w-full aspect-video rounded-2xl overflow-hidden border border-zinc-800 bg-black shadow-2xl">
                                <iframe src="\${yEmbed}" class="absolute top-0 left-0 w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                            </div>
                        </div>
                    \`;
                } else if (yUrl) {
                    contentDiv.innerHTML = \`
                        <div class="p-8 bg-zinc-950 rounded-2xl border border-zinc-800 text-center space-y-4">
                            <span class="text-sm text-zinc-300 font-bold block">Priložen je video link:</span>
                            <a href="\${yUrl}" target="_blank" rel="noreferrer" class="inline-flex px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition">
                                ▶ Otvori na YouTube
                            </a>
                        </div>
                    \`;
                } else {
                    contentDiv.innerHTML = \`
                        <div class="py-12 text-center text-zinc-500 italic bg-zinc-950 rounded-2xl border border-zinc-850">
                            Nema priloženog video trailera ili isječka za ovu epizodu.
                        </div>
                    \`;
                }

            } else if (tabName === 'actors') {
                const actorList = ep.actors || [];
                if (actorList.length === 0) {
                    contentDiv.innerHTML = '<p class="text-zinc-500 italic text-center py-10">Nema unesenih glumaca za ovu epizodu.</p>';
                    return;
                }

                let html = '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left">';
                actorList.forEach(act => {
                    const pic = act.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop';
                    html += \`
                        <div onclick="showActorProfileBio('\${act.id}', activePopupShowId, activePopupSeasonNum, activePopupEpNum)" class="bg-zinc-950 hover:bg-zinc-850 p-3.5 rounded-2xl border border-zinc-800 flex items-center gap-3.5 transition cursor-pointer hover:border-yellow-400/40 group">
                            <img src="\${pic}" class="w-11 h-11 rounded-xl object-cover border border-zinc-700 shrink-0" referrerPolicy="no-referrer">
                            <div class="min-w-0 flex-1">
                                <span class="font-black text-xs text-white group-hover:text-yellow-400 block truncate transition">\${act.name}</span>
                                \${act.characterName ? \`<span class="text-[10px] text-zinc-400 block truncate">uloga: \${act.characterName}</span>\` : ''}
                            </div>
                        </div>
                    \`;
                });
                html += '</div>';
                contentDiv.innerHTML = html;

            } else if (tabName === 'reviews') {
                const reviewList = ep.guestReviews || [];
                if (reviewList.length === 0) {
                    contentDiv.innerHTML = '<p class="text-zinc-500 italic text-center py-10">Nema unesenih gostujućih ocjena za ovu epizodu.</p>';
                    return;
                }

                let html = '<div class="space-y-3">';
                reviewList.forEach(rev => {
                    const avatar = rev.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop';
                    html += \`
                        <div class="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2.5">
                                    <img src="\${avatar}" class="w-8 h-8 rounded-full object-cover border border-zinc-700" referrerPolicy="no-referrer">
                                    <div>
                                        <span class="font-black text-zinc-200 text-xs block">\${rev.voterName}</span>
                                        <span class="text-[9px] text-zinc-500 font-mono uppercase">Recenzija</span>
                                    </div>
                                </div>
                                <span class="bg-yellow-400/10 border border-yellow-500/20 text-yellow-400 text-xs font-mono font-black px-3 py-1 rounded-xl">
                                    ★ \${rev.rating.toFixed(1)}
                                </span>
                            </div>
                            <p class="text-zinc-300 text-xs leading-relaxed italic bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">"\${rev.reviewText}"</p>
                        </div>
                    \`;
                });
                html += '</div>';
                contentDiv.innerHTML = html;
            }
        }

        // POPUP ACTOR BIO
        function showActorProfileBio(actorId, showId, seasonNum, epNum) {
            let actor = null;
            const entry = DB_ENTRIES.find(item => item.id === showId);
            
            if (entry) {
                if (seasonNum !== 'null' && epNum !== 'null' && seasonNum !== null && epNum !== null) {
                    const season = entry.seasons?.find(s => s.seasonNumber === parseInt(seasonNum));
                    const ep = season?.episodes?.find(e => e.episodeNumber === parseInt(epNum));
                    actor = ep?.actors?.find(a => a.id === actorId);
                } else if (entry.movieActors) {
                    actor = entry.movieActors.find(a => a.id === actorId);
                }
            }

            if (!actor) {
                // Global search across all entries
                DB_ENTRIES.forEach(e => {
                    if (e.movieActors) {
                        const found = e.movieActors.find(a => a.id === actorId || a.name.toLowerCase() === actorId.toLowerCase());
                        if (found) actor = found;
                    }
                    if (e.seasons) {
                        e.seasons.forEach(s => {
                            (s.episodes || []).forEach(ep => {
                                const found = (ep.actors || []).find(a => a.id === actorId || a.name.toLowerCase() === actorId.toLowerCase());
                                if (found) actor = found;
                            });
                        });
                    }
                });
            }

            if (!actor) return;

            // Check if global enriched profile exists
            const enrichedProfile = DB_ACTOR_PROFILES[actor.name.trim()];

            document.getElementById('actor-detail-name').textContent = actor.name;
            const charEl = document.getElementById('actor-detail-char');
            if (actor.characterName) {
                charEl.style.display = 'block';
                charEl.textContent = 'Uloga: ' + actor.characterName;
            } else {
                charEl.style.display = 'none';
            }

            const awards = enrichedProfile?.awards || actor.otherInfo || 'Nema unesenih posebnih priznanja.';
            const bio = enrichedProfile?.bio || actor.bio || (actor.name + ' je registrovani i ocijenjeni glumački umjetnik na ovom projektu.');

            document.getElementById('actor-detail-awards').textContent = awards;
            document.getElementById('actor-detail-bio').textContent = bio;
            document.getElementById('actor-detail-photo').src = enrichedProfile?.photoUrl || actor.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop';

            const appListDiv = document.getElementById('actor-appearances-list');
            appListDiv.innerHTML = '';

            const apps = getActorAppearancesList(actor.name);
            if (apps.length === 0) {
                appListDiv.innerHTML = '<p class="text-xs text-zinc-500 italic py-2">Nema drugih uloga u ovom katalogu.</p>';
            } else {
                apps.forEach(app => {
                    const div = document.createElement('div');
                    div.className = 'flex gap-3 py-2.5 items-center justify-between group transition cursor-pointer hover:bg-zinc-900 rounded-xl px-2';
                    div.onclick = () => {
                        navigateToEntry(app.entryId, app.seasonNumber, app.episodeNumber);
                    };

                    const seasonEpLabel = app.seasonNumber && app.episodeNumber 
                        ? 'Sezona ' + app.seasonNumber + ', Ep ' + app.episodeNumber + ' - "' + app.episodeName + '"'
                        : 'Film';

                    div.innerHTML = \`
                        <div class="flex gap-2.5 items-center min-w-0">
                            <img src="\${app.posterUrl}" class="w-7 h-9 object-cover rounded-lg border border-zinc-700 shrink-0" referrerPolicy="no-referrer">
                            <div class="min-w-0">
                                <p class="text-xs font-black text-white truncate group-hover:text-yellow-400 transition">\${app.entryName}</p>
                                <p class="text-[10px] text-zinc-400 truncate">\${seasonEpLabel}</p>
                                \${app.characterName ? \`<p class="text-[10px] text-yellow-400/80 truncate">uloga: \${app.characterName}</p>\` : ''}
                            </div>
                        </div>
                        <span class="text-zinc-500 group-hover:text-yellow-400 shrink-0 text-xs">➔</span>
                    \`;
                    appListDiv.appendChild(div);
                });
            }

            const actorOverlay = document.getElementById('actor-overlay');
            actorOverlay.classList.remove('hidden');
            actorOverlay.offsetHeight;
            actorOverlay.classList.add('opacity-100');
            actorOverlay.querySelector('.max-w-lg').classList.remove('scale-95');
            actorOverlay.querySelector('.max-w-lg').classList.add('scale-100');
        }

        function getActorAppearancesList(actorName) {
            if (!actorName) return [];
            const searchName = actorName.toLowerCase().trim();
            const list = [];

            DB_ENTRIES.forEach(entry => {
                if (entry.movieActors) {
                    entry.movieActors.forEach(act => {
                        if (act && act.name && act.name.toLowerCase().trim() === searchName) {
                            list.push({
                                entryId: entry.id,
                                entryName: entry.name,
                                type: entry.type,
                                posterUrl: entry.posterUrl,
                                characterName: act.characterName
                            });
                        }
                    });
                }
                if (entry.seasons) {
                    entry.seasons.forEach(season => {
                        if (season.episodes) {
                            season.episodes.forEach(ep => {
                                if (ep.actors) {
                                    ep.actors.forEach(act => {
                                        if (act && act.name && act.name.toLowerCase().trim() === searchName) {
                                            list.push({
                                                entryId: entry.id,
                                                entryName: entry.name,
                                                type: entry.type,
                                                posterUrl: entry.posterUrl,
                                                characterName: act.characterName,
                                                seasonNumber: season.seasonNumber,
                                                seasonName: season.seasonName,
                                                episodeNumber: ep.episodeNumber,
                                                episodeName: ep.name
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
            return list;
        }

        // VIEW 2: Render Projects / Playlists in exported HTML
        function renderProjectsView() {
            const container = document.getElementById('projects-grid-container');
            const totalBadge = document.getElementById('projects-total-label');
            container.innerHTML = '';

            totalBadge.textContent = 'Ukupno Baza: ' + DB_PROJECTS.length;

            if (DB_PROJECTS.length === 0) {
                container.innerHTML = \`
                    <div class="col-span-full py-16 text-center text-zinc-500 italic bg-zinc-900/40 rounded-3xl border border-zinc-800">
                        Nema sačuvanih prilagođenih projekata ili baza.
                    </div>
                \`;
                return;
            }

            DB_PROJECTS.forEach(project => {
                const card = document.createElement('div');
                card.className = 'bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-4 text-left hover:border-yellow-500/40 transition shadow-xl flex flex-col';

                const items = project.items || [];
                const color = project.color || '#eab308';

                let itemsListHtml = '';
                if (items.length === 0) {
                    itemsListHtml = '<p class="text-zinc-600 text-xs italic py-4">Baza je prazna.</p>';
                } else {
                    itemsListHtml = '<div class="space-y-2 max-h-56 overflow-y-auto pr-1">';
                    items.forEach(it => {
                        itemsListHtml += \`
                            <div onclick="navigateToEntry('\${it.entryId}')" class="flex items-center justify-between gap-3 p-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-850 cursor-pointer transition group">
                                <div class="flex items-center gap-2.5 min-w-0">
                                    <img src="\${it.posterUrl || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800'}" class="w-7 h-10 object-cover rounded-lg border border-zinc-700 shrink-0" referrerPolicy="no-referrer">
                                    <div class="min-w-0">
                                        <h5 class="font-bold text-white text-xs truncate group-hover:text-yellow-400 transition">\${it.entryName}</h5>
                                        <span class="text-[10px] text-zinc-400">\${it.type === 'show' ? '📺 Serija' : '🎬 Film'} • \${it.year || ''}</span>
                                    </div>
                                </div>
                                <span class="text-xs font-mono font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-lg shrink-0">★ \${(it.rating || 8.0).toFixed(1)}</span>
                            </div>
                        \`;
                    });
                    itemsListHtml += '</div>';
                }

                card.innerHTML = \`
                    <div class="flex items-start justify-between gap-3 border-b border-zinc-800 pb-3">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-2xl flex items-center justify-center text-zinc-950 font-black text-sm shrink-0 shadow-lg" style="background-color: \${color}">
                                📂
                            </div>
                            <div>
                                <h4 class="font-black text-base text-white truncate">\${project.name}</h4>
                                <span class="text-[10px] text-zinc-400 font-mono">\${items.length} stavki u bazi</span>
                            </div>
                        </div>
                    </div>
                    <p class="text-xs text-zinc-400 line-clamp-2 italic">"\${project.description || 'Prilagođena baza filmova i serija.'}"</p>
                    <div class="flex-1">
                        \${itemsListHtml}
                    </div>
                \`;
                container.appendChild(card);
            });
        }

        // VIEW 3: Render Actors in exported HTML
        function renderActorsView() {
            const container = document.getElementById('actors-grid-container');
            const searchVal = (document.getElementById('actors-search-input')?.value || '').toLowerCase().trim();
            container.innerHTML = '';

            // Aggregate all actors
            const actorMap = new Map();
            DB_ENTRIES.forEach(entry => {
                if (entry.movieActors) {
                    entry.movieActors.forEach(act => {
                        if (act && act.name && !actorMap.has(act.name.toLowerCase().trim())) {
                            actorMap.set(act.name.toLowerCase().trim(), { ...act, sampleEntryId: entry.id });
                        }
                    });
                }
                if (entry.seasons) {
                    entry.seasons.forEach(s => {
                        (s.episodes || []).forEach(ep => {
                            (ep.actors || []).forEach(act => {
                                if (act && act.name && !actorMap.has(act.name.toLowerCase().trim())) {
                                    actorMap.set(act.name.toLowerCase().trim(), { ...act, sampleEntryId: entry.id });
                                }
                            });
                        });
                    });
                }
            });

            let actorsList = Array.from(actorMap.values());
            if (searchVal) {
                actorsList = actorsList.filter(a => a.name.toLowerCase().includes(searchVal) || (a.characterName || '').toLowerCase().includes(searchVal));
            }

            if (actorsList.length === 0) {
                container.innerHTML = '<p class="col-span-full py-16 text-center text-zinc-500 italic">Nema pronađenih glumaca.</p>';
                return;
            }

            actorsList.forEach(act => {
                const enriched = DB_ACTOR_PROFILES[act.name.trim()];
                const photo = enriched?.photoUrl || act.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop';
                const appsCount = getActorAppearancesList(act.name).length;

                const card = document.createElement('div');
                card.className = 'bg-zinc-900 border border-zinc-800 hover:border-yellow-500/40 rounded-2xl p-4 flex items-center gap-3.5 cursor-pointer transition group shadow-lg';
                card.onclick = () => {
                    showActorProfileBio(act.id || act.name, act.sampleEntryId, 'null', 'null');
                };

                card.innerHTML = \`
                    <img src="\${photo}" class="w-14 h-14 rounded-2xl object-cover border border-zinc-700 shrink-0 group-hover:scale-105 transition duration-300" referrerPolicy="no-referrer">
                    <div class="min-w-0 flex-1 text-left">
                        <h4 class="font-black text-sm text-white group-hover:text-yellow-400 truncate transition">\${act.name}</h4>
                        \${act.characterName ? \`<p class="text-[11px] text-zinc-400 truncate">uloga: \${act.characterName}</p>\` : ''}
                        <span class="text-[10px] text-yellow-500/80 font-mono font-bold block mt-1">\${appsCount} nastupa u bazi</span>
                    </div>
                \`;
                container.appendChild(card);
            });
        }

        function closeActorPopup() {
            const actorOverlay = document.getElementById('actor-overlay');
            actorOverlay.classList.remove('opacity-100');
            actorOverlay.querySelector('.max-w-lg')?.classList.add('scale-95');
            actorOverlay.querySelector('.max-w-lg')?.classList.remove('scale-100');
            setTimeout(() => {
                actorOverlay.classList.add('hidden');
            }, 250);
        }

        function closeDetailsPopup() {
            const popup = document.getElementById('popup-overlay');
            popup.classList.remove('opacity-100');
            popup.querySelector('.max-w-4xl')?.classList.add('scale-95');
            popup.querySelector('.max-w-4xl')?.classList.remove('scale-100');
            setTimeout(() => {
                popup.classList.add('hidden');
            }, 250);
        }

        function navigateToEntry(entryId, seasonNum = null, epNum = null) {
            switchMainView('catalog');
            activeId = entryId;
            renderSidebar();
            renderActiveSlate();
            
            closeActorPopup();
            closeDetailsPopup();
            
            if (seasonNum !== null && epNum !== null && seasonNum !== 'null' && epNum !== 'null') {
                setTimeout(() => {
                    showEpisodeDetails(entryId, parseInt(seasonNum), parseInt(epNum));
                }, 150);
            }
        }

        function handleSearchFilterChange() {
            renderSidebar();
        }

        function renderEmptySlate() {
            document.getElementById('dashboard-slate').innerHTML = \`
                <div class="flex flex-col items-center justify-center h-full text-zinc-500 p-8 text-center space-y-2">
                    <p class="font-black text-sm uppercase text-zinc-400">Cinema Grafik</p>
                    <p class="text-xs">Izaberite naslov iz biblioteke za detaljan pregled.</p>
                </div>
            \`;
        }

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeActorPopup();
                closeDetailsPopup();
            }
        });

        // Initialize App
        document.getElementById('total-count-badge').textContent = DB_ENTRIES.length;
        document.getElementById('projects-count-badge').textContent = DB_PROJECTS.length + ' Baza';
        
        // Count total unique actors
        const uniqueActors = new Set();
        DB_ENTRIES.forEach(e => {
            (e.movieActors || []).forEach(a => uniqueActors.add(a.name));
            (e.seasons || []).forEach(s => (s.episodes || []).forEach(ep => (ep.actors || []).forEach(a => uniqueActors.add(a.name))));
        });
        document.getElementById('total-actors-badge').textContent = uniqueActors.size;

        if (DB_ENTRIES.length > 0) {
            renderSidebar();
            renderActiveSlate();
        } else {
            renderEmptySlate();
        }
    </script>
</body>
</html>`;
  };

  const handleGenerateAndDownloadSingleHTML = () => {
    const htmlContent = generateStandaloneHTML();
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cinema-grafik-katalog.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyStandaloneHTMLToClipboard = () => {
    try {
      const htmlContent = generateStandaloneHTML();
      navigator.clipboard.writeText(htmlContent);
      setCopiedTextId('standalone-html-copy');
      setTimeout(() => {
        setCopiedTextId(null);
      }, 2500);
    } catch (e) {
      console.error('Došlo je do greške prilikom kopiranja HTML-a:', e);
    }
  };



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-955/85 backdrop-blur-md animate-none" id="export-modal-overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 15 }}
        className="relative w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        id="export-modal-panel"
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-950/65">
          <div className="flex items-center gap-2">
            <Download className="text-yellow-450" size={18} />
            <div className="text-left">
              <h2 className="font-extrabold text-base uppercase tracking-wider text-zinc-100 font-sans">
                Cinema Grafik — Izvoz i Portovanje
              </h2>
              <p className="text-zinc-500 text-xs mt-0.5">Izvezite vaše podatke ili kompajlirajte aplikaciju za PC i Android uređaje</p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="btn-close-export-modal"
            className="text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab buttons bar */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/40 p-1.5 gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('web-html')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'web-html'
                ? 'bg-zinc-800 text-white shadow font-black border border-zinc-700'
                : 'text-zinc-550 hover:text-zinc-300 bg-transparent font-bold'
            }`}
          >
            <Globe size={14} /> Samostalni HTML
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('json-backup');
              setImportStatus('idle');
              setImportMessage('');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'json-backup'
                ? 'bg-zinc-800 text-white shadow font-black border border-zinc-700'
                : 'text-zinc-550 hover:text-zinc-300 bg-transparent font-bold'
            }`}
          >
            <Database size={14} /> JSON Prenos (Backup)
          </button>
        </div>

        {/* Content panel */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-zinc-350">
          
          {/* OFFLINE HTML WEB APP */}
          {activeTab === 'web-html' && (
            <div className="space-y-4">
              <div className="space-y-1.5 text-left">
                <h3 className="font-extrabold text-zinc-100 flex items-center gap-1.5 text-sm uppercase font-sans">
                  <Globe size={16} className="text-yellow-450" />
                  Interaktivna, prenosiva Web Aplikacija
                </h3>
                <p className="text-zinc-400 leading-relaxed text-xs font-sans">
                  Preuzmite kompletnu bazu podataka spakovanu u samo jedan samostalni i prenosivi super <code className="font-mono text-yellow-300/90 text-[11px] bg-yellow-500/10 px-1.5 py-0.5 rounded font-bold">.html</code> fajl. 
                  Sadrži sve vaše izmjene, ocjene, režisere, slike, ocjene kritike i kompletne biografije i glumačke postave sa pretragom. Možete ga otvoriti na računaru, poslati prijateljima ili koristiti potpuno offline na telefonu!
                </p>
              </div>

              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 flex items-center justify-between">
                <div className="text-left font-sans">
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Integrisana Statistika</p>
                  <p className="text-[11px] text-zinc-400 mt-1">{entries.length} naslova / projekata će biti upisano u fajl katalog.</p>
                </div>
                <div className="flex items-center gap-1 bg-yellow-400/10 border border-yellow-500/20 px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold tracking-wider text-yellow-500 font-sans">
                  <CheckCircle2 size={12} /> Spreman za preuzimanje
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCopyStandaloneHTMLToClipboard}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-extrabold text-xs text-zinc-300 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 transition-all font-sans cursor-pointer uppercase shadow-lg"
                >
                  {copiedTextId === 'standalone-html-copy' ? (
                    <>
                      <Check size={14} className="text-emerald-450 animate-pulse" />
                      <span className="text-emerald-450 font-sans">Kopirano!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Kopiraj HTML Kod (Tauri / Mobilni)
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleGenerateAndDownloadSingleHTML}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-extrabold text-xs text-zinc-950 bg-yellow-400 hover:bg-yellow-300 transition-all font-sans cursor-pointer uppercase shadow-lg shadow-yellow-500/15"
                >
                  <Download size={14} /> Preuzmi HTML Katalog (.html)
                </button>
              </div>
            </div>
          )}



          {/* JSON BACKUP / RESTORE */}
          {activeTab === 'json-backup' && (
            <div className="space-y-6">
              <div className="space-y-1.5 text-left font-sans">
                <h3 className="font-extrabold text-zinc-100 flex items-center gap-1.5 text-sm uppercase">
                  <Database size={16} className="text-yellow-450 animate-pulse" />
                  Uvoz i Izvoz JSON Baze Podataka
                </h3>
                <p className="text-zinc-400 leading-relaxed text-xs">
                  Spremite cijelu bazu projekata, recenzija i glumaca lokalno kao kompaktan <code className="font-mono text-yellow-300 font-bold bg-zinc-950 px-1 py-0.5 rounded">.json</code> fajl. 
                  Možete ga poslati sebi ili drugima i učitati ga na bilo kojem drugom računaru ili mobilnom telefonu sa jednim klikom kako biste imali sinkronizirane liste svugdje.
                </p>
              </div>

              {/* TWO SIDES GRID - EXPORT & IMPORT */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left font-sans">
                {/* FORCE MANUAL SAVE TO BROWSER */}
                <div className="md:col-span-2 p-5 rounded-2xl bg-zinc-950 border border-emerald-500/20 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-left">
                    <h4 className="font-extrabold text-sm text-zinc-100 uppercase tracking-wide flex items-center gap-2">
                      <span className="p-1 rounded bg-emerald-500/15 text-emerald-400">
                        <Database size={14} />
                      </span>
                      Sigurnosno Ručno Spašavanje (Backup Save)
                    </h4>
                    <p className="text-zinc-400 leading-relaxed text-xs max-w-xl">
                      Ako želite biti 100% sigurni da su sve izmjene (opisi, slike, linkovi) trajno pohranjene u memoriju Vašeg trenutnog preglednika, pritisnite ovo dugme.
                    </p>
                  </div>
                  <button
                    onClick={handleLocalForceSave}
                    className={`w-full md:w-auto flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-extrabold text-xs uppercase transition-all cursor-pointer shadow-lg active:scale-[0.98] duration-150 shrink-0 ${
                      isSavedManually 
                        ? 'bg-emerald-500 text-zinc-950 shadow-emerald-500/20' 
                        : 'bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/35'
                    }`}
                  >
                    {isSavedManually ? (
                      <>
                        <Check size={14} strokeWidth={3} /> Uspješno Spremljeno!
                      </>
                    ) : (
                      <>
                        <Save size={14} /> Spasi u Lokalni Browser
                      </>
                    )}
                  </button>
                </div>

                {/* EXPORT PANEL */}
                <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-850 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="py-1 px-2.5 rounded-lg bg-yellow-400/10 text-yellow-500 text-xs font-black">
                        1
                      </div>
                      <h4 className="font-extrabold text-sm text-zinc-100 uppercase tracking-wide">Preuzmi / Izvezi bazu</h4>
                    </div>
                    <p className="text-zinc-400 leading-relaxed text-xs">
                      Preuzmite trenutno stanje aplikacije sa svim postavkama, ocjenama i detaljima. Vaš fajl će sadržavati ukupno <strong className="text-white bg-zinc-850 px-1.5 py-0.5 rounded border border-zinc-800">{entries.length}</strong> projekata.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleJSONExport}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-extrabold text-xs text-zinc-950 bg-yellow-400 hover:bg-yellow-300 transition-all cursor-pointer uppercase shadow-lg shadow-yellow-500/10 active:scale-[0.98] duration-150"
                    >
                      <Download size={14} /> Preuzmi .json fajl
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyJSONToClipboard}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs text-zinc-300 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 transition-all cursor-pointer uppercase"
                    >
                      {copiedTextId === 'json-backup-copy' ? (
                        <>
                          <Check size={12} className="text-emerald-450 animate-pulse" />
                          <span className="text-emerald-450 font-sans">Kopirano u Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} /> Kopiraj JSON bazu
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* IMPORT PANEL */}
                <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-850 flex flex-col space-y-4 justify-between">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="py-1 px-2.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-xs font-black">
                          2
                        </div>
                        <h4 className="font-extrabold text-sm text-zinc-100 uppercase tracking-wide font-sans">Uvezi / Učitaj bazu</h4>
                      </div>
                      <p className="text-zinc-400 leading-relaxed text-xs font-sans">
                        Odaberite režim uvoza u zavisnosti od toga da li želite trajno zamijeniti bazu ili je spojiti.
                      </p>
                    </div>

                    {/* Mode selectors */}
                    <div className="flex bg-zinc-900 p-1 gap-1 rounded-xl border border-zinc-850">
                      <button
                        type="button"
                        onClick={() => {
                          setImportMode('merge');
                          setImportStatus('idle');
                        }}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          importMode === 'merge'
                            ? 'bg-zinc-800 text-emerald-450 border border-zinc-700 font-black'
                            : 'text-zinc-500 hover:text-zinc-400 bg-transparent'
                        }`}
                      >
                        <ArrowRightLeft size={10} /> Spoji podatke
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setImportMode('replace');
                          setImportStatus('idle');
                        }}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          importMode === 'replace'
                            ? 'bg-red-500/10 text-red-500 border border-red-500/20 font-black'
                            : 'text-zinc-500 hover:text-zinc-400 bg-transparent'
                        }`}
                      >
                        <AlertTriangle size={10} /> Zamijeni sve
                      </button>
                    </div>

                    {/* Drag-drop zone */}
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-all flex flex-col items-center justify-center space-y-2 cursor-pointer ${
                        dragActive
                          ? 'border-yellow-450 bg-yellow-450/5'
                          : 'border-zinc-800 hover:border-zinc-750 bg-zinc-900/40'
                      }`}
                    >
                      <Upload size={20} className={dragActive ? 'text-yellow-400 animate-bounce' : 'text-zinc-500'} />
                      <div className="space-y-1">
                        <p className="text-[11px] text-zinc-300 font-extrabold">
                          Dovucite .json fajl ovdje ili
                        </p>
                        <label className="text-[10px] text-yellow-400 hover:text-yellow-300 underline font-black cursor-pointer inline-block">
                          Pretražite fajl
                          <input
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={handleFileUpload}
                          />
                        </label>
                      </div>
                      <p className="text-[8px] text-zinc-500 lowercase tracking-wider font-sans">Prihvata isključivo validne Cinema Grafik JSON fajlove</p>
                    </div>

                    {/* Alternativni uvoz preko polja */}
                    <div className="space-y-2 pt-3 border-t border-zinc-900">
                      <span className="block text-[9px] uppercase font-black text-zinc-500 tracking-wider">
                        Tauri / Mobilni alternativni uvoz (Paste)
                      </span>
                      <textarea
                        placeholder="Zalijepite kopiran JSON te pritisnite dugme ispod..."
                        value={pastedJSON}
                        onChange={(e) => setPastedJSON(e.target.value)}
                        rows={2}
                        className="w-full bg-zinc-950 p-2.5 text-[11px] font-mono rounded-xl border border-zinc-850 text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20"
                      />
                      <button
                        type="button"
                        onClick={handleImportPastedJSON}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-extrabold text-[10px] uppercase text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/25 transition-all cursor-pointer"
                      >
                        <Check size={11} strokeWidth={3} /> Učitaj iz zalijepljenog teksta
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Alert feedback */}
              {importStatus !== 'idle' && (
                <div
                  className={`p-4 rounded-xl border flex gap-3 text-xs items-start font-sans transition-all animate-fade-in ${
                    importStatus === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-red-500/10 border-red-500/30 text-red-400'
                  }`}
                >
                  <div className="p-1 shrink-0">
                    {importStatus === 'success' ? (
                      <CheckCircle2 size={16} className="text-emerald-400 animate-bounce" />
                    ) : (
                      <AlertTriangle size={16} className="text-red-450" />
                    )}
                  </div>
                  <div className="space-y-1 text-left">
                    <p className="font-extrabold uppercase tracking-wider text-[10px]">
                      {importStatus === 'success' ? 'Izvršeno uspješno!' : 'Greška prilikom uvoza'}
                    </p>
                    <p className="leading-relaxed opacity-90">{importMessage}</p>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal footer wrapper */}
        <div className="p-4 bg-zinc-955 border-t border-zinc-805 text-center shrink-0">
          <p className="text-[10px] text-zinc-550 font-bold tracking-widest uppercase font-sans">
            Cinema Grafik • Samostalnost i Prenosivost
          </p>
        </div>

      </motion.div>
    </div>
  );
}
