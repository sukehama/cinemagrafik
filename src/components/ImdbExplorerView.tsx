import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Film, 
  Tv, 
  Star, 
  Plus, 
  FolderPlus, 
  ExternalLink, 
  Sparkles, 
  Key, 
  RefreshCw, 
  Check, 
  ChevronRight, 
  Layers, 
  Info,
  Calendar,
  Clock,
  User,
  Award,
  Bookmark,
  CheckCircle2,
  X,
  ArrowLeft,
  Youtube,
  Play
} from 'lucide-react';
import { RatingEntry, ProjectFolder, ProjectItem, Season, Episode, Actor } from '../types';
import { fetchActorWikiInfo, batchFetchActorsWiki } from '../wikipedia';
import { fetchTVmazeShowData, fetchTMDBTrailer } from '../tvmaze';

interface ImdbExplorerViewProps {
  onImportToCatalog: (newEntry: RatingEntry) => void;
  existingEntries: RatingEntry[];
  onAddToProject?: (projectId: string, item: ProjectItem) => void;
  projectFolders?: ProjectFolder[];
  onCreateProject?: (name: string, description?: string, color?: string, icon?: string) => string;
  onClose?: () => void;
}

interface OMDbSearchResult {
  Title: string;
  Year: string;
  imdbID: string;
  Type: 'movie' | 'series' | 'episode';
  Poster: string;
}

interface OMDbDetailResult {
  Title: string;
  Year: string;
  Rated?: string;
  Released?: string;
  Runtime?: string;
  Genre?: string;
  Director?: string;
  Writer?: string;
  Actors?: string;
  Plot?: string;
  Language?: string;
  Country?: string;
  Awards?: string;
  Poster?: string;
  Ratings?: { Source: string; Value: string }[];
  Metascore?: string;
  imdbRating?: string;
  imdbVotes?: string;
  imdbID: string;
  Type: string;
  totalSeasons?: string;
  Response?: string;
  Error?: string;
}

const POPULAR_SUGGESTIONS = [
  'Breaking Bad',
  'The Dark Knight',
  'Interstellar',
  'Succession',
  'Dune: Part Two',
  'Severance',
  'Better Call Saul',
  'Oppenheimer',
  'The Godfather',
  'Game of Thrones',
  'The Sopranos',
  'Chernobyl'
];

export default function ImdbExplorerView({
  onImportToCatalog,
  existingEntries,
  onAddToProject,
  projectFolders = [],
  onCreateProject,
  onClose
}: ImdbExplorerViewProps) {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'movie' | 'series'>('all');
  const [results, setResults] = useState<OMDbSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // API Key management
  const [customApiKey, setCustomApiKey] = useState<string>(() => localStorage.getItem('omdb_custom_api_key') || '');
  const [tmdbApiKey, setTmdbApiKey] = useState<string>(() => localStorage.getItem('tmdb_custom_api_key') || '');

  // Selected Detail Modal
  const [selectedDetail, setSelectedDetail] = useState<OMDbDetailResult | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailSeasonsData, setDetailSeasonsData] = useState<Record<number, any>>({});
  const [selectedSeasonTab, setSelectedSeasonTab] = useState<number>(1);
  const [isLoadingSeason, setIsLoadingSeason] = useState(false);

  // Deep import progress state
  const [isImporting, setIsImporting] = useState(false);
  const [importStatusText, setImportStatusText] = useState<string>('');

  // Add to Playlist / Project Modal
  const [projectTargetItem, setProjectTargetItem] = useState<{ title: string; imdbId: string; type: string; poster: string; rating: number; year: string } | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [addedFeedback, setAddedFeedback] = useState<string | null>(null);

  // Refresh keys from localStorage on mount
  useEffect(() => {
    const omdb = localStorage.getItem('omdb_custom_api_key') || '';
    const tmdb = localStorage.getItem('tmdb_custom_api_key') || '';
    setCustomApiKey(omdb);
    setTmdbApiKey(tmdb);
  }, []);

  const performSearch = async (searchQuery: string, typeFilter = filterType, overrideKey = customApiKey) => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams();
      params.set('query', searchQuery.trim());
      if (typeFilter !== 'all') {
        params.set('type', typeFilter);
      }
      if (overrideKey) {
        params.set('apiKey', overrideKey);
      }

      const res = await fetch(`/api/omdb/search?${params.toString()}`, {
        headers: overrideKey ? { 'x-omdb-key': overrideKey } : {}
      });
      const data = await res.json();

      if (data.Response === 'True') {
        setResults(data.Search || []);
      } else {
        setResults([]);
        setErrorMessage(data.Error || 'Nema pronađenih rezultata za traženi pojam.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Greška pri povezivanju sa OMDb servisom.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDetail = async (imdbId: string) => {
    setIsLoadingDetail(true);
    setDetailSeasonsData({});
    setSelectedSeasonTab(1);
    try {
      const params = new URLSearchParams({ id: imdbId, plot: 'full' });
      if (customApiKey) params.set('apiKey', customApiKey);

      const res = await fetch(`/api/omdb/detail?${params.toString()}`);
      const data: OMDbDetailResult = await res.json();

      if (data.Response !== 'False') {
        setSelectedDetail(data);

        // If it is a series, fetch season 1 episodes
        if (data.Type === 'series' && data.totalSeasons) {
          fetchSeasonEpisodes(imdbId, 1);
        }
      } else {
        alert('Neuspješno učitavanje detalja sa IMDb-a: ' + ((data as any).Error || ''));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const fetchSeasonEpisodes = async (imdbId: string, seasonNum: number) => {
    if (detailSeasonsData[seasonNum]) {
      setSelectedSeasonTab(seasonNum);
      return;
    }

    setIsLoadingSeason(true);
    try {
      const params = new URLSearchParams({ id: imdbId, season: String(seasonNum) });
      if (customApiKey) params.set('apiKey', customApiKey);

      const res = await fetch(`/api/omdb/detail?${params.toString()}`);
      const data = await res.json();
      if (data.Response !== 'False') {
        setDetailSeasonsData(prev => ({ ...prev, [seasonNum]: data }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingSeason(false);
      setSelectedSeasonTab(seasonNum);
    }
  };

  // Convert and Import into User's Rating Catalog with FULL SEASONS, WIKIPEDIA ACTORS & DESCRIPTIONS
  const handleImportDetailToCatalog = async (detail: OMDbDetailResult) => {
    setIsImporting(true);
    setImportStatusText('Pripremam uvoz naslova...');

    try {
      const isShow = detail.Type === 'series';
      const parsedRating = parseFloat(detail.imdbRating || '0') || 7.5;
      const cleanPoster = detail.Poster && detail.Poster !== 'N/A' 
        ? detail.Poster 
        : 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop&q=80';

      // 1. Parse and fetch real Actor portraits and bios from Wikipedia
      setImportStatusText('Preuzimam biografije i slike glumaca sa Wikipedije...');
      const actorNames = (detail.Actors || '').split(',').map(s => s.trim()).filter(Boolean);
      const wikiActorsMap = await batchFetchActorsWiki(actorNames);

      const parsedActors: Actor[] = actorNames.map((name, i) => {
        const wikiData = wikiActorsMap[name] || {};
        return {
          id: `act_${Date.now()}_${i}`,
          name,
          characterName: 'Glavna uloga',
          photoUrl: wikiData.photoUrl || `https://images.unsplash.com/photo-${1534528741775 + (i * 100)}?auto=format&fit=crop&w=300&h=300&q=80`,
          bio: wikiData.bio || `${name} je istaknuti glumac/glumica u projektu "${detail.Title}".`,
          performanceRating: 8.5
        };
      });

      // 2. Try fetching deep episode data (synopses & stills) from TMDB or TVmaze
      let tvmazeData = null;
      if (isShow) {
        setImportStatusText('Dohvatam detaljne sinopsise i slike epizoda...');
        try {
          tvmazeData = await fetchTVmazeShowData(detail.imdbID || detail.Title, tmdbApiKey);
        } catch (e) {
          console.warn('TVmaze/TMDB enrichment error:', e);
        }
      }

      // 3. Try fetching official YouTube trailer from TMDB if available
      let officialTrailer: string | null = null;
      try {
        officialTrailer = await fetchTMDBTrailer(detail.imdbID, tmdbApiKey);
      } catch (e) {}

      let seasons: Season[] = [];

      if (isShow) {
        const totalSeasonsCount = parseInt(detail.totalSeasons || '1', 10) || 1;

        // Loop through ALL seasons and fetch real episodes for each season!
        for (let s = 1; s <= totalSeasonsCount; s++) {
          setImportStatusText(`Učitavam epizode i opise za Sezonu ${s} od ${totalSeasonsCount}...`);
          
          let seasonData = detailSeasonsData[s];
          if (!seasonData || !seasonData.Episodes) {
            try {
              const params = new URLSearchParams({ id: detail.imdbID, season: String(s) });
              if (customApiKey) params.set('apiKey', customApiKey);
              const sRes = await fetch(`/api/omdb/detail?${params.toString()}`);
              seasonData = await sRes.json();
            } catch (err) {
              console.warn(`Neuspjeh pri dohvatu sezone ${s}:`, err);
            }
          }

          const tvmazeSeasonEps = tvmazeData?.episodesBySeason?.[s] || [];
          let epList: Episode[] = [];

          if (seasonData && Array.isArray(seasonData.Episodes) && seasonData.Episodes.length > 0) {
            // Process all episodes in the season with TVmaze enriched overviews and screenshots
            epList = seasonData.Episodes.map((ep: any, epIdx: number) => {
              const epNum = parseInt(ep.Episode || String(epIdx + 1), 10) || (epIdx + 1);
              const epTitle = ep.Title || `Epizoda ${epNum}`;
              const epRating = parseFloat(ep.imdbRating || '0') || parsedRating;
              const epAirDate = ep.Released || '';
              const epYear = epAirDate ? epAirDate.split(' ')[2] || detail.Year : detail.Year;

              // Find matching TVmaze episode for rich synopsis and real episode screenshot
              const tvmazeEp = tvmazeSeasonEps.find(m => m.episodeNumber === epNum) || tvmazeSeasonEps[epIdx];
              
              // Generate real YouTube search trailer/clip link
              const epYoutubeQuery = `${detail.Title} Season ${s} Episode ${epNum} ${epTitle} promo trailer`;
              const epYoutubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(epYoutubeQuery)}`;

              // Use TVmaze full detailed synopsis if available, otherwise OMDb, otherwise informative fallback
              const epOverview = (tvmazeEp?.overview && tvmazeEp.overview.length > 15)
                ? tvmazeEp.overview
                : (ep.Plot && ep.Plot !== 'N/A' && ep.Plot.length > 10)
                  ? ep.Plot
                  : `Epizoda "${epTitle}" (Sezona ${s}, Epizoda ${epNum}) iz serije "${detail.Title}". Zvanična IMDb ocjena: ${ep.imdbRating && ep.imdbRating !== 'N/A' ? ep.imdbRating : parsedRating}/10.`;

              const epImage = tvmazeEp?.imageUrl || cleanPoster;

              return {
                id: `ep_${detail.imdbID}_s${s}_e${epNum}`,
                episodeNumber: epNum,
                name: epTitle,
                rating: epRating,
                releaseYear: epYear,
                airDate: epAirDate || tvmazeEp?.airDate,
                overview: epOverview,
                imageUrl: epImage,
                youtubeUrl: epYoutubeUrl,
                actors: parsedActors.slice(0, 4)
              };
            });
          } else if (tvmazeSeasonEps.length > 0) {
            // Fallback directly to TVmaze episodes if OMDb had missing season data
            epList = tvmazeSeasonEps.map((tmEp, epIdx) => ({
              id: `ep_${detail.imdbID}_s${s}_e${tmEp.episodeNumber}`,
              episodeNumber: tmEp.episodeNumber,
              name: tmEp.name || `Epizoda ${tmEp.episodeNumber}`,
              rating: tmEp.rating || parsedRating,
              releaseYear: tmEp.airDate ? tmEp.airDate.split('-')[0] : detail.Year,
              airDate: tmEp.airDate,
              overview: tmEp.overview || `Epizoda ${tmEp.episodeNumber} sezone ${s} serije "${detail.Title}".`,
              imageUrl: tmEp.imageUrl || cleanPoster,
              youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${detail.Title} Season ${s} Episode ${tmEp.episodeNumber} trailer`)}`,
              actors: parsedActors.slice(0, 4)
            }));
          } else {
            // Fallback: If no episode list found, create structured episodes
            for (let epIdx = 1; epIdx <= 8; epIdx++) {
              epList.push({
                id: `ep_${detail.imdbID}_s${s}_e${epIdx}`,
                episodeNumber: epIdx,
                name: `Epizoda ${epIdx}`,
                rating: parsedRating,
                releaseYear: detail.Year,
                overview: `Epizoda ${epIdx} sezone ${s} serije "${detail.Title}".`,
                imageUrl: cleanPoster,
                youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${detail.Title} Season ${s} Episode ${epIdx} trailer`)}`,
                actors: parsedActors.slice(0, 3)
              });
            }
          }

          seasons.push({
            seasonNumber: s,
            seasonName: `Sezona ${s}`,
            episodes: epList
          });
        }
      }

      // Movie Trailer URL (prefer official direct embed if found from TMDB, else YouTube query)
      const movieTrailerUrl = officialTrailer || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${detail.Title} ${detail.Year} official trailer`)}`;

      const newEntry: RatingEntry = {
        id: `imdb_${detail.imdbID || Date.now()}`,
        type: isShow ? 'show' : 'movie',
        name: detail.Title,
        year: detail.Year ? detail.Year.split('–')[0].trim() : '2024',
        description: detail.Plot && detail.Plot !== 'N/A' 
          ? detail.Plot 
          : `Katalog naslov uvezen direktno sa IMDb-a. Žanr: ${detail.Genre || 'Drama'}. Režija: ${detail.Director || 'N/A'}.`,
        posterUrl: cleanPoster,
        bannerUrl: cleanPoster,
        customThemeColor: '#eab308',
        source: 'imdb',
        imdbId: detail.imdbID,
        movieRating: !isShow ? parsedRating : undefined,
        movieDuration: !isShow ? detail.Runtime : undefined,
        movieYoutubeUrl: !isShow ? movieTrailerUrl : undefined,
        movieActors: !isShow ? parsedActors : undefined,
        seasons: isShow ? seasons : undefined
      };

      setImportStatusText('Završavam spremanje u katalog...');
      onImportToCatalog(newEntry);
      
      setAddedFeedback(`"${detail.Title}" je uspješno uvezen sa svim sezonama, opisima i glumcima!`);
      setTimeout(() => setAddedFeedback(null), 4000);
      setSelectedDetail(null);
    } catch (err: any) {
      console.error('Greška pri uvozu:', err);
      alert('Došlo je do greške prilikom uvoza naslova: ' + (err.message || 'Nepoznata greška'));
    } finally {
      setIsImporting(false);
      setImportStatusText('');
    }
  };

  // Add Item to a specific Project Folder / Playlist
  const handleConfirmAddToProject = (folderId: string) => {
    if (!projectTargetItem) return;

    let existingProjects: ProjectFolder[] = [];
    try {
      const saved = localStorage.getItem('baza_projekti_v1');
      if (saved) existingProjects = JSON.parse(saved);
    } catch (e) {}

    const targetFolder = existingProjects.find(f => f.id === folderId);
    if (!targetFolder) return;

    const newItem: ProjectItem = {
      id: `proj_item_${Date.now()}`,
      entryId: projectTargetItem.imdbId,
      entryName: projectTargetItem.title,
      type: projectTargetItem.type === 'series' ? 'show' : 'movie',
      posterUrl: projectTargetItem.poster,
      rating: projectTargetItem.rating || 8.0,
      year: projectTargetItem.year,
      addedAt: new Date().toISOString()
    };

    targetFolder.items = [newItem, ...(targetFolder.items || [])];
    targetFolder.updatedAt = new Date().toISOString();

    localStorage.setItem('baza_projekti_v1', JSON.stringify(existingProjects));
    window.dispatchEvent(new CustomEvent('baza_projekti_updated', { detail: existingProjects }));

    if (onAddToProject) {
      onAddToProject(folderId, newItem);
    }

    setAddedFeedback(`Dodato u bazu "${targetFolder.name}"!`);
    setTimeout(() => setAddedFeedback(null), 3500);
    setProjectTargetItem(null);
  };

  const handleCreateNewProjectAndAdd = () => {
    if (!newProjectName.trim() || !projectTargetItem) return;

    const newFolder: ProjectFolder = {
      id: `proj_${Date.now()}`,
      name: newProjectName.trim(),
      description: 'Prilagođena lista naslova uvezenih sa IMDb-a.',
      color: '#eab308',
      icon: 'bookmark',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [{
        id: `proj_item_${Date.now()}`,
        entryId: projectTargetItem.imdbId,
        entryName: projectTargetItem.title,
        type: projectTargetItem.type === 'series' ? 'show' : 'movie',
        posterUrl: projectTargetItem.poster,
        rating: projectTargetItem.rating || 8.0,
        year: projectTargetItem.year,
        addedAt: new Date().toISOString()
      }]
    };

    let existingProjects: ProjectFolder[] = [];
    try {
      const saved = localStorage.getItem('baza_projekti_v1');
      if (saved) existingProjects = JSON.parse(saved);
    } catch (e) {}

    const updatedProjects = [newFolder, ...existingProjects];
    localStorage.setItem('baza_projekti_v1', JSON.stringify(updatedProjects));
    window.dispatchEvent(new CustomEvent('baza_projekti_updated', { detail: updatedProjects }));

    setAddedFeedback(`Kreirana baza "${newFolder.name}" i dodana stavka!`);
    setTimeout(() => setAddedFeedback(null), 3500);
    setNewProjectName('');
    setProjectTargetItem(null);
  };

  // Get user's current project folders for dropdown
  const currentFolders: ProjectFolder[] = React.useMemo(() => {
    try {
      const saved = localStorage.getItem('baza_projekti_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return projectFolders;
  }, [projectFolders, projectTargetItem]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Feedback */}
      <AnimatePresence>
        {addedFeedback && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-6 z-[100] bg-yellow-400 text-zinc-950 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-3 shadow-2xl border border-yellow-300"
          >
            <CheckCircle2 size={18} className="text-zinc-950" />
            <span>{addedFeedback}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Importing Loading Overlay */}
      <AnimatePresence>
        {isImporting && (
          <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-zinc-900 border border-yellow-500/30 rounded-3xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl"
            >
              <div className="w-16 h-16 rounded-3xl bg-yellow-400/15 border border-yellow-400/30 flex items-center justify-center mx-auto text-yellow-400 shadow-lg">
                <RefreshCw className="animate-spin" size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-white uppercase tracking-wider">Uvoženje sa IMDb-a</h3>
                <p className="text-xs text-yellow-400 font-bold">{importStatusText || 'Obrada podataka...'}</p>
                <p className="text-[11px] text-zinc-400">
                  Preuzimamo sve sezone, opise epizoda, zvanične ocjene i biografije glumaca sa Wikipedije.
                </p>
              </div>
              <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden">
                <div className="bg-yellow-400 h-full w-full animate-pulse" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Top Header bar with IMDb gold theme */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border border-yellow-500/20 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-750 text-zinc-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-zinc-700"
                >
                  <ArrowLeft size={13} />
                  <span>Nazad</span>
                </button>
              )}
              <span className="bg-yellow-400 text-zinc-955 text-xs font-black px-2.5 py-0.5 rounded uppercase tracking-wider shadow">
                IMDb / OMDb
              </span>
              <span className="text-xs font-bold text-yellow-500/90 tracking-wide uppercase">
                Globalni Istraživač Titula
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
              Pretraži bilo koji film ili seriju na svijetu
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Istraži zvanične ocjene, sve sezone i epizode sa bogatim opisima (TMDB/TVmaze/OMDb), glumačku postavu sa Wikipedije i YouTube trailere. Uvezi jednim klikom u svoj katalog ili rasporedi u baze.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            performSearch(query);
          }}
          className="mt-6 flex flex-col sm:flex-row gap-3 relative z-10"
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Unesite naziv filma ili serije (npr. Breaking Bad, Oppenheimer, Shogun)..."
              className="w-full pl-11 pr-4 py-3.5 bg-zinc-950/90 border border-zinc-800 focus:border-yellow-400 rounded-2xl text-white placeholder-zinc-500 text-sm focus:outline-none transition shadow-inner"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Filter types */}
            <div className="flex bg-zinc-950 p-1 rounded-2xl border border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setFilterType('all');
                  if (query) performSearch(query, 'all');
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterType === 'all' ? 'bg-yellow-400 text-zinc-955 shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Sve
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterType('movie');
                  if (query) performSearch(query, 'movie');
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  filterType === 'movie' ? 'bg-yellow-400 text-zinc-955 shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Film size={13} /> Filmovi
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterType('series');
                  if (query) performSearch(query, 'series');
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  filterType === 'series' ? 'bg-yellow-400 text-zinc-955 shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Tv size={13} /> Serije
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="px-6 py-3.5 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-zinc-955 font-black uppercase text-xs tracking-wider rounded-2xl transition flex items-center gap-2 shadow-lg shadow-yellow-500/10 cursor-pointer shrink-0 active:scale-95"
            >
              {isLoading ? <RefreshCw className="animate-spin" size={16} /> : <Search size={16} />}
              <span>Pretraži</span>
            </button>
          </div>
        </form>

        {/* Quick Suggestion Pills */}
        <div className="mt-4 flex items-center gap-2 flex-wrap text-xs">
          <span className="text-zinc-500 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1">
            <Sparkles size={12} className="text-yellow-400" /> Popularno:
          </span>
          {POPULAR_SUGGESTIONS.slice(0, 7).map(item => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setQuery(item);
                performSearch(item);
              }}
              className="px-2.5 py-1 bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800/80 hover:border-yellow-500/40 text-zinc-300 hover:text-yellow-400 rounded-lg text-[11px] font-medium transition cursor-pointer"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-2xl text-red-200 text-xs flex items-center gap-3">
          <Info size={18} className="text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Results Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4 text-center">
          <RefreshCw className="w-10 h-10 text-yellow-400 animate-spin" />
          <p className="text-sm font-bold text-zinc-300">Pretražujem IMDb bazu podataka...</p>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <p className="font-bold uppercase tracking-wider">Pronađeno rezultata: {results.length}</p>
            <p className="text-zinc-500">Kliknite na karticu za detalje ili dodajte u katalog</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {results.map(item => {
              const cleanPoster = item.Poster && item.Poster !== 'N/A' ? item.Poster : 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop&q=80';
              const isAlreadyInCatalog = existingEntries.some(e => e.name.toLowerCase() === item.Title.toLowerCase() || e.id.includes(item.imdbID));

              return (
                <motion.div
                  key={item.imdbID}
                  whileHover={{ y: -4 }}
                  className="bg-zinc-900/90 border border-zinc-800 hover:border-yellow-500/40 rounded-2xl overflow-hidden flex flex-col shadow-lg transition-all group"
                >
                  {/* Poster Image */}
                  <div 
                    onClick={() => handleOpenDetail(item.imdbID)}
                    className="relative aspect-[2/3] bg-zinc-950 overflow-hidden cursor-pointer"
                  >
                    <img 
                      src={cleanPoster} 
                      alt={item.Title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80" />
                    
                    {/* Type badge */}
                    <div className="absolute top-3 left-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        item.Type === 'series' ? 'bg-purple-500/90 text-white' : 'bg-yellow-400 text-zinc-955'
                      }`}>
                        {item.Type === 'series' ? 'Serija' : 'Film'}
                      </span>
                    </div>

                    {/* Already in catalog badge */}
                    {isAlreadyInCatalog && (
                      <div className="absolute top-3 right-3">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-zinc-955 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                          <Check size={10} /> U katalogu
                        </span>
                      </div>
                    )}

                    <div className="absolute bottom-3 left-3 right-3">
                      <span className="text-[10px] text-zinc-400 font-mono font-bold block">{item.Year}</span>
                      <h4 className="text-sm font-black text-white line-clamp-2 leading-tight group-hover:text-yellow-400 transition-colors">
                        {item.Title}
                      </h4>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-3 bg-zinc-950 border-t border-zinc-800/80 flex items-center gap-2 mt-auto">
                    <button
                      onClick={() => handleOpenDetail(item.imdbID)}
                      className="flex-1 py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Info size={13} />
                      <span>Detalji</span>
                    </button>

                    <button
                      onClick={() => setProjectTargetItem({
                        title: item.Title,
                        imdbId: item.imdbID,
                        type: item.Type,
                        poster: cleanPoster,
                        rating: 8.0,
                        year: item.Year
                      })}
                      title="Dodaj u bazu ili plejlistu"
                      className="p-2 bg-zinc-850 hover:bg-yellow-400 hover:text-zinc-950 text-zinc-300 rounded-xl transition cursor-pointer"
                    >
                      <Bookmark size={15} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : query && !isLoading ? (
        <div className="py-20 text-center space-y-3 bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-8">
          <Film className="w-12 h-12 text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Nema pronađenih naslova</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Pokušaj sa originalnim engleskim nazivom ili promijeni filter pretrage.
          </p>
        </div>
      ) : (
        /* Default Intro Showcase */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800/60 space-y-3 text-left">
            <div className="w-10 h-10 rounded-2xl bg-yellow-400/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-center">
              <Search size={20} />
            </div>
            <h4 className="font-bold text-white text-sm">Direktna IMDb Pretraga</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Pristupi stotinama hiljada filmova i serija sa zvaničnim IMDb ocjenama, glumačkom postavom i sinopsisom.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800/60 space-y-3 text-left">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Layers size={20} />
            </div>
            <h4 className="font-bold text-white text-sm">Automatsko Učitavanje Svih Sezona</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Za serije povlači sve sezone i svaku epizodu sa njenom IMDb ocjenom, opisom i datumom izlaska.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800/60 space-y-3 text-left">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Bookmark size={20} />
            </div>
            <h4 className="font-bold text-white text-sm">Plejliste i Projekti</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Svrstavaj filmove i serije u tematske fascikle i liste za gledanje (Watchlist) direktno iz preglednika.
            </p>
          </div>
        </div>
      )}

      {/* DETAIL MODAL INSPECTOR */}
      <AnimatePresence>
        {selectedDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl max-h-[90vh] flex flex-col relative text-left">
              {/* Header Hero Banner */}
              <div className="relative h-56 bg-zinc-950 overflow-hidden shrink-0">
                <img 
                  src={selectedDetail.Poster && selectedDetail.Poster !== 'N/A' ? selectedDetail.Poster : 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800'} 
                  alt="" 
                  className="w-full h-full object-cover opacity-25"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/60 to-transparent" />
                
                <button
                  onClick={() => setSelectedDetail(null)}
                  className="absolute top-4 right-4 p-2 bg-zinc-950/80 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition cursor-pointer z-20 border border-zinc-800"
                >
                  <X size={18} />
                </button>

                <div className="absolute bottom-4 left-6 right-6 flex gap-5 items-end z-10">
                  <img 
                    src={selectedDetail.Poster && selectedDetail.Poster !== 'N/A' ? selectedDetail.Poster : 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800'} 
                    alt={selectedDetail.Title}
                    className="w-20 sm:w-24 aspect-[2/3] object-cover rounded-xl border-2 border-zinc-700 shadow-2xl shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-yellow-400 text-zinc-955 text-[10px] font-black uppercase">
                        {selectedDetail.Type === 'series' ? 'Serija' : 'Film'}
                      </span>
                      <span className="text-xs text-zinc-400 font-mono font-bold">{selectedDetail.Year}</span>
                      {selectedDetail.Runtime && (
                        <span className="text-xs text-zinc-400 font-medium">• {selectedDetail.Runtime}</span>
                      )}
                      {selectedDetail.Genre && (
                        <span className="text-xs text-zinc-400 font-medium">• {selectedDetail.Genre}</span>
                      )}
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white truncate mt-1">
                      {selectedDetail.Title}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Body Content */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
                {/* Ratings & Key Metadata Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 text-center space-y-1">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">IMDb Ocjena</span>
                    <div className="flex items-center justify-center gap-1.5 text-yellow-400 font-black font-mono text-lg">
                      <Star size={16} className="fill-yellow-400" />
                      <span>{selectedDetail.imdbRating || 'N/A'}</span>
                      <span className="text-zinc-600 text-xs">/10</span>
                    </div>
                    <span className="text-[9px] text-zinc-500 block">{selectedDetail.imdbVotes || '0'} glasova</span>
                  </div>

                  {selectedDetail.Metascore && selectedDetail.Metascore !== 'N/A' && (
                    <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 text-center space-y-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">Metascore</span>
                      <p className="text-lg font-black text-emerald-400 font-mono">{selectedDetail.Metascore}</p>
                      <span className="text-[9px] text-zinc-500 block">Kritika</span>
                    </div>
                  )}

                  <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 text-center space-y-1">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Režija</span>
                    <p className="text-xs font-bold text-zinc-200 truncate">{selectedDetail.Director || 'N/A'}</p>
                    <span className="text-[9px] text-zinc-500 block">Director</span>
                  </div>

                  <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 text-center space-y-1">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Glumci</span>
                    <p className="text-xs font-bold text-zinc-200 truncate">{selectedDetail.Actors || 'N/A'}</p>
                    <span className="text-[9px] text-zinc-500 block">Glavne uloge</span>
                  </div>
                </div>

                {/* Plot Synopsis */}
                <div className="bg-zinc-950/70 border border-zinc-800/80 p-4 rounded-2xl space-y-1.5">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">Sinopsis / Radnja</span>
                  <p className="text-zinc-300 leading-relaxed text-xs">
                    {selectedDetail.Plot && selectedDetail.Plot !== 'N/A' ? selectedDetail.Plot : 'Nema detaljnog opisa na IMDb-u.'}
                  </p>
                </div>

                {/* If series, show Seasons and Episodes with Live IMDb ratings! */}
                {selectedDetail.Type === 'series' && selectedDetail.totalSeasons && (
                  <div className="space-y-3 bg-zinc-950/90 border border-zinc-800 p-4 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <Tv size={14} className="text-yellow-400" />
                        Epizode po sezonama (Ukupno: {selectedDetail.totalSeasons} sezona)
                      </span>
                    </div>

                    {/* Season Pills */}
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {Array.from({ length: parseInt(selectedDetail.totalSeasons, 10) || 1 }).map((_, idx) => {
                        const sNum = idx + 1;
                        return (
                          <button
                            key={sNum}
                            onClick={() => fetchSeasonEpisodes(selectedDetail.imdbID, sNum)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                              selectedSeasonTab === sNum
                                ? 'bg-yellow-400 text-zinc-955 shadow'
                                : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                            }`}
                          >
                            Sezona {sNum}
                          </button>
                        );
                      })}
                    </div>

                    {/* Episodes List in Selected Season */}
                    {isLoadingSeason ? (
                      <div className="py-8 text-center text-zinc-400">
                        <RefreshCw className="animate-spin w-5 h-5 mx-auto text-yellow-400" />
                        <span className="text-[11px] font-bold mt-2 block">Učitavam ocjene epizoda sezone {selectedSeasonTab}...</span>
                      </div>
                    ) : detailSeasonsData[selectedSeasonTab]?.Episodes ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {detailSeasonsData[selectedSeasonTab].Episodes.map((ep: any) => (
                          <div 
                            key={ep.imdbID || ep.Episode}
                            className="bg-zinc-900/80 border border-zinc-800/80 p-2.5 rounded-xl flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-zinc-800 text-zinc-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                                {ep.Episode}
                              </span>
                              <div className="min-w-0">
                                <h5 className="font-bold text-white text-xs truncate">{ep.Title}</h5>
                                <span className="text-[10px] text-zinc-500 block">{ep.Released || 'Datum nepoznat'}</span>
                              </div>
                            </div>
                            <div className="shrink-0 flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-lg">
                              <Star size={12} className="text-yellow-400 fill-yellow-400" />
                              <span className="text-xs font-black font-mono text-yellow-400">
                                {ep.imdbRating && ep.imdbRating !== 'N/A' ? ep.imdbRating : '—'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-zinc-500 text-xs italic">Nisu pronađene epizode za ovu sezonu.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <a
                  href={`https://www.imdb.com/title/${selectedDetail.imdbID}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-zinc-400 hover:text-yellow-400 flex items-center gap-1 font-bold"
                >
                  <ExternalLink size={13} />
                  <span>Otvori na IMDb.com</span>
                </a>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setProjectTargetItem({
                        title: selectedDetail.Title,
                        imdbId: selectedDetail.imdbID,
                        type: selectedDetail.Type,
                        poster: selectedDetail.Poster && selectedDetail.Poster !== 'N/A' ? selectedDetail.Poster : 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800',
                        rating: parseFloat(selectedDetail.imdbRating || '0') || 8.0,
                        year: selectedDetail.Year
                      });
                    }}
                    className="px-4 py-2.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer"
                  >
                    <FolderPlus size={14} />
                    <span>Dodaj u Plejlistu</span>
                  </button>

                  <button
                    onClick={() => handleImportDetailToCatalog(selectedDetail)}
                    disabled={isImporting}
                    className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-zinc-955 text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center gap-2 shadow-lg cursor-pointer active:scale-95"
                  >
                    {isImporting ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={16} />}
                    <span>Uvezi u Lični Katalog</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD TO PROJECT / PLAYLIST MODAL */}
      <AnimatePresence>
        {projectTargetItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-yellow-400">
                  <Bookmark size={18} />
                  <h3 className="font-black text-sm uppercase tracking-wider text-white">
                    Dodaj u Bazu Projekata
                  </h3>
                </div>
                <button
                  onClick={() => setProjectTargetItem(null)}
                  className="p-1 text-zinc-500 hover:text-white rounded-lg transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Item Preview */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-950 border border-zinc-800/80">
                <img 
                  src={projectTargetItem.poster} 
                  alt={projectTargetItem.title} 
                  className="w-12 aspect-[2/3] object-cover rounded-lg border border-zinc-700"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <span className="text-[10px] font-mono text-zinc-400 font-bold block">{projectTargetItem.year}</span>
                  <h4 className="font-bold text-white text-xs truncate">{projectTargetItem.title}</h4>
                  <span className="text-[10px] text-yellow-400 font-bold">★ {projectTargetItem.rating}</span>
                </div>
              </div>

              {/* Existing Project Folders */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Odaberi postojeću bazu / fasciklu:
                </label>
                {currentFolders.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {currentFolders.map(folder => (
                      <button
                        key={folder.id}
                        onClick={() => handleConfirmAddToProject(folder.id)}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800/80 hover:border-yellow-500/40 text-left transition group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div 
                            className="w-3 h-3 rounded-full shrink-0" 
                            style={{ backgroundColor: folder.color || '#eab308' }} 
                          />
                          <span className="font-bold text-xs text-zinc-200 group-hover:text-yellow-400 truncate">
                            {folder.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                          {folder.items?.length || 0} stavki
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500 text-xs italic bg-zinc-950 p-3 rounded-xl border border-zinc-850">
                    Trenutno nema kreiranih baza. Kreirajte novu ispod.
                  </p>
                )}
              </div>

              {/* Create New Folder Inline */}
              <div className="pt-3 border-t border-zinc-800 space-y-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Ili kreiraj novu bazu:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Naziv nove baze (npr. Sci-Fi Maratoni)..."
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 focus:border-yellow-400 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                  <button
                    onClick={handleCreateNewProjectAndAdd}
                    disabled={!newProjectName.trim()}
                    className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-zinc-955 font-black text-xs uppercase rounded-xl transition cursor-pointer"
                  >
                    Kreiraj
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
