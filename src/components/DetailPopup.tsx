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
            <div className="bg-zinc-900/40 p-4.5 rounded-2xl border border-zinc-800/40 space-y-2">
              <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-widest block">SINOPSIS</span>
              <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                {overview || "Nema unesenog opisa za ovu epizodu."}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}