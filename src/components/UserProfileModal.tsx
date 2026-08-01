import React, { useState, useEffect } from 'react';
import { 
  X, User, Mail, Calendar, Award, Plus, Edit, Trash2, Star, MessageSquare, 
  LogOut, RefreshCw, Clock, Check, Crown, Shield, Image as ImageIcon, Globe, 
  Save, Eye, Camera, Activity, CheckCircle, XCircle, Search 
} from 'lucide-react';
import { 
  UserProfile, ContributionLog, fetchAllUserProfiles, setUserModeratorStatus, 
  fetchPendingChangeRequests, updateChangeRequestStatus 
} from '../firebaseSync';
import { PendingChangeRequest } from '../types';

interface UserProfileModalProps {
  user: any;
  profile: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onLogout?: () => void;
  recentContributions?: ContributionLog[];
  isLoadingContributions?: boolean;
  isReadOnly?: boolean;
  onUpdateProfile?: (updatedData: Partial<UserProfile>) => Promise<void>;
  onSelectUser?: (userId: string) => void;
  onSyncAllToServer?: () => Promise<void>;
}

const AVATAR_PRESETS = [
  { name: 'Redatelj', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80' },
  { name: 'Kritičar', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80' },
  { name: 'Popcorn Fan', url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&h=150&q=80' },
  { name: 'Glumac', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&h=150&q=80' },
  { name: 'Gledatelj', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80' },
  { name: 'Sci-Fi Fan', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&h=150&q=80' },
];

const GRADIENT_PRESETS = [
  { id: 'classic', name: 'Sivi Metal', class: 'from-zinc-800 to-zinc-950', border: 'border-zinc-700' },
  { id: 'cyberpunk', name: 'Neon Fuzija', class: 'from-pink-600 via-purple-600 to-cyan-500', border: 'border-pink-500/40' },
  { id: 'sunset', name: 'Zlatni Zalazak', class: 'from-amber-500 via-red-500 to-purple-600', border: 'border-amber-500/40' },
  { id: 'emerald', name: 'Zeleni Matriks', class: 'from-emerald-500 via-teal-500 to-cyan-600', border: 'border-emerald-500/40' },
  { id: 'cosmic', name: 'Duboki Svemir', class: 'from-indigo-950 via-purple-900 to-zinc-950', border: 'border-purple-500/30' },
  { id: 'gold', name: 'Zlatna Elita', class: 'from-yellow-600 via-amber-500 to-yellow-850', border: 'border-yellow-500/40' },
];

export default function UserProfileModal({
  user,
  profile,
  isOpen,
  onClose,
  onLogout,
  recentContributions = [],
  isLoadingContributions = false,
  isReadOnly = false,
  onUpdateProfile,
  onSelectUser,
  onSyncAllToServer
}: UserProfileModalProps) {
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedPhoto, setEditedPhoto] = useState('');
  const [editedBio, setEditedBio] = useState('');
  const [editedStatusText, setEditedStatusText] = useState('');
  const [editedGradient, setEditedGradient] = useState('classic');
  const [editedBannerUrl, setEditedBannerUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [isSyncingMaster, setIsSyncingMaster] = useState(false);
  const [syncMasterMsg, setSyncMasterMsg] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setEditedName(profile.displayName || '');
      setEditedPhoto(profile.photoURL || '');
      setEditedBio(profile.bio || 'Ljubitelj filmova i serija 🎬');
      setEditedStatusText(profile.statusText || 'Aktivan u katalogu');
      setEditedGradient(profile.profileGradientStyle || 'classic');
      setEditedBannerUrl(profile.bannerUrl || '');
    }
  }, [profile, isOpen]);

  // Admin panel state
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [pendingRequests, setPendingRequests] = useState<PendingChangeRequest[]>([]);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(false);

  // ZASTITA: Ako modal nije otvoren ili nema profila, ne renderujemo nista
  if (!isOpen || !profile) return null;

  // NOVI ADMIN
  const isAdmin = profile.email === 'bilkufarimulhik006@gmail.com' || profile.isAdmin === true;

  useEffect(() => {
    if (isOpen && isAdmin) {
      const loadAdminData = async () => {
        setIsLoadingAdmin(true);
        try {
          const users = await fetchAllUserProfiles();
          setAllUsers(users);
          const reqs = await fetchPendingChangeRequests();
          setPendingRequests(reqs);
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoadingAdmin(false);
        }
      };
      loadAdminData();
    }
  }, [isOpen, isAdmin]);

  const handleToggleModerator = async (targetUid: string, currentStatus: boolean | undefined) => {
    const nextStatus = !currentStatus;
    try {
      await setUserModeratorStatus(targetUid, nextStatus);
      setAllUsers(prev => prev.map(u => u.uid === targetUid ? { ...u, isModerator: nextStatus } : u));
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolveRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      await updateChangeRequestStatus(requestId, status);
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (e) {
      console.error(e);
    }
  };

  const getGradientClass = (styleId?: string) => {
    const found = GRADIENT_PRESETS.find(p => p.id === styleId);
    return found ? found.class : 'from-zinc-800 to-zinc-900';
  };

  const getGradientBorder = (styleId?: string) => {
    const found = GRADIENT_PRESETS.find(p => p.id === styleId);
    return found ? found.border : 'border-zinc-850';
  };

  const activeGradient = getGradientClass(profile.profileGradientStyle);
  const activeBorder = getGradientBorder(profile.profileGradientStyle);

  const handleSave = async () => {
    if (!onUpdateProfile) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onUpdateProfile({
        displayName: editedName.trim() || profile.displayName,
        photoURL: editedPhoto || profile.photoURL,
        bio: editedBio.trim(),
        statusText: editedStatusText.trim(),
        profileGradientStyle: editedGradient,
        bannerUrl: editedBannerUrl.trim(),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      setIsEditing(false);
    } catch (err) {
      console.error('Greška pri spremanju profila:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const getActionBadge = (actionType: 'add' | 'edit' | 'delete' | 'rating' | 'review') => {
    switch (actionType) {
      case 'add': return <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-900/40 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">Dodano</span>;
      case 'edit': return <span className="bg-yellow-950/80 text-yellow-400 border border-yellow-900/40 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">Izmjena</span>;
      case 'delete': return <span className="bg-red-950/80 text-red-400 border border-red-900/40 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">Obrisano</span>;
      case 'rating': return <span className="bg-sky-950/80 text-sky-400 border border-sky-900/40 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">Ocjena</span>;
      case 'review': return <span className="bg-purple-950/80 text-purple-400 border border-purple-900/40 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">Komentar</span>;
      default: return <span className="bg-zinc-900 text-zinc-400 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">Akcija</span>;
    }
  };

  // 100% Cist React JSX bez motion tagova
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md" id="profile-modal-overlay">
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      <div className={`relative bg-zinc-900 border ${activeBorder} rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl z-10 flex flex-col max-h-[85vh]`}>
        
        <div 
          className={`h-32 relative shrink-0 overflow-hidden bg-gradient-to-r ${activeGradient}`}
          style={profile.bannerUrl ? { backgroundImage: `linear-gradient(to bottom, rgba(24, 24, 27, 0.2), rgba(24, 24, 27, 0.8)), url(${profile.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        >
          <div className="absolute inset-0 bg-zinc-950/30" />
          
          <div className="absolute top-4 left-4 flex gap-2">
            {isAdmin && (
              <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-400 text-zinc-950 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-yellow-500/20">
                <Crown size={12} className="animate-pulse" />
                <span>Administrator</span>
              </div>
            )}
            {isReadOnly && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-[9px] font-black uppercase tracking-wider">
                <Eye size={10} />
                <span>Pregled Profila</span>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-950/80 hover:bg-zinc-950 text-zinc-400 hover:text-white flex items-center justify-center transition border border-zinc-850 cursor-pointer z-10"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pb-6 relative flex flex-col sm:flex-row sm:items-end gap-5 -mt-12 shrink-0 border-b border-zinc-850/60 bg-zinc-900/60 backdrop-blur">
          <div className="relative group shrink-0 self-start sm:self-auto">
            <img 
              src={profile.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80'} 
              alt={profile.displayName || 'Korisnik'} 
              className="w-24 h-24 rounded-3xl border-4 border-zinc-900 bg-zinc-950 object-cover shadow-2xl"
              referrerPolicy="no-referrer"
            />
            <span className={`absolute bottom-1 right-1 block h-3.5 w-3.5 rounded-full ring-4 ring-zinc-900 ${profile.isOnline !== false ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
          </div>

          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                {profile.displayName || 'Korisnik'}
              </h3>
            </div>
            
            <p className="text-[11px] font-bold text-yellow-400 flex items-center gap-1.5 font-sans italic bg-yellow-500/5 border border-yellow-500/10 px-2.5 py-1 rounded-lg w-max max-w-full">
              <Activity size={12} className="text-yellow-400 shrink-0" />
              "{profile.statusText || 'Nema statusne poruke'}"
            </p>

            <p className="text-xs text-zinc-400 flex items-center gap-1.5 font-mono">
              <Mail size={12} className="text-zinc-500" />
              {profile.email || 'Nema e-maila'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-end">
            {!isReadOnly && (
              <>
                {isEditing ? (
                  <button onClick={() => setIsEditing(false)} className="bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-extrabold px-3.5 py-2 rounded-xl text-xs uppercase tracking-wider cursor-pointer">
                    Odustani
                  </button>
                ) : (
                  <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-500 text-zinc-950 font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider cursor-pointer">
                    <Edit size={14} />
                    Uredi Profil
                  </button>
                )}
              </>
            )}
            {onLogout && !isReadOnly && (
              <button onClick={onLogout} className="flex items-center gap-1.5 bg-red-650/10 hover:bg-red-650/20 border border-red-500/35 text-red-400 font-extrabold px-4 py-2 rounded-xl text-xs uppercase tracking-wider cursor-pointer">
                <LogOut size={14} /> Odjavi Se
              </button>
            )}
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          {isEditing ? (
            <div className="space-y-5">
              <div className="border-b border-zinc-850 pb-2 flex items-center gap-2">
                <Edit size={14} className="text-yellow-400" />
                <h4 className="text-xs font-black uppercase text-zinc-200 tracking-wider">Prilagodi Moj Račun</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider block">Prikazano Ime</label>
                  <input type="text" value={editedName} onChange={(e) => setEditedName(e.target.value)} placeholder="Upišite nadimak..." className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 p-2.5 rounded-xl text-xs text-white focus:outline-none" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider block">Statusna Poruka</label>
                  <input type="text" value={editedStatusText} onChange={(e) => setEditedStatusText(e.target.value)} placeholder="npr. Gledam Shoguna ⚔️..." className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 p-2.5 rounded-xl text-xs text-white focus:outline-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider block">Biografija (Kratki opis)</label>
                <textarea value={editedBio} onChange={(e) => setEditedBio(e.target.value)} placeholder="Recite nešto o sebi..." rows={2} maxLength={160} className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 p-2.5 rounded-xl text-xs text-white focus:outline-none resize-none" />
                <div className="text-right text-[9px] text-zinc-650 font-mono">{editedBio.length}/160 znakova</div>
              </div>

              <div className="pt-3 border-t border-zinc-850 flex items-center justify-end gap-2.5">
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-extrabold rounded-xl text-xs uppercase tracking-wider cursor-pointer">Odustani</button>
                <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer">
                  {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  Spremi Izmjene
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {profile.bio && (
                <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-850/50 space-y-1.5">
                  <span className="text-[10px] text-zinc-500 uppercase font-black tracking-wider block">O Meni / Biografija</span>
                  <p className="text-xs text-zinc-200 font-medium leading-relaxed font-sans">{profile.bio}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-850/50 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">Ukupni Doprinosi</span>
                    <p className="text-2xl font-black text-white font-mono leading-none">{profile.contributionsCount || 0}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-yellow-400/10 text-yellow-400 flex items-center justify-center"><Award size={20} /></div>
                </div>

                <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-850/50 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">Datum Registracije</span>
                    <p className="text-sm font-extrabold text-zinc-200">
                      {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('hr-HR') : 'Pridružen nedavno'}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-400/10 text-purple-400 flex items-center justify-center"><Calendar size={20} /></div>
                </div>
              </div>

              {isAdmin && (
                <div className="space-y-4 bg-gradient-to-br from-amber-500/10 via-zinc-950 to-zinc-950 p-5 rounded-2xl border border-amber-500/40 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
                    <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-2">
                      <Crown size={18} className="text-amber-400 animate-pulse" />
                      Admin Panel (bilkufarimulhik006@gmail.com)
                    </h4>
                  </div>

                  {onSyncAllToServer && (
                    <div className="pt-3 border-b border-amber-500/20 pb-3 space-y-2">
                      <button
                        type="button"
                        disabled={isSyncingMaster}
                        onClick={async () => {
                          setIsSyncingMaster(true);
                          try { await onSyncAllToServer(); setSyncMasterMsg('Uspješno!'); } 
                          catch (e: any) { setSyncMasterMsg('Greška'); } 
                          finally { setIsSyncingMaster(false); }
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-955 font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
                      >
                        {isSyncingMaster ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                        {isSyncingMaster ? 'Sinhronizujem...' : 'Sinhronizuj Sve sa Serverom'}
                      </button>
                    </div>
                  )}

                  <div className="space-y-2.5 pt-3">
                    <h5 className="text-[11px] font-black uppercase text-zinc-300 tracking-wider flex items-center gap-1.5">
                      <Shield size={13} className="text-amber-400" /> Korisnici
                    </h5>
                    
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-2.5 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Pretraži..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-850 text-xs text-zinc-200 pl-8 pr-3 py-1.5 rounded-xl focus:outline-none"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1.5">
                      {allUsers
                        .filter(u => !userSearchQuery || (u.displayName || '').toLowerCase().includes(userSearchQuery.toLowerCase()))
                        .map(u => (
                          <div key={u.uid} className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-900 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2.5">
                              <img src={u.photoURL} alt={u.displayName} className="w-7 h-7 rounded-full object-cover border border-zinc-800" />
                              <div>
                                <div className="font-extrabold text-zinc-200">{u.displayName}</div>
                                <div className="text-[10px] text-zinc-500">{u.email}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 bg-zinc-950 border-t border-zinc-850 text-center text-[10px] text-zinc-600 font-mono shrink-0 flex items-center justify-center gap-1.5 select-none">
          <Globe size={11} className="text-zinc-550" />
          <span>Sinhronizovano u realnom vremenu s Firebase Cloud bazom podataka</span>
        </div>
      </div>
    </div>
  );
}