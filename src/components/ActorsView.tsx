import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Actor, RatingEntry } from '../types';
import { Search, User, Edit3, Save, Calendar, ExternalLink, Star, Award, Heart, Info, ArrowLeft, Trash } from 'lucide-react';

interface ActorsViewProps {
  entries: RatingEntry[];
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
  selectedActorName: string | null;
  setSelectedActorName: (name: string | null) => void;
  onNavigateToEntry: (entryId: string, seasonNum?: number, epNum?: number) => void;
  onUpdateActorGlobalDetails: (actorName: string, fields: Partial<Actor>) => void;
  onUpdateActorAppearanceRating: (actorName: string, entryId: string, seasonNum: number | undefined, epNum: number | undefined, rating: number) => void;
}

export default function ActorsView({
  entries,
  allActorsWithAppearances,
  selectedActorName,
  setSelectedActorName,
  onNavigateToEntry,
  onUpdateActorGlobalDetails,
  onUpdateActorAppearanceRating
}: ActorsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Actor edit form states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCharacterName, setEditCharacterName] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editOtherInfo, setEditOtherInfo] = useState('');

  // Find selected actor data
  const activeActorData = useMemo(() => {
    if (!selectedActorName) return null;
    return allActorsWithAppearances.find(
      a => a.actor.name.trim().toLowerCase() === selectedActorName.trim().toLowerCase()
    );
  }, [allActorsWithAppearances, selectedActorName]);

  // Handle opening of edit mode
  const startEditing = () => {
    if (!activeActorData) return;
    const { actor } = activeActorData;
    setEditName(actor.name || '');
    setEditCharacterName(actor.characterName || '');
    setEditPhotoUrl(actor.photoUrl || '');
    setEditBio(actor.bio || '');
    setEditAge(actor.age ? String(actor.age) : '');
    setEditOtherInfo(actor.otherInfo || '');
    setIsEditing(true);
  };

  // Handle saving of edit details
  const saveActorDetails = () => {
    if (!selectedActorName) return;
    const trimmedNewName = editName.trim();
    onUpdateActorGlobalDetails(selectedActorName, {
      name: trimmedNewName || selectedActorName,
      characterName: editCharacterName.trim() || undefined,
      photoUrl: editPhotoUrl.trim() || undefined,
      bio: editBio.trim() || undefined,
      age: editAge.trim() ? editAge.trim() : undefined,
      otherInfo: editOtherInfo.trim() || undefined
    });

    if (trimmedNewName && trimmedNewName.toLowerCase() !== selectedActorName.toLowerCase()) {
      setSelectedActorName(trimmedNewName);
    }

    setIsEditing(false);
  };

  // Filter list of all actors by search query
  const filteredActors = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allActorsWithAppearances;
    return allActorsWithAppearances.filter(a => 
      a.actor.name.toLowerCase().includes(q) || 
      (a.actor.characterName && a.actor.characterName.toLowerCase().includes(q)) ||
      a.appearances.some(app => app.entryName.toLowerCase().includes(q))
    );
  }, [allActorsWithAppearances, searchQuery]);

  return (
    <div className="space-y-6" id="actors-database-panel">
      
      <AnimatePresence mode="wait">
        {!selectedActorName ? (
          // GRID VIEW OF ALL ACTORS
          <motion.div
            key="actors-grid-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Header & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Award className="text-yellow-400 w-5 h-5" /> Baza Glumaca
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Upravljajte i ocjenjujte uloge svih glumačkih ekipa u vašem katalogu
                </p>
              </div>

              {/* Actor Search Input */}
              <div className="relative w-full md:w-80">
                <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500">
                  <Search size={15} />
                </span>
                <input
                  type="text"
                  placeholder="Pretraži glumce, uloge, djela..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg text-xs bg-zinc-900 border border-zinc-800 text-slate-200 placeholder-zinc-500 focus:outline-none focus:border-yellow-500 transition-all"
                />
              </div>
            </div>

            {/* Grid */}
            {filteredActors.length === 0 ? (
              <div className="p-16 text-center border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/10">
                <User className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                <h4 className="font-extrabold text-sm text-zinc-400">Nema pronađenih glumaca</h4>
                <p className="text-xs text-zinc-500 mt-1">
                  Dodajte glumce na specifičnim epizodama ili filmovima da se pojave ovdje.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredActors.map(({ actor, appearances }) => {
                  // Calculate average performance rating
                  const ratedApps = appearances.filter(a => a.rawActor.performanceRating !== undefined);
                  const avgRating = ratedApps.length > 0 
                    ? ratedApps.reduce((acc, a) => acc + (a.rawActor.performanceRating || 0), 0) / ratedApps.length 
                    : 0;

                  return (
                    <button
                      key={`actor-card-${actor.name}`}
                      onClick={() => setSelectedActorName(actor.name)}
                      className="group bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-800 rounded-2xl p-3.5 text-center flex flex-col items-center transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                    >
                      {/* Avatar picture */}
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-950 border-2 border-zinc-800 group-hover:border-yellow-400 transition-all shadow-md relative shrink-0">
                        {actor.photoUrl ? (
                          <img
                            src={actor.photoUrl}
                            alt={actor.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-650 bg-zinc-950">
                            <User className="w-6 h-6" />
                          </div>
                        )}
                      </div>

                      {/* Info block */}
                      <div className="mt-3 w-full">
                        <h4 className="font-black text-xs text-zinc-150 tracking-tight truncate w-full group-hover:text-white transition">
                          {actor.name}
                        </h4>
                        
                        {actor.characterName && (
                          <p className="text-[10px] text-zinc-500 truncate italic mt-0.5">
                            u ulozi: {actor.characterName}
                          </p>
                        )}
                        
                        {/* Summary details */}
                        <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-zinc-850/60">
                          <span className="text-[9px] font-mono text-zinc-500 font-bold bg-zinc-950/60 px-1.5 py-0.5 rounded border border-zinc-800">
                            {appearances.length} {appearances.length === 1 ? 'Uloga' : appearances.length < 5 ? 'Uloge' : 'Uloga'}
                          </span>
                          
                          {avgRating > 0 && (
                            <span className="flex items-center gap-0.5 text-[9px] font-mono font-black text-yellow-500 bg-yellow-400/5 px-1.5 py-0.5 rounded border border-yellow-500/10">
                              <Star size={8} className="fill-yellow-500 text-yellow-500" />
                              {avgRating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          // DEDICATED PROFILE PAGE FOR THE SELECTED ACTOR
          <motion.div
            key="actor-profile-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-zinc-900/40 border border-zinc-850 rounded-3xl p-6 md:p-8 space-y-8"
          >
            {/* Back button row */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => { setSelectedActorName(null); setIsEditing(false); }}
                className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg transition active:scale-95 cursor-pointer"
              >
                <ArrowLeft size={14} /> Nazad na bazu glumaca
              </button>

              <button
                onClick={isEditing ? saveActorDetails : startEditing}
                className={`flex items-center gap-1.5 text-xs font-black px-3.5 py-1.5 rounded-lg transition active:scale-95 cursor-pointer ${
                  isEditing 
                    ? 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400' 
                    : 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-750 border border-zinc-700/60'
                }`}
              >
                {isEditing ? <Save size={14} /> : <Edit3 size={14} />}
                <span>{isEditing ? 'Spremi promjene' : 'Uredi profil'}</span>
              </button>
            </div>

            {/* Profile Header info block */}
            <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start text-center md:text-left">
              
              {/* Profile Image Column */}
              <div className="relative group shrink-0">
                <div className="w-32 h-32 md:w-36 md:h-36 rounded-2xl overflow-hidden bg-zinc-950 border-4 border-zinc-800 relative shadow-xl">
                  {activeActorData?.actor.photoUrl ? (
                    <img
                      src={activeActorData.actor.photoUrl}
                      alt={activeActorData.actor.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700 bg-zinc-950">
                      <User className="w-14 h-14" />
                    </div>
                  )}
                </div>
              </div>

              {/* Portrait Info Data Column */}
              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
                    {activeActorData?.actor.name}
                  </h1>
                  {activeActorData?.actor.characterName && (
                    <span className="inline-block mt-1 text-sm font-bold text-yellow-400 bg-yellow-400/5 border border-yellow-500/10 px-2.5 py-1 rounded-full uppercase tracking-wide">
                      Primarni lik: {activeActorData.actor.characterName}
                    </span>
                  )}
                </div>

                {/* Edit Form Fields vs Standard Profile display fields */}
                {isEditing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-left">
                    <div className="space-y-1.5 col-span-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ime Glumca / Glumice</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Ime i prezime..."
                        className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-yellow-500 font-bold"
                      />
                    </div>

                    <div className="space-y-1.5 col-span-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Primarni Lik</label>
                      <input
                        type="text"
                        value={editCharacterName}
                        onChange={(e) => setEditCharacterName(e.target.value)}
                        placeholder="npr. Batman / Tony Stark..."
                        className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-yellow-500"
                      />
                    </div>

                    <div className="space-y-1.5 col-span-1 sm:col-span-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">URL Slike Glumca</label>
                      <input
                        type="text"
                        value={editPhotoUrl}
                        onChange={(e) => setEditPhotoUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/photo-..."
                        className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-yellow-500"
                      />
                    </div>

                    <div className="space-y-1.5 col-span-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Dob / Godine rođenja</label>
                      <input
                        type="text"
                        value={editAge}
                        onChange={(e) => setEditAge(e.target.value)}
                        placeholder="npr. 45"
                        className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-yellow-500"
                      />
                    </div>

                    <div className="space-y-1.5 col-span-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ostale informacije</label>
                      <input
                        type="text"
                        value={editOtherInfo}
                        onChange={(e) => setEditOtherInfo(e.target.value)}
                        placeholder="npr. Oscar dobitnik"
                        className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-yellow-500"
                      />
                    </div>

                    <div className="space-y-1.5 col-span-1 sm:col-span-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Kratka Biografija</label>
                      <textarea
                        rows={3}
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        placeholder="Unesite kratku historiju rada i zanimljivosti o glumcu..."
                        className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-yellow-500 resize-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Compact stats info */}
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-semibold">
                      {activeActorData?.actor.age && (
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <Calendar size={14} className="text-zinc-500" />
                          <span>Starost: <strong className="text-zinc-200">{activeActorData.actor.age} godina</strong></span>
                        </div>
                      )}
                      
                      {activeActorData?.actor.otherInfo && (
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <Info size={14} className="text-zinc-500" />
                          <span>Osobina: <strong className="text-zinc-200">{activeActorData.actor.otherInfo}</strong></span>
                        </div>
                      )}
                    </div>

                    {/* Bio */}
                    <div>
                      <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Biografija</h4>
                      <p className="text-xs text-zinc-455 text-zinc-350 leading-relaxed max-w-xl">
                        {activeActorData?.actor.bio || 'Biografija glumca još uvijek nije unesena. Kliknite "Uredi profil" da dodate biografiju i ostale osobine.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* List of appearances with performance rating */}
            <div className="space-y-4 pt-6 border-t border-zinc-850">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Heart className="text-red-500 w-4 h-4 fill-red-500" /> Ostvarene uloge i ocjene performanse ({activeActorData?.appearances.length})
              </h3>
              <p className="text-xs text-zinc-500 -mt-2">
                Ocijenite kvalitetu glume ovog glumca u svakom pojedinačnom filmu ili epizodi serije
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeActorData?.appearances.map((app) => {
                  const hasRating = app.rawActor.performanceRating !== undefined;
                  const currentRating = app.rawActor.performanceRating || 0;

                  return (
                    <div 
                      key={`appearance-${app.entryId}-${app.seasonNum || 0}-${app.epNum || 0}`}
                      className="bg-zinc-950/50 hover:bg-zinc-950 border border-zinc-850 rounded-2xl p-4 flex flex-col justify-between gap-4 transition duration-200"
                    >
                      {/* Name and context of role */}
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                            {app.type === 'movie' ? '🎬 Film' : `📺 Epizoda serije (S${app.seasonNum}E${app.epNum})`}
                          </span>
                          <h4 className="font-extrabold text-xs text-zinc-100 tracking-tight mt-0.5">
                            {app.entryName}
                          </h4>
                          {app.epName && (
                            <p className="text-[10px] text-zinc-400 italic mt-0.5">
                              "{app.epName}"
                            </p>
                          )}
                          {app.rawActor.characterName && (
                            <p className="text-[10px] text-yellow-500/80 mt-1 font-medium">
                              Kao lik: <strong className="text-zinc-200">{app.rawActor.characterName}</strong>
                            </p>
                          )}
                        </div>

                        {/* Open media item button */}
                        <button
                          onClick={() => onNavigateToEntry(app.entryId, app.seasonNum, app.epNum)}
                          className="p-2 bg-zinc-900 text-zinc-400 hover:text-white rounded-lg border border-zinc-800 transition active:scale-95 cursor-pointer"
                          title="Otvori u katalogu"
                        >
                          <ExternalLink size={12} />
                        </button>
                      </div>

                      {/* Performance rating control */}
                      <div className="flex items-center justify-between pt-3 border-t border-zinc-900/60">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                          Ocjena Glume:
                        </span>
                        
                        {/* Interactive stars bar */}
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => {
                            const isSelected = star <= currentRating;
                            return (
                              <button
                                key={`star-${star}`}
                                onClick={() => onUpdateActorAppearanceRating(
                                  app.rawActor.name,
                                  app.entryId,
                                  app.seasonNum,
                                  app.epNum,
                                  star
                                )}
                                className="transition transform hover:scale-125 cursor-pointer"
                                title={`Ocijeni sa ${star}/10`}
                              >
                                <Star 
                                  size={13} 
                                  className={`${
                                    isSelected 
                                      ? 'fill-yellow-500 text-yellow-500' 
                                      : 'text-zinc-700 hover:text-zinc-500'
                                  }`} 
                                />
                              </button>
                            );
                          })}
                          <span className="text-[11px] font-mono font-black text-zinc-400 ml-1.5">
                            {hasRating ? `${currentRating.toFixed(0)}/10` : 'N/O'}
                          </span>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
