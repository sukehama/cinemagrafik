import React, { useState } from 'react';
import { motion } from 'motion/react';
import { RatingEntry, Season } from '../types';
import { X, Film, Tv, Save, Upload, Sparkles } from 'lucide-react';

interface EditEntryModalProps {
  entry: RatingEntry;
  onClose: () => void;
  onSave: (updatedEntry: RatingEntry) => void;
}

const BANNER_PRESETS = [
  { name: 'Kibernetički Sleek', banner: 'https://images.unsplash.com/photo-1563507644-15a65571c366?w=1000&q=80', poster: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80' },
  { name: 'Svemirsko Istraživanje', banner: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1000&q=80', poster: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=400&q=80' },
  { name: 'Gotički Noir', banner: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1000&q=80', poster: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=400&q=80' },
  { name: 'Zalazak Sunca', banner: 'https://images.unsplash.com/photo-1501183007986-d0d080b147f9?w=1000&q=80', poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&q=80' }
];

export default function EditEntryModal({ entry, onClose, onSave }: EditEntryModalProps) {
  const [name, setName] = useState(entry.name);
  const [year, setYear] = useState(entry.year);
  const [description, setDescription] = useState(entry.description);
  const [posterUrl, setPosterUrl] = useState(entry.posterUrl);
  const [bannerUrl, setBannerUrl] = useState(entry.bannerUrl);

  const [seasons, setSeasons] = useState<Season[]>(entry.seasons || []);

  // Movie specific
  const [movieRating, setMovieRating] = useState(entry.movieRating ?? 8.0);
  const [movieDuration, setMovieDuration] = useState(entry.movieDuration ?? '');
  const [movieYoutubeUrl, setMovieYoutubeUrl] = useState(entry.movieYoutubeUrl ?? '');

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

  const applyPreset = (index: number) => {
    setBannerUrl(BANNER_PRESETS[index].banner);
    setPosterUrl(BANNER_PRESETS[index].poster);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Molimo unesite naziv unosa!');

    const updated: RatingEntry = {
      ...entry,
      name: name.trim(),
      year: year.trim() || 'TBA',
      description: description.trim(),
      posterUrl: posterUrl || 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=500&q=80',
      bannerUrl: bannerUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&q=80',
    };

    if (entry.type === 'movie') {
      updated.movieRating = Number(movieRating);
      updated.movieDuration = movieDuration.trim() || undefined;
      updated.movieYoutubeUrl = movieYoutubeUrl.trim() || undefined;
    } else {
      updated.seasons = seasons;
    }

    onSave(updated);
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-zinc-900 border border-zinc-805 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col my-8"
        id={`edit-entry-modal-${entry.id}`}
      >
        {/* Banner with Mini Poster */}
        <div className="h-44 bg-zinc-950 relative overflow-hidden flex items-end">
          <img
            src={bannerUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&q=80'}
            alt="Uredi banner"
            className="w-full h-full object-cover opacity-45 absolute inset-0"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-black/40" />
          
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white p-2 rounded-full transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>

          <div className="p-6 relative z-10 flex items-center gap-4 w-full">
            <div className="w-14 h-20 bg-zinc-950 rounded-lg overflow-hidden border border-zinc-750 shadow-md shrink-0">
              <img
                src={posterUrl || 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=500&q=80'}
                alt="Uredi poster"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-yellow-500 tracking-widest px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
                Uredi: {entry.type === 'movie' ? 'Film' : entry.type === 'universe' ? 'Filmski Univerzum' : 'TV Serija'}
              </span>
              <h2 className="text-xl font-black text-white tracking-tight mt-1 truncate">
                {name || 'Bez naziva'}
              </h2>
            </div>
          </div>
        </div>

        {/* Form Body Scroll Box */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(100vh-250px)]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase text-zinc-400 tracking-wider mb-1">
                Naslov / Naziv projekta
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
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
              rows={3}
              className="w-full bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 focus:border-yellow-400 rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-700 focus:outline-none transition text-xs resize-none"
            />
          </div>

          {/* Quick presets for art choices */}
          <div className="border-t border-zinc-800/60 pt-4">
            <span className="block text-xs font-bold uppercase text-zinc-400 tracking-wider mb-2">
              Predefinisani vizuelni stilovi:
            </span>
            <div className="grid grid-cols-4 gap-2">
              {BANNER_PRESETS.map((preset, idx) => (
                <button
                  key={`preset-edit-${idx}`}
                  type="button"
                  onClick={() => applyPreset(idx)}
                  className="bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 p-2 rounded-lg text-left transition cursor-pointer"
                >
                  <p className="text-[10px] text-zinc-200 font-black uppercase tracking-wide truncate">{preset.name}</p>
                  <span className="text-[9px] text-zinc-500 font-mono block">Primijeni</span>
                </button>
              ))}
            </div>
          </div>

          {/* Poster and Banner links / uploads */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 bg-zinc-950/70 p-3 rounded-xl border border-zinc-800">
              <label className="block text-xs font-bold uppercase text-zinc-400 tracking-wider">
                Poster Slika (URL ili Upload)
              </label>
              <input
                type="text"
                value={posterUrl}
                onChange={(e) => setPosterUrl(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 placeholder-zinc-700 focus:outline-none text-xs"
              />
              <label className="flex items-center justify-center gap-1.5 border border-dashed border-zinc-800 hover:border-yellow-400 bg-zinc-900/40 hover:bg-zinc-950 px-3 py-1.5 rounded-lg cursor-pointer transition text-center">
                <Upload size={12} className="text-zinc-500 hover:text-yellow-400" />
                <span className="text-[10px] text-zinc-400 uppercase font-black">Izaberi sliku postera</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePosterUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="space-y-2 bg-zinc-950/70 p-3 rounded-xl border border-zinc-800">
              <label className="block text-xs font-bold uppercase text-zinc-400 tracking-wider">
                Pozadinska slika (URL ili Upload)
              </label>
              <input
                type="text"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 placeholder-zinc-700 focus:outline-none text-xs"
              />
              <label className="flex items-center justify-center gap-1.5 border border-dashed border-zinc-800 hover:border-yellow-400 bg-zinc-900/40 hover:bg-zinc-950 px-3 py-1.5 rounded-lg cursor-pointer transition text-center">
                <Upload size={12} className="text-zinc-500 hover:text-yellow-400" />
                <span className="text-[10px] text-zinc-400 uppercase font-black">Izaberi sliku pozadine</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Custom season category names editor for series/universes */}
          {(entry.type === 'show' || entry.type === 'universe') && seasons.length > 0 && (
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
              <span className="block text-xs font-bold uppercase text-zinc-400 tracking-wider">
                {entry.type === 'universe' ? 'Nazivi faza / kategorija' : 'Nazivi Sezona'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                {seasons.map((s, idx) => (
                  <div key={`edit-season-name-${s.seasonNumber}`} className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 font-bold shrink-0 w-16">
                      {entry.type === 'universe' ? `Faza ${s.seasonNumber}:` : `Sezona ${s.seasonNumber}:`}
                    </span>
                    <input
                      type="text"
                      value={s.seasonName || ''}
                      placeholder={entry.type === 'universe' ? `npr. Faza ${s.seasonNumber}` : `npr. Sezona ${s.seasonNumber}`}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSeasons(prev => prev.map(item => item.seasonNumber === s.seasonNumber ? { ...item, seasonName: val } : item));
                      }}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-zinc-200 text-xs focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Movie Details (Only shown if entry is movie) */}
          {entry.type === 'movie' && (
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-4" id="edit-movie-specials">
              <h3 className="font-sans font-bold text-xs text-yellow-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles size={14} className="fill-yellow-400 text-yellow-400" /> Atributi filma
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1 flex justify-between">
                    <span>Lična ocjena:</span>
                    <span className="text-yellow-405 font-mono font-bold">
                      {movieRating === 0 ? '0.0 (Još neocjenjeno)' : movieRating.toFixed(1)}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0.0"
                    max="10.0"
                    step="0.1"
                    value={movieRating}
                    onChange={(e) => setMovieRating(Number(e.target.value))}
                    className="w-full accent-yellow-400 cursor-pointer h-1.5 bg-zinc-850 rounded-lg"
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
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-100 placeholder-zinc-705 text-xs"
                />
              </div>
            </div>
          )}

          {/* Submit Action footer */}
          <div className="flex gap-3 pt-4 border-t border-zinc-800 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-805 hover:bg-zinc-750 text-zinc-350 rounded-lg font-bold text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Odustani
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 bg-yellow-405 hover:bg-yellow-500 text-zinc-950 px-5 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-md"
              id="btn-save-edit-spec"
            >
              <Save size={14} /> Spasi izmjene
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
