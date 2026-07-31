import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Episode, Actor, GuestReview, RatingEntry, FeaturedMoment } from '../types';
import { getYoutubeEmbedUrl, getRatingColorClass } from '../utils';
import { X, Save, Trash2, Edit2, Play, Star, Upload, Plus, Users, MessageSquare, ChevronRight, ChevronLeft, Check, Video, Clock } from 'lucide-react';

interface DetailPopupProps {
  episode: Episode;
  seasonNumber: number;
  onClose: () => void;
  onSave: (updatedEpisode: Episode) => void;
  onDelete?: () => void;
  allEntriesAvailable: RatingEntry[];
  onNavigateToActor?: (actorName: string) => void;
  onNavigateToEntry?: (entryId: string, seasonNum?: number, episodeNum?: number) => void;
  onNavigateEpisode?: (direction: 'next' | 'prev') => void;
  hasNextEpisode?: boolean;
  hasPrevEpisode?: boolean;
}

export default function DetailPopup({
  episode,
  seasonNumber,
  onClose,
  onSave,
  onDelete,
  allEntriesAvailable = [],
  onNavigateToActor,
  onNavigateToEntry,
  onNavigateEpisode,
  hasNextEpisode = false,
  hasPrevEpisode = false
}: DetailPopupProps) {
  const [name, setName] = useState(episode.name);
  const [rating, setRating] = useState(episode.rating);
  const [year, setYear] = useState<string | number>(episode.year || ''); // DODANO: Godina
  const [imageUrl, setImageUrl] = useState(episode.imageUrl || '');
  const [youtubeUrl, setYoutubeUrl] = useState(episode.youtubeUrl || '');
  const [overview, setOverview] = useState(episode.overview || '');
  const [isEditing, setIsEditing] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [linkText, setLinkText] = useState(episode.linkText || '');
  const [linkTargetId, setLinkTargetId] = useState(episode.linkTargetId || '');

  const [guestReviews, setGuestReviews] = useState<GuestReview[]>(episode.guestReviews || []);
  const [actors, setActors] = useState<Actor[]>(episode.actors || []);

  const [isAddingReview, setIsAddingReview] = useState(false);
  const [newReviewVoter, setNewReviewVoter] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(8.0);
  const [newReviewText, setNewReviewText] = useState('');
  const [newReviewPhoto, setNewReviewPhoto] = useState('');

  const [isAddingActor, setIsAddingActor] = useState(false);
  const [newActorName, setNewActorName] = useState('');
  const [newActorCharacter, setNewActorCharacter] = useState('');
  const [newActorPhoto, setNewActorPhoto] = useState('');
  const [newActorBio, setNewActorBio] = useState('');
  const [newActorOtherInfo, setNewActorOtherInfo] = useState('');
  const [autofillSuccessMsg, setAutofillSuccessMsg] = useState('');

  const [actorSearchQuery, setActorSearchQuery] = useState('');
  const [selectedActorsMap, setSelectedActorsMap] = useState<{[actorId: string]: { actor: Actor; characterName: string }}>({});
  const [activeActorTab, setActiveActorTab] = useState<'search' | 'new'>('search');
  const [showAllActors, setShowAllActors] = useState(false);

  const [featuredMoments, setFeaturedMoments] = useState<FeaturedMoment[]>(episode.featuredMoments || []);
  const [isAddingMoment, setIsAddingMoment] = useState(false);
  const [newMomentTitle, setNewMomentTitle] = useState('');
  const [newMomentStart, setNewMomentStart] = useState('');
  const [newMomentEnd, setNewMomentEnd] = useState('');
  const [newMomentNotes, setNewMomentNotes] = useState('');
  const [videoStartTime, setVideoStartTime] = useState<number | null>(null);

  useEffect(() => {
    setName(episode.name);
    setRating(episode.rating);
    setYear(episode.year || '');
    setImageUrl(episode.imageUrl || '');
    setYoutubeUrl(episode.youtubeUrl || '');
    setOverview(episode.overview || '');
    setLinkText(episode.linkText || '');
    setLinkTargetId(episode.linkTargetId || '');
    setGuestReviews(episode.guestReviews || []);
    setActors(episode.actors || []);
    setFeaturedMoments(episode.featuredMoments || []);
    setIsEditing(false);
    setShowTrailer(false);
  }, [episode]);

  const handleSave = () => {
    onSave({
      ...episode,
      name,
      rating: Number(rating),
      year: year ? String(year) : undefined,
      imageUrl: imageUrl || undefined,
      youtubeUrl: youtubeUrl || undefined,
      overview: overview || undefined,
      guestReviews,
      actors,
      featuredMoments,
      linkText: linkText || undefined,
      linkTargetId: linkTargetId || undefined
    });
    setIsEditing(false);
  };

  // --- Glumci: dodavanje, uklanjanje, ocjenjivanje ---
  const handleAddActor = () => {
    if (!newActorName.trim()) return;
    const newActor: Actor = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: newActorName.trim(),
      characterName: newActorCharacter.trim() || undefined,
      photoUrl: newActorPhoto.trim() || undefined,
      bio: newActorBio.trim() || undefined,
      otherInfo: newActorOtherInfo.trim() || undefined,
    };
    setActors([...actors, newActor]);
    setNewActorName(''); setNewActorCharacter(''); setNewActorPhoto(''); setNewActorBio(''); setNewActorOtherInfo('');
    setIsAddingActor(false);
  };

  const handleRemoveActor = (id: string) => {
    setActors(actors.filter(a => a.id !== id));
  };

  const handleRateActor = (id: string, rating: number) => {
    setActors(actors.map(a => a.id === id ? { ...a, performanceRating: rating } : a));
  };

  // --- Kritike: dodavanje, uklanjanje ---
  const handleAddReview = () => {
    if (!newReviewVoter.trim()) return;
    const review: GuestReview = {
      id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      voterName: newReviewVoter.trim(),
      rating: Number(newReviewRating),
      reviewText: newReviewText.trim() || undefined,
      photoUrl: newReviewPhoto.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    setGuestReviews([...guestReviews, review]);
    setNewReviewVoter(''); setNewReviewRating(8.0); setNewReviewText(''); setNewReviewPhoto('');
    setIsAddingReview(false);
  };

  const handleRemoveReview = (id: string) => {
    setGuestReviews(guestReviews.filter(r => r.id !== id));
  };

  // --- Istaknuti momenti: dodavanje, uklanjanje ---
  const handleAddMoment = () => {
    if (!newMomentTitle.trim()) return;
    const moment: FeaturedMoment = {
      id: `mom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: newMomentTitle.trim(),
      startTime: newMomentStart.trim(),
      endTime: newMomentEnd.trim(),
      notes: newMomentNotes.trim() || undefined,
    };
    setFeaturedMoments([...featuredMoments, moment]);
    setNewMomentTitle(''); setNewMomentStart(''); setNewMomentEnd(''); setNewMomentNotes('');
    setIsAddingMoment(false);
  };

  const handleRemoveMoment = (id: string) => {
    setFeaturedMoments(featuredMoments.filter(m => m.id !== id));
  };

  const embedUrl = getYoutubeEmbedUrl(youtubeUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-955/90 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
      >
        {isEditing ? (
          <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60 shrink-0">
            <div className="min-w-0">
              <span className="text-[10px] font-mono font-bold text-yellow-400 uppercase tracking-widest block">
                Uređivanje • Epizoda {episode.episodeNumber}
              </span>
              <h3 className="text-sm sm:text-base font-black text-white truncate pr-4">
                Uredi detalje epizode
              </h3>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Otkaži
              </button>
              <button onClick={onClose} className="text-zinc-400 hover:text-white bg-zinc-800 p-1.5 rounded-full cursor-pointer">
                <X size={15} />
              </button>
            </div>
          </div>
        ) : (
          <div className="h-56 sm:h-72 bg-zinc-950 relative overflow-hidden flex items-end shrink-0 select-none">
            <img
              src={imageUrl || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop&q=80'}
              alt={name}
              className="w-full h-full object-cover opacity-50 absolute inset-0 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-black/70 z-10" />
            
            {embedUrl && (
              <div className="absolute inset-0 flex items-center justify-center z-15">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowTrailer(true)}
                  className="bg-red-600 hover:bg-red-500 text-white p-4.5 rounded-full shadow-2xl cursor-pointer"
                >
                  <Play size={22} className="fill-white ml-0.5" />
                </motion.button>
              </div>
            )}

            <div className="absolute top-4 right-4 flex items-center gap-1.5 z-20">
              <button
                onClick={() => setIsEditing(true)}
                className="px-2.5 py-1.5 bg-zinc-950/80 hover:bg-zinc-900 text-yellow-400 border border-zinc-800 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
              >
                <Edit2 size={11} /> Uredi
              </button>
              <button onClick={onClose} className="text-zinc-400 hover:text-white bg-zinc-950/80 p-1.5 rounded-full cursor-pointer backdrop-blur-md">
                <X size={13} />
              </button>
            </div>

            <div className="p-5 sm:p-6 relative z-10 flex flex-col justify-end w-full gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 font-mono text-[10px] font-black uppercase tracking-wider">
                S{seasonNumber < 10 ? `0${seasonNumber}` : seasonNumber}E{episode.episodeNumber < 10 ? `0${episode.episodeNumber}` : episode.episodeNumber} • Sezona {seasonNumber}, Epizoda {episode.episodeNumber}
              </span>

              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 w-full">
                <h3 className="text-base sm:text-2xl font-black text-white tracking-tight drop-shadow-xl pr-2">
                  {name && !name.toLowerCase().startsWith('epizoda') ? name : (name || `Epizoda ${episode.episodeNumber}`)}
                </h3>
                
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-xl font-black font-mono text-xs uppercase tracking-wider border ${getRatingColorClass(Number(rating))}`}>
                    <Star size={12} className="fill-current" />
                    <span>{Number(rating) === 0 ? 'N/A' : Number(rating).toFixed(1)}</span>
                  </div>

                  {/* DODANO: Prikaz godine epizode ako postoji */}
                  {year && (
                    <span className="px-2.5 py-1 rounded-xl bg-zinc-900/80 border border-zinc-800 text-[10px] font-mono text-yellow-400 font-bold flex items-center gap-1">
                      📅 {year}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs text-zinc-300">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wide mb-1">
                  Naziv epizode:
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 text-zinc-100 focus:outline-none focus:border-yellow-400"
                />
              </div>

              {/* DODANO: Polje za unosenje Godine epizode */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wide mb-1">
                  Godina / Datum izlaska epizode:
                </label>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="npr. 2024 ili 12.05.2024"
                  className="w-full bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 text-zinc-100 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wide mb-1 flex justify-between">
                  <span>Ocjena:</span>
                  <span className="text-yellow-400 font-mono font-bold">{Number(rating).toFixed(1)}/10</span>
                </label>
                <input
                  type="range"
                  min="0.0"
                  max="10.0"
                  step="0.1"
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg accent-yellow-400 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wide mb-1">
                  Opis (Sinopsis):
                </label>
                <textarea
                  value={overview}
                  onChange={(e) => setOverview(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 text-zinc-100 focus:outline-none focus:border-yellow-400"
                />
              </div>

              <button
                onClick={handleSave}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-zinc-955 font-black py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-md"
              >
                <Save size={13} /> Spasi izmjene
              </button>
            </div>
          ) : (
            <>
            {/* Sinopsis */}
            <div className="bg-zinc-900/40 p-4.5 rounded-2xl border border-zinc-800/40 space-y-2">
              <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-widest block">SINOPSIS</span>
              <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                {overview || "Nema unesenog opisa za ovu epizodu."}
              </p>
            </div>

            {/* GLUMCI U EPIZODI */}
            <div className="bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <Users size={12} className="text-yellow-400" /> GLUMCI ({actors.length})
                </span>
                <button
                  onClick={() => setIsAddingActor(!isAddingActor)}
                  className="flex items-center gap-1 text-[10px] font-bold uppercase text-yellow-400 hover:text-yellow-300 bg-zinc-950/60 px-2 py-1 rounded-lg border border-zinc-800 cursor-pointer"
                >
                  <Plus size={11} /> Dodaj Glumca
                </button>
              </div>

              {isAddingActor && (
                <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input value={newActorName} onChange={e => setNewActorName(e.target.value)} placeholder="Ime glumca *" className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-yellow-400" />
                    <input value={newActorCharacter} onChange={e => setNewActorCharacter(e.target.value)} placeholder="Ime lika (uloga)" className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-yellow-400" />
                  </div>
                  <input value={newActorPhoto} onChange={e => setNewActorPhoto(e.target.value)} placeholder="URL slike (opcionalno)" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-yellow-400" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input value={newActorBio} onChange={e => setNewActorBio(e.target.value)} placeholder="Biografija (opcionalno)" className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-yellow-400" />
                    <input value={newActorOtherInfo} onChange={e => setNewActorOtherInfo(e.target.value)} placeholder="Ostale info (opcionalno)" className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-yellow-400" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddActor} className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-zinc-950 text-xs font-black py-2 rounded-lg uppercase cursor-pointer">Dodaj</button>
                    <button onClick={() => setIsAddingActor(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold py-2 px-3 rounded-lg cursor-pointer">Otkaži</button>
                  </div>
                </div>
              )}

              {actors.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {actors.map(actor => (
                    <div key={actor.id} className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-900 flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                          {actor.photoUrl ? <img src={actor.photoUrl} alt={actor.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <Users size={16} className="text-zinc-600" />}
                        </div>
                        <div className="min-w-0">
                          {onNavigateToActor ? (
                            <button onClick={() => onNavigateToActor(actor.name)} className="font-extrabold text-[12px] text-zinc-100 hover:text-yellow-400 transition truncate text-left cursor-pointer">{actor.name}</button>
                          ) : (
                            <h4 className="font-extrabold text-[12px] text-zinc-100 truncate">{actor.name}</h4>
                          )}
                          {actor.characterName && <p className="text-[10px] text-zinc-400 truncate">ulozi: {actor.characterName}</p>}
                          <div className="flex items-center gap-0.5 mt-1">
                            {[1,2,3,4,5,6,7,8,9,10].map(s => (
                              <button key={s} onClick={() => handleRateActor(actor.id, s)} title={`Ocijeni ${s}/10`} className="cursor-pointer hover:scale-125 transition">
                                <Star size={10} className={s <= (actor.performanceRating || 0) ? 'fill-yellow-500 text-yellow-500' : 'text-zinc-700 hover:text-zinc-500'} />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleRemoveActor(actor.id)} className="text-zinc-600 hover:text-red-400 p-1 shrink-0 rounded hover:bg-red-500/10 transition cursor-pointer" title="Ukloni glumca"><X size={12} /></button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-zinc-600 text-center py-2">Nema dodatih glumaca za ovu epizodu.</p>
              )}
            </div>

            {/* GOSTUJUĆE KRITIKE / GLASOVI */}
            <div className="bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <MessageSquare size={12} className="text-yellow-400" /> GOSTUJUĆE KRITIKE ({guestReviews.length})
                </span>
                <button
                  onClick={() => setIsAddingReview(!isAddingReview)}
                  className="flex items-center gap-1 text-[10px] font-bold uppercase text-yellow-400 hover:text-yellow-300 bg-zinc-950/60 px-2 py-1 rounded-lg border border-zinc-800 cursor-pointer"
                >
                  <Plus size={11} /> Dodaj Kritiku
                </button>
              </div>

              {isAddingReview && (
                <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800 space-y-2.5">
                  <input value={newReviewVoter} onChange={e => setNewReviewVoter(e.target.value)} placeholder="Ime kritičara / platforme *" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-yellow-400" />
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase shrink-0">Ocjena:</span>
                    <input type="range" min="0" max="10" step="0.1" value={newReviewRating} onChange={e => setNewReviewRating(Number(e.target.value))} className="flex-1 accent-yellow-400 cursor-pointer h-1" />
                    <span className="text-xs font-mono font-black text-yellow-400 shrink-0 w-8 text-right">{newReviewRating.toFixed(1)}</span>
                  </div>
                  <input value={newReviewPhoto} onChange={e => setNewReviewPhoto(e.target.value)} placeholder="URL slike (opcionalno)" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-yellow-400" />
                  <textarea value={newReviewText} onChange={e => setNewReviewText(e.target.value)} placeholder="Tekst kritike (opcionalno)" rows={2} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-yellow-400 resize-none" />
                  <div className="flex gap-2">
                    <button onClick={handleAddReview} className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-zinc-950 text-xs font-black py-2 rounded-lg uppercase cursor-pointer">Dodaj</button>
                    <button onClick={() => setIsAddingReview(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold py-2 px-3 rounded-lg cursor-pointer">Otkaži</button>
                  </div>
                </div>
              )}

              {guestReviews.length > 0 ? (
                <div className="space-y-2">
                  {guestReviews.map(review => (
                    <div key={review.id} className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-900 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-zinc-100 truncate">{review.voterName}</span>
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${getRatingColorClass(review.rating)}`}>★ {review.rating.toFixed(1)}</span>
                        </div>
                        {review.reviewText && <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{review.reviewText}</p>}
                      </div>
                      <button onClick={() => handleRemoveReview(review.id)} className="text-zinc-600 hover:text-red-400 p-1 shrink-0 rounded hover:bg-red-500/10 transition cursor-pointer" title="Ukloni kritiku"><X size={12} /></button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-zinc-600 text-center py-2">Nema dodatih kritika za ovu epizodu.</p>
              )}
            </div>

            {/* ISTAKNUTI MOMENTI */}
            <div className="bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <Video size={12} className="text-yellow-400" /> ISTAKNUTI MOMENTI ({featuredMoments.length})
                </span>
                <button
                  onClick={() => setIsAddingMoment(!isAddingMoment)}
                  className="flex items-center gap-1 text-[10px] font-bold uppercase text-yellow-400 hover:text-yellow-300 bg-zinc-950/60 px-2 py-1 rounded-lg border border-zinc-800 cursor-pointer"
                >
                  <Plus size={11} /> Dodaj Moment
                </button>
              </div>

              {isAddingMoment && (
                <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800 space-y-2.5">
                  <input value={newMomentTitle} onChange={e => setNewMomentTitle(e.target.value)} placeholder="Naslov momenta *" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-yellow-400" />
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="flex items-center gap-2">
                      <Clock size={12} className="text-zinc-500 shrink-0" />
                      <input value={newMomentStart} onChange={e => setNewMomentStart(e.target.value)} placeholder="Početak (01:23)" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-yellow-400" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={12} className="text-zinc-500 shrink-0" />
                      <input value={newMomentEnd} onChange={e => setNewMomentEnd(e.target.value)} placeholder="Kraj (01:25)" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-yellow-400" />
                    </div>
                  </div>
                  <textarea value={newMomentNotes} onChange={e => setNewMomentNotes(e.target.value)} placeholder="Bilješke (opcionalno)" rows={2} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-yellow-400 resize-none" />
                  <div className="flex gap-2">
                    <button onClick={handleAddMoment} className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-zinc-950 text-xs font-black py-2 rounded-lg uppercase cursor-pointer">Dodaj</button>
                    <button onClick={() => setIsAddingMoment(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold py-2 px-3 rounded-lg cursor-pointer">Otkaži</button>
                  </div>
                </div>
              )}

              {featuredMoments.length > 0 ? (
                <div className="space-y-2">
                  {featuredMoments.map(moment => (
                    <div key={moment.id} className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-900 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs text-zinc-100 truncate">{moment.title}</h4>
                          {moment.startTime && <span className="text-[9px] font-mono text-zinc-500 shrink-0">{moment.startTime}{moment.endTime ? ` – ${moment.endTime}` : ''}</span>}
                        </div>
                        {moment.notes && <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{moment.notes}</p>}
                      </div>
                      <button onClick={() => handleRemoveMoment(moment.id)} className="text-zinc-600 hover:text-red-400 p-1 shrink-0 rounded hover:bg-red-500/10 transition cursor-pointer" title="Ukloni moment"><X size={12} /></button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-zinc-600 text-center py-2">Nema dodatih istaknutih momenata.</p>
              )}
            </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}