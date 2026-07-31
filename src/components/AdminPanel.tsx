import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Shield, Check, Trash2, Clock, UserCog, Crown, User as UserIcon, Loader as Loader2, Inbox } from 'lucide-react';
import {
  UserProfile,
  UserRole,
  PendingSubmission,
  fetchPendingSubmissions,
  approveSubmission,
  rejectSubmission,
  searchUsers,
  setUserRole,
} from '../firebaseSync';

interface AdminPanelProps {
  currentUser: UserProfile | null;
  onClose: () => void;
}

type TabType = 'submissions' | 'users';

export default function AdminPanel({ currentUser, onClose }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('submissions');
  const [submissions, setSubmissions] = useState<PendingSubmission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadSubmissions = useCallback(async () => {
    setIsLoadingSubmissions(true);
    const data = await fetchPendingSubmissions();
    setSubmissions(data);
    setIsLoadingSubmissions(false);
  }, []);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const results = await searchUsers(searchTerm);
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleRoleChange = async (userId: string, role: UserRole) => {
    setActionLoading(userId);
    try {
      await setUserRole(userId, role);
      setSearchResults(prev => prev.map(u => u.uid === userId ? { ...u, role } : u));
    } catch (err) {
      console.error('Failed to update role:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (submission: PendingSubmission) => {
    setActionLoading(submission.id);
    try {
      await approveSubmission(submission, currentUser?.uid || '');
      setSubmissions(prev => prev.filter(s => s.id !== submission.id));
    } catch (err) {
      console.error('Failed to approve submission:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (submissionId: string) => {
    setActionLoading(submissionId);
    try {
      await rejectSubmission(submissionId, currentUser?.uid || '');
      setSubmissions(prev => prev.filter(s => s.id !== submissionId));
    } catch (err) {
      console.error('Failed to reject submission:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const getRoleIcon = (role?: UserRole) => {
    switch (role) {
      case 'admin': return <Crown size={12} className="text-yellow-400" />;
      case 'moderator': return <Shield size={12} className="text-sky-400" />;
      default: return <UserIcon size={12} className="text-zinc-500" />;
    }
  };

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-yellow-400/15 text-yellow-400 border-yellow-400/30';
      case 'moderator': return 'bg-sky-400/15 text-sky-400 border-sky-400/30';
      default: return 'bg-zinc-700/40 text-zinc-400 border-zinc-700/50';
    }
  };

  const getRoleLabel = (role?: UserRole) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'moderator': return 'Moderator';
      default: return 'Korisnik';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]"
        style={{ background: 'linear-gradient(135deg, rgba(24,24,27,0.9) 0%, rgba(9,9,11,0.95) 100%)' }}
      >
        {/* Glow accent */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 p-5 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-400/15 border border-yellow-400/30 flex items-center justify-center shadow-lg">
              <Crown size={20} className="text-yellow-400" />
            </div>
            <div>
              <h2 className="font-black text-lg uppercase tracking-tight text-white">Admin Panel</h2>
              <p className="text-zinc-400 text-xs">Upravljaj submissionsima i korisničkim ulogama</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="relative z-10 flex gap-2 p-3 border-b border-white/10 bg-white/5">
          <button
            onClick={() => setActiveTab('submissions')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'submissions'
                ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 shadow-lg'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <Inbox size={14} />
            Submissions
            {submissions.length > 0 && (
              <span className="bg-yellow-400 text-zinc-950 text-[9px] font-black px-1.5 py-0.5 rounded-full">{submissions.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-sky-400/20 text-sky-400 border border-sky-400/30 shadow-lg'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <UserCog size={14} />
            Korisnici
          </button>
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 overflow-y-auto p-5">
          <AnimatePresence mode="wait">
            {activeTab === 'submissions' && (
              <motion.div
                key="submissions"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-3"
              >
                {isLoadingSubmissions ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 size={32} className="text-yellow-400 animate-spin" />
                    <p className="text-zinc-500 text-xs uppercase tracking-wider">Učitavanje submissionsa...</p>
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <Check size={28} className="text-emerald-400" />
                    </div>
                    <p className="text-zinc-300 text-sm font-bold">Nema pending submissionsa</p>
                    <p className="text-zinc-500 text-xs">Sve promjene su pregledane i odobrene.</p>
                  </div>
                ) : (
                  submissions.map((sub) => (
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <img
                            src={sub.submitterPhotoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop'}
                            alt={sub.submitterName}
                            className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-white truncate">{sub.submitterName}</span>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                sub.actionType === 'add' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : sub.actionType === 'edit' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                  : 'bg-red-500/15 text-red-400 border border-red-500/30'
                              }`}>
                                {sub.actionType === 'add' ? 'Dodavanje' : sub.actionType === 'edit' ? 'Izmjena' : 'Brisanje'}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400 mt-1 font-medium truncate">
                              {sub.entryData.name} ({sub.entryData.type === 'show' ? 'Serija' : sub.entryData.type === 'movie' ? 'Film' : 'Univerzum'})
                            </p>
                            <p className="text-[10px] text-zinc-600 mt-0.5">
                              {new Date(sub.submittedAt).toLocaleString('bs-BA')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleApprove(sub)}
                            disabled={actionLoading === sub.id}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase transition-all cursor-pointer disabled:opacity-50"
                          >
                            {actionLoading === sub.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                            Odobri
                          </button>
                          <button
                            onClick={() => handleReject(sub.id)}
                            disabled={actionLoading === sub.id}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 text-[10px] font-black uppercase transition-all cursor-pointer disabled:opacity-50"
                          >
                            <X size={12} />
                            Odbij
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}

            {activeTab === 'users' && (
              <motion.div
                key="users"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                {/* Search bar */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Pretraži po imenu ili emailu..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/20 transition-all"
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="px-5 py-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 text-xs font-black uppercase transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    Traži
                  </button>
                </div>

                {/* Results */}
                {searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((user) => (
                      <motion.div
                        key={user.uid}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-white/20 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <img
                            src={user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop'}
                            alt={user.displayName}
                            className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-white truncate">{user.displayName}</p>
                            <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
                            <div className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border mt-1 ${getRoleBadge(user.role)}`}>
                              {getRoleIcon(user.role)}
                              {getRoleLabel(user.role)}
                            </div>
                          </div>
                        </div>

                        {user.uid !== currentUser?.uid && (
                          <div className="flex items-center gap-2 shrink-0">
                            {user.role === 'moderator' ? (
                              <button
                                onClick={() => handleRoleChange(user.uid, 'user')}
                                disabled={actionLoading === user.uid}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-700/30 hover:bg-zinc-700/50 text-zinc-300 border border-zinc-600/30 text-[10px] font-black uppercase transition-all cursor-pointer disabled:opacity-50"
                              >
                                {actionLoading === user.uid ? <Loader2 size={12} className="animate-spin" /> : <UserCog size={12} />}
                                Ukloni Mod
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRoleChange(user.uid, 'moderator')}
                                disabled={actionLoading === user.uid}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 text-[10px] font-black uppercase transition-all cursor-pointer disabled:opacity-50"
                              >
                                {actionLoading === user.uid ? <Loader2 size={12} className="animate-spin" /> : <Shield size={12} />}
                                Postavi za Mod
                              </button>
                            )}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                ) : !isSearching && searchTerm ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-700/20 border border-zinc-600/30 flex items-center justify-center">
                      <Search size={24} className="text-zinc-500" />
                    </div>
                    <p className="text-zinc-400 text-sm">Nema pronađenih korisnika</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                      <Search size={24} className="text-sky-400" />
                    </div>
                    <p className="text-zinc-300 text-sm font-bold">Pretraži korisnike</p>
                    <p className="text-zinc-500 text-xs">Unesi ime ili email iznad da pronađeš korisnike i upravljaš njihovim ulogama</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
