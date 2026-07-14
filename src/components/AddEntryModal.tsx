import React, { useState } from 'react';
import { motion } from 'motion/react';
import { RatingEntry, Season, Episode } from '../types';
import { X, Film, Tv, Save, Upload, Sparkles, Trophy } from 'lucide-react';

interface AddEntryModalProps {
  onClose: () => void;
  onAdd: (newEntry: RatingEntry) => void;
}


export default function AddEntryModal({ onClose, onAdd }: AddEntryModalProps) {
  const [type, setType] = useState<'show' | 'movie' | 'universe'>('show');
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [description, setDescription] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

  // TV Shows and Cinematic Universes Setup
  const [seasonsCount, setSeasonsCount] = useState(1);
  const [episodesPerSeason, setEpisodesPerSeason] = useState(8);
  const [configureIndividually, setConfigureIndividually] = useState(false);
  const [individualSeasonCounts, setIndividualSeasonCounts] = useState<number[]>([]);
  const [initialRating, setInitialRating] = useState(8.0);
  const [universeCategoryNames, setUniverseCategoryNames] = useState<string[]>([]);

  // Movie specific
  const [movieRating, setMovieRating] = useState(8.0);
  const [movieDuration, setMovieDuration] = useState('');
  const [movieYoutubeUrl, setMovieYoutubeUrl] = useState('');

  const handlePosterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setPosterUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setBannerUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };


  const updateSeasonsCountAndSync = (count: number) => {
    const minCount = Math.max(1, Math.min(25, count));
    setSeasonsCount(minCount);
    setIndividualSeasonCounts(prev => {
      const next = [...prev];
      while (next.length < minCount) {
        next.push(episodesPerSeason);
      }
      return next.slice(0, minCount);
    });
    setUniverseCategoryNames(prev => {
      const next = [...prev];
      while (next.length < minCount) {
        next.push('');
      }
      return next.slice(0, minCount);
    });
  };

  const syncEpisodesPerSeasonAll = (count: number) => {
    const eps = Math.max(1, count);
    setEpisodesPerSeason(eps);
    setIndividualSeasonCounts(Array(seasonsCount).fill(eps));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Molimo unesite naziv!');

    const cleanId = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const secureId = `${cleanId}-${Date.now().toString().slice(-4)}`;

    const newEntry: RatingEntry = {
      id: secureId,
      name: name.trim(),
      type,
      year: year.trim() || 'TBA',
      description: description.trim(),
      posterUrl: posterUrl.trim() || 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=500&q=80',
      bannerUrl: bannerUrl.trim() || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&q=80',
    };

    if (type === 'movie') {
      newEntry.movieRating = Number(movieRating);
      newEntry.movieDuration = movieDuration.trim() || undefined;
      newEntry.movieYoutubeUrl = movieYoutubeUrl.trim() || undefined;
    } else {
      // Create seasons and episodes
      const generatedSeasons: Season[] = [];
      for (let s = 1; s <= seasonsCount; s++) {
        const episodes: Episode[] = [];
        const numEpisodes = configureIndividually
          ? (individualSeasonCounts[s - 1] ?? episodesPerSeason)
          : episodesPerSeason;

        for (let ep = 1; ep <= numEpisodes; ep++) {
          episodes.push({
            id: `${secureId}-s${s}e${ep}`,
            episodeNumber: ep,
            name: type === 'universe' ? `Stavka ${ep}` : `Epizoda ${ep}`,
            rating: initialRating,
            overview: type === 'universe'
              ? `Ovo je stavka ${ep} u kategoriji "${universeCategoryNames[s - 1] || 'Faza ' + s}" projekta ${name}.`
              : `Ovo je sezona ${s} epizoda ${ep} projekta ${name}. Detalje možete izmijeniti direktno na rating mreži.`,
            imageUrl: bannerUrl || undefined
          });
        }
        generatedSeasons.push({
          seasonNumber: s,
          seasonName: type === 'universe' ? (universeCategoryNames[s - 1] || `Faza ${s}`) : undefined,
          episodes
        });
      }
      newEntry.seasons = generatedSeasons;
    }

    onAdd(newEntry);
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col my-8"
        id="add-entry-modal"
      >
        {/* Banner with Mini Poster */}
        <div className="h-44 bg-zinc-950 relative overflow-hidden flex items-end">
          <img
            src={bannerUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&q=80'}
            alt="Preliminaarni banner"
            className="w-full h-full object-cover opacity-35 absolute inset-0"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-black/30" />
          
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white p-2 rounded-full transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>

          <div className="p-6 relative z-10 flex items-center gap-4 w-full">
            <div className="w-14 h-20 bg-zinc-950 rounded-lg overflow-hidden border border-zinc-700 shadow-lg shrink-0">
              <img
                src={posterUrl || 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=500&q=80'}
                alt="Preliminarni poster"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-yellow-500 tracking-widest px-2.5 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
                Započni novi unos
              </span>
              <h2 className="text-xl font-black text-white tracking-tight mt-1 truncate">
                {name || 'Novi Projekt'}
              </h2>
            </div>
          </div>
        </div>

        {/* Form Body container */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(100vh-250px)]">
          
          {/* Default media formats */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
              Tip formata projekta
            </label>
            <div className="grid grid-cols-3 gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800" id="media-type-choices">
              <button
                type="button"
                onClick={() => setType('show')}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 font-bold text-xs transition-all cursor-pointer ${
                  type === 'show'
                    ? 'bg-zinc-800 text-yellow-500 font-black shadow-inner'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Tv size={13} />
                <span>Serija</span>
              </button>
              <button
                type="button"
                onClick={() => setType('movie')}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 font-bold text-xs transition-all cursor-pointer ${
                  type === 'movie'
                    ? 'bg-zinc-800 text-yellow-500 font-black shadow-inner'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Film size={13} />
                <span>Film</span>
              </button>
              <button
                type="button"
                onClick={() => setType('universe')}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 font-bold text-xs transition-all cursor-pointer ${
                  type === 'universe'
                    ? 'bg-zinc-800 text-yellow-500 font-black shadow-inner'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Trophy size={13} />
                <span>Univerzum</span>
              </button>
            </div>
          </div>

          {/* Core metadata details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase text-zinc-400 tracking-wider mb-1">
                Naziv / Naslov projekta
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="npr. Breaking Bad, Interstellar"
                className="w-full bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 focus:border-yellow-400 rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-700 focus:outline-none transition text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-zinc-400 tracking-wider mb-1">
                Godina izlaska
              </label>
              <input
                type="text"
                required
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="npr. 2008 - 2013"
                className="w-full bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 focus:border-yellow-400 rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-700 focus:outline-none transition text-xs text-center font-mono font-bold text-yellow-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-zinc-400 tracking-wider mb-1">
              Opis / Sinopsis projekta
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Unesite kratki osvrt ili opis radnje..."
              rows={3}
              className="w-full bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 focus:border-yellow-400 rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-700 focus:outline-none transition text-xs resize-none"
            />
          </div>


          {/* Visual Images layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800">
              <label className="block text-xs font-bold uppercase text-zinc-400 tracking-wider">
                Poster Slika (URL ili Upload)
              </label>
              <input
                type="text"
                value={posterUrl}
                onChange={(e) => setPosterUrl(e.target.value)}
                placeholder="https://... ili izaberite sliku ispod"
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 placeholder-zinc-750 focus:outline-none text-xs"
              />
              <label className="flex items-center justify-center gap-1.5 border border-dashed border-zinc-800 hover:border-yellow-400 bg-zinc-900/35 px-3 py-2 rounded-lg cursor-pointer transition text-center">
                <Upload size={12} className="text-zinc-500" />
                <span className="text-[10px] text-zinc-400 uppercase font-black">Izaberi sliku postera</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePosterUpload}
                  className="hidden"
                />
              </label>
              {posterUrl && (
                <div className="text-[8px] text-zinc-500 font-mono truncate">
                  Spreman Base64 poster
                </div>
              )}
            </div>

            <div className="space-y-2 bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800">
              <label className="block text-xs font-bold uppercase text-zinc-400 tracking-wider">
                Pozadinska slika (URL ili Upload)
              </label>
              <input
                type="text"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://... ili izaberite sliku ispod"
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 placeholder-zinc-750 focus:outline-none text-xs"
              />
              <label className="flex items-center justify-center gap-1.5 border border-dashed border-zinc-800 hover:border-yellow-400 bg-zinc-900/35 px-3 py-2 rounded-lg cursor-pointer transition text-center">
                <Upload size={12} className="text-zinc-500" />
                <span className="text-[10px] text-zinc-400 uppercase font-black">Izaberi sliku pozadine</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerUpload}
                  className="hidden"
                />
              </label>
              {bannerUrl && (
                <div className="text-[8px] text-zinc-500 font-mono truncate">
                  Spremna Base64 pozadina
                </div>
              )}
            </div>
          </div>

          {/* Series / Universe options setup */}
          {(type === 'show' || type === 'universe') && (
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-4" id="show-initialization-tools">
              <h3 className="font-sans font-bold text-xs text-yellow-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles size={14} className="fill-yellow-400 text-yellow-400" /> 
                {type === 'universe' ? 'Generisanje faza / kategorija' : 'Generisane sezone / epizode'}
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                    {type === 'universe' ? 'Broj faza / kategorija' : 'Broj Sezona'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={seasonsCount}
                    onChange={(e) => updateSeasonsCountAndSync(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-yellow-500 font-mono font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                    {type === 'universe' ? 'Stavki po fazi' : 'Epizoda po sezoni'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={25}
                    value={episodesPerSeason}
                    onChange={(e) => syncEpisodesPerSeasonAll(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-yellow-500 font-mono font-bold text-center"
                  />
                </div>
              </div>

              {/* Specific custom categories naming block if cinematic universe is chosen */}
              {type === 'universe' && (
                <div className="space-y-2 p-3.5 bg-zinc-900/60 border border-zinc-850 rounded-xl">
                  <span className="block text-[10px] font-bold text-zinc-350 uppercase tracking-wide">
                    Naziv faza / kategorija univerzuma:
                  </span>
                  <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {Array.from({ length: seasonsCount }).map((_, sIdx) => {
                      const labelText = `Faza / Kategorija ${sIdx + 1}`;
                      const val = universeCategoryNames[sIdx] || '';
                      return (
                        <div key={`univ-create-${sIdx}`} className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-500 font-mono font-bold shrink-0 w-16">Udio {sIdx + 1}:</span>
                          <input
                            type="text"
                            value={val}
                            placeholder={`npr. ${labelText}`}
                            onChange={(e) => {
                              const v = e.target.value;
                              setUniverseCategoryNames(prev => {
                                const next = [...prev];
                                while (next.length < seasonsCount) next.push('');
                                next[sIdx] = v;
                                return next;
                              });
                            }}
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-zinc-200 text-xs focus:outline-none"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Set specific sizes individually */}
              <div className="pt-1.5 border-t border-zinc-900/50">
                <label className="flex items-center gap-2 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={configureIndividually}
                    onChange={(e) => {
                      setConfigureIndividually(e.target.checked);
                      if (e.target.checked) updateSeasonsCountAndSync(seasonsCount);
                    }}
                    className="rounded text-yellow-500 focus:ring-yellow-400 h-3.5 w-3.5 bg-zinc-900 border-zinc-800"
                  />
                  <span className="text-xs font-semibold text-zinc-300">
                    Definiši poseban broj stavki po nivoima
                  </span>
                </label>

                {configureIndividually && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                    {Array.from({ length: seasonsCount }).map((_, sIndex) => {
                      const sNum = sIndex + 1;
                      const val = individualSeasonCounts[sIndex] ?? episodesPerSeason;
                      return (
                        <div key={`indiv-s-${sNum}`} className="space-y-1">
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                            {type === 'universe' ? `F{sNum} stavke` : `S{sNum} epizoda`}
                          </span>
                          <input
                            type="number"
                            min={1}
                            max={35}
                            value={val}
                            onChange={(e) => {
                              const newVal = Math.max(1, Number(e.target.value));
                              setIndividualSeasonCounts(prev => {
                                const next = [...prev];
                                while (next.length < seasonsCount) {
                                  next.push(episodesPerSeason);
                                }
                                next[sIndex] = newVal;
                                return next;
                              });
                            }}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-center font-mono font-bold text-yellow-500 text-xs"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1 flex justify-between">
                  <span>Početna ocjena svih stavki:</span>
                  <span className="text-yellow-400 font-bold">
                    {initialRating === 0 ? '0.0 (Još neocjenjeno)' : initialRating.toFixed(1)}
                  </span>
                </label>
                <input
                  type="range"
                  min="0.0"
                  max="10.0"
                  step="0.1"
                  value={initialRating}
                  onChange={(e) => setInitialRating(Number(e.target.value))}
                  className="w-full accent-yellow-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Film options format */}
          {type === 'movie' && (
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-4" id="movie-initialization-tools">
              <h3 className="font-sans font-bold text-xs text-yellow-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles size={14} className="fill-yellow-400 text-yellow-400" /> Detalji filma
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1 flex justify-between">
                    <span>Ocjena filma:</span>
                    <span className="text-yellow-400 font-mono font-bold">
                      {movieRating === 0 ? '0.0 (Neocjenjeno)' : movieRating.toFixed(1)}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0.0"
                    max="10.0"
                    step="0.1"
                    value={movieRating}
                    onChange={(e) => setMovieRating(Number(e.target.value))}
                    className="w-full accent-yellow-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                    Trajanje filma
                  </label>
                  <input
                    type="text"
                    value={movieDuration}
                    onChange={(e) => setMovieDuration(e.target.value)}
                    placeholder="npr. 2h 15m"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-100 placeholder-zinc-700 font-semibold text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                  YouTube link filma (embed ili puni video)
                </label>
                <input
                  type="text"
                  value={movieYoutubeUrl}
                  onChange={(e) => setMovieYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-100 placeholder-zinc-700 text-xs"
                />
              </div>
            </div>
          )}

          {/* Submit controls */}
          <div className="flex gap-3 pt-4 border-t border-zinc-800 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-350 rounded-lg font-bold text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Odustani
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-500 text-zinc-950 px-5 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-md"
              id="btn-add-entry-spec"
            >
              <Save size={14} /> Spasi katalog
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
