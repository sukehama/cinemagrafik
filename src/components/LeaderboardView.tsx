import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RatingEntry, Actor } from '../types';
import { 
  Trophy, 
  Users, 
  Star, 
  Award, 
  TrendingUp, 
  Film, 
  Tv, 
  Layers, 
  Sparkles,
  Flame,
  ArrowUpRight,
  Filter
} from 'lucide-react';

interface LeaderboardViewProps {
  entries?: RatingEntry[];
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
      source?: 'local' | 'imdb';
    }[];
  }[];
  onNavigateToActor: (actorName: string) => void;
  onNavigateToEntry?: (entryId: string) => void;
}

export default function LeaderboardView({
  entries = [],
  allActorsWithAppearances,
  onNavigateToActor,
  onNavigateToEntry
}: LeaderboardViewProps) {
  // Source Filter: 'all' | 'local' | 'imdb' (default: 'local')
  const [sourceFilter, setSourceFilter] = useState<'all' | 'local' | 'imdb'>('local');
  
  // Section tab: 'actors' | 'titles' | 'episodes'
  const [leaderboardTab, setLeaderboardTab] = useState<'actors' | 'titles' | 'episodes'>('actors');

  // Filter appearances by selected source
  const filteredActorsData = useMemo(() => {
    return allActorsWithAppearances
      .map(item => {
        const matchingAppearances = item.appearances.filter(app => {
          if (sourceFilter === 'all') return true;
          const isImdb = app.source === 'imdb' || app.entryId.startsWith('imdb_');
          return sourceFilter === 'imdb' ? isImdb : !isImdb;
        });

        return {
          actor: item.actor,
          appearances: matchingAppearances
        };
      })
      .filter(item => item.appearances.length > 0);
  }, [allActorsWithAppearances, sourceFilter]);

  // 1. Leaderboard: Most prolific actors in this category
  const appearancesLeaderboard = useMemo(() => {
    return [...filteredActorsData]
      .map(item => ({
        actor: item.actor,
        appearancesCount: item.appearances.length,
        characterNames: Array.from(new Set(item.appearances.map(a => a.rawActor.characterName).filter(Boolean))) as string[],
        projectNames: Array.from(new Set(item.appearances.map(a => a.entryName)))
      }))
      .sort((a, b) => b.appearancesCount - a.appearancesCount);
  }, [filteredActorsData]);

  // 2. Leaderboard: Best-rated actors in this category
  const ratingLeaderboard = useMemo(() => {
    return [...filteredActorsData]
      .map(item => {
        const ratedAppearances = item.appearances.filter(a => a.rawActor.performanceRating !== undefined && a.rawActor.performanceRating > 0);
        const avg = ratedAppearances.length > 0 
          ? ratedAppearances.reduce((acc, cur) => acc + (cur.rawActor.performanceRating || 0), 0) / ratedAppearances.length
          : 0;

        return {
          actor: item.actor,
          averageRating: avg,
          appearancesRatedCount: ratedAppearances.length,
          appearancesCount: item.appearances.length,
          characterNames: Array.from(new Set(item.appearances.map(a => a.rawActor.characterName).filter(Boolean))) as string[]
        };
      })
      .filter(item => item.averageRating > 0)
      .sort((a, b) => b.averageRating - a.averageRating);
  }, [filteredActorsData]);

  // 3. Leaderboard: Actor Combos / Duos in this category
  const combosLeaderboard = useMemo(() => {
    const comboMap = new Map<string, { actors: [string, string]; count: number; projectNames: Set<string> }>();
    const locationMap = new Map<string, string[]>();

    filteredActorsData.forEach(item => {
      item.appearances.forEach(app => {
        const locationKey = app.type === 'movie' 
          ? `movie-${app.entryId}` 
          : `show-${app.entryId}-s${app.seasonNum}-e${app.epNum}`;
        
        if (!locationMap.has(locationKey)) {
          locationMap.set(locationKey, []);
        }
        locationMap.get(locationKey)!.push(item.actor.name);
      });
    });

    locationMap.forEach((actorNames, locationKey) => {
      let entryTitle = 'Projekt';
      filteredActorsData.forEach(item => {
        const found = item.appearances.find(app => {
          const key = app.type === 'movie' 
            ? `movie-${app.entryId}` 
            : `show-${app.entryId}-s${app.seasonNum}-e${app.epNum}`;
          return key === locationKey;
        });
        if (found) {
          entryTitle = found.entryName;
        }
      });

      const uniqueNames = Array.from(new Set(actorNames)).sort();
      if (uniqueNames.length < 2) return;

      for (let i = 0; i < uniqueNames.length; i++) {
        for (let j = i + 1; j < uniqueNames.length; j++) {
          const act1 = uniqueNames[i];
          const act2 = uniqueNames[j];
          const key = `${act1} & ${act2}`;

          if (!comboMap.has(key)) {
            comboMap.set(key, { actors: [act1, act2], count: 0, projectNames: new Set() });
          }
          const combo = comboMap.get(key)!;
          combo.count += 1;
          combo.projectNames.add(entryTitle);
        }
      }
    });

    return Array.from(comboMap.values()).sort((a, b) => b.count - a.count);
  }, [filteredActorsData]);

  // Helper for computing average rating of an entry
  const getEntryAverageRating = (entry: RatingEntry): number => {
    if (entry.type === 'movie') {
      return entry.movieRating || 0;
    }
    const allEps = (entry.seasons || []).flatMap(s => s.episodes || []);
    if (allEps.length === 0) return 0;
    const total = allEps.reduce((acc, ep) => acc + (ep.rating || 0), 0);
    return Number((total / allEps.length).toFixed(1));
  };

  // Filtered titles by source
  const filteredEntries = useMemo(() => {
    return (entries || []).filter(entry => {
      if (!entry || entry.type === 'universe') return false;
      const isImdb = entry.source === 'imdb' || entry.id?.startsWith('imdb_') || Boolean(entry.imdbId);
      if (sourceFilter === 'imdb') return isImdb;
      if (sourceFilter === 'local') return !isImdb;
      return true;
    });
  }, [entries, sourceFilter]);

  // 4. Leaderboard: Best rated movies and shows
  const topTitlesLeaderboard = useMemo(() => {
    return [...filteredEntries]
      .map(entry => ({
        entry,
        avgRating: getEntryAverageRating(entry),
        isImdb: entry.source === 'imdb' || entry.id?.startsWith('imdb_') || Boolean(entry.imdbId)
      }))
      .filter(t => t.avgRating > 0)
      .sort((a, b) => b.avgRating - a.avgRating);
  }, [filteredEntries]);

  // 5. Leaderboard: Top individual episodes
  const topEpisodesLeaderboard = useMemo(() => {
    const epList: {
      id: string;
      title: string;
      rating: number;
      showName: string;
      entryId: string;
      seasonNum: number;
      epNum: number;
      imageUrl?: string;
      isImdb: boolean;
    }[] = [];

    filteredEntries.forEach(entry => {
      if (entry.type === 'show' && Array.isArray(entry.seasons)) {
        const isImdb = entry.source === 'imdb' || entry.id?.startsWith('imdb_') || Boolean(entry.imdbId);
        entry.seasons.forEach(s => {
          (s.episodes || []).forEach(ep => {
            if (ep && typeof ep.rating === 'number' && ep.rating > 0) {
              epList.push({
                id: ep.id || `${entry.id}-s${s.seasonNumber}-e${ep.episodeNumber}`,
                title: ep.name || `Epizoda ${ep.episodeNumber}`,
                rating: ep.rating,
                showName: entry.name,
                entryId: entry.id,
                seasonNum: s.seasonNumber,
                epNum: ep.episodeNumber,
                imageUrl: ep.imageUrl || entry.posterUrl,
                isImdb
              });
            }
          });
        });
      }
    });

    return epList.sort((a, b) => b.rating - a.rating).slice(0, 50);
  }, [filteredEntries]);

  // Quick statistics
  const localCount = useMemo(() => (entries || []).filter(e => e.type !== 'universe' && e.source !== 'imdb' && !e.id?.startsWith('imdb_')).length, [entries]);
  const imdbCount = useMemo(() => (entries || []).filter(e => e.type !== 'universe' && (e.source === 'imdb' || e.id?.startsWith('imdb_') || Boolean(e.imdbId))).length, [entries]);

  return (
    <div className="space-y-8" id="leaderboards-tab-panel">
      
      {/* Intro Header & Source Segmentation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-zinc-900/50 p-5 rounded-3xl border border-zinc-800/80 backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                Rang Liste & Statistike
              </h2>
              <p className="text-xs text-zinc-400">
                Prikaz performansi glumaca, filmova, serija i epizoda odvojeno za lokalne i IMDb naslove
              </p>
            </div>
          </div>
        </div>

        {/* SOURCE FILTER SEGMENTED BUTTONS (LOKALNO vs IMDB vs SVI) */}
        <div className="flex flex-wrap items-center gap-1.5 bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800 shrink-0 self-start md:self-auto">
          <button
            onClick={() => setSourceFilter('local')}
            className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              sourceFilter === 'local'
                ? 'bg-yellow-400 text-zinc-955 shadow-lg shadow-yellow-400/20 font-black'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <span>🏠</span>
            <span>Lokalno ({localCount})</span>
          </button>

          <button
            onClick={() => setSourceFilter('imdb')}
            className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              sourceFilter === 'imdb'
                ? 'bg-yellow-400 text-zinc-955 shadow-lg shadow-yellow-400/20 font-black'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Sparkles size={13} className="text-yellow-400" />
            <span>IMDb ({imdbCount})</span>
          </button>

          <button
            onClick={() => setSourceFilter('all')}
            className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              sourceFilter === 'all'
                ? 'bg-yellow-400 text-zinc-955 shadow-lg shadow-yellow-400/20 font-black'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Layers size={13} />
            <span>Sve ({entries.filter(e => e.type !== 'universe').length})</span>
          </button>
        </div>
      </div>

      {/* SUB-TABS: GLUMCI vs FILMOVI & SERIJE vs EPIZODE */}
      <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setLeaderboardTab('actors')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
            leaderboardTab === 'actors'
              ? 'bg-zinc-800 text-yellow-400 border border-yellow-400/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
          }`}
        >
          <Users size={15} />
          <span>Glumci ({filteredActorsData.length})</span>
        </button>

        <button
          onClick={() => setLeaderboardTab('titles')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
            leaderboardTab === 'titles'
              ? 'bg-zinc-800 text-yellow-400 border border-yellow-400/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
          }`}
        >
          <Film size={15} />
          <span>Filmovi & Serije ({topTitlesLeaderboard.length})</span>
        </button>

        <button
          onClick={() => setLeaderboardTab('episodes')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
            leaderboardTab === 'episodes'
              ? 'bg-zinc-800 text-yellow-400 border border-yellow-400/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
          }`}
        >
          <Tv size={15} />
          <span>Top Epizode ({topEpisodesLeaderboard.length})</span>
        </button>
      </div>

      {/* CURRENT FILTER BADGE / INFO */}
      <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-yellow-400" />
          <span>
            Prikazujem podatke za: <strong className="text-white uppercase font-black">{
              sourceFilter === 'all' ? 'Sve Naslove (Lokalne + IMDb)' : sourceFilter === 'local' ? 'Samo Lokalne / Autorske Naslove' : 'Samo IMDb / TMDB Uvezene Naslove'
            }</strong>
          </span>
        </div>
      </div>

      {/* VIEW 1: ACTORS LEADERBOARD (3 COLUMNS) */}
      {leaderboardTab === 'actors' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          
          {/* COLUMN 1: MOST PROLIFIC ACTORS */}
          <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-850">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-zinc-200 uppercase tracking-wider">Najaktivniji Glumci</h3>
                  <p className="text-[10px] text-zinc-500">Najveći broj uloga</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 font-bold bg-zinc-950 px-2 py-0.5 rounded-md">
                {appearancesLeaderboard.length} glumaca
              </span>
            </div>

            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              {appearancesLeaderboard.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Users className="w-8 h-8 text-zinc-700 mx-auto" />
                  <p className="text-xs text-zinc-500 italic">Nema glumaca u ovoj kategoriji</p>
                </div>
              ) : (
                appearancesLeaderboard.map((item, idx) => (
                  <div 
                    key={`app-lead-${item.actor.name}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/40 border border-zinc-900/80 hover:bg-zinc-950/90 transition group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black font-mono shrink-0 ${
                        idx === 0 ? 'bg-yellow-400 text-zinc-950' : idx === 1 ? 'bg-zinc-300 text-zinc-950' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-zinc-850 text-zinc-500'
                      }`}>
                        {idx + 1}
                      </span>

                      <div className="min-w-0">
                        <button
                          onClick={() => onNavigateToActor(item.actor.name)}
                          className="font-bold text-xs text-zinc-100 hover:text-yellow-400 text-left truncate block focus:outline-none cursor-pointer"
                        >
                          {item.actor.name}
                        </button>
                        <span className="text-[9px] text-zinc-500 truncate block">
                          {item.characterNames.join(', ') || 'Nema naziva uloge'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-black font-mono bg-zinc-900 text-zinc-300 px-2 py-1 rounded-md border border-zinc-800">
                        {item.appearancesCount}x
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMN 2: BEST RATED ACTORS */}
          <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-850">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-yellow-400/10 flex items-center justify-center text-yellow-400">
                  <Award size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-zinc-200 uppercase tracking-wider">Najbolje Ocijenjeni</h3>
                  <p className="text-[10px] text-zinc-500">Najviša ocjena glume</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 font-bold bg-zinc-950 px-2 py-0.5 rounded-md">
                {ratingLeaderboard.length} ocijenjenih
              </span>
            </div>

            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              {ratingLeaderboard.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Star className="w-8 h-8 text-zinc-700 mx-auto" />
                  <p className="text-xs text-zinc-500 italic">Nema ocijenjenih uloga u ovoj kategoriji</p>
                </div>
              ) : (
                ratingLeaderboard.map((item, idx) => (
                  <div 
                    key={`rate-lead-${item.actor.name}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/40 border border-zinc-900/80 hover:bg-zinc-950/90 transition group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black font-mono shrink-0 ${
                        idx === 0 ? 'bg-yellow-400 text-zinc-950' : idx === 1 ? 'bg-zinc-300 text-zinc-950' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-zinc-850 text-zinc-500'
                      }`}>
                        {idx + 1}
                      </span>

                      <div className="min-w-0">
                        <button
                          onClick={() => onNavigateToActor(item.actor.name)}
                          className="font-bold text-xs text-zinc-100 hover:text-yellow-400 text-left truncate block focus:outline-none cursor-pointer"
                        >
                          {item.actor.name}
                        </button>
                        <span className="text-[9px] text-zinc-500 truncate block">
                          Ocijenjeno: {item.appearancesRatedCount} od {item.appearancesCount} uloga
                        </span>
                      </div>
                    </div>

                    <span className="flex items-center gap-1 text-xs font-black font-mono text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-1 rounded-lg shrink-0">
                      <Star size={11} className="fill-yellow-400 text-yellow-400" />
                      {item.averageRating.toFixed(1)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMN 3: ACTOR COMBOS / DUETS */}
          <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-850">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400">
                  <Users size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-zinc-200 uppercase tracking-wider">Najčešći Dueti</h3>
                  <p className="text-[10px] text-zinc-500">Zajednička djela</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 font-bold bg-zinc-950 px-2 py-0.5 rounded-md">
                {combosLeaderboard.length} parova
              </span>
            </div>

            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              {combosLeaderboard.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Users className="w-8 h-8 text-zinc-700 mx-auto" />
                  <p className="text-xs text-zinc-500 italic">Nema dovoljno zajedničkih uloga</p>
                </div>
              ) : (
                combosLeaderboard.map((item, idx) => (
                  <div 
                    key={`combo-lead-${idx}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/40 border border-zinc-900/80 hover:bg-zinc-950/90 transition group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-zinc-850 text-zinc-500 flex items-center justify-center text-[10px] font-black font-mono shrink-0">
                        {idx + 1}
                      </span>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1">
                          <button
                            onClick={() => onNavigateToActor(item.actors[0])}
                            className="font-bold text-xs text-zinc-100 hover:text-yellow-400 text-left focus:outline-none cursor-pointer"
                          >
                            {item.actors[0]}
                          </button>
                          <span className="text-[10px] text-zinc-600 font-mono">+</span>
                          <button
                            onClick={() => onNavigateToActor(item.actors[1])}
                            className="font-bold text-xs text-zinc-100 hover:text-yellow-400 text-left focus:outline-none cursor-pointer"
                          >
                            {item.actors[1]}
                          </button>
                        </div>
                        <span className="text-[9px] text-zinc-500 truncate block">
                          U projektima: {Array.from(item.projectNames).join(', ')}
                        </span>
                      </div>
                    </div>

                    <span className="text-xs font-black font-mono bg-pink-500/10 text-pink-400 border border-pink-500/20 px-2 py-1 rounded-md shrink-0">
                      {item.count}x
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* VIEW 2: TITLES LEADERBOARD (Top Movies & Shows) */}
      {leaderboardTab === 'titles' && (
        <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-6 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-850">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-yellow-400/10 flex items-center justify-center text-yellow-400">
                <Film size={16} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-zinc-100 uppercase tracking-wider">
                  Top Ocijenjeni Filmovi i Serije
                </h3>
                <p className="text-xs text-zinc-400">Rangirano prema prosječnoj ocjeni projekta</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-950 px-3 py-1 rounded-lg border border-zinc-800">
              {topTitlesLeaderboard.length} naslova
            </span>
          </div>

          {topTitlesLeaderboard.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 italic">
              Nema ocijenjenih naslova u odabranoj kategoriji ({sourceFilter === 'local' ? 'Lokalno' : sourceFilter === 'imdb' ? 'IMDb' : 'Sve'})
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topTitlesLeaderboard.map((item, idx) => (
                <div
                  key={`title-rank-${item.entry.id}`}
                  onClick={() => onNavigateToEntry && onNavigateToEntry(item.entry.id)}
                  className="p-3.5 rounded-2xl bg-zinc-950/40 border border-zinc-900 hover:border-yellow-400/40 hover:bg-zinc-950/80 transition flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black font-mono shrink-0 ${
                      idx === 0 ? 'bg-yellow-400 text-zinc-950' : idx === 1 ? 'bg-zinc-300 text-zinc-950' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-zinc-850 text-zinc-400'
                    }`}>
                      {idx + 1}
                    </span>

                    {item.entry.posterUrl ? (
                      <img
                        src={item.entry.posterUrl}
                        alt={item.entry.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-14 object-cover rounded-lg shrink-0 border border-zinc-800 shadow"
                      />
                    ) : (
                      <div className="w-10 h-14 bg-zinc-900 rounded-lg flex items-center justify-center text-zinc-600 shrink-0">
                        <Film size={16} />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-white group-hover:text-yellow-400 transition truncate">
                          {item.entry.name}
                        </h4>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                          item.isImdb ? 'bg-yellow-500/10 text-yellow-400' : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {item.isImdb ? 'IMDb' : 'Lokalno'}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                        {item.entry.year || 'Godina nepoznata'} • {item.entry.type === 'movie' ? 'Film' : 'Serija'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="flex items-center gap-1 text-xs font-black font-mono text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-1 rounded-xl">
                      <Star size={11} className="fill-yellow-400 text-yellow-400" />
                      {item.avgRating.toFixed(1)}
                    </span>
                    <ArrowUpRight size={14} className="text-zinc-600 group-hover:text-yellow-400 transition opacity-0 group-hover:opacity-100" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: EPISODES LEADERBOARD (Top Individual Episodes) */}
      {leaderboardTab === 'episodes' && (
        <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-6 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-850">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-yellow-400/10 flex items-center justify-center text-yellow-400">
                <Tv size={16} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-zinc-100 uppercase tracking-wider">
                  Top Ocijenjene Epizode
                </h3>
                <p className="text-xs text-zinc-400">Pojedinačne epizode sa najvišim ocjenama u katalogu</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-950 px-3 py-1 rounded-lg border border-zinc-800">
              Top {topEpisodesLeaderboard.length} epizoda
            </span>
          </div>

          {topEpisodesLeaderboard.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 italic">
              Nema ocijenjenih epizoda serija u odabranoj kategoriji
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topEpisodesLeaderboard.map((ep, idx) => (
                <div
                  key={`top-ep-${ep.id}-${idx}`}
                  onClick={() => onNavigateToEntry && onNavigateToEntry(ep.entryId)}
                  className="p-3.5 rounded-2xl bg-zinc-950/40 border border-zinc-900 hover:border-yellow-400/40 hover:bg-zinc-950/80 transition flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black font-mono shrink-0 ${
                      idx === 0 ? 'bg-yellow-400 text-zinc-950' : idx === 1 ? 'bg-zinc-300 text-zinc-950' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-zinc-850 text-zinc-400'
                    }`}>
                      {idx + 1}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-white group-hover:text-yellow-400 transition truncate">
                          {ep.title}
                        </h4>
                        <span className="text-[9px] font-mono text-zinc-400 bg-zinc-900 px-1.5 py-0.2 rounded border border-zinc-800 shrink-0">
                          S{ep.seasonNum}E{ep.epNum}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                        Iz serije: <span className="text-zinc-300 font-semibold">{ep.showName}</span> ({ep.isImdb ? 'IMDb' : 'Lokalno'})
                      </p>
                    </div>
                  </div>

                  <span className="flex items-center gap-1 text-xs font-black font-mono text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-1 rounded-xl shrink-0">
                    <Star size={11} className="fill-yellow-400 text-yellow-400" />
                    {ep.rating.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
