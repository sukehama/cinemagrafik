import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Episode, Actor, GuestReview, RatingEntry, FeaturedMoment } from '../types';
import { getYoutubeEmbedUrl, getRatingColorClass } from '../utils';
import { X, Youtube, Save, Trash2, Edit2, Play, Star, Upload, Plus, Users, MessageSquare, Film, Tv, ChevronRight, ChevronLeft, Check, Video, Clock } from 'lucide-react';

interface DetailPopupProps {
  episode: Episode;
  seasonNumber: number;
  onClose: () => void;
  onSave: (updatedEpisode: Episode) => void;
  onDelete?: () => void;
  allEntriesAvailable: RatingEntry[];
  onNavigateToEntry?: (entryId: string, seasonNum?: number, episodeNum?: number) => void;
  onNavigateEpisode?: (direction: 'next' | 'prev') => void;
  hasNextEpisode?: boolean;
  hasPrevEpisode?: boolean;
}

const BRIEF_AVATAR_PRESETS = [
  { name: 'Kritičar', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop' },
  { name: 'Gledalac', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop' },
  { name: 'Novinar', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop' },
  { name: 'Bloger', url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop' },
];

export default function DetailPopup({
  episode,
  seasonNumber,
  onClose,
  onSave,
  onDelete,
  allEntriesAvailable = [],
  onNavigateToEntry,
  onNavigateEpisode,
  hasNextEpisode = false,
  hasPrevEpisode = false
}: DetailPopupProps) {
  const [name, setName] = useState(episode.name);
  const [rating, setRating] = useState(episode.rating);
  const [imageUrl, setImageUrl] = useState(episode.imageUrl || '');
  const [youtubeUrl, setYoutubeUrl] = useState(episode.youtubeUrl || '');
  const [overview, setOverview] = useState(episode.overview || '');
  const [isEditing, setIsEditing] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Custom hyperlink state
  const [linkText, setLinkText] = useState(episode.linkText || '');
  const [linkTargetId, setLinkTargetId] = useState(episode.linkTargetId || '');

  // Lists state
  const [guestReviews, setGuestReviews] = useState<GuestReview[]>(episode.guestReviews || []);
  const [actors, setActors] = useState<Actor[]>(episode.actors || []);

  // Form Adding state
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

  // Actor search & multi-select states
  const [actorSearchQuery, setActorSearchQuery] = useState('');
  const [selectedActorsMap, setSelectedActorsMap] = useState<{[actorId: string]: { actor: Actor; characterName: string }}>({});
  const [activeActorTab, setActiveActorTab] = useState<'search' | 'new'>('search');

  // Featured Moments states
  const [featuredMoments, setFeaturedMoments] = useState<FeaturedMoment[]>(episode.featuredMoments || []);
  const [isAddingMoment, setIsAddingMoment] = useState(false);
  const [newMomentTitle, setNewMomentTitle] = useState('');
  const [newMomentStart, setNewMomentStart] = useState('');
  const [newMomentEnd, setNewMomentEnd] = useState('');
  const [newMomentNotes, setNewMomentNotes] = useState('');

  // Synchronize internal state when the active episode is changed via Next/Prev navigation
  useEffect(() => {
    setName(episode.name);
    setRating(episode.rating);
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
    setIsAddingReview(false);
    setIsAddingActor(false);
    setIsAddingMoment(false);
    setNewMomentTitle('');
    setNewMomentStart('');
    setNewMomentEnd('');
    setNewMomentNotes('');
    setActorSearchQuery('');
    setSelectedActorsMap({});
    setActiveActorTab('search');
  }, [episode]);

  const handleToggleDbActor = (act: Actor) => {
    setSelectedActorsMap(prev => {
      const exists = !!prev[act.id];
      const next = { ...prev };
      if (exists) {
        delete next[act.id];
      } else {
        next[act.id] = {
          actor: act,
          characterName: act.characterName || ''
        };
      }
      return next;
    });
  };

  const handleUpdateCharacterForSelected = (actorId: string, charName: string) => {
    setSelectedActorsMap(prev => {
      if (!prev[actorId]) return prev;
      return {
        ...prev,
        [actorId]: {
          ...prev[actorId],
          characterName: charName
        }
      };
    });
  };

  const handleAddSelectedActorsDone = () => {
    const selectedList = Object.values(selectedActorsMap) as { actor: Actor; characterName: string }[];
    if (selectedList.length === 0) {
      setIsAddingActor(false);
      return;
    }
    
    const newActorsToAdd: Actor[] = selectedList.map(item => ({
      id: `act-${Date.now()}-${Math.random().toString().slice(-4)}`,
      name: item.actor.name,
      characterName: item.characterName.trim() || undefined,
      photoUrl: item.actor.photoUrl,
      bio: item.actor.bio,
      age: item.actor.age,
      otherInfo: item.actor.otherInfo
    }));
    
    const updatedActors = [...actors, ...newActorsToAdd];
    setActors(updatedActors);
    
    onSave({
      ...episode,
      name,
      rating: Number(rating),
      imageUrl: imageUrl || undefined,
      youtubeUrl: youtubeUrl || undefined,
      overview: overview || undefined,
      guestReviews,
      actors: updatedActors,
      linkText: linkText || undefined,
      linkTargetId: linkTargetId || undefined
    });
    
    setSelectedActorsMap({});
    setActorSearchQuery('');
    setIsAddingActor(false);
  };

  const handleNewActorNameChange = (val: string) => {
    setNewActorName(val);
    if (!val.trim()) {
      setAutofillSuccessMsg('');
      return;
    }
    const match = existingActors.find(act => act.name.trim().toLowerCase() === val.trim().toLowerCase());
    if (match) {
      setNewActorPhoto(match.photoUrl || '');
      setNewActorBio(match.bio || '');
      setNewActorOtherInfo(match.otherInfo || '');
      if (!newActorCharacter.trim()) {
        setNewActorCharacter(match.characterName || '');
      }
      setAutofillSuccessMsg(`Pronađen glumac/ica "${match.name}" – podaci su automatski povučeni! 👥`);
    } else {
      setAutofillSuccessMsg('');
    }
  };

  // Selected actor editing states
  const [isEditingSelectedActor, setIsEditingSelectedActor] = useState(false);
  const [editActorName, setEditActorName] = useState('');
  const [editActorCharacter, setEditActorCharacter] = useState('');
  const [editActorPhoto, setEditActorPhoto] = useState('');
  const [editActorAge, setEditActorAge] = useState<string | number>('');
  const [editActorBio, setEditActorBio] = useState('');
  const [editActorOtherInfo, setEditActorOtherInfo] = useState('');

  // Floating detail modal state
  const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
  const [showAllActorsSubModal, setShowAllActorsSubModal] = useState(false);

  // Get unique existing actors across all media to serve as templates/presets
  const getExistingActorsList = (): Actor[] => {
    const actorMap = new Map<string, Actor>();
    allEntriesAvailable.forEach(entry => {
      if (entry.movieActors) {
        entry.movieActors.forEach(a => {
          if (a && a.name) {
            actorMap.set(a.name.toLowerCase().trim(), a);
          }
        });
      }
      if (entry.seasons) {
        entry.seasons.forEach(s => {
          if (s.episodes) {
            s.episodes.forEach(ep => {
              if (ep.actors) {
                ep.actors.forEach(a => {
                  if (a && a.name) {
                    actorMap.set(a.name.toLowerCase().trim(), a);
                  }
                });
              }
            });
          }
        });
      }
    });
    return Array.from(actorMap.values());
  };

  const existingActors = getExistingActorsList();

  interface ActorAppearance {
    entryId: string;
    entryName: string;
    type: 'movie' | 'show' | 'universe';
    posterUrl: string;
    characterName?: string;
    seasonNumber?: number;
    seasonName?: string;
    episodeNumber?: number;
    episodeName?: string;
  }

  const getActorAppearances = (actorName?: string): ActorAppearance[] => {
    if (!actorName) return [];
    const searchName = actorName.toLowerCase().trim();
    const list: ActorAppearance[] = [];

    allEntriesAvailable.forEach((entry) => {
      // 1. Check movieActors
      if (entry.movieActors) {
        entry.movieActors.forEach((act) => {
          if (act && act.name && act.name.toLowerCase().trim() === searchName) {
            list.push({
              entryId: entry.id,
              entryName: entry.name,
              type: entry.type,
              posterUrl: entry.posterUrl,
              characterName: act.characterName,
            });
          }
        });
      }

      // 2. Check each season's episodes
      if (entry.seasons) {
        entry.seasons.forEach((season) => {
          if (season.episodes) {
            season.episodes.forEach((ep) => {
              if (ep.actors) {
                ep.actors.forEach((act) => {
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
                      episodeName: ep.name,
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
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImageUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleActorPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setNewActorPhoto(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReviewPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setNewReviewPhoto(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Sync state on change
  useEffect(() => {
    setName(episode.name);
    setRating(episode.rating);
    setImageUrl(episode.imageUrl || '');
    setYoutubeUrl(episode.youtubeUrl || '');
    setOverview(episode.overview || '');
    setGuestReviews(episode.guestReviews || []);
    setActors(episode.actors || []);
    setFeaturedMoments(episode.featuredMoments || []);
    setLinkText(episode.linkText || '');
    setLinkTargetId(episode.linkTargetId || '');
    setIsEditing(false);
    setShowTrailer(false);
    setShowDeleteConfirm(false);
    setIsAddingReview(false);
    setIsAddingActor(false);
    setIsAddingMoment(false);
    setIsEditingSelectedActor(false);
  }, [episode]);

  const handleSave = () => {
    onSave({
      ...episode,
      name,
      rating: Number(rating),
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

  const handleAddMomentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMomentTitle.trim()) return alert('Molimo unesite naziv istaknutog momenta!');

    const newMoment = {
      id: `mom-${Date.now()}-${Math.random().toString().slice(-4)}`,
      title: newMomentTitle.trim(),
      startTime: newMomentStart.trim() || '00:00',
      endTime: newMomentEnd.trim() || '00:00',
      notes: newMomentNotes.trim() || undefined
    };

    const updatedMoments = [...featuredMoments, newMoment];
    setFeaturedMoments(updatedMoments);

    onSave({
      ...episode,
      name,
      rating: Number(rating),
      imageUrl: imageUrl || undefined,
      youtubeUrl: youtubeUrl || undefined,
      overview: overview || undefined,
      guestReviews,
      actors,
      featuredMoments: updatedMoments,
      linkText: linkText || undefined,
      linkTargetId: linkTargetId || undefined
    });

    setNewMomentTitle('');
    setNewMomentStart('');
    setNewMomentEnd('');
    setNewMomentNotes('');
    setIsAddingMoment(false);
  };

  const handleDeleteMoment = (momentId: string) => {
    const updatedMoments = featuredMoments.filter(m => m.id !== momentId);
    setFeaturedMoments(updatedMoments);

    onSave({
      ...episode,
      name,
      rating: Number(rating),
      imageUrl: imageUrl || undefined,
      youtubeUrl: youtubeUrl || undefined,
      overview: overview || undefined,
      guestReviews,
      actors,
      featuredMoments: updatedMoments,
      linkText: linkText || undefined,
      linkTargetId: linkTargetId || undefined
    });
  };

  const handleAddReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewVoter.trim()) return alert('Molimo unesite ime kritičara!');

    const newRev: GuestReview = {
      id: `rev-${Date.now()}-${Math.random().toString().slice(-4)}`,
      voterName: newReviewVoter.trim(),
      rating: Number(newReviewRating),
      reviewText: newReviewText.trim(),
      photoUrl: newReviewPhoto.trim() || undefined,
      createdAt: 'Sada'
    };

    const updatedReviews = [...guestReviews, newRev];
    setGuestReviews(updatedReviews);

    onSave({
      ...episode,
      name,
      rating: Number(rating),
      imageUrl: imageUrl || undefined,
      youtubeUrl: youtubeUrl || undefined,
      overview: overview || undefined,
      guestReviews: updatedReviews,
      actors,
      linkText: linkText || undefined,
      linkTargetId: linkTargetId || undefined
    });

    setNewReviewVoter('');
    setNewReviewRating(8.0);
    setNewReviewText('');
    setNewReviewPhoto('');
    setIsAddingReview(false);
  };

  const handleDeleteReview = (reviewId: string) => {
    const updatedReviews = guestReviews.filter(r => r.id !== reviewId);
    setGuestReviews(updatedReviews);

    onSave({
      ...episode,
      name,
      rating: Number(rating),
      imageUrl: imageUrl || undefined,
      youtubeUrl: youtubeUrl || undefined,
      overview: overview || undefined,
      guestReviews: updatedReviews,
      actors,
      linkText: linkText || undefined,
      linkTargetId: linkTargetId || undefined
    });
  };

  const handleAddActorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActorName.trim()) return alert('Molimo unesite ime glumca!');

    const matchedActor = existingActors.find(act => act.name.trim().toLowerCase() === newActorName.trim().toLowerCase());
    const newAct: Actor = {
      id: `act-${Date.now()}-${Math.random().toString().slice(-4)}`,
      name: newActorName.trim(),
      characterName: newActorCharacter.trim() || undefined,
      photoUrl: newActorPhoto.trim() || undefined,
      bio: newActorBio.trim() || undefined,
      otherInfo: newActorOtherInfo.trim() || undefined,
      age: matchedActor ? matchedActor.age : undefined
    };

    const updatedActors = [...actors, newAct];
    setActors(updatedActors);

    onSave({
      ...episode,
      name,
      rating: Number(rating),
      imageUrl: imageUrl || undefined,
      youtubeUrl: youtubeUrl || undefined,
      overview: overview || undefined,
      guestReviews,
      actors: updatedActors,
      linkText: linkText || undefined,
      linkTargetId: linkTargetId || undefined
    });

    setNewActorName('');
    setNewActorCharacter('');
    setNewActorPhoto('');
    setNewActorBio('');
    setNewActorOtherInfo('');
    setAutofillSuccessMsg('');
    setIsAddingActor(false);
  };

  const handleDeleteActor = (actorId: string) => {
    const updatedActors = actors.filter(a => a.id !== actorId);
    setActors(updatedActors);

    onSave({
      ...episode,
      name,
      rating: Number(rating),
      imageUrl: imageUrl || undefined,
      youtubeUrl: youtubeUrl || undefined,
      overview: overview || undefined,
      guestReviews,
      actors: updatedActors,
      linkText: linkText || undefined,
      linkTargetId: linkTargetId || undefined
    });
  };

  const handleStartEditActor = (actor: Actor) => {
    setEditActorName(actor.name || '');
    setEditActorCharacter(actor.characterName || '');
    setEditActorPhoto(actor.photoUrl || '');
    setEditActorAge(actor.age || '');
    setEditActorBio(actor.bio || '');
    setEditActorOtherInfo(actor.otherInfo || '');
    setIsEditingSelectedActor(true);
  };

  const handleEditActorPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setEditActorPhoto(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEditActor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActor) return;
    if (!editActorName.trim()) return alert('Molimo unesite ime glumca!');

    const updatedActor: Actor = {
      id: selectedActor.id,
      name: editActorName.trim(),
      characterName: editActorCharacter.trim() || undefined,
      photoUrl: editActorPhoto.trim() || undefined,
      age: editActorAge ? (isNaN(Number(editActorAge)) ? editActorAge : Number(editActorAge)) : undefined,
      bio: editActorBio.trim() || undefined,
      otherInfo: editActorOtherInfo.trim() || undefined
    };

    const updatedActors = actors.map(a => a.id === selectedActor.id ? updatedActor : a);
    setActors(updatedActors);

    onSave({
      ...episode,
      name,
      rating: Number(rating),
      imageUrl: imageUrl || undefined,
      youtubeUrl: youtubeUrl || undefined,
      overview: overview || undefined,
      guestReviews,
      actors: updatedActors,
      linkText: linkText || undefined,
      linkTargetId: linkTargetId || undefined
    });

    setSelectedActor(updatedActor);
    setIsEditingSelectedActor(false);
  };

  const embedUrl = getYoutubeEmbedUrl(youtubeUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/90 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-805 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
      >
        {isEditing ? (
          /* EDITING MODE HEADER BAR */
          <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60 shrink-0">
            <div className="min-w-0">
              <span className="text-[10px] font-mono font-bold text-yellow-550 uppercase tracking-widest block">
                Uređivanje • Pozicija {episode.episodeNumber}
              </span>
              <h3 className="text-sm sm:text-base font-black text-white truncate pr-4">
                Uredi detalje
              </h3>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 bg-zinc-800 text-zinc-350 border border-zinc-700 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                Otkaži
              </button>
              <button
                onClick={onClose}
                className="text-zinc-400 hover:text-white bg-zinc-800 p-1.5 rounded-full cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        ) : (
          /* BEAUTIFUL IMAGE BANNER HEADER FOR VIEWING MODE (WITH DYNAMIC VIDEO OR PICTURE EMBED) */
          embedUrl && showTrailer ? (
            /* TRAILER PLAYER AT THE TOP */
            <div className="h-52 sm:h-64 bg-black relative shrink-0">
              <iframe
                title="Najava epizode video"
                src={`${embedUrl}?autoplay=1`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              <button
                onClick={() => setShowTrailer(false)}
                className="absolute top-4 left-4 bg-zinc-955 hover:bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-yellow-500 font-extrabold rounded-md text-[9px] uppercase tracking-wider z-20 cursor-pointer"
              >
                ← Prikaži sliku
              </button>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-zinc-950/80 hover:bg-zinc-90 w-7 h-7 flex items-center justify-center rounded-full z-20 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            /* DYNAMIC HIGH-CONTRAST GRADIENT IMAGE COVER WITH DETAILS AND PLAY ACTION */
            <div className="h-52 sm:h-64 bg-zinc-950 relative overflow-hidden flex items-end shrink-0 select-none">
              <img
                src={imageUrl || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop&q=80'}
                alt={name}
                className="w-full h-full object-cover opacity-60 absolute inset-0"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/35 to-black/70 z-10" />
              
              {/* Play Button Overlay if Youtube Trailer exists */}
              {embedUrl && (
                <div className="absolute inset-0 flex items-center justify-center z-15">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowTrailer(true)}
                    className="bg-red-650 hover:bg-gradient-to-r hover:from-red-600 hover:to-red-700 hover:bg-red-650 border border-red-500/20 text-white p-4 rounded-full shadow-2xl cursor-pointer flex items-center justify-center"
                    title="Pokreni video isječak"
                  >
                    <Play size={20} className="fill-white ml-0.5" />
                  </motion.button>
                </div>
              )}

              {/* Next/Prev Navigation Buttons */}
              <div className="absolute top-4 left-4 flex items-center gap-1.5 z-20">
                <button
                  type="button"
                  disabled={!hasPrevEpisode}
                  onClick={() => onNavigateEpisode?.('prev')}
                  className={`p-1.5 rounded-full border text-zinc-300 transition-all flex items-center justify-center ${
                    hasPrevEpisode 
                      ? 'bg-zinc-950/80 hover:bg-zinc-900 border-zinc-800 hover:text-yellow-405 hover:border-yellow-405/45 active:scale-90 cursor-pointer' 
                      : 'bg-zinc-950/30 border-zinc-900/50 text-zinc-650 cursor-not-allowed opacity-40'
                  }`}
                  title="Prethodna epizoda"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  disabled={!hasNextEpisode}
                  onClick={() => onNavigateEpisode?.('next')}
                  className={`p-1.5 rounded-full border text-zinc-300 transition-all flex items-center justify-center ${
                    hasNextEpisode 
                      ? 'bg-zinc-950/80 hover:bg-zinc-900 border-zinc-800 hover:text-yellow-405 hover:border-yellow-405/45 active:scale-90 cursor-pointer' 
                      : 'bg-zinc-950/30 border-zinc-900/50 text-zinc-650 cursor-not-allowed opacity-40'
                  }`}
                  title="Sljedeća epizoda"
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Edit/Delete/Close buttons in floating top bar */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5 z-20">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-2.5 py-1.5 bg-zinc-950/80 hover:bg-zinc-900 text-yellow-500 border border-zinc-850 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Edit2 size={11} /> Uredi
                </button>

                {onDelete && (
                  showDeleteConfirm ? (
                    <div className="flex items-center gap-1 bg-zinc-950/90 px-1.5 py-1 rounded-lg border border-red-500/30">
                      <span className="text-[8px] uppercase font-bold text-red-400">Sigurni?</span>
                      <button
                        onClick={() => {
                          onDelete();
                          setShowDeleteConfirm(false);
                        }}
                        className="px-1.5 py-0.5 bg-red-500 hover:bg-red-600 text-white font-extrabold rounded text-[8px]"
                      >
                        Da
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-1.5 py-0.5 bg-zinc-805 text-zinc-300 rounded text-[8px]"
                      >
                        Ne
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="p-1 px-2 bg-zinc-950/80 hover:bg-red-955 hover:text-red-400 text-zinc-400 border border-zinc-850 rounded-lg transition active:scale-95 cursor-pointer"
                    >
                      <Trash2 size={11} />
                    </button>
                  )
                )}

                <button
                  onClick={onClose}
                  className="text-zinc-400 hover:text-white bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-850 p-1.5 rounded-full transition cursor-pointer"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Title, ratings, episode info sitting directly overlayed with gradient inside the image */}
              <div className="p-5 relative z-10 flex items-end justify-between w-full gap-4">
                <div className="min-w-0">
                  <span className="text-[10px] font-mono font-bold text-yellow-505 uppercase tracking-widest block drop-shadow-sm">
                    Faza / Sezona {seasonNumber} • Stavka / Epizoda {episode.episodeNumber}
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-white truncate drop-shadow-lg pr-2 mt-0.5">
                    {name || 'Neimenovano'}
                  </h3>
                </div>
                
                {/* Visual Rating Indicator inside image cover */}
                <div className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold font-mono text-xs shadow-lg uppercase tracking-wider border transition-colors ${getRatingColorClass(Number(rating))} border-zinc-800/40`}>
                  <Star size={12} className="fill-current text-current" />
                  <span>{Number(rating) === 0 ? 'N/A' : Number(rating).toFixed(1)}</span>
                </div>
              </div>
            </div>
          )
        )}

        {/* Scrollable Panel */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs text-zinc-300">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wide mb-1">
                  Naziv epizode / stavke:
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-950 p-2.5 rounded-xl border border-zinc-850 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-yellow-405"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wide mb-1 flex justify-between">
                  <span>Vrijednost ocjene:</span>
                  <span className="text-yellow-450 font-mono font-bold">
                    {Number(rating) === 0 ? 'Još neocjenjeno' : `${Number(rating).toFixed(1)}/10`}
                  </span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0.0"
                    max="10.0"
                    step="0.1"
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="flex-1 h-1 bg-zinc-850 rounded-lg accent-yellow-405 cursor-pointer appearance-none"
                  />
                  <input
                    type="number"
                    min="0.0"
                    max="10.0"
                    step="0.1"
                    value={rating}
                    onChange={(e) => setRating(Math.max(0, Math.min(10, Number(e.target.value))))}
                    className="w-14 bg-zinc-950 text-yellow-400 font-mono text-center font-bold p-1 border border-zinc-850 rounded text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wide mb-1">
                  YouTube promo / video link:
                </label>
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-zinc-950 p-2.5 rounded-xl border border-zinc-850 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-yellow-405"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wide mb-1">
                  Pozadinska slika / Screenshot segmenta (URL ili lokalni upload):
                </label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... ili učitajte ispod"
                  className="w-full bg-zinc-950 p-2.5 rounded-xl border border-zinc-850 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-yellow-405"
                />
                <label className="flex items-center justify-center gap-1.5 border border-dashed border-zinc-800 hover:border-yellow-450 bg-zinc-950/35 px-3 py-2 rounded-lg cursor-pointer transition text-center">
                  <Upload size={13} className="text-zinc-550" />
                  <span className="text-[10px] text-zinc-400 uppercase font-black">Učitaj lokalnu sliku</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wide mb-1">
                  Opis stavke (Sinopsis):
                </label>
                <textarea
                  value={overview}
                  onChange={(e) => setOverview(e.target.value)}
                  placeholder="Napišite kratak sinopsis segmenta..."
                  rows={2}
                  className="w-full bg-zinc-950 p-2.5 rounded-xl border border-zinc-850 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-yellow-405"
                />
              </div>

              {/* Hyperlink target configs */}
              <div className="border-t border-zinc-805 pt-3 space-y-3">
                <span className="block text-xs font-bold text-zinc-400 uppercase tracking-wide">
                  Povezana alternativna verzija / Hyperlink (Opcionalno)
                </span>
                <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-850 grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-[9px] text-zinc-500 font-extrabold uppercase mb-1">Prikazani tekst (npr. Has 1 Alternative Cut)</label>
                    <input
                      type="text"
                      value={linkText}
                      onChange={(e) => setLinkText(e.target.value)}
                      placeholder="npr. Has 1 Alternative Cut ili Pogledaj povezani univerzum"
                      className="w-full bg-zinc-900 border border-zinc-805 rounded px-2.5 py-1.5 text-zinc-100 placeholder-zinc-700 text-xs focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-zinc-500 font-extrabold uppercase mb-1">Odredište poveznice / Hyperlink target</label>
                    <select
                      value={linkTargetId}
                      onChange={(e) => setLinkTargetId(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-805 rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none"
                    >
                      <option value="">-- Bez poveznice --</option>
                      {allEntriesAvailable.map(item => {
                        if (item.type === 'movie') {
                          return (
                            <option key={`lnk-t-${item.id}`} value={item.id}>
                              🎬 [Film] {item.name}
                            </option>
                          );
                        } else {
                          return (item.seasons || []).flatMap(s => 
                            (s.episodes || []).map(ep => {
                              const composite = `${item.id}|${s.seasonNumber}|${ep.episodeNumber}`;
                              const typ = item.type === 'universe' ? 'Univerzum' : 'Serija';
                              const label = item.type === 'universe' ? (s.seasonName || `Faza ${s.seasonNumber}`) : `Sezona ${s.seasonNumber}`;
                              return (
                                <option key={`lnk-t-${composite}`} value={composite}>
                                  📺 [{typ}] {item.name} - {label}, E{ep.episodeNumber}: {ep.name}
                                </option>
                              );
                            })
                          );
                        }
                      })}
                    </select>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSave}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-zinc-950 font-black py-2.5 rounded-xl transition text-xs uppercase tracking-wider cursor-pointer shadow-md"
              >
                <Save size={13} /> Spasi izmjene
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Hyperlinked Alternative Cut info */}
              {episode.linkText && (
                <div className="bg-yellow-500/10 hover:bg-yellow-500/15 border border-yellow-500/25 p-3 rounded-xl flex items-center justify-between gap-3 animate-fade-in">
                  <span className="text-yellow-405 font-sans font-bold text-xs">
                    ✨ {episode.linkText}
                  </span>
                  {onNavigateToEntry && episode.linkTargetId && (
                    <button
                      type="button"
                      onClick={() => {
                        if (episode.linkTargetId!.includes('|')) {
                          const [ent, s, e] = episode.linkTargetId!.split('|');
                          onNavigateToEntry(ent, Number(s), Number(e));
                        } else {
                          onNavigateToEntry(episode.linkTargetId!);
                        }
                      }}
                      className="text-[9px] font-black uppercase tracking-wider bg-yellow-400 hover:bg-yellow-300 text-zinc-950 px-3 py-1.5 rounded-lg transition-all active:scale-95 duration-200 cursor-pointer"
                    >
                      Prikaži →
                    </button>
                  )}
                </div>
              )}

              {/* Synopsis Segment */}
              <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-900/40">
                <span className="text-[9px] uppercase font-mono text-zinc-500 font-extrabold block mb-1">Sinopsis</span>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  {overview || "Nema unesenog opisa za ovu stavku. Da biste ga dodali, kliknite na 'Uredi' gore desno."}
                </p>
              </div>

              {/* CAST MODULE */}
              <div className="bg-zinc-950/40 border border-zinc-850 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center border-b border-zinc-850/60 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Users size={14} className="text-emerald-400" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-200">
                      Glavni glumci i likovi ({actors.length})
                    </h4>
                  </div>
                  <button
                    onClick={() => setIsAddingActor(!isAddingActor)}
                    className="text-[9px] font-black uppercase text-emerald-400 hover:text-emerald-350 flex items-center gap-1"
                  >
                    <Plus size={10} /> {isAddingActor ? 'Zatvori' : 'Dodaj glumca'}
                  </button>
                </div>

                {isAddingActor && (
                  <div className="space-y-3 bg-zinc-950 p-4 rounded-xl border border-zinc-850">
                    {/* Tabs bar */}
                    <div className="flex border-b border-zinc-850 pb-2 mb-3">
                      <button
                        type="button"
                        onClick={() => setActiveActorTab('search')}
                        className={`flex-1 text-[10px] font-extrabold uppercase tracking-wider py-1.5 border-b-2 text-center transition ${
                          activeActorTab === 'search' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-500 hover:text-zinc-400'
                        }`}
                      >
                        Odabir iz baze (Pretraga)
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveActorTab('new')}
                        className={`flex-1 text-[10px] font-extrabold uppercase tracking-wider py-1.5 border-b-2 text-center transition ${
                          activeActorTab === 'new' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-500 hover:text-zinc-400'
                        }`}
                      >
                        Dodaj potpuno novog glumca
                      </button>
                    </div>

                    {activeActorTab === 'search' ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[9px] uppercase font-bold text-zinc-500 mb-1">Pretraži glumce po imenu</label>
                          <input
                            type="text"
                            value={actorSearchQuery}
                            onChange={(e) => setActorSearchQuery(e.target.value)}
                            placeholder="Upišite ime glumca..."
                            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 placeholder-zinc-700 text-xs focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        {/* List of matching database actors */}
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                          {(() => {
                            const filtered = existingActors.filter(act => 
                              act.name.toLowerCase().includes(actorSearchQuery.toLowerCase().trim())
                            );
                            
                            if (filtered.length === 0) {
                              return (
                                <p className="text-[10px] text-zinc-650 italic text-center py-4">
                                  Nema pronađenih glumaca u bazi. Iskoristite tab "Dodaj potpuno novog glumca" da unesete novog!
                                </p>
                              );
                            }
                            
                            return filtered.map(act => {
                              const isChecked = !!selectedActorsMap[act.id];
                              return (
                                <div 
                                  key={`db-act-${act.id}`}
                                  className={`p-2 rounded-lg border transition-all ${
                                    isChecked ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm' : 'bg-zinc-900/40 border-zinc-900 hover:bg-zinc-900'
                                  } flex flex-col gap-2`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleDbActor(act)}
                                      className="flex items-center gap-2.5 text-left flex-1 min-w-0 cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {}} // Controlled by outer button
                                        className="rounded border-zinc-800 text-emerald-500 accent-emerald-500 cursor-pointer w-3.5 h-3.5 shrink-0"
                                      />
                                      {act.photoUrl && (
                                        <img src={act.photoUrl} alt={act.name} className="w-7 h-7 rounded-full object-cover shrink-0 border border-zinc-800" referrerPolicy="no-referrer" />
                                      )}
                                      <div className="min-w-0">
                                        <p className="font-bold text-zinc-200 text-xs truncate">{act.name}</p>
                                        <p className="text-[9px] text-zinc-500 truncate">Zadnja uloga: {act.characterName || 'Nema'}</p>
                                      </div>
                                    </button>
                                  </div>
                                  
                                  {isChecked && (
                                    <div className="flex items-center gap-2 pl-6 pt-1.5 border-t border-zinc-900/60">
                                      <span className="text-[9px] text-zinc-400 font-bold shrink-0">Uloga / Lik u ovoj epizodi/filmu:</span>
                                      <input
                                        type="text"
                                        placeholder="npr. Walter White"
                                        value={selectedActorsMap[act.id].characterName}
                                        onChange={(e) => handleUpdateCharacterForSelected(act.id, e.target.value)}
                                        className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded px-2.5 py-0.5 text-zinc-200 text-[10px] focus:outline-none"
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>

                        {/* Actions for selection */}
                        <div className="flex gap-2 pt-2 border-t border-zinc-850/60">
                          <button
                            type="button"
                            onClick={handleAddSelectedActorsDone}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black text-[10px] uppercase py-2 rounded-lg cursor-pointer flex items-center justify-center gap-1 transition active:scale-95"
                          >
                            <Check size={11} /> Završeno ({Object.keys(selectedActorsMap).length})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedActorsMap({});
                              setActorSearchQuery('');
                              setIsAddingActor(false);
                            }}
                            className="bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-[10px] px-3 py-2 rounded-lg cursor-pointer"
                          >
                            Odustani
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Fully new actor manual form */
                      <form onSubmit={handleAddActorSubmit} className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="block text-[9px] uppercase font-bold text-zinc-500 mb-0.5">Ime glumca *</label>
                            <input
                              type="text"
                              required
                              value={newActorName}
                              onChange={(e) => handleNewActorNameChange(e.target.value)}
                              placeholder="npr. Bryan Cranston"
                              className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-zinc-100 placeholder-zinc-700 text-xs focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] uppercase font-bold text-zinc-500 mb-0.5">Naziv lika u projektu</label>
                            <input
                              type="text"
                              value={newActorCharacter}
                              onChange={(e) => setNewActorCharacter(e.target.value)}
                              placeholder="npr. Walter White"
                              className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-zinc-100 placeholder-zinc-700 text-xs focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>

                        {autofillSuccessMsg && (
                          <div className="bg-emerald-950/40 border border-emerald-900/50 px-3 py-1.5 rounded-lg text-[10px] text-emerald-400 font-semibold animate-pulse">
                            {autofillSuccessMsg}
                          </div>
                        )}

                        <div>
                          <label className="block text-[9px] uppercase font-bold text-zinc-500 mb-0.5">Fotografija (Upload ili URL)</label>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={newActorPhoto}
                              onChange={(e) => setNewActorPhoto(e.target.value)}
                              placeholder="Unesite URL slike"
                              className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-zinc-100 placeholder-zinc-700 text-xs focus:outline-none focus:border-emerald-500"
                            />
                            <label className="flex items-center justify-center gap-1 border border-dashed border-zinc-800 hover:border-emerald-400 bg-zinc-900/40 hover:bg-zinc-950 px-2.5 py-1 rounded-lg cursor-pointer transition text-center shrink-0">
                              <Upload size={10} className="text-zinc-500" />
                              <span className="text-[9px] text-zinc-400 uppercase font-bold">Izaberi</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleActorPhotoUpload}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[9px] uppercase font-bold text-zinc-500 mb-0.5">Zanimljivosti / Biografija</label>
                            <textarea
                              value={newActorBio}
                              onChange={(e) => setNewActorBio(e.target.value)}
                              placeholder="Kratke biografske crtice..."
                              rows={2}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-zinc-100 placeholder-zinc-700 text-xs focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] uppercase font-bold text-zinc-500 mb-0.5">Nagrade, Nominacije ili Trivia</label>
                            <textarea
                              value={newActorOtherInfo}
                              onChange={(e) => setNewActorOtherInfo(e.target.value)}
                              placeholder="npr. 3 nominacije za Emmy..."
                              rows={2}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-zinc-100 placeholder-zinc-700 text-xs focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black text-[10px] uppercase py-2 rounded-lg cursor-pointer transition active:scale-95"
                          >
                            Potvrdi i dodaj
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsAddingActor(false)}
                            className="bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-[10px] px-3 py-2 rounded-lg cursor-pointer"
                          >
                            Odustani
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* Actor Grid list */}
                {actors.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {actors.slice(0, 4).map(act => (
                      <div
                        key={act.id}
                        className="relative group bg-zinc-950/60 border border-zinc-900 hover:border-emerald-500/20 rounded-xl p-2 flex flex-col items-center text-center space-y-1"
                      >
                        <div
                          onClick={() => setSelectedActor(act)}
                          className="w-11 h-11 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900 cursor-pointer hover:border-emerald-400 transition"
                        >
                          <img
                            src={act.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'}
                            alt={act.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5
                            onClick={() => setSelectedActor(act)}
                            className="font-bold text-[10px] text-zinc-200 truncate cursor-pointer hover:text-emerald-400"
                          >
                            {act.name}
                          </h5>
                          {act.characterName && (
                            <p className="text-[8px] text-zinc-500 truncate italic">
                              as {act.characterName}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteActor(act.id)}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400"
                        >
                          <X size={9} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-zinc-600 italic text-center py-2">
                    Još niste unijeli članove glumačke ekipe za ovu stavku.
                  </p>
                )}

                {actors.length > 4 && (
                  <div className="text-right">
                    <button
                      onClick={() => setShowAllActorsSubModal(true)}
                      className="inline-flex items-center gap-1 bg-zinc-900 hover:bg-zinc-855 px-2.5 py-1 rounded border border-emerald-900 text-[9px] text-emerald-400 font-bold"
                    >
                      Prikaži kompletnu ekipu ({actors.length}) <ChevronRight size={10} />
                    </button>
                  </div>
                )}
              </div>

              {/* OPINION BALLOTS FOR REVIEWERS */}
              <div className="bg-zinc-950/40 border border-zinc-850 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center border-b border-zinc-850/60 pb-2">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare size={14} className="text-yellow-400" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-200">
                      Recenzije gostujućih kritičara ({guestReviews.length})
                    </h4>
                  </div>
                  <button
                    onClick={() => setIsAddingReview(!isAddingReview)}
                    className="text-[9px] font-black uppercase text-yellow-405 hover:text-yellow-350 flex items-center gap-1"
                  >
                    <Plus size={10} /> {isAddingReview ? 'Zatvori' : 'Dodaj recenziju'}
                  </button>
                </div>

                {isAddingReview && (
                  <form onSubmit={handleAddReviewSubmit} className="space-y-3 bg-zinc-950 p-3.5 rounded-xl border border-zinc-850">
                    <h5 className="text-[9px] font-bold text-zinc-400 uppercase">Dodaj novu recenziju</h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-zinc-500 mb-0.5">Ime autora recenzije *</label>
                        <input
                          type="text"
                          required
                          value={newReviewVoter}
                          onChange={(e) => setNewReviewVoter(e.target.value)}
                          placeholder="npr. Mom, IGN, Peter"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-zinc-100 placeholder-zinc-700 text-xs focus:outline-none focus:border-yellow-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-zinc-500 mb-0.5">Slika / Avatar (Upload ili URL)</label>
                        <input
                          type="text"
                          value={newReviewPhoto}
                          onChange={(e) => setNewReviewPhoto(e.target.value)}
                          placeholder="Unesite URL slike"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 placeholder-zinc-700 text-xs focus:outline-none focus:border-yellow-450"
                        />
                        <label className="flex items-center justify-center gap-1 border border-dashed border-zinc-800 hover:border-yellow-400 bg-zinc-900/40 hover:bg-zinc-950 px-2.5 py-1.5 rounded-lg cursor-pointer transition text-center mt-1">
                          <Upload size={10} className="text-zinc-500" />
                          <span className="text-[9px] text-zinc-400 uppercase font-black">Učitaj sliku</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleReviewPhotoUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="block text-[9px] text-zinc-500 uppercase font-bold">Ili odaberite unaprijed postavljen avatar:</span>
                      <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {BRIEF_AVATAR_PRESETS.map(p => (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => setNewReviewPhoto(p.url)}
                            className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded border text-[8px] transition ${
                              newReviewPhoto === p.url ? 'bg-yellow-400/10 text-yellow-400 border-yellow-455' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                            }`}
                          >
                            <img src={p.url} alt={p.name} className="w-3.5 h-3.5 rounded-full object-cover" />
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase font-bold text-zinc-400 mb-0.5 flex justify-between">
                        <span>Dodijeljena ocjena:</span>
                        <span className="text-yellow-400 font-mono font-bold">{newReviewRating.toFixed(1)}/10</span>
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0.0"
                          max="10.0"
                          step="0.1"
                          value={newReviewRating}
                          onChange={(e) => setNewReviewRating(Number(e.target.value))}
                          className="flex-1 h-1.5 bg-zinc-800 accent-yellow-405 rounded-lg cursor-pointer appearance-none"
                        />
                        <span className="text-xs font-mono font-bold text-yellow-400 w-6 text-right">{newReviewRating.toFixed(1)}</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase font-bold text-zinc-500 mb-0.5">Tekst recenzije</label>
                      <textarea
                        required
                        value={newReviewText}
                        onChange={(e) => setNewReviewText(e.target.value)}
                        placeholder="Upišite detaljno mišljenje kritičara o ovoj stavci..."
                        rows={2}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-zinc-100 placeholder-zinc-700 text-xs focus:outline-none focus:border-yellow-405"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-zinc-950 font-black text-[10px] uppercase py-2 rounded-lg cursor-pointer"
                      >
                        Objavi recenziju
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingReview(false)}
                        className="bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-[10px] px-3 py-2 rounded-lg"
                      >
                        Otkaži
                      </button>
                    </div>
                  </form>
                )}

                {/* Reviews log output */}
                {guestReviews.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {guestReviews.map(rev => (
                      <div key={rev.id} className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-900 flex flex-col space-y-2">
                        <div className="flex items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2">
                            <img
                              src={rev.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'}
                              alt="Voter"
                              className="w-6.5 h-6.5 rounded-full object-cover border border-zinc-800 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <h5 className="font-extrabold text-[11px] text-zinc-200">{rev.voterName}</h5>
                              <span className="text-[8px] text-zinc-550 font-mono">Just now</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${getRatingColorClass(rev.rating)}`}>
                              ★ {rev.rating.toFixed(1)}
                            </span>
                            <button
                              onClick={() => handleDeleteReview(rev.id)}
                              className="text-zinc-600 hover:text-red-405"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        </div>
                        <p className="text-zinc-400 leading-relaxed font-sans pl-8 text-xs">{rev.reviewText}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-zinc-600 italic text-center py-2">
                    Nema unesenih recenzija za ovu stavku.
                  </p>
                )}
              </div>

              {/* FEATURED MOMENTS (ISTAKNUTI MOMENTI) MODULE */}
              <div className="bg-zinc-950/40 border border-zinc-850 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center border-b border-zinc-850/60 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Video size={14} className="text-pink-400" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-200">
                      Istaknuti momenti / Isječci ({featuredMoments.length})
                    </h4>
                  </div>
                  <button
                    onClick={() => setIsAddingMoment(!isAddingMoment)}
                    className="text-[9px] font-black uppercase text-pink-400 hover:text-pink-350 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={10} /> {isAddingMoment ? 'Zatvori' : 'Dodaj moment'}
                  </button>
                </div>

                {isAddingMoment && (
                  <form onSubmit={handleAddMomentSubmit} className="space-y-3 bg-zinc-950 p-3.5 rounded-xl border border-zinc-850">
                    <h5 className="text-[9px] font-bold text-zinc-400 uppercase">Dodaj istaknuti isječak</h5>

                    <div className="space-y-2">
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-zinc-500 mb-0.5">Naziv / Opis momenta *</label>
                        <input
                          type="text"
                          required
                          value={newMomentTitle}
                          onChange={(e) => setNewMomentTitle(e.target.value)}
                          placeholder="npr. Walter White 'I am the one who knocks!'"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-zinc-100 placeholder-zinc-700 text-xs focus:outline-none focus:border-pink-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block text-[9px] uppercase font-bold text-zinc-500 mb-0.5">Početno Vrijeme (Timestamp)</label>
                          <input
                            type="text"
                            value={newMomentStart}
                            onChange={(e) => setNewMomentStart(e.target.value)}
                            placeholder="npr. 01:22:30 ili 15:40"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-zinc-100 placeholder-zinc-700 text-xs focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase font-bold text-zinc-500 mb-0.5">Krajnje Vrijeme (Timestamp)</label>
                          <input
                            type="text"
                            value={newMomentEnd}
                            onChange={(e) => setNewMomentEnd(e.target.value)}
                            placeholder="npr. 01:23:15 ili 16:10"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-zinc-100 placeholder-zinc-700 text-xs focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] uppercase font-bold text-zinc-500 mb-0.5">Dodatna bilješka / Komentar (Opcionalno)</label>
                        <textarea
                          value={newMomentNotes}
                          onChange={(e) => setNewMomentNotes(e.target.value)}
                          placeholder="npr. Nevjerovatna glumačka ekspresija..."
                          rows={2}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-zinc-100 placeholder-zinc-700 text-xs focus:outline-none resize-none"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 bg-pink-500 hover:bg-pink-600 text-white font-black text-[10px] uppercase py-2 rounded-lg cursor-pointer transition"
                      >
                        Potvrdi i dodaj
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingMoment(false)}
                        className="bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-[10px] px-3 py-2 rounded-lg cursor-pointer"
                      >
                        Otkaži
                      </button>
                    </div>
                  </form>
                )}

                {/* Moments output list */}
                {featuredMoments.length > 0 ? (
                  <div className="space-y-2">
                    {featuredMoments.map(mom => (
                      <div key={mom.id} className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-900 flex items-start justify-between gap-3 hover:bg-zinc-950 transition">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400 shrink-0">
                            <Clock size={12} />
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-extrabold text-[11px] text-zinc-200 tracking-tight">{mom.title}</h5>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[9px] font-mono font-bold text-pink-400 bg-pink-500/5 px-1.5 py-0.5 rounded border border-pink-550/10 shrink-0">
                                {mom.startTime} - {mom.endTime}
                              </span>
                              {mom.notes && (
                                <span className="text-[10px] text-zinc-500 truncate italic">
                                  — {mom.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteMoment(mom.id)}
                          className="text-zinc-650 hover:text-red-400 p-1 shrink-0 cursor-pointer"
                          title="Ukloni moment"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-zinc-650 italic text-center py-2">
                    Nema unesenih istaknutih momenata za ovaj video segment.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ALL CAST SUB MODAL */}
      <AnimatePresence>
        {showAllActorsSubModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-zinc-305 flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-4 shrink-0">
                <h4 className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-1">
                  Glumačka ekipa ({actors.length})
                </h4>
                <button
                  onClick={() => setShowAllActorsSubModal(false)}
                  className="bg-zinc-850 text-zinc-400 hover:text-white p-1 rounded-full"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="overflow-y-auto space-y-2 flex-1 pr-1">
                {actors.map(act => (
                  <div key={act.id} className="flex justify-between items-center bg-zinc-950/70 p-2.5 rounded-xl border border-zinc-900">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={act.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'}
                        alt={act.name}
                        className="w-7 h-7 rounded-full object-cover border border-zinc-800 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <span
                          onClick={() => { setSelectedActor(act); setShowAllActorsSubModal(false); }}
                          className="font-bold text-xs text-white hover:text-emerald-450 cursor-pointer hover:underline block truncate"
                        >
                          {act.name}
                        </span>
                        {act.characterName && (
                          <span className="text-[9px] text-zinc-500 block truncate">Lika: {act.characterName}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteActor(act.id)}
                      className="text-[9px] text-red-405 font-bold uppercase shrink-0 py-1"
                    >
                      Ukloni
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ACTOR BIO SUB MODAL */}
      <AnimatePresence>
        {selectedActor && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-zinc-950/95 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-5 text-zinc-305 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            >
              {isEditingSelectedActor ? (
                /* EDIT ACTOR FORM */
                <form onSubmit={handleSaveEditActor} className="flex flex-col h-full max-h-[80vh] overflow-hidden text-left font-sans">
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-4 shrink-0">
                    <h3 className="font-extrabold text-xs text-white uppercase tracking-wider">Uredi informacije o glumcu</h3>
                    <button
                      type="button"
                      onClick={() => setIsEditingSelectedActor(false)}
                      className="bg-zinc-800 text-zinc-300 hover:text-white px-2 py-1 rounded text-[10px] font-bold"
                    >
                      Nazad
                    </button>
                  </div>

                  <div className="overflow-y-auto flex-1 space-y-3.5 pr-1 text-xs">
                    <div>
                      <label className="block text-[9px] uppercase font-bold text-zinc-500 mb-0.5">Ime glumca *</label>
                      <input
                        type="text"
                        required
                        value={editActorName}
                        onChange={(e) => setEditActorName(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-100 placeholder-zinc-700 text-xs focus:outline-none focus:border-emerald-500"
                        placeholder="npr. Bryan Cranston"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-zinc-500 mb-0.5">Naziv uloge / lika</label>
                        <input
                          type="text"
                          value={editActorCharacter}
                          onChange={(e) => setEditActorCharacter(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-100 placeholder-zinc-700 text-xs focus:outline-none focus:border-emerald-500"
                          placeholder="npr. Walter White"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-zinc-500 mb-0.5">Godine (Starost)</label>
                        <input
                          type="text"
                          value={editActorAge}
                          onChange={(e) => setEditActorAge(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-100 placeholder-zinc-700 text-xs focus:outline-none focus:border-emerald-500"
                          placeholder="npr. 58"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase font-bold text-zinc-500 mb-0.5">Fotografija (URL ili upload)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editActorPhoto}
                          onChange={(e) => setEditActorPhoto(e.target.value)}
                          className="flex-1 bg-zinc-950 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-100 placeholder-zinc-700 text-xs focus:outline-none focus:border-emerald-500"
                          placeholder="Unesite URL slike"
                        />
                        <label className="flex items-center justify-center gap-1 border border-dashed border-zinc-800 hover:border-emerald-400 bg-zinc-950 px-2.5 py-1.5 rounded cursor-pointer transition text-center shrink-0">
                          <Upload size={10} className="text-zinc-500" />
                          <span className="text-[9px] text-zinc-400">Izaberi</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleEditActorPhotoUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase font-bold text-zinc-500 mb-0.5">Biografija / Zanimljivosti</label>
                      <textarea
                        value={editActorBio}
                        onChange={(e) => setEditActorBio(e.target.value)}
                        rows={3}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-100 placeholder-zinc-700 text-xs focus:outline-none focus:border-emerald-500"
                        placeholder="Napišite biografiju..."
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase font-bold text-zinc-500 mb-0.5">Nagrade, nominacije, ostalo</label>
                      <textarea
                        value={editActorOtherInfo}
                        onChange={(e) => setEditActorOtherInfo(e.target.value)}
                        rows={2}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-100 placeholder-zinc-700 text-xs focus:outline-none focus:border-emerald-500"
                        placeholder="npr. 1 Golden Globe, 4 Emmy-ja..."
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-800 mt-4 shrink-0">
                    <button
                      type="submit"
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black text-[11px] uppercase py-2.5 rounded-xl cursor-pointer transition active:scale-[0.98]"
                    >
                      Spremi izmjene
                    </button>
                  </div>
                </form>
              ) : (
                /* REGULAR BIO VIEW */
                <>
                  <div className="flex justify-between items-start border-b border-zinc-805 pb-3 mb-4 shrink-0">
                    <div className="text-left font-sans min-w-0 flex-1 pr-2">
                      <h3 className="font-extrabold text-sm sm:text-base text-white truncate">{selectedActor.name}</h3>
                      {selectedActor.characterName ? (
                        <span className="text-[9px] text-yellow-500 font-mono font-bold block truncate">
                          uloga: {selectedActor.characterName}{selectedActor.age ? ` • ${selectedActor.age} god.` : ''}
                        </span>
                      ) : (
                        selectedActor.age ? (
                          <span className="text-[9px] text-yellow-500 font-mono font-bold block">
                            {selectedActor.age} god.
                          </span>
                        ) : null
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleStartEditActor(selectedActor)}
                        className="bg-zinc-850 hover:bg-zinc-750 hover:text-emerald-400 text-zinc-350 p-1.5 rounded-full shrink-0 transition cursor-pointer"
                        title="Uredi informacije o glumcu"
                      >
                        <Edit2 size={11} />
                      </button>
                      <button
                        onClick={() => { setSelectedActor(null); setIsEditingSelectedActor(false); }}
                        className="bg-zinc-850 text-zinc-300 hover:text-white p-1.5 rounded-full shrink-0 transition cursor-pointer"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </div>

                  <div className="overflow-y-auto flex-1 space-y-4 pr-1">
                    <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start text-center sm:text-left">
                      <img
                        src={selectedActor.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'}
                        alt="Actor profile"
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shadow-md shrink-0 border border-zinc-800"
                        referrerPolicy="no-referrer"
                      />
                      <div className="space-y-2 flex-1 w-full">
                        <div className="bg-zinc-950/40 p-3 rounded-xl border border-zinc-900/60 text-left">
                          <span className="text-[8px] text-yellow-500 uppercase tracking-widest block font-black">🏅 Nagrade i Nominacije</span>
                          <p className="text-[10px] text-zinc-200 mt-1 leading-relaxed">
                            {selectedActor.otherInfo || 'Nema unesenih nagrada za ovog umjetnika.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 bg-zinc-950/50 p-3.5 rounded-xl border border-zinc-900/60 font-sans text-left">
                      <span className="text-[8px] text-emerald-450 uppercase tracking-wider block font-black">📝 Biografija i Trivia zanimljivosti</span>
                      <p className="text-xs text-zinc-300 leading-relaxed mt-1">
                        {selectedActor.bio || `${selectedActor.name} je registrovani i ocijenjeni glumački saradnik na ovom projektu.`}
                      </p>
                    </div>

                    {/* ACTOR APPEARANCES IN OTHER MEDIA */}
                    {(() => {
                      const apps = getActorAppearances(selectedActor.name);
                      const currentEntry = allEntriesAvailable.find(e => 
                        e.seasons?.some(s => 
                          s.seasonNumber === seasonNumber && 
                          s.episodes?.some(ep => ep.id === episode.id)
                        )
                      );
                      
                      return (
                        <div className="space-y-2 text-left bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-900/60 font-sans">
                          <span className="text-[8px] text-amber-400 uppercase tracking-widest block font-black">
                            🎬 OSTALI NASTUPI / ULOGE ({apps.length})
                          </span>
                          {apps.length === 0 ? (
                            <p className="text-[10px] text-zinc-500 italic">Nema drugih uloga u bazi podataka.</p>
                          ) : (
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 mt-2 divide-y divide-zinc-900/70">
                              {apps.map((app, idx) => {
                                const isCurrentApp = 
                                  app.entryId === currentEntry?.id && 
                                  app.seasonNumber === seasonNumber && 
                                  app.episodeNumber === episode.episodeNumber;

                                return (
                                  <div 
                                    key={`app-${idx}`}
                                    onClick={() => {
                                      if (onNavigateToEntry) {
                                        onNavigateToEntry(app.entryId, app.seasonNumber, app.episodeNumber);
                                        setSelectedActor(null);
                                        setIsEditingSelectedActor(false);
                                      }
                                    }}
                                    className={`flex gap-3 pt-2 first:pt-0 pb-2 last:pb-0 items-center justify-between group transition ${onNavigateToEntry ? 'cursor-pointer hover:bg-zinc-900/30 px-1 py-1 rounded' : ''}`}
                                  >
                                    <div className="flex gap-2 items-center min-w-0">
                                      <img 
                                        src={app.posterUrl || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=80&auto=format&fit=crop&q=80'} 
                                        alt={app.entryName} 
                                        className="w-6 h-8 object-cover rounded border border-zinc-850 shrink-0"
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="min-w-0">
                                        <p className="text-[10px] font-extrabold text-white truncate group-hover:text-amber-400 transition flex items-center gap-1">
                                          {app.entryName}
                                          {isCurrentApp && (
                                            <span className="text-[7.5px] bg-red-500/20 text-red-400 border border-red-500/30 px-1 rounded font-normal shrink-0">Trenutno</span>
                                          )}
                                        </p>
                                        {app.seasonNumber && app.episodeNumber ? (
                                          <p className="text-[8.5px] text-zinc-400 truncate">
                                            S{app.seasonNumber}E{app.episodeNumber} - <span className="italic">"{app.episodeName}"</span>
                                          </p>
                                        ) : (
                                          <p className="text-[8.5px] text-zinc-400">
                                            Film
                                          </p>
                                        )}
                                        {app.characterName && (
                                          <p className="text-[8.5px] text-yellow-500/80 truncate">
                                            uloga: {app.characterName}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    {onNavigateToEntry && (
                                      <ChevronRight size={11} className="text-zinc-500 group-hover:text-amber-400 shrink-0 transform group-hover:translate-x-0.5 transition" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
