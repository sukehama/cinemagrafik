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

  const validateAndImportJSON = (fileText: string) => {
    try {
      const parsed = JSON.parse(fileText);
      if (!Array.isArray(parsed)) {
        throw new Error('Uvezeni dokument mora biti JSON niz (array) stavki.');
      }
      
      const isValid = parsed.every((item: any) => {
        return typeof item === 'object' && item !== null && typeof item.id === 'string' && typeof item.name === 'string';
      });

      if (!isValid && parsed.length > 0) {
        throw new Error('Neki od elemenata nemaju ispravan format (nedostaje jedinstveni ID ili Naziv).');
      }

      if (onImportJSON) {
        let finalEntries: RatingEntry[] = [];
        if (importMode === 'replace') {
          finalEntries = parsed as RatingEntry[];
        } else {
          // Merge strategy: update existing, add new ones
          const mergedMap = new Map<string, RatingEntry>();
          entries.forEach(e => mergedMap.set(e.id, e));
          (parsed as RatingEntry[]).forEach(e => mergedMap.set(e.id, e));
          finalEntries = Array.from(mergedMap.values());
        }

        onImportJSON(finalEntries);
        setImportStatus('success');
        setImportMessage(`Uspješno uvezeno i sinhronizovano ${parsed.length} stavki u bazu podataka! ${importMode === 'replace' ? 'Svi prethodni podaci su zamijenjeni.' : 'Novi i postojeći podaci su spojeni.'}`);
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
      const dataStr = JSON.stringify(entries, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const timestamp = new Date().toISOString().split('T')[0];
      const exportFileDefaultName = `cinemagrafik-baza-${timestamp}.json`;
      
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
      navigator.clipboard.writeText(JSON.stringify(entries, null, 2));
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

  // Generate a standalone interactive raw HTML file that embeds user's current exact rating state
  const generateStandaloneHTML = () => {
    const serializedData = JSON.stringify(entries, null, 2);

    return `<!DOCTYPE html>
<html lang="bs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cinema Grafik — Ahmed (Offline Katalog)</title>
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
        body { background-color: #08080c; color: #f4f4f5; font-family: system-ui, -apple-system, sans-serif; }
        .rating-95 { background: linear-gradient(135deg, #0284c7, #0369a1); color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.4); }
        .rating-90 { background: linear-gradient(135deg, #059669, #047857); color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.4); }
        .rating-80 { background: linear-gradient(135deg, #10b981, #059669); color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.4); }
        .rating-70 { background: linear-gradient(135deg, #eab308, #ca8a04); color: #000; font-weight: 850; }
        .rating-60 { background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; }
        .rating-40 { background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; }
        .rating-0  { background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #fff; }
        
        ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
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

        /* Glatke tranzicije i animacije */
        .transition-all {
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .animate-fade-in-up {
            animation: fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(8px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .popup-animate {
            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
        }
    </style>
</head>
<body class="p-4 sm:p-8 md:p-12 font-sans selection:bg-yellow-500/30 min-h-screen bg-zinc-950">

    <div class="max-w-6xl mx-auto space-y-8">
        <!-- Brand Header bar -->
        <header class="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-zinc-900 pb-6 gap-4">
            <div>
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-[9px] font-black uppercase tracking-wider mb-2 font-sans">
                    ★ INTERAKTIVNI OFFLINE KATALOG I BIOGRAFIJE
                </span>
                <div class="flex items-center gap-2">
                    <span class="bg-yellow-450 text-zinc-950 font-black px-2 py-0.5 rounded text-xs uppercase font-sans">IMDb</span>
                    <h1 class="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight font-sans">Cinema Grafik</h1>
                </div>
                <p class="text-zinc-500 text-xs sm:text-sm mt-1 mb-0 pb-0">
                    Made by Ahmed • Interaktivni katalog ocjena, epizoda, glumaca i statistike
                </p>
            </div>
            <div class="bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-2xl flex items-center gap-3 shrink-0">
                <span class="text-3xl font-bold font-mono text-yellow-550" id="total-count-badge">0</span>
                <div class="text-xs text-left font-sans">
                    <p class="text-zinc-100 font-extrabold">Ocijenjeno projekata</p>
                    <p class="text-zinc-550 text-[10px]">Pristup bazi kompletan</p>
                </div>
            </div>
        </header>

        <!-- Filters + Search bar -->
        <section class="bg-zinc-90 w-full p-4 rounded-2xl border border-zinc-900 bg-zinc-900/40 flex flex-col md:flex-row gap-4 items-stretch md:items-center">
            <div class="relative flex-1">
                <input 
                    type="text" 
                    id="html-search-input" 
                    placeholder="Pretražite naslove, opise, glumce ili uloge..." 
                    oninput="handleSearchFilterChange()"
                    class="w-full bg-zinc-950 border border-zinc-850 text-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-yellow-500 pl-10"
                />
                <span class="absolute left-3.5 top-2.5 text-zinc-550 font-mono">&#128269;</span>
            </div>
            <div class="flex items-center gap-2">
                <select 
                    id="html-filter-type" 
                    onchange="handleSearchFilterChange()"
                    class="bg-zinc-950 border border-zinc-850 text-zinc-300 text-xs font-bold rounded-xl px-3 py-2 uppercase tracking-wide cursor-pointer outline-none focus:border-yellow-500 font-sans"
                >
                    <option value="all">🍿 Svi Formati</option>
                    <option value="show">📺 Serije</option>
                    <option value="movie">🎬 Filmovi</option>
                </select>
            </div>
        </section>

        <!-- Main Workspace split -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            <div class="lg:col-span-4 space-y-4">
                <div class="flex items-center justify-between border-b border-zinc-900 pb-2 font-sans">
                    <p class="text-[10px] uppercase font-black text-zinc-500 tracking-wider">Biblioteka katalog</p>
                    <span id="filtered-count" class="text-[10px] text-zinc-650 font-mono font-bold"></span>
                </div>
                <div class="space-y-2 max-h-[500px] overflow-y-auto pr-1" id="sidebar-titles">
                    <!-- Dynamic titles injected here -->
                </div>
            </div>

            <div class="lg:col-span-8 space-y-6">
                <div class="bg-zinc-900/40 border border-zinc-900 p-6 rounded-3xl space-y-6 min-h-[460px] text-left" id="dashboard-slate">
                    <!-- Slate presentation layer -->
                </div>
            </div>

        </div>
    </div>

    <!-- Episode Detail Popup Overlay -->
    <div id="popup-overlay" class="fixed inset-0 bg-black/90 backdrop-blur-md z-40 flex items-center justify-center p-4 hidden opacity-0 transition-opacity duration-300" onclick="closeDetailsPopup()">
        <div class="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col popup-animate transform scale-95" onclick="event.stopPropagation()">
            <!-- Header bar with image -->
            <div id="popup-img-container" class="h-44 bg-zinc-955 relative overflow-hidden flex items-end shrink-0">
                <img id="popup-image" src="" class="w-full h-full object-cover opacity-40 absolute inset-0" />
                <div class="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
                <button onclick="closeDetailsPopup()" class="absolute top-4 right-4 bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white p-2 rounded-full transition-colors cursor-pointer text-xs z-30">✕</button>
                <div class="p-6 relative z-10 flex flex-col items-start w-full justify-end text-left">
                    <span id="popup-season-ep" class="text-[8px] font-mono uppercase text-yellow-500 font-black bg-yellow-500/15 text-yellow-400 px-1.5 py-0.5 rounded border border-yellow-500/25"></span>
                    <h3 id="popup-name" class="text-base sm:text-lg font-black text-white mt-1"></h3>
                </div>
            </div>
            
            <!-- Tab switches inside modal -->
            <div class="flex border-b border-zinc-850 bg-zinc-950 p-1 shrink-0 gap-1 text-[10px] uppercase font-black tracking-wider">
                <button id="popup-tab-details" onclick="switchPopupTab('details')" class="flex-1 py-1.5 rounded-lg text-center bg-zinc-850 text-white font-black">📝 Pregled</button>
                <button id="popup-tab-actors" onclick="switchPopupTab('actors')" class="flex-1 py-1.5 rounded-lg text-center text-zinc-400 hover:text-zinc-200">👥 Glumci</button>
                <button id="popup-tab-reviews" onclick="switchPopupTab('reviews')" class="flex-1 py-1.5 rounded-lg text-center text-zinc-400 hover:text-zinc-200">⭐ Recenzije</button>
            </div>

            <!-- Content Area (Scrollable) -->
            <div class="p-5 overflow-y-auto flex-1 space-y-4 text-xs" id="popup-tab-content">
                <!-- Dynamic Content injected here -->
            </div>
            
            <!-- Rating Badge Floating right -->
            <div class="absolute top-32 right-6 z-20">
                <span id="popup-rating" class="px-3 py-1 text-zinc-950 rounded-lg text-xs font-black font-mono shadow-md"></span>
            </div>
        </div>
    </div>

    <!-- Actor Bio Overlay -->
    <div id="actor-overlay" class="fixed inset-0 bg-black/92 backdrop-blur-md z-50 flex items-center justify-center p-4 hidden opacity-0 transition-opacity duration-300" onclick="closeActorPopup()">
        <div class="bg-zinc-900 border border-zinc-808 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative max-h-[85vh] flex flex-col p-5 popup-animate transform scale-95" onclick="event.stopPropagation()">
            <div class="flex justify-between items-start border-b border-zinc-800 pb-3 mb-4 shrink-0 text-left">
                <div>
                    <h3 id="actor-detail-name" class="font-black text-sm sm:text-base text-white"></h3>
                    <span id="actor-detail-char" class="text-[8px] text-yellow-500 font-black block mt-0.5 uppercase tracking-widest"></span>
                </div>
                <button onclick="closeActorPopup()" class="bg-zinc-800 text-zinc-300 hover:text-white p-1 rounded-full shrink-0 text-xs font-bold leading-none w-5 h-5 flex items-center justify-center">✕</button>
            </div>

            <div class="overflow-y-auto flex-1 space-y-4 pr-1 text-xs font-sans text-left">
                <div class="flex flex-col sm:flex-row gap-4 items-center sm:items-start text-center sm:text-left">
                    <img id="actor-detail-photo" src="" class="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shadow-md shrink-0 border border-zinc-800" referrerPolicy="no-referrer" />
                    <div class="space-y-2 flex-1 w-full text-left">
                        <div class="bg-zinc-955 p-3 rounded-xl border border-zinc-900/60 font-sans">
                            <span class="text-[8px] text-yellow-500 uppercase tracking-widest block font-black">🏅 Nagrade i Nominacije</span>
                            <p id="actor-detail-awards" class="text-[9.5px] text-zinc-200 mt-1 leading-relaxed"></p>
                        </div>
                    </div>
                </div>

                <div class="space-y-1 bg-zinc-955/50 p-3 rounded-xl border border-zinc-900/60 text-left">
                    <span class="text-[8px] text-emerald-405 uppercase tracking-wider block font-black">📝 Biografija i Trivia zanimljivosti</span>
                    <p id="actor-detail-bio" class="text-zinc-300 leading-relaxed mt-1 text-[11px]"></p>
                </div>

                <!-- Appearances section -->
                <div class="space-y-2 text-left bg-zinc-950/60 p-3 rounded-xl border border-zinc-900/60">
                    <span class="text-[8px] text-amber-500 uppercase tracking-widest block font-black font-sans">🎬 Ostali nastupi u ovom katalogu</span>
                    <div id="actor-appearances-list" class="space-y-2 max-h-36 overflow-y-auto pr-1 mt-1.5 divide-y divide-zinc-900/70">
                        <!-- Dynamic appearances injected here -->
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Script logic -->
    <script>
        const DB_ENTRIES = ${serializedData};

        function getRatingColorClass(rating) {
            if (rating >= 9.5) return 'rating-95';
            if (rating >= 9.0) return 'rating-90';
            if (rating >= 8.0) return 'rating-80';
            if (rating >= 7.0) return 'rating-70';
            if (rating >= 6.0) return 'rating-60';
            if (rating >= 4.0) return 'rating-40';
            return 'rating-0';
        }

        let activeId = DB_ENTRIES.length > 0 ? DB_ENTRIES[0].id : null;

        function renderSidebar() {
            const query = document.getElementById('html-search-input').value.toLowerCase().trim();
            const format = document.getElementById('html-filter-type').value;
            
            const filtered = DB_ENTRIES.filter(item => {
                const matchesType = format === 'all' || item.type === format;
                if (!matchesType) return false;
                
                if (!query) return true;
                
                // Matches title or description
                const matchesBasic = item.name.toLowerCase().includes(query) || (item.description || '').toLowerCase().includes(query);
                if (matchesBasic) return true;
                
                // Matches movie actors or episode actors
                if (item.movieActors && item.movieActors.some(a => a.name.toLowerCase().includes(query))) {
                    return true;
                }
                if (item.seasons) {
                    const hasMatch = item.seasons.some(s => 
                        (s.episodes || []).some(ep => 
                            ep.name.toLowerCase().includes(query) || 
                            (ep.overview || '').toLowerCase().includes(query) ||
                            (ep.actors || []).some(a => a.name.toLowerCase().includes(query))
                        )
                    );
                    if (hasMatch) return true;
                }
                return false;
            });

            document.getElementById('filtered-count').textContent = \`Prikazano: \${filtered.length} od \${DB_ENTRIES.length}\`;

            const container = document.getElementById('sidebar-titles');
            container.innerHTML = '';

            filtered.forEach(item => {
                const isSelected = item.id === activeId;
                const card = document.createElement('button');
                card.className = \`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center gap-3.5 cursor-pointer \${
                    isSelected 
                        ? 'bg-zinc-900 border-yellow-500/45 shadow' 
                        : 'bg-zinc-955/40 border-zinc-900 hover:bg-zinc-900/50 hover:border-zinc-800'
                }\`;
                card.onclick = () => {
                    activeId = item.id;
                    renderSidebar();
                    renderActiveSlate();
                };

                const badges = item.type === 'show' ? '📺 Serija' : item.type === 'universe' ? '🌌 Univerzum' : '🎬 Film';
                const scoreStr = item.type === 'movie' ? (item.movieRating ? item.movieRating.toFixed(1) : 'TBA') : getAverageRating(item);

                card.innerHTML = \`
                    <div class="w-10 h-13 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-80 w-10 shrink-0">
                        <img src="\${item.posterUrl}" class="w-full h-full object-cover">
                    </div>
                    <div class="flex-1 min-w-0 text-left">
                        <span class="text-[9px] text-zinc-500 font-bold block uppercase">\${badges} • \${item.year}</span>
                        <h4 class="font-extrabold text-sm text-zinc-100 truncate mt-0.5">\${item.name}</h4>
                    </div>
                    <div class="text-right">
                        <span class="text-xs font-mono font-bold text-yellow-405 bg-yellow-400/10 border border-yellow-500/20 px-2 py-0.5 rounded-lg">\${scoreStr}</span>
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

        function renderActiveSlate() {
            const container = document.getElementById('dashboard-slate');
            container.innerHTML = '';

            const entry = DB_ENTRIES.find(item => item.id === activeId);
            if (!entry) {
                renderEmptySlate();
                return;
            }

            // Outer container banner
            const headHtml = \`
                <div class="h-44 bg-zinc-955 rounded-2xl overflow-hidden relative flex items-end shadow-inner border border-zinc-850">
                    <img src="\${entry.bannerUrl}" class="w-full h-full object-cover opacity-30 absolute inset-0">
                    <div class="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent"></div>
                    <div class="p-6 relative z-10 flex gap-4 items-center">
                        <div class="w-12 h-18 rounded overflow-hidden bg-zinc-955 shadow border border-zinc-800">
                            <img src="\${entry.posterUrl}" class="w-full h-full object-cover">
                        </div>
                        <div class="text-left font-sans animate-fade-in-up">
                            <span class="text-[9px] font-mono uppercase bg-yellow-500/10 text-yellow-505 px-2 py-0.5 rounded-full border border-yellow-500/20">\${entry.year} • \${entry.type.toUpperCase()}</span>
                            <h2 class="text-2xl font-black text-white mt-1">\${entry.name}</h2>
                        </div>
                    </div>
                </div>
                <div class="text-xs text-zinc-400 leading-relaxed bg-zinc-950/40 p-4 border border-zinc-900 rounded-2xl italic animate-fade-in-up" style="animation-delay: 80ms;">
                    "\${entry.description || 'Nema opisanog sinopsisa.'}"
                </div>
            \`;

            let mainContent = '';

            if (entry.type === 'movie') {
                const scoreVal = entry.movieRating ? entry.movieRating.toFixed(1) : '0.0';
                const durationLabel = entry.movieDuration || 'Trajanje nije navedeno';
                const colorCls = getRatingColorClass(entry.movieRating || 0);

                mainContent = \`
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans text-left">
                        <div class="bg-zinc-950/80 p-5 rounded-2xl border border-zinc-900 space-y-3.5 flex flex-col justify-center items-center text-center">
                            <h3 class="text-[9px] uppercase font-black tracking-widest text-zinc-400">LIČNA OCJENA FILMA</h3>
                            <div class="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl \${colorCls} text-zinc-955">
                                <span class="text-3xl font-black font-mono">\${scoreVal}</span>
                                <span class="text-xs font-bold">/ 10</span>
                            </div>
                            <p class="text-zinc-550 text-[10px] uppercase font-mono tracking-wider">Trajanje: \${durationLabel}</p>
                        </div>
                \`;

                // Movie trailer if available
                if (entry.movieYoutubeUrl) {
                    let youtubeEmbedUrl = '';
                    const yUrl = entry.movieYoutubeUrl;
                    if (yUrl.includes('youtube.com/embed/')) {
                        youtubeEmbedUrl = yUrl;
                    } else {
                        const regExp = /^.*(youtu.be\\/|v\\/|u\\/\\w\\/|embed\\/|watch\\?v=|\\&v=)([^#\\&\\?]*).*/;
                        const match = yUrl.match(regExp);
                        if (match && match[2].length === 11) {
                            youtubeEmbedUrl = \`https://www.youtube.com/embed/\${match[2]}\`;
                        }
                    }

                    if (youtubeEmbedUrl) {
                        mainContent += \`
                            <div class="bg-zinc-955 p-3 rounded-2xl border border-zinc-900">
                                <div class="relative w-full aspect-video rounded-xl overflow-hidden border border-zinc-855 bg-zinc-950">
                                    <iframe src="\${youtubeEmbedUrl}" class="absolute top-0 left-0 w-full h-full border-0" allowfullscreen></iframe>
                                </div>
                            </div>
                        \`;
                    } else {
                        mainContent += \`
                            <div class="bg-zinc-955 p-5 rounded-2xl border border-zinc-900 flex items-center justify-center">
                                <a href="\${yUrl}" target="_blank" rel="noopener noreferrer" class="px-5 py-2.5 rounded-xl bg-red-650/10 text-red-100 border border-red-500/20 font-bold hover:bg-red-650/20 transition text-xs">
                                    ▶ Otvori YouTube Najavu
                                </a>
                            </div>
                        \`;
                    }
                } else {
                    mainContent += \`
                        <div class="bg-zinc-955 p-5 rounded-2xl border border-zinc-900 flex items-center justify-center text-zinc-600 italic text-[11px]">
                            Nije priložen video trailer za ovaj film.
                        </div>
                    \`;
                }

                mainContent += '</div>';

                // Display movie cast too!
                const mActors = entry.movieActors || [];
                if (mActors.length > 0) {
                    mainContent += \`
                        <div class="bg-zinc-950/40 p-4 rounded-xl border border-zinc-900/60 mt-4 text-left font-sans">
                            <span class="text-[8px] text-amber-550 font-extrabold tracking-widest uppercase block mb-3">👥 GLUMAČKI ANSAMBL / CAST FILMA</span>
                            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                                \${mActors.map(act => {
                                    const pic = act.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop';
                                    return \`
                                        <div onclick="showActorProfileBio('\${act.id}', '\${entry.id}', 'null', 'null')" class="bg-zinc-950 hover:bg-zinc-900/80 p-2 rounded-xl border border-zinc-900 flex items-center gap-2.5 transition cursor-pointer hover:border-emerald-500/20 group transition-all">
                                            <img src="\${pic}" class="w-8 h-8 rounded-full object-cover border border-zinc-800 shrink-0" referrerPolicy="no-referrer">
                                            <div class="min-w-0 flex-1 text-left">
                                                <span class="font-extrabold text-[10px] text-zinc-100 group-hover:text-emerald-450 block truncate transition">\${act.name}</span>
                                                <span class="text-[8.5px] text-zinc-500 block truncate">uloga: \${act.characterName || 'Nema'}</span>
                                            </div>
                                        </div>
                                    \`;
                                }).join('')}
                            </div>
                        </div>
                    \`;
                }

                // Display movie reviews
                const mReviews = entry.movieReviews || [];
                if (mReviews.length > 0) {
                    mainContent += \`
                        <div class="bg-zinc-950/40 p-4 rounded-xl border border-zinc-900/60 mt-4 text-left font-sans">
                            <span class="text-[8px] text-emerald-400 font-black tracking-widest uppercase block mb-3">⭐ OCJENE I KOMENTARI KRITIKE</span>
                            <div class="space-y-3">
                                \${mReviews.map(rev => {
                                    const pic = rev.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop';
                                    return \`
                                        <div class="bg-zinc-950 p-3.5 rounded-xl border border-zinc-900 space-y-2 text-xs">
                                            <div class="flex items-center justify-between">
                                                <div class="flex items-center gap-2">
                                                    <img src="\${pic}" class="w-6 h-6 rounded-full object-cover border border-zinc-800" referrerPolicy="no-referrer">
                                                    <span class="font-bold text-zinc-200 text-xs shadow-none">\${rev.voterName}</span>
                                                </div>
                                                <span class="text-yellow-505 text-xs font-mono font-black border border-yellow-500/10 bg-yellow-500/5 px-2 py-0.5 rounded">★ \${rev.rating.toFixed(1)}</span>
                                            </div>
                                            <p class="text-zinc-400 text-[10px] italic leading-relaxed bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-950">"\${rev.reviewText}"</p>
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

        function renderSeasonsGrid(show) {
            let htmlStr = '<div class="space-y-6">';
            if (!show.seasons || show.seasons.length === 0) {
                return '<p class="text-zinc-550 text-xs italic">Nema unesenih faza ili sezona.</p>';
            }

            htmlStr += \`<div class="flex items-center gap-1.5 text-zinc-550 text-[10px] uppercase font-bold tracking-widest pl-1 font-sans">
                <span>💡 Kliknite na bilo koji obojeni blok ispod za prikaz detalja!</span>
            </div>\`;

            show.seasons.forEach(season => {
                let episodeGridHtml = '';
                const seasonLabel = show.type === 'universe' ? (season.seasonName || \`Faza \${season.seasonNumber}\`) : (season.seasonName || \`Sezona \${season.seasonNumber}\`);
                
                season.episodes.forEach(ep => {
                    const colorCls = getRatingColorClass(ep.rating);
                    episodeGridHtml += \`<button 
                        onclick="showEpisodeDetails('\${show.id}', \${season.seasonNumber}, \${ep.episodeNumber})"
                        class="\${colorCls} w-10 h-10 rounded-lg font-black font-mono transition-transform hover:scale-105 active:scale-95 flex items-center justify-center text-sm shadow hover:shadow-lg cursor-pointer shrink-0"
                        title="Ep \${ep.episodeNumber}: \${ep.name} (\${ep.rating.toFixed(1)})"
                    >\${ep.rating.toFixed(1)}</button>\`;
                });

                htmlStr += \`<div class="bg-zinc-950/60 p-5 rounded-2xl border border-zinc-900 space-y-3 text-left">
                    <div class="flex items-center justify-between font-sans">
                        <h4 class="font-extrabold text-xs text-zinc-300 uppercase tracking-widest">\${seasonLabel}</h4>
                        <span class="text-[9px] uppercase font-bold text-zinc-500 font-mono tracking-widest bg-zinc-950 px-2.5 py-0.5 rounded border border-zinc-900">\${season.episodes.length} STAVKI</span>
                    </div>
                    <div class="flex flex-wrap gap-2.5">
                        \${episodeGridHtml}
                    </div>
                </div>\`;
            });

            htmlStr += \`<div class="border-t border-zinc-900 pt-5 mt-4 text-left">
                <p class="text-[9px] uppercase text-zinc-500 font-extrabold tracking-widest mb-3">Vodič Boja </p>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px] text-zinc-400 font-sans">
                    <div class="flex items-center gap-2"><span class="w-10 h-3 rounded bg-sky-650 rating-95"></span> <span>Cinema (9.5+)</span></div>
                    <div class="flex items-center gap-2"><span class="w-10 h-3 rounded bg-emerald-650 rating-90"></span> <span>Sjajno (9.0+)</span></div>
                    <div class="flex items-center gap-2"><span class="w-10 h-3 rounded bg-emerald-555 rating-80"></span> <span>Odlično (8.0+)</span></div>
                    <div class="flex items-center gap-2"><span class="w-10 h-3 rounded bg-yellow-500 rating-70 text-[8px] flex items-center justify-center">★</span> <span>Dobro (7.0+)</span></div>
                </div>
            </div>\`;

            htmlStr += '</div>';
            return htmlStr;
        }

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

            document.getElementById('popup-season-ep').textContent = \`\${categoryLabel} \${seasonNum} — \${itemLabel} \${epNum}\`;
            document.getElementById('popup-name').textContent = ep.name || ('Stavka ' + epNum);
            
            const badge = document.getElementById('popup-rating');
            badge.textContent = ep.rating.toFixed(1);
            badge.className = \`px-3 py-1 text-zinc-950 rounded-lg text-xs font-black font-mono shadow \${getRatingColorClass(ep.rating)}\`;

            const imgElement = document.getElementById('popup-image');
            imgElement.src = ep.imageUrl || entry.bannerUrl || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800';

            switchPopupTab('details');

            const popup = document.getElementById('popup-overlay');
            popup.classList.remove('hidden');
            // Glatki CSS prelaz
            popup.offsetHeight;
            popup.classList.add('opacity-100');
            popup.querySelector('.max-w-xl').classList.remove('scale-95');
            popup.querySelector('.max-w-xl').classList.add('scale-100');
        }

        function switchPopupTab(tabName) {
            activePopupTab = tabName;
            
            // update tabs view
            const tabs = ['details', 'actors', 'reviews'];
            tabs.forEach(t => {
                const btn = document.getElementById('popup-tab-' + t);
                if (t === tabName) {
                    btn.className = 'flex-1 py-1.5 rounded-lg text-center bg-zinc-850 text-white font-black border border-zinc-700';
                } else {
                    btn.className = 'flex-1 py-1.5 rounded-lg text-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40';
                }
            });

            const contentDiv = document.getElementById('popup-tab-content');
            contentDiv.innerHTML = '';

            const entry = DB_ENTRIES.find(item => item.id === activePopupShowId);
            if (!entry) return;
            const season = entry.seasons.find(s => s.seasonNumber === activePopupSeasonNum);
            if (!season) return;
            const ep = season.episodes.find(e => e.episodeNumber === activePopupEpNum);
            if (!ep) return;

            if (tabName === 'details') {
                let html = \`
                    <div class="space-y-4 font-sans text-left">
                        <div class="bg-zinc-950/45 p-4 border border-zinc-900 rounded-2xl italic leading-relaxed text-zinc-300">
                            "\${ep.overview || 'Nema upisanog opisa niti detalja za ovu stavku.'}"
                        </div>
                \`;

                // Alternate Cut / Hyperlink navigation check
                if (ep.linkText && ep.linkTargetId) {
                    html += \`
                        <div onclick="navigateToEntry('\${ep.linkTargetId}')" class="bg-yellow-500/10 hover:bg-yellow-500/15 border border-yellow-500/25 p-3 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition">
                            <div class="flex items-center gap-2 text-yellow-500 font-extrabold text-[10px] uppercase">
                                🔗 Povezani projekat ili posebna verzija
                            </div>
                            <span class="text-[9px] text-white font-bold hover:underline">\${ep.linkText} ➔</span>
                        </div>
                    \`;
                }

                // YouTube Trailer
                const yUrl = ep.youtubeUrl || ep.youtubeLink;
                if (yUrl) {
                    let youtubeEmbedUrl = '';
                    if (yUrl.includes('youtube.com/embed/')) {
                        youtubeEmbedUrl = yUrl;
                    } else {
                        const regExp = /^.*(youtu.be\\/|v\\/|u\\/\\w\\/|embed\\/|watch\\?v=|\\&v=)([^#\\&\\?]*).*/;
                        const match = yUrl.match(regExp);
                        if (match && match[2].length === 11) {
                            youtubeEmbedUrl = \`https://www.youtube.com/embed/\${match[2]}\`;
                        }
                    }

                    if (youtubeEmbedUrl) {
                        html += \`
                            <div class="space-y-1.5 mt-2">
                                <span class="text-[8px] uppercase font-mono text-zinc-500 font-extrabold block">Najava epizode video</span>
                                <div class="relative w-full aspect-video rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950">
                                    <iframe src="\${youtubeEmbedUrl}" class="absolute top-0 left-0 w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                                </div>
                            </div>
                        \`;
                    } else {
                        html += \`
                            <a href="\${yUrl}" target="_blank" rel="noopener noreferrer" class="flex items-center justify-center p-3 text-center bg-red-600/15 border border-red-500/20 rounded-xl text-red-100 font-bold text-xs hover:bg-red-650/20 transition mt-2 animate-none">
                                ▶ Pogledaj i Otvori video trailer
                            </a>
                        \`;
                    }
                }

                html += '</div>';
                contentDiv.innerHTML = html;

            } else if (tabName === 'actors') {
                const actorList = ep.actors || [];
                if (actorList.length === 0) {
                    contentDiv.innerHTML = '<p class="text-zinc-550 italic text-center py-6">Nema unesenih glumaca za ovu stavku u bazi.</p>';
                    return;
                }

                let html = '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left font-sans">';
                actorList.forEach((act, idx) => {
                    const pic = act.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop';
                    html += \`
                        <div onclick="showActorProfileBio('\${act.id}', activePopupShowId, activePopupSeasonNum, activePopupEpNum)" class="bg-zinc-950 hover:bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-855 flex items-center gap-3 transition cursor-pointer hover:border-emerald-500/30 group transition-all active:scale-[0.98] duration-150 animate-fade-in-up" style="animation-delay: \${idx * 30}ms;">
                            <img src="\${pic}" class="w-8 h-8 rounded-full object-cover border border-zinc-800 shrink-0" referrerPolicy="no-referrer">
                            <div class="min-w-0 flex-1 text-left">
                                <span class="font-extrabold text-[11px] text-zinc-100 group-hover:text-emerald-450 block truncate transition">\${act.name}</span>
                                \${act.characterName ? \`<span class="text-[9px] text-zinc-500 block truncate">Lika: \${act.characterName}</span>\` : ''}
                            </div>
                        </div>
                    \`;
                });
                html += '</div>';
                contentDiv.innerHTML = html;

            } else if (tabName === 'reviews') {
                const reviewList = ep.guestReviews || [];
                if (reviewList.length === 0) {
                    contentDiv.innerHTML = '<p class="text-zinc-500 italic text-center py-6">Nije unesena nijedna gostujuća ocjena.</p>';
                    return;
                }

                let html = '<div class="space-y-3 text-left font-sans animate-fade-in">';
                reviewList.forEach((rev, idx) => {
                    const avatar = rev.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop';
                    html += \`
                        <div class="bg-zinc-950/50 p-3 rounded-xl border border-zinc-900/70 space-y-2 animate-fade-in-up" style="animation-delay: \${idx * 45}ms;">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <img src="\${avatar}" class="w-6 h-6 rounded-full object-cover border border-zinc-850" referrerPolicy="no-referrer">
                                    <div>
                                        <span class="font-bold text-zinc-200 block text-xs">\${rev.voterName}</span>
                                        <span class="text-[8px] text-zinc-500 font-mono tracking-wider block uppercase">Kritičarski komentar</span>
                                    </div>
                                </div>
                                <span class="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-mono font-black px-2.5 py-0.5 rounded-lg shadow-none">
                                    ★ \${rev.rating.toFixed(1)}
                                </span>
                            </div>
                            <p class="text-zinc-400 text-[10px] leading-relaxed italic bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-950 font-sans">
                                "\${rev.reviewText}"
                            </p>
                        </div>
                    \`;
                });
                html += '</div>';
                contentDiv.innerHTML = html;
            }
        }

        function showActorProfileBio(actorId, showId, seasonNum, epNum) {
            const entry = DB_ENTRIES.find(item => item.id === showId);
            if (!entry) return;
            
            let actor = null;
            if (seasonNum !== 'null' && epNum !== 'null' && seasonNum !== null && epNum !== null) {
                const season = entry.seasons.find(s => s.seasonNumber === parseInt(seasonNum));
                const ep = season?.episodes?.find(e => e.episodeNumber === parseInt(epNum));
                actor = ep?.actors?.find(a => a.id === actorId);
            } else if (entry.movieActors) {
                actor = entry.movieActors.find(a => a.id === actorId);
            }

            if (!actor) {
                if (entry.movieActors) {
                    actor = entry.movieActors.find(a => a.id === actorId);
                }
                if (!actor && entry.seasons) {
                    entry.seasons.forEach(s => {
                        (s.episodes || []).forEach(ep => {
                            const found = (ep.actors || []).find(a => a.id === actorId);
                            if (found) actor = found;
                        });
                    });
                }
            }

            if (!actor) return;

            document.getElementById('actor-detail-name').textContent = actor.name;
            const ageLabel = actor.age ? \` • \${actor.age} god.\` : '';
            const charEl = document.getElementById('actor-detail-char');
            if (actor.characterName) {
                charEl.style.display = 'block';
                charEl.textContent = \`Uloga: \${actor.characterName}\${ageLabel}\`;
            } else if (actor.age) {
                charEl.style.display = 'block';
                charEl.textContent = \`\${actor.age} god.\`;
            } else {
                charEl.style.display = 'none';
                charEl.textContent = '';
            }
            document.getElementById('actor-detail-awards').textContent = actor.otherInfo || 'Nema unesenih nagrada za ovog umjetnika.';
            document.getElementById('actor-detail-bio').textContent = actor.bio || \`\${actor.name} je registrovani i ocijenjeni glumački saradnik na ovom projektu.\`;
            
            const pic = actor.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop';
            document.getElementById('actor-detail-photo').src = pic;

            const appListDiv = document.getElementById('actor-appearances-list');
            appListDiv.innerHTML = '';

            const apps = getActorAppearancesList(actor.name);
            if (apps.length === 0) {
                appListDiv.innerHTML = '<p class="text-[10px] text-zinc-650 italic text-left pb-1 font-sans">Nema drugih uloga u bazi podataka.</p>';
            } else {
                apps.forEach(app => {
                    const isCurrentApp = 
                      app.entryId === showId && 
                      (seasonNum !== 'null' && seasonNum !== null ? app.seasonNumber === parseInt(seasonNum) : false) && 
                      (epNum !== 'null' && epNum !== null ? app.episodeNumber === parseInt(epNum) : false);

                    const div = document.createElement('div');
                    div.className = 'flex gap-3.5 pt-2 first:pt-0 pb-2 last:pb-0 items-center justify-between group transition cursor-pointer hover:bg-zinc-900/30 w-full rounded text-left';
                    div.onclick = () => {
                        navigateToEntry(app.entryId, app.seasonNumber, app.episodeNumber);
                    };

                    const seasonEpLabel = app.seasonNumber && app.episodeNumber 
                        ? \`Sezona \${app.seasonNumber}, Epizoda \${app.episodeNumber} - "\${app.episodeName}"\` 
                        : 'Film';

                    div.innerHTML = \`
                        <div class="flex gap-2 items-center min-w-0">
                            <img src="\${app.posterUrl}" class="w-6 h-8 object-cover rounded border border-zinc-800 shrink-0 shadow-none" referrerPolicy="no-referrer">
                            <div class="min-w-0">
                                <p class="text-[10px] font-extrabold text-white truncate group-hover:text-amber-400 transition flex items-center gap-1 font-sans">
                                    \${app.entryName}
                                    \${isCurrentApp ? '<span class="text-[7px] bg-red-500/20 text-red-500 border border-red-500/30 px-0.5 rounded font-normal shrink-0">Trenutno</span>' : ''}
                                </p>
                                <p class="text-[8.5px] text-zinc-400 truncate font-sans">\${seasonEpLabel}</p>
                                \${app.characterName ? \`<p class="text-[8.5px] text-yellow-500/80 truncate font-sans">uloga: \${app.characterName}</p>\` : ''}
                            </div>
                        </div>
                        <span class="text-zinc-500 group-hover:text-amber-400 shrink-0 text-[10px] transform group-hover:translate-x-0.5 transition">➔</span>
                    \`;
                    appListDiv.appendChild(div);
                });
            }

            const actorOverlay = document.getElementById('actor-overlay');
            actorOverlay.classList.remove('hidden');
            // Glatki CSS prelaz
            actorOverlay.offsetHeight;
            actorOverlay.classList.add('opacity-100');
            actorOverlay.querySelector('.max-w-sm').classList.remove('scale-95');
            actorOverlay.querySelector('.max-w-sm').classList.add('scale-100');
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

        function closeActorPopup() {
            const actorOverlay = document.getElementById('actor-overlay');
            actorOverlay.classList.remove('opacity-100');
            actorOverlay.querySelector('.max-w-sm').classList.add('scale-95');
            actorOverlay.querySelector('.max-w-sm').classList.remove('scale-100');
            setTimeout(() => {
                actorOverlay.classList.add('hidden');
            }, 300);
        }

        function navigateToEntry(entryId, seasonNum = null, epNum = null) {
            if (typeof entryId === 'string' && entryId.includes('|')) {
                const parts = entryId.split('|');
                entryId = parts[0];
                seasonNum = parts[1];
                epNum = parts[2];
            }
            activeId = entryId;
            renderSidebar();
            renderActiveSlate();
            
            closeActorPopup();
            closeDetailsPopup();
            
            if (seasonNum !== null && epNum !== null && seasonNum !== 'null' && epNum !== 'null') {
                setTimeout(() => {
                    showEpisodeDetails(entryId, parseInt(seasonNum), parseInt(epNum));
                }, 120);
            } else {
                const dashboardEl = document.getElementById('dashboard-slate');
                if (dashboardEl) {
                    dashboardEl.scrollIntoView({ behavior: 'smooth' });
                }
            }
        }

        function closeDetailsPopup() {
            const ytContainer = document.getElementById('yt-container');
            if (ytContainer) ytContainer.innerHTML = '';
            
            const popup = document.getElementById('popup-overlay');
            popup.classList.remove('opacity-100');
            popup.querySelector('.max-w-xl').classList.add('scale-95');
            popup.querySelector('.max-w-xl').classList.remove('scale-100');
            setTimeout(() => {
                popup.classList.add('hidden');
            }, 300);
        }

        function handleSearchFilterChange() {
            renderSidebar();
        }

        function renderEmptySlate() {
            document.getElementById('dashboard-slate').innerHTML = \`
                <div class="flex flex-col items-center justify-center h-full text-zinc-600 p-8 text-center space-y-2">
                    <p class="font-extrabold text-sm uppercase text-zinc-550">Cinema Grafik</p>
                    <p class="text-xs">Nema učitanih stavki u katalogu. Ahmed</p>
                </div>
            \`;
        }

        if (DB_ENTRIES.length > 0) {
            document.getElementById('total-count-badge').textContent = DB_ENTRIES.length;
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
            Cinema Grafik • Ahmed • Samostalnost i Prenosivost
          </p>
        </div>

      </motion.div>
    </div>
  );
}
