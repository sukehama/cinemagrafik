import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Clock
} from 'lucide-react';
import { UserProfile, ContributionLog } from '../firebaseSync';

interface UserProfileModalProps {
  user: any;
  profile: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  recentContributions: ContributionLog[];
  isLoadingContributions: boolean;
}

export default function UserProfileModal({
  user,
  profile,
  isOpen,
  onClose,
  onLogout,
  recentContributions,
  isLoadingContributions
}: UserProfileModalProps) {
  if (!user) return null;

  // Format date to local readable format
  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '—';
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString('hr-HR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  // Get action icon
  const getActionIcon = (actionType: 'add' | 'edit' | 'delete' | 'rating' | 'review') => {
    switch (actionType) {
      case 'add':
        return <Plus size={12} className="text-emerald-400" />;
      case 'edit':
        return <Edit size={12} className="text-yellow-400" />;
      case 'delete':
        return <Trash2 size={12} className="text-red-400" />;
      case 'rating':
        return <Star size={12} className="text-sky-400 fill-current" />;
      case 'review':
        return <MessageSquare size={12} className="text-purple-400" />;
      default:
        return <Clock size={12} className="text-zinc-400" />;
    }
  };

  // Get action label / color class
  const getActionBadge = (actionType: 'add' | 'edit' | 'delete' | 'rating' | 'review') => {
    switch (actionType) {
      case 'add':
        return <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-900/40 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">Dodano</span>;
      case 'edit':
        return <span className="bg-yellow-950/80 text-yellow-400 border border-yellow-900/40 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">Izmjena</span>;
      case 'delete':
        return <span className="bg-red-950/80 text-red-400 border border-red-900/40 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">Obrisano</span>;
      case 'rating':
        return <span className="bg-sky-950/80 text-sky-400 border border-sky-900/40 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">Ocjena</span>;
      case 'review':
        return <span className="bg-purple-950/80 text-purple-400 border border-purple-900/40 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">Komentar</span>;
      default:
        return <span className="bg-zinc-900 text-zinc-400 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">Akcija</span>;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md" id="profile-modal-overlay">
          {/* Backdrop Tap to close */}
          <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl z-10 flex flex-col max-h-[85vh]"
          >
            {/* Header image band */}
            <div className="h-28 bg-gradient-to-r from-yellow-500/20 via-purple-500/10 to-sky-500/20 relative border-b border-zinc-800 shrink-0">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-950/80 hover:bg-zinc-950 text-zinc-400 hover:text-white flex items-center justify-center transition border border-zinc-850 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Profile Info Overlay section */}
            <div className="px-6 pb-6 relative flex flex-col md:flex-row md:items-end gap-5 -mt-10 shrink-0">
              <img 
                src={user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80'} 
                alt={user.displayName || 'Korisnik'} 
                className="w-20 h-20 rounded-2xl border-4 border-zinc-900 bg-zinc-950 object-cover shadow-xl"
                referrerPolicy="no-referrer"
              />
              <div className="flex-1 space-y-1">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  {user.displayName || 'Korisnik'}
                  <span className="h-2 w-2 rounded-full bg-emerald-400" title="Aktivan" />
                </h3>
                <p className="text-xs text-zinc-400 flex items-center gap-1.5 font-mono">
                  <Mail size={12} className="text-zinc-500" />
                  {user.email || 'Nema e-maila'}
                </p>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 bg-red-650/10 hover:bg-red-650/20 border border-red-500/35 text-red-400 font-extrabold px-4 py-2 rounded-xl text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all self-start md:self-end"
              >
                <LogOut size={14} />
                Odjavi Se
              </button>
            </div>

            {/* Main Content Layout */}
            <div className="p-6 pt-0 flex-1 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              {/* Stats & Metadata Bento Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Stats Card: Contributions */}
                <div className="bg-zinc-950 p-4.5 rounded-2xl border border-zinc-850/50 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">Moji Doprinosi</span>
                    <p className="text-2xl font-black text-white font-mono leading-none">
                      {profile?.contributionsCount || 0}
                    </p>
                    <p className="text-[9px] text-zinc-650 font-bold uppercase">U bazi podataka</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-yellow-400/10 text-yellow-400 flex items-center justify-center">
                    <Award size={20} />
                  </div>
                </div>

                {/* Metadata Card: Registry Date */}
                <div className="bg-zinc-950 p-4.5 rounded-2xl border border-zinc-850/50 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">Datum Registracije</span>
                    <p className="text-sm font-extrabold text-zinc-200">
                      {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('hr-HR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Danas'}
                    </p>
                    <p className="text-[9px] text-zinc-500 font-mono">
                      Zadnja aktivnost: {profile?.lastActive ? new Date(profile.lastActive).toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' }) : 'Sada'}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-400/10 text-purple-400 flex items-center justify-center">
                    <Calendar size={20} />
                  </div>
                </div>
              </div>

              {/* RECENT ACTIVITY / CONTRIBUTION HISTORY */}
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
                ) : recentContributions.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-zinc-850 rounded-2xl bg-zinc-950/10">
                    <p className="text-xs text-zinc-500 italic">Nema zabilježenih doprinosa. Sve promjene koje napravite bit će ovdje prikazane!</p>
                  </div>
                ) : (
                  <div className="border border-zinc-850/80 rounded-2xl divide-y divide-zinc-850/60 bg-zinc-950/30 overflow-hidden">
                    {recentContributions.map((log) => (
                      <div key={log.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-zinc-900/30 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Contributor Avatar */}
                          <img 
                            src={log.userPhotoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=50&h=50&q=80'} 
                            alt={log.userName} 
                            className="w-8 h-8 rounded-lg object-cover bg-zinc-950 shrink-0 border border-zinc-800"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold text-zinc-200 truncate">
                              {log.userName}
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
            </div>

            {/* Footer brand info */}
            <div className="p-4 bg-zinc-950 border-t border-zinc-850 text-center text-[10px] text-zinc-650 font-mono shrink-0">
              Uređaj spojen na universalnu Firebase Cloud bazu
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
