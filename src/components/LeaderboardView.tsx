import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { RatingEntry, Actor } from '../types';
import { Trophy, Users, Star, Award, Sparkles, TrendingUp, UserCheck } from 'lucide-react';

interface LeaderboardViewProps {
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
  onNavigateToActor: (actorName: string) => void;
}

export default function LeaderboardView({
  allActorsWithAppearances,
  onNavigateToActor
}: LeaderboardViewProps) {

  // 1. Leaderboard for appearances counts
  const appearancesLeaderboard = useMemo(() => {
    return [...allActorsWithAppearances]
      .map(item => ({
        actor: item.actor,
        appearancesCount: item.appearances.length,
        characterNames: Array.from(new Set(item.appearances.map(a => a.rawActor.characterName).filter(Boolean))) as string[]
      }))
      .sort((a, b) => b.appearancesCount - a.appearancesCount)
      .slice(0, 10);
  }, [allActorsWithAppearances]);

  // 2. Leaderboard for best-rated actors (minimum 1 appearance)
  const ratingLeaderboard = useMemo(() => {
    return [...allActorsWithAppearances]
      .map(item => {
        const ratedAppearances = item.appearances.filter(a => a.rawActor.performanceRating !== undefined);
        const avg = ratedAppearances.length > 0 
          ? ratedAppearances.reduce((acc, cur) => acc + (cur.rawActor.performanceRating || 0), 0) / ratedAppearances.length
          : 0;

        return {
          actor: item.actor,
          averageRating: avg,
          appearancesRatedCount: ratedAppearances.length,
          appearancesCount: item.appearances.length
        };
      })
      .filter(item => item.averageRating > 0)
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, 10);
  }, [allActorsWithAppearances]);

  // 3. Leaderboard for Actor Combos (who appears together most often in episodes/movies)
  const combosLeaderboard = useMemo(() => {
    const comboMap = new Map<string, { actors: [string, string]; count: number; projectNames: Set<string> }>();

    // For each unique appearance location (e.g. "movie-ID" or "show-ID-sX-epY"), group up the actor names
    const locationMap = new Map<string, string[]>();

    allActorsWithAppearances.forEach(item => {
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

    // Generate pairs
    locationMap.forEach((actorNames, locationKey) => {
      // Find clean human-readable entry name
      let entryTitle = 'Projekt';
      allActorsWithAppearances.forEach(item => {
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

      // Filter duplicates
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

    return Array.from(comboMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [allActorsWithAppearances]);

  return (
    <div className="space-y-8" id="leaderboards-tab-panel">
      
      {/* Intro Header */}
      <div>
        <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
          <Trophy className="text-yellow-400 w-5 h-5" /> Rang Liste i Statistika Glume
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Analiza i rangiranje glumačkih performansi, najčešćih kombinacija glumaca i broja uloga u vašem katalogu
        </p>
      </div>

      {/* Grid containing three distinct sub-leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEADERBOARD 1: MOST PROLIFIC ACTORS (Most appearances) */}
        <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-850">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <TrendingUp size={16} />
            </div>
            <div>
              <h3 className="font-extrabold text-xs text-zinc-200 uppercase tracking-wider">Najaktivniji Glumci</h3>
              <p className="text-[10px] text-zinc-500">Najveći broj uloga u katalogu</p>
            </div>
          </div>

          <div className="space-y-2">
            {appearancesLeaderboard.length === 0 ? (
              <p className="text-xs text-zinc-650 italic text-center py-6">Nema dovoljno podataka</p>
            ) : (
              appearancesLeaderboard.map((item, idx) => (
                <div 
                  key={`app-lead-${item.actor.name}`}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/30 border border-zinc-900/60 hover:bg-zinc-950/70 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Rank Number Badge */}
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black font-mono shrink-0 ${
                      idx === 0 ? 'bg-yellow-400 text-zinc-950' : idx === 1 ? 'bg-zinc-400 text-zinc-950' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-zinc-850 text-zinc-500'
                    }`}>
                      {idx + 1}
                    </span>

                    {/* Actor Meta */}
                    <div className="min-w-0">
                      <button
                        onClick={() => onNavigateToActor(item.actor.name)}
                        className="font-bold text-xs text-zinc-100 hover:text-yellow-400 text-left truncate block focus:outline-none"
                      >
                        {item.actor.name}
                      </button>
                      <span className="text-[9px] text-zinc-500 truncate block">
                        {item.characterNames.join(', ') || 'Nema uloge'}
                      </span>
                    </div>
                  </div>

                  {/* Appearances count indicator */}
                  <span className="text-xs font-black font-mono bg-zinc-900 text-zinc-300 px-2 py-1 rounded-md border border-zinc-850 shrink-0">
                    {item.appearancesCount}x
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* LEADERBOARD 2: BEST RATED ACTORS */}
        <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-850">
            <div className="w-8 h-8 rounded-lg bg-yellow-400/10 flex items-center justify-center text-yellow-400">
              <Award size={16} />
            </div>
            <div>
              <h3 className="font-extrabold text-xs text-zinc-200 uppercase tracking-wider">Najbolje Ocijenjeni</h3>
              <p className="text-[10px] text-zinc-500">Najviša prosječna ocjena performansi</p>
            </div>
          </div>

          <div className="space-y-2">
            {ratingLeaderboard.length === 0 ? (
              <p className="text-xs text-zinc-650 italic text-center py-6">Nema ocijenjenih uloga</p>
            ) : (
              ratingLeaderboard.map((item, idx) => (
                <div 
                  key={`rate-lead-${item.actor.name}`}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/30 border border-zinc-900/60 hover:bg-zinc-950/70 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black font-mono shrink-0 ${
                      idx === 0 ? 'bg-yellow-400 text-zinc-950' : idx === 1 ? 'bg-zinc-400 text-zinc-950' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-zinc-850 text-zinc-500'
                    }`}>
                      {idx + 1}
                    </span>

                    <div className="min-w-0">
                      <button
                        onClick={() => onNavigateToActor(item.actor.name)}
                        className="font-bold text-xs text-zinc-100 hover:text-yellow-400 text-left truncate block focus:outline-none"
                      >
                        {item.actor.name}
                      </button>
                      <span className="text-[9px] text-zinc-500 truncate block">
                        Ocijenjeno: {item.appearancesRatedCount} od {item.appearancesCount} uloga
                      </span>
                    </div>
                  </div>

                  {/* Rating Badge */}
                  <span className="flex items-center gap-0.5 text-xs font-black font-mono text-yellow-500 bg-yellow-400/5 border border-yellow-500/10 px-2.5 py-1 rounded-lg shrink-0">
                    <Star size={10} className="fill-yellow-500 text-yellow-500" />
                    {item.averageRating.toFixed(1)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* LEADERBOARD 3: ACTOR COMBOS */}
        <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-850">
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400">
              <Users size={16} />
            </div>
            <div>
              <h3 className="font-extrabold text-xs text-zinc-200 uppercase tracking-wider">Najčešći Dueti</h3>
              <p className="text-[10px] text-zinc-500">Parovi glumaca sa najviše zajedničkih djela</p>
            </div>
          </div>

          <div className="space-y-2">
            {combosLeaderboard.length === 0 ? (
              <p className="text-xs text-zinc-650 italic text-center py-6">Nema dovoljno uloga za duete</p>
            ) : (
              combosLeaderboard.map((item, idx) => (
                <div 
                  key={`combo-lead-${idx}`}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/30 border border-zinc-900/60 hover:bg-zinc-950/70 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-zinc-850 text-zinc-500 flex items-center justify-center text-[10px] font-black font-mono shrink-0">
                      {idx + 1}
                    </span>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          onClick={() => onNavigateToActor(item.actors[0])}
                          className="font-bold text-xs text-zinc-100 hover:text-yellow-400 text-left focus:outline-none inline"
                        >
                          {item.actors[0]}
                        </button>
                        <span className="text-[10px] text-zinc-600 font-mono">+</span>
                        <button
                          onClick={() => onNavigateToActor(item.actors[1])}
                          className="font-bold text-xs text-zinc-100 hover:text-yellow-400 text-left focus:outline-none inline"
                        >
                          {item.actors[1]}
                        </button>
                      </div>
                      <span className="text-[9px] text-zinc-500 truncate block">
                        U projektima: {Array.from(item.projectNames).join(', ')}
                      </span>
                    </div>
                  </div>

                  {/* Duet frequency count */}
                  <span className="text-xs font-black font-mono bg-zinc-900 text-pink-400 px-2 py-1 rounded-md border border-zinc-850 shrink-0">
                    {item.count}x
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
