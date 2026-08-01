import React, { useState, useEffect } from 'react';
import {
X,
User,
Mail,
Calendar,
Award,
Plus,
Edit,
Trash2,
Star,
MessageSquare,
LogOut,
RefreshCw,
Clock,
Check,
Crown,
Shield,
Image as ImageIcon,
Globe,
Save,
Eye,
Camera,
Activity,
CheckCircle,
XCircle,
Search
} from 'lucide-react';
import {
UserProfile,
ContributionLog,
fetchAllUserProfiles,
setUserModeratorStatus,
fetchPendingChangeRequests,
updateChangeRequestStatus
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
onUpdateProfile?: (updatedData: Partial) => Promise;
onSelectUser?: (userId: string) => void;
onSyncAllToServer?: () => Promise;
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

const MASTER_ADMIN_EMAIL = 'bilkufarimulhik006@gmail.com';
const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80';

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

// Safe fallback Profile object so modal never crashes if profile is loading
const activeProfile: UserProfile = profile || {
uid: user?.uid || 'guest',
email: user?.email || '',
displayName: user?.displayName || user?.email?.split('@')[0] || 'Korisnik',
photoURL: user?.photoURL || DEFAULT_AVATAR,
bio: 'Ljubitelj filmova i serija 🎬',
statusText: 'Aktivan u katalogu',
profileGradientStyle: 'classic',
bannerUrl: '',
contributionsCount: 0,
createdAt: Date.now(),
lastActive: Date.now(),
isOnline: true,
};

const [isEditing, setIsEditing] = useState(false);
const [editedName, setEditedName] = useState('');
const [editedPhoto, setEditedPhoto] = useState('');
const [editedBio, setEditedBio] = useState('');
const [editedStatusText, setEditedStatusText] = useState('');
const [editedGradient, setEditedGradient] = useState('classic');
const [editedBannerUrl, setEditedBannerUrl] = useState('');
const [isSaving, setIsSaving] = useState(false);
const [saveSuccess, setSaveSuccess] = useState(false);

// Admin sync status
const [isSyncingMaster, setIsSyncingMaster] = useState(false);
const [syncMasterMsg, setSyncMasterMsg] = useState<string | null>(null);

// Synchronize internal state on profile change
useEffect(() => {
if (activeProfile) {
setEditedName(activeProfile.displayName || '');
setEditedPhoto(activeProfile.photoURL || '');
setEditedBio(activeProfile.bio || 'Ljubitelj filmova i serija 🎬');
setEditedStatusText(activeProfile.statusText || 'Aktivan u katalogu');
setEditedGradient(activeProfile.profileGradientStyle || 'classic');
setEditedBannerUrl(activeProfile.bannerUrl || '');
}
}, [profile, isOpen, user]);

// Determine administrator privilege status
const isAdmin = activeProfile.email === MASTER_ADMIN_EMAIL || activeProfile.isAdmin === true || user?.email === MASTER_ADMIN_EMAIL;

// Admin panel state
const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
const [userSearchQuery, setUserSearchQuery] = useState('');
const [pendingRequests, setPendingRequests] = useState<PendingChangeRequest[]>([]);
const [isLoadingAdmin, setIsLoadingAdmin] = useState(false);

useEffect(() => {
if (isOpen && isAdmin) {
const loadAdminData = async () => {
setIsLoadingAdmin(true);
try {
const users = await fetchAllUserProfiles();
setAllUsers(users || []);
const reqs = await fetchPendingChangeRequests();
setPendingRequests(reqs || []);
} catch (e) {
console.error("Admin data load error:", e);
} finally {
setIsLoadingAdmin(false);
}
};
loadAdminData();
}
}, [isOpen, isAdmin]);

if (!isOpen) return null;

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

const activeGradient = getGradientClass(activeProfile.profileGradientStyle);
const activeBorder = getGradientBorder(activeProfile.profileGradientStyle);

const handleSave = async () => {
if (!onUpdateProfile) return;
setIsSaving(true);
setSaveSuccess(false);
try {
await onUpdateProfile({
displayName: editedName.trim() || activeProfile.displayName,
photoURL: editedPhoto || activeProfile.photoURL,
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
case 'add':
return Dodano;
case 'edit':
return Izmjena;
case 'delete':
return Obrisano;
case 'rating':
return Ocjena;
case 'review':
return Komentar;
default:
return Akcija;
}
};

return (

{/* Backdrop Tap to close */}


  <div className={`relative bg-zinc-900 border ${activeBorder} rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl z-10 flex flex-col max-h-[85vh]`}>
    {/* Header image / gradient band */}
    <div 
      className={`h-32 relative shrink-0 overflow-hidden bg-gradient-to-r ${activeGradient}`}
      style={activeProfile.bannerUrl ? { backgroundImage: `linear-gradient(to bottom, rgba(24, 24, 27, 0.2), rgba(24, 24, 27, 0.8)), url(${activeProfile.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
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

    {/* Profile Info Overlay section */}
    <div className="px-6 pb-6 relative flex flex-col sm:flex-row sm:items-end gap-5 -mt-12 shrink-0 border-b border-zinc-850/60 bg-zinc-900/60 backdrop-blur">
      <div className="relative group shrink-0 self-start sm:self-auto">
        <img 
          src={activeProfile.photoURL || DEFAULT_AVATAR} 
          alt={activeProfile.displayName || 'Korisnik'} 
          className="w-24 h-24 rounded-3xl border-4 border-zinc-900 bg-zinc-950 object-cover shadow-2xl"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
          }}
        />
        <span className={`absolute bottom-1 right-1 block h-3.5 w-3.5 rounded-full ring-4 ring-zinc-900 ${activeProfile.isOnline !== false ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
      </div>

      <div className="flex-1 space-y-1.5 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
            {activeProfile.displayName || 'Korisnik'}
          </h3>
          {activeProfile.isOnline !== false && (
            <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-900/30 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              Online
            </span>
          )}
        </div>
        
        <p className="text-[11px] font-bold text-yellow-400 flex items-center gap-1.5 font-sans italic bg-yellow-500/5 border border-yellow-500/10 px-2.5 py-1 rounded-lg w-max max-w-full">
          <Activity size={12} className="text-yellow-400 shrink-0" />
          "{activeProfile.statusText || 'Nema statusne poruke'}"
        </p>

        <p className="text-xs text-zinc-400 flex items-center gap-1.5 font-mono">
          <Mail size={12} className="text-zinc-500" />
          {activeProfile.email || user?.email || 'Nema e-maila'}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-start sm:self-end">
        {!isReadOnly && (
          <>
            {isEditing ? (
              <button
                onClick={() => setIsEditing(false)}
                className="bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-extrabold px-3.5 py-2 rounded-xl text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
              >
                Odustani
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-500 text-zinc-950 font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all shadow-lg shadow-yellow-500/10"
              >
                <Edit size={14} />
                Uredi Profil
              </button>
            )}
          </>
        )}
        {onLogout && !isReadOnly && (
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 bg-red-650/10 hover:bg-red-650/20 border border-red-500/35 text-red-400 font-extrabold px-4 py-2 rounded-xl text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
          >
            <LogOut size={14} />
            Odjavi Se
          </button>
        )}
      </div>
    </div>

    {/* Main Scroll Content Layout */}
    <div className="p-6 flex-1 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
      {isEditing ? (
        // EDIT MODE FORM
        <div className="space-y-5 animate-fade-in">
          <div className="border-b border-zinc-850 pb-2 flex items-center gap-2">
            <Edit size={14} className="text-yellow-400" />
            <h4 className="text-xs font-black uppercase text-zinc-200 tracking-wider">Prilagodi Moj Račun</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nickname */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider block">Prikazano Ime</label>
              <input 
                type="text" 
                value={editedName} 
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Upišite nadimak..."
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 p-2.5 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>

            {/* Status text */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider block">Statusna Poruka</label>
              <input 
                type="text" 
                value={editedStatusText} 
                onChange={(e) => setEditedStatusText(e.target.value)}
                placeholder="npr. Gledam Shoguna ⚔️..."
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 p-2.5 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Bio Textarea */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider block">Biografija (Kratki opis)</label>
            <textarea 
              value={editedBio} 
              onChange={(e) => setEditedBio(e.target.value)}
              placeholder="Recite nešto o sebi..."
              rows={2}
              maxLength={160}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 p-2.5 rounded-xl text-xs text-white focus:outline-none resize-none"
            />
            <div className="text-right text-[9px] text-zinc-650 font-mono">
              {editedBio.length}/160 znakova
            </div>
          </div>

          {/* Custom Avatar selector & input */}
          <div className="space-y-2.5">
            <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider block">Profilna Slika (Izaberite ili zalijepite URL)</label>
            <div className="grid grid-cols-6 gap-2.5">
              {AVATAR_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => setEditedPhoto(preset.url)}
                  className={`aspect-square rounded-2xl overflow-hidden border-2 relative focus:outline-none cursor-pointer group ${
                    editedPhoto === preset.url ? 'border-yellow-400 scale-95 shadow-lg' : 'border-zinc-800 opacity-60 hover:opacity-100'
                  }`}
                  title={preset.name}
                >
                  <img src={preset.url} alt="" className="w-full h-full object-cover" />
                  {editedPhoto === preset.url && (
                    <div className="absolute inset-0 bg-yellow-400/10 flex items-center justify-center">
                      <span className="bg-yellow-400 text-zinc-950 p-0.5 rounded-full">
                        <Check size={8} strokeWidth={4} />
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-zinc-950 p-1.5 rounded-xl border border-zinc-850 mt-1">
              <span className="text-[10px] text-zinc-550 font-mono px-2">Custom URL:</span>
              <input 
                type="text" 
                value={editedPhoto} 
                onChange={(e) => setEditedPhoto(e.target.value)}
                placeholder="https://..."
                className="flex-1 bg-transparent text-xs text-zinc-300 focus:outline-none"
              />
            </div>
          </div>

          {/* Custom Banner selector & input */}
          <div className="space-y-2.5">
            <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider block">Stil Profila / Pozadina (Odaberite Gradient ili zalijepite sliku)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {GRADIENT_PRESETS.map((grad) => (
                <button
                  key={grad.id}
                  onClick={() => setEditedGradient(grad.id)}
                  className={`p-2.5 rounded-xl bg-gradient-to-r ${grad.class} border-2 text-left relative focus:outline-none cursor-pointer transition-all ${
                    editedGradient === grad.id ? 'border-white scale-[0.98]' : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <span className="text-[10px] font-black text-white uppercase tracking-wider block drop-shadow-md">
                    {grad.name}
                  </span>
                  {editedGradient === grad.id && (
                    <span className="absolute right-2 top-2 bg-white text-zinc-950 rounded-full p-0.5 shadow">
                      <Check size={8} strokeWidth={4} />
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="space-y-1.5 mt-2">
              <span className="text-[10px] text-zinc-550 font-mono block">Custom URL za Pozadinsku Sliku (zamjenjuje gradient):</span>
              <div className="flex items-center gap-2 bg-zinc-950 p-2 rounded-xl border border-zinc-850">
                <ImageIcon size={12} className="text-zinc-500 shrink-0" />
                <input 
                  type="text" 
                  value={editedBannerUrl} 
                  onChange={(e) => setEditedBannerUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 bg-transparent text-xs text-zinc-300 focus:outline-none"
                />
                {editedBannerUrl && (
                  <button 
                    onClick={() => setEditedBannerUrl('')}
                    className="text-[9px] text-red-400 hover:text-red-300 uppercase font-mono px-1.5"
                  >
                    Očisti
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Save and Cancel buttons */}
          <div className="pt-3 border-t border-zinc-850 flex items-center justify-end gap-2.5">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-extrabold rounded-xl text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
            >
              Odustani
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all shadow-lg shadow-emerald-500/15"
            >
              {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              Spremi Izmjene
            </button>
          </div>
        </div>
      ) : (
        // NORMAL VIEW MODE
        <div className="space-y-6">
          {/* About Bio Section */}
          {activeProfile.bio && (
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-850/50 space-y-1.5">
              <span className="text-[10px] text-zinc-500 uppercase font-black tracking-wider block">O Meni / Biografija</span>
              <p className="text-xs text-zinc-200 font-medium leading-relaxed font-sans">
                {activeProfile.bio}
              </p>
            </div>
          )}

          {/* Stats Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Contributions count */}
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-850/50 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">Ukupni Doprinosi</span>
                <p className="text-2xl font-black text-white font-mono leading-none">
                  {activeProfile.contributionsCount || 0}
                </p>
                <p className="text-[9px] text-zinc-600 font-bold uppercase">Upisano u bazu podataka</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-yellow-400/10 text-yellow-400 flex items-center justify-center">
                <Award size={20} />
              </div>
            </div>

            {/* Registration Date */}
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-850/50 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">Datum Registracije</span>
                <p className="text-sm font-extrabold text-zinc-200">
                  {activeProfile.createdAt ? new Date(activeProfile.createdAt).toLocaleDateString('hr-HR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Pridružen nedavno'}
                </p>
                <p className="text-[9px] text-zinc-550 font-mono">
                  Zadnja aktivnost: {activeProfile.lastActive ? new Date(activeProfile.lastActive).toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' }) : 'Sada'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-400/10 text-purple-400 flex items-center justify-center">
                <Calendar size={20} />
              </div>
            </div>
          </div>

          {/* TROFEJI SECTION */}
          <div className="space-y-3 bg-zinc-950/80 p-4 rounded-2xl border border-yellow-400/20">
            <h4 className="text-xs font-black uppercase text-yellow-400 tracking-wider flex items-center gap-2">
              <Award size={16} className="text-yellow-400" />
              Trofeji i Dostignuća
            </h4>

            {(activeProfile.trophies && activeProfile.trophies.length > 0) || localStorage.getItem('vedo_trophy_unlocked') === 'true' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 bg-gradient-to-r from-yellow-500/10 to-amber-500/5 p-3 rounded-xl border border-yellow-500/30">
                  <div className="w-10 h-10 rounded-full bg-yellow-400 text-zinc-955 flex items-center justify-center font-black shadow-[0_0_15px_rgba(250,204,21,0.5)] shrink-0">
                    <Crown size={20} />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-yellow-300 uppercase tracking-wide">Vedo Dela Slayer 🏆</h5>
                    <p className="text-[10px] text-zinc-400 font-bold">Pobijeđen Vedo Dela Boss u mini-igri!</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 font-mono italic">
                Još nemate otključanih trofeja. Pobijedite Vedo Dela Boss-a da otključate prvi trofej!
              </p>
            )}
          </div>

          {/* ADMIN PANEL SECTION */}
          {isAdmin && (
            <div className="space-y-4 bg-gradient-to-br from-amber-500/10 via-zinc-950 to-zinc-950 p-5 rounded-2xl border border-amber-500/40 shadow-2xl">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
                <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-2">
                  <Crown size={18} className="text-amber-400 animate-pulse" />
                  Admin Kontrolni Panel ({MASTER_ADMIN_EMAIL})
                </h4>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  Vlasnik Baze
                </span>
              </div>

              {/* Master Catalog Server Sync Option */}
              {onSyncAllToServer && (
                <div className="pt-3 border-b border-amber-500/20 pb-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[11px] font-black uppercase text-amber-300 tracking-wider flex items-center gap-1.5">
                      <Activity size={13} className="text-amber-400" />
                      Glavna Sinhronizacija Baze sa Serverom
                    </h5>
                    <span className="text-[9px] font-mono text-zinc-400">Master Sync</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    Pritisnite ovo dugme da pošaljete sav lokalni katalog na centralni Firestore server. Od tog trenutka svi drugi korisnici u Bosni i Hercegovini i svijetu vide kompletan sadržaj s vašeg kompjutera!
                  </p>

                  {syncMasterMsg && (
                    <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-[10px] text-emerald-300 font-bold">
                      {syncMasterMsg}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={isSyncingMaster}
                    onClick={async () => {
                      setIsSyncingMaster(true);
                      setSyncMasterMsg(null);
                      try {
                        await onSyncAllToServer();
                        setSyncMasterMsg('✓ Čitav katalog uspješno sinhronizovan na server! Svi korisnici sada imaju vašu najnoviju bazu.');
                      } catch (e: any) {
                        setSyncMasterMsg('Greška pri sinhronizaciji: ' + (e.message || 'Nepoznata greška'));
                      } finally {
                        setIsSyncingMaster(false);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-zinc-955 font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    {isSyncingMaster ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                    {isSyncingMaster ? 'Sinhronizujem...' : '🚀 Sinhronizuj Sve sa Serverom'}
                  </button>
                </div>
              )}

              {/* Pending Requests Review */}
              <div className="space-y-2.5">
                <h5 className="text-[11px] font-black uppercase text-zinc-300 tracking-wider flex items-center gap-1.5">
                  <Clock size={13} className="text-yellow-400" />
                  Zahtjevi za Izmjene ({pendingRequests.length})
                </h5>
                {pendingRequests.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic bg-zinc-950/60 p-3 rounded-xl border border-zinc-900">
                    Nema trenutnih zahtjeva na čekanju.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {pendingRequests.map(req => (
                      <div key={req.id} className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="font-extrabold text-zinc-200">
                            {req.userName} <span className="text-zinc-500 font-normal">({req.userEmail})</span>
                          </div>
                          <div className="text-[10px] text-yellow-400 font-bold mt-0.5">
                            {req.details}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleResolveRequest(req.id, 'approved')}
                            className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-zinc-955 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle size={12} /> Odobri
                          </button>
                          <button
                            onClick={() => handleResolveRequest(req.id, 'rejected')}
                            className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle size={12} /> Odbij
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Manage Users & Moderator Privileges */}
              <div className="space-y-2.5 pt-3 border-t border-amber-500/20">
                <h5 className="text-[11px] font-black uppercase text-zinc-300 tracking-wider flex items-center gap-1.5">
                  <Shield size={13} className="text-amber-400" />
                  Upravljanje Korisnicima & Moderatorima
                </h5>
                
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-2.5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Pretraži registrovane korisnike..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 text-xs text-zinc-200 pl-8 pr-3 py-1.5 rounded-xl focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {allUsers
                    .filter(u => {
                      if (!userSearchQuery) return true;
                      const query = userSearchQuery.toLowerCase();
                      const nameMatch = (u.displayName || '').toLowerCase().includes(query);
                      const emailMatch = (u.email || '').toLowerCase().includes(query);
                      return nameMatch || emailMatch;
                    })
                    .map(u => (
                      <div key={u.uid} className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-900 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <img 
                            src={u.photoURL || DEFAULT_AVATAR} 
                            alt={u.displayName || 'Korisnik'} 
                            className="w-7 h-7 rounded-full object-cover border border-zinc-800"
                            onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
                          />
                          <div>
                            <div className="font-extrabold text-zinc-200 text-xs">{u.displayName || 'Korisnik'}</div>
                            <div className="text-[10px] text-zinc-500 font-mono">{u.email || 'Nema e-maila'}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleModerator(u.uid, u.isModerator)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                            u.isModerator
                              ? 'bg-amber-400 text-zinc-955 shadow-md shadow-amber-400/20'
                              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                          }`}
                        >
                          {u.isModerator ? 'Moderator ✓' : '+ Dodaj Moderatora'}
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Contribution list inside Modal */}
          {recentContributions && recentContributions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-zinc-400 tracking-wider flex items-center gap-2">
                <Clock size={14} className="text-yellow-400" />
                Zadnje Izmjene i Doprinosi u Katalogu
              </h4>

              {isLoadingContributions ? (
                <div className="p-8 text-center border border-zinc-850 rounded-2xl flex flex-col items-center justify-center gap-2 bg-zinc-950/20">
                  <RefreshCw size={24} className="animate-spin text-yellow-400" />
                  <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">Učitavanje doprinosa...</p>
                </div>
              ) : (
                <div className="border border-zinc-850/80 rounded-2xl divide-y divide-zinc-850/60 bg-zinc-950/30 overflow-hidden">
                  {recentContributions.map((log) => (
                    <div 
                      key={log.id} 
                      onClick={() => onSelectUser && onSelectUser(log.userId)}
                      className={`p-3.5 flex items-center justify-between gap-4 hover:bg-zinc-900/30 transition-colors ${onSelectUser ? 'cursor-pointer group' : ''}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img 
                          src={log.userPhotoUrl || DEFAULT_AVATAR} 
                          alt={log.userName || 'Korisnik'} 
                          className={`w-8 h-8 rounded-lg object-cover bg-zinc-950 shrink-0 border border-zinc-800 ${onSelectUser ? 'group-hover:border-yellow-400 transition-colors' : ''}`}
                          referrerPolicy="no-referrer"
                          onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
                        />
                        <div className="min-w-0">
                          <p className={`text-xs font-extrabold truncate ${onSelectUser ? 'text-zinc-200 group-hover:text-yellow-400 transition-colors' : 'text-zinc-200'}`}>
                            {log.userName || 'Korisnik'}
                          </p>
                          <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                            {log.details}: <span className="text-yellow-400 font-bold">"{log.entryName}"</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0 gap-1.5 font-mono">
                        {getActionBadge(log.actionType)}
                        <span className="text-[9px] text-zinc-550">
                          {new Date(log.timestamp).toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>

    {/* Footer brand info */}
    <div className="p-4 bg-zinc-950 border-t border-zinc-850 text-center text-[10px] text-zinc-600 font-mono shrink-0 flex items-center justify-center gap-1.5 select-none">
      <Globe size={11} className="text-zinc-550" />
      <span>Sinhronizovano u realnom vremenu s Firebase Cloud bazom podataka</span>
    </div>
  </div>
</div>


);
}