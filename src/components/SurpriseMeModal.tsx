import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RatingEntry, Episode, Actor } from '../types';
import { X, Sparkles, Filter, Tv, Film, Gift, Trophy, ArrowRight, Star } from 'lucide-react';

interface SurpriseMeModalProps {
  entries: RatingEntry[];
  onClose: () => void;
  onNavigateToEntry: (entryId: string, seasonNum?: number, episodeNum?: number) => void;
}

export default function SurpriseMeModal({ entries, onClose, onNavigateToEntry }: SurpriseMeModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<'all' | 'show' | 'movie' | 'universe'>('all');
  const [selectedEntryId, setSelectedEntryId] = useState<string>('all');
  const [selectedActors, setSelectedActors] = useState<string[]>([]);
  const [surpriseResult, setSurpriseResult] = useState<{
    entry: RatingEntry;
    seasonNum?: number;
    episode?: Episode;
  } | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [noCandidatesError, setNoCandidatesError] = useState(false);

  // Scan entire library to extract all unique actors
  const availableActors = useMemo(() => {
    const actorNames = new Set<string>();
    entries.forEach(entry => {
      if (entry.movieActors) {
        entry.movieActors.forEach(act => {
          if (act.name) actorNames.add(act.name.trim());
        });
      }
      if (entry.seasons) {
        entry.seasons.forEach(s => {
          (s.episodes || []).forEach(ep => {
            if (ep.actors) {
              ep.actors.forEach(act => {
                if (act.name) actorNames.add(act.name.trim());
              });
            }
          });
        });
      }
    });
    return Array.from(actorNames).sort();
  }, [entries]);

  // Filter entry dropdown based on selected format
  const filteredEntryDropdownList = useMemo(() => {
    return entries.filter(e => {
      if (selectedFormat === 'all') return true;
      return e.type === selectedFormat;
    });
  }, [entries, selectedFormat]);

  const handleToggleActor = (actorName: string) => {
    setSelectedActors(prev => {
      if (prev.includes(actorName)) {
        return prev.filter(name => name !== actorName);
      } else {
        // limit to 2 actors maximum as requested by user
        if (prev.length >= 2) {
          return [prev[1], actorName];
        }
        return [...prev, actorName];
      }
    });
  };

  const handleFindSurprise = () => {
    setNoCandidatesError(false);
    
    // Candidates registry holding all individual item entities
    const candidates: {
      entry: RatingEntry;
      seasonNum?: number;
      episode?: Episode;
    }[] = [];

    entries.forEach(e => {
      // 1. Format filter
      if (selectedFormat !== 'all' && e.type !== selectedFormat) return;
      
      // 2. Specific entry title filter
      if (selectedEntryId !== 'all' && e.id !== selectedEntryId) return;

      if (e.type === 'movie') {
        // Actors check
        if (selectedActors.length > 0) {
          const hasAllActors = selectedActors.every(actorName => 
            e.movieActors?.some(act => act.name.trim() === actorName)
          );
          if (!hasAllActors) return;
        }
        
        candidates.push({ entry: e });
      } else if (e.type === 'show' || e.type === 'universe') {
        // Scan episodes/items inside seasons
        (e.seasons || []).forEach(s => {
          (s.episodes || []).forEach(ep => {
            if (selectedActors.length > 0) {
              const hasAllActors = selectedActors.every(actorName => 
                ep.actors?.some(act => act.name.trim() === actorName)
              );
              if (!hasAllActors) return;
            }
            candidates.push({
              entry: e,
              seasonNum: s.seasonNumber,
              episode: ep
            });
          });
        });
      }
    });

    if (candidates.length === 0) {
      setNoCandidatesError(true);
      setSurpriseResult(null);
      return;
    }

    // Pick a random candidate
    const randomIndex = Math.floor(Math.random() * candidates.length);
    const chosen = candidates[randomIndex];
    
    setSurpriseResult(chosen);
    setShowCelebration(true);
  };

  // Static celebration particle configurations
  const celebrationConfettis = Array.from({ length: 35 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100 - 50, // -50vw to 50vw
    y: Math.random() * -80 - 20, // offset heights
    color: ['#eab308', '#22c55e', '#3b82f6', '#ef4444', '#a855f7', '#ec4899', '#f97316'][i % 7],
    size: Math.random() * 8 + 6,
    delay: Math.random() * 0.4,
    rotation: Math.random() * 360,
  }));

  const celebrationBalloons = Array.from({ length: 6 }).map((_, i) => ({
    id: i,
    x: (i - 2.5) * 20, // distribute horizontal
    color: ['#ec4899', '#a855f7', '#0ea5e9', '#3b82f6', '#22c55e', '#eab308'][i % 6],
    size: Math.random() * 20 + 35,
    delay: i * 0.15,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/90 backdrop-blur-md" id="surprise-me-modal-overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        id="surprise-panel"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-805 flex items-center justify-between bg-zinc-950/60 shrink-0">
          <div className="flex items-center gap-2">
            <Gift className="text-yellow-400 animate-bounce" size={20} />
            <div>
              <h2 className="font-extrabold text-sm sm:text-base uppercase tracking-wider text-white">
                Iznenadi me! 🎉
              </h2>
              <p className="text-[10px] sm:text-xs text-zinc-500 font-sans">Kreiraj kombinaciju filtera i osvoji nasumičan film ili epizodu!</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white bg-zinc-850 p-1.5 rounded-full transition-colors flex items-center justify-center shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Contents Scroll Box */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs text-zinc-300">
          
          {!showCelebration ? (
            <div className="space-y-5">
              {/* Type Category Filter */}
              <div className="space-y-2">
                <span className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider block">1. Šta želiš gledati? (Format)</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-850">
                  {[
                    { key: 'all', label: 'Bilo šta', icon: Sparkles },
                    { key: 'movie', label: 'Filmovi', icon: Film },
                    { key: 'show', label: 'Serije', icon: Tv },
                    { key: 'universe', label: 'Univerzumi', icon: Trophy },
                  ].map(f => {
                    const Icon = f.icon;
                    const active = selectedFormat === f.key;
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => {
                          setSelectedFormat(f.key as any);
                          setSelectedEntryId('all'); // reset entry selector
                        }}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg font-bold text-[10px] transition-all cursor-pointer ${
                          active
                            ? 'bg-zinc-800 text-yellow-400 border border-zinc-700 shadow-inner'
                            : 'text-zinc-500 hover:text-zinc-350'
                        }`}
                      >
                        <Icon size={12} />
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Specific Title filtering selection */}
              <div className="space-y-2">
                <label className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider block">2. Odaberite određeni projekt (Opcionalno)</label>
                <select
                  value={selectedEntryId}
                  onChange={(e) => setSelectedEntryId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 p-2.5 rounded-xl text-zinc-200 focus:outline-none focus:border-yellow-450"
                >
                  <option value="all">🍿 Bilo koji projekt u biblioteci</option>
                  {filteredEntryDropdownList.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.type === 'movie' ? '🎬' : item.type === 'universe' ? '🏆' : '📺'} {item.name} ({item.year})
                    </option>
                  ))}
                </select>
              </div>

              {/* Actor Tag Filter chips picker */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider block">3. Filtriraj po glavnim glumcima (Maksimalno 2)</span>
                  {selectedActors.length > 0 && (
                    <button
                      onClick={() => setSelectedActors([])}
                      className="text-[10px] text-yellow-500 hover:text-yellow-400 font-semibold"
                    >
                      Očisti glumce
                    </button>
                  )}
                </div>
                
                {availableActors.length === 0 ? (
                  <p className="text-[10px] text-zinc-650 italic p-3 bg-zinc-950/20 border border-dashed border-zinc-850 rounded-xl text-center">
                    Trenutno nema unesenih glumaca u biblioteci. Da biste koristili ovaj filter, dodajte glumce u epizode/filmove.
                  </p>
                ) : (
                  <div className="border border-zinc-850 bg-zinc-950/40 p-3 rounded-xl max-h-36 overflow-y-auto space-y-1 pr-1">
                    <div className="flex flex-wrap gap-1.5">
                      {availableActors.map(actorName => {
                        const isChosen = selectedActors.includes(actorName);
                        return (
                          <button
                            key={actorName}
                            type="button"
                            onClick={() => handleToggleActor(actorName)}
                            className={`px-2.5 py-1 text-[10px] font-semibold rounded-lg border transition-all cursor-pointer ${
                              isChosen
                                ? 'bg-yellow-400 text-zinc-950 border-yellow-450 font-extrabold scale-102'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-850 hover:border-zinc-800 hover:text-zinc-200'
                            }`}
                          >
                            {actorName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {selectedActors.length > 0 && (
                  <p className="text-[9px] text-zinc-500 font-mono">Odabrani glumci: {selectedActors.join(', ')}</p>
                )}
              </div>

              {/* Error warning if no candidates */}
              {noCandidatesError && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-red-400 font-medium text-[10px] sm:text-xs leading-relaxed"
                >
                  Nismo pronašli nijedan film ili epizodu koji odgovaraju odabranim kriterijima. Pokušajte ukloniti filtere za glumce ili proširite formate!
                </motion.div>
              )}

              {/* Run Trigger action button */}
              <button
                type="button"
                onClick={handleFindSurprise}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-zinc-950 font-black py-3 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-yellow-500/10 transition-transform active:scale-98 cursor-pointer"
              >
                <Gift size={14} className="animate-spin" /> PROVJERI MOJE IZNENAĐENJE! 🎉
              </button>
            </div>
          ) : (
            /* DELIGHTFUL SURPRISE CELEBRATION COMPONENT SCREEN (BIRTHDAY PARTY STYLING) */
            <div className="relative text-center py-6 pb-2 min-h-[300px] overflow-hidden select-none" id="celebration-envelope">
              {/* Confetti Explosion Shower */}
              {celebrationConfettis.map(part => (
                <motion.div
                  key={`conf-${part.id}`}
                  initial={{ x: 0, y: 150, rotate: 0, scale: 0.1, opacity: 1 }}
                  animate={{
                    x: part.x * 2.8,
                    y: part.y * 5.2,
                    rotate: part.rotation + 720,
                    scale: [0.2, 1, 0.9, 0],
                    opacity: [1, 1, 0.8, 0],
                  }}
                  transition={{
                    duration: 2.2,
                    delay: part.delay,
                    ease: 'easeOut',
                  }}
                  className="absolute left-1/2 bottom-8 z-20 pointer-events-none rounded"
                  style={{
                    backgroundColor: part.color,
                    width: part.size,
                    height: part.size * (part.id % 2 === 0 ? 1 : 1.8),
                    marginLeft: -part.size / 2,
                  }}
                />
              ))}

              {/* Floating Balloons upward trend */}
              {celebrationBalloons.map(bal => (
                <motion.div
                  key={`balloon-${bal.id}`}
                  initial={{ x: bal.x, y: 180, opacity: 0 }}
                  animate={{
                    x: [bal.x, bal.x + Math.sin(bal.id) * 20, bal.x - Math.sin(bal.id) * 15],
                    y: -420,
                    opacity: [0, 0.9, 0.9, 0],
                  }}
                  transition={{
                    duration: 3.5,
                    delay: bal.delay,
                    ease: 'easeOut',
                  }}
                  className="absolute pointer-events-none z-10 flex flex-col items-center"
                  style={{
                    left: `calc(50% + ${bal.x}px)`,
                    bottom: 0,
                  }}
                >
                  <div
                    className="rounded-full shadow-lg relative flex items-center justify-center text-xs"
                    style={{
                      backgroundColor: bal.color,
                      width: bal.size,
                      height: bal.size * 1.25,
                    }}
                  >
                    <span className="text-white drop-shadow opacity-60">🎈</span>
                  </div>
                  {/* String of balloon */}
                  <div className="w-0.5 h-12 bg-white/20" />
                </motion.div>
              ))}

              {/* Gift Card Display Frame */}
              <motion.div
                initial={{ scale: 0.6, opacity: 0, rotate: -3 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 15, delay: 0.2 }}
                className="bg-zinc-950/80 max-w-sm mx-auto p-5 rounded-2xl border-2 border-yellow-450 relative z-30 shadow-2xl"
              >
                <span className="text-[10px] font-black uppercase text-yellow-400 tracking-widest block bg-yellow-500/10 px-3 py-1 rounded-full w-max mx-auto border border-yellow-505/20 mb-3">
                  IZNENAĐENJE JE SPREMNO! 🥳✨
                </span>

                <p className="text-[11px] text-zinc-400 mt-1 mb-4 font-sans leading-relaxed">
                  Naš generator ti donosi fantastično iznenađenje iz tvog <strong>Cinema Grafik</strong> kataloga:
                </p>

                {surpriseResult && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-left space-y-3 shadow-inner">
                    <div className="flex gap-3">
                      <div className="w-12 h-16 rounded overflow-hidden bg-black shrink-0 border border-zinc-800">
                        <img
                          src={surpriseResult.entry.posterUrl}
                          alt={surpriseResult.entry.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.2 bg-zinc-950 font-bold border border-zinc-800 text-yellow-500 rounded block w-max">
                          {surpriseResult.entry.type === 'movie' ? '🎬 Dugometražni film' : surpriseResult.entry.type === 'universe' ? '🏆 Filmski univerzumi' : '📺 Serija'}
                        </span>
                        <h4 className="font-extrabold text-white text-xs sm:text-sm mt-1 truncate">
                          {surpriseResult.entry.name}
                        </h4>
                        <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{surpriseResult.entry.year}</p>
                      </div>
                    </div>

                    {/* Specific Season and Episode context if TV Show or Universe */}
                    {surpriseResult.episode && (
                      <div className="border-t border-zinc-805/60 pt-2.5 space-y-1 bg-zinc-950/40 p-2 rounded-lg">
                        <span className="text-[9px] text-emerald-400 uppercase font-mono font-bold tracking-wider block">
                          {surpriseResult.entry.type === 'universe' 
                            ? `Kategorija: ${surpriseResult.entry.seasons?.find(se => se.seasonNumber === surpriseResult.seasonNum)?.seasonName || 'Faza ' + surpriseResult.seasonNum}`
                            : `Sezona ${surpriseResult.seasonNum} • Epizoda ${surpriseResult.episode.episodeNumber}`}
                        </span>
                        <h3 className="font-extrabold text-zinc-200 text-xs sm:text-sm truncate">
                          {surpriseResult.episode.name}
                        </h3>
                        {surpriseResult.episode.rating > 0 ? (
                          <div className="flex items-center gap-1 text-[10px] text-yellow-405 font-bold font-mono">
                            <Star size={11} className="fill-yellow-500 text-yellow-500" />
                            {surpriseResult.episode.rating.toFixed(1)} / 10
                          </div>
                        ) : (
                          <span className="text-[9px] text-zinc-500 italic block">Još neocjenjeno</span>
                        )}
                      </div>
                    )}

                    {/* Simple total review index preview if Movie */}
                    {surpriseResult.entry.type === 'movie' && surpriseResult.entry.movieRating !== undefined && (
                      <div className="border-t border-zinc-805/60 pt-2.5">
                        <span className="text-[9px] text-sky-400 uppercase font-mono font-bold block">Lična ocjena filma</span>
                        <div className="flex items-center gap-1 text-sm text-yellow-450 font-mono font-extrabold mt-0.5">
                          <Star size={12} className="fill-yellow-500 text-yellow-500" />
                          {surpriseResult.entry.movieRating > 0 ? `${surpriseResult.entry.movieRating.toFixed(1)}/10` : 'Još neocjenjeno'}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCelebration(false);
                      setSurpriseResult(null);
                    }}
                    className="bg-zinc-900 hover:bg-zinc-805 text-zinc-400 py-2 rounded-xl text-[10px] font-bold uppercase transition-colors cursor-pointer"
                  >
                    Ponovi 🎉
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (surpriseResult) {
                        onNavigateToEntry(
                          surpriseResult.entry.id,
                          surpriseResult.seasonNum,
                          surpriseResult.episode?.episodeNumber
                        );
                        onClose();
                      }
                    }}
                    className="flex items-center justify-center gap-1 bg-yellow-400 hover:bg-yellow-500 text-zinc-950 font-black py-2 rounded-xl text-[10px] uppercase transition-all cursor-pointer shadow-md"
                  >
                    Gledaj <ArrowRight size={10} />
                  </button>
                </div>
              </motion.div>
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
}
