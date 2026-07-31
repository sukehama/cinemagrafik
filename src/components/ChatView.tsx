import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Send, 
  Image as ImageIcon, 
  Trash2, 
  Sparkles, 
  Upload, 
  X, 
  User as UserIcon
} from 'lucide-react';
import { UserProfile } from '../firebaseSync';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userPhotoUrl: string;
  text: string;
  imageUrl?: string;
  createdAt: string;
  reactions?: Record<string, string[]>;
}

interface ChatViewProps {
  currentUserProfile: UserProfile | null;
  onSelectUser?: (userId: string) => void; // Omogućeno otvaranje profila klikom na korisnika u chatu
}

const DEFAULT_EMOJIS = ['👍', '❤️', '🔥', '😂', '🍿', '🚀', '💯', '💩'];

export default function ChatView({ currentUserProfile, onSelectUser }: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isImageInputOpen, setIsImageInputOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'memes'>('all');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [guestName, setGuestName] = useState(() => localStorage.getItem('chat-guest-name') || 'Ljubitelj Filmovi');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let unsubscribe: () => void;
    try {
      const chatCol = collection(db, 'chat_messages');
      unsubscribe = onSnapshot(chatCol, (snapshot) => {
        const loaded: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        loaded.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setMessages(loaded);
      }, (err) => {
        const saved = localStorage.getItem('cinema-chat-messages');
        if (saved) {
          try { setMessages(JSON.parse(saved)); } catch (e) {}
        }
      });
    } catch (err) {
      const saved = localStorage.getItem('cinema-chat-messages');
      if (saved) {
        try { setMessages(JSON.parse(saved)); } catch (e) {}
      }
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('Molimo odaberite sliku manju od 3MB!');
      return;
    }

    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageUrlInput(reader.result as string);
      setIsUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() && !imageUrlInput) return;

    const authorName = currentUserProfile?.displayName || guestName || 'Anoniman Korisnik';
    const authorPhoto = currentUserProfile?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80';
    const authorId = currentUserProfile?.uid || `guest-${guestName.replace(/\s+/g, '-').toLowerCase()}`;

    const newMsg: Omit<ChatMessage, 'id'> = {
      userId: authorId,
      userName: authorName,
      userPhotoUrl: authorPhoto,
      text: inputMessage.trim(),
      imageUrl: imageUrlInput.trim() || undefined,
      createdAt: new Date().toISOString(),
      reactions: {}
    };

    setInputMessage('');
    setImageUrlInput('');
    setIsImageInputOpen(false);

    try {
      const chatCol = collection(db, 'chat_messages');
      await addDoc(chatCol, newMsg);
    } catch (err) {
      const localMsg: ChatMessage = { ...newMsg, id: `msg-${Date.now()}` };
      const updated = [...messages, localMsg];
      setMessages(updated);
      localStorage.setItem('cinema-chat-messages', JSON.stringify(updated));
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    const userId = currentUserProfile?.uid || guestName;
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;

    const currentReactions = msg.reactions || {};
    const existingList = currentReactions[emoji] || [];
    const hasReacted = existingList.includes(userId);

    const updatedList = hasReacted 
      ? existingList.filter(id => id !== userId)
      : [...existingList, userId];

    const updatedReactions = { ...currentReactions };
    if (updatedList.length > 0) {
      updatedReactions[emoji] = updatedList;
    } else {
      delete updatedReactions[emoji];
    }

    try {
      const msgRef = doc(db, 'chat_messages', messageId);
      await updateDoc(msgRef, { reactions: updatedReactions });
    } catch (err) {
      const updated = messages.map(m => m.id === messageId ? { ...m, reactions: updatedReactions } : m);
      setMessages(updated);
      localStorage.setItem('cinema-chat-messages', JSON.stringify(updated));
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Da li ste sigurni da želite obrisati ovu poruku?')) return;
    try {
      const msgRef = doc(db, 'chat_messages', messageId);
      await deleteDoc(msgRef);
    } catch (err) {
      const updated = messages.filter(m => m.id !== messageId);
      setMessages(updated);
      localStorage.setItem('cinema-chat-messages', JSON.stringify(updated));
    }
  };

  const filteredMessages = filterMode === 'memes' 
    ? messages.filter(m => !!m.imageUrl)
    : messages;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      
      {/* CHAT HEADER CARD */}
      <div className="bg-zinc-950/70 backdrop-blur-xl border border-zinc-800/80 p-5 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-500 to-yellow-400 p-0.5 shadow-lg shadow-purple-500/20">
            <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center text-yellow-400">
              <MessageSquare size={24} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black uppercase tracking-wider text-white">
                Zajednica & Chat
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono font-bold animate-pulse">
                UŽIVO
              </span>
            </div>
            {/* IZMJENA DESKRIPCIJE: Tačno zatraženi tekst */}
            <p className="text-xs text-zinc-400 mt-0.5 font-medium">
              Razgovaraj s drugim ljudima
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-2xl border border-zinc-800">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                filterMode === 'all' 
                  ? 'bg-purple-600 text-white shadow-md' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Sve poruke ({messages.length})
            </button>
            <button
              onClick={() => setFilterMode('memes')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                filterMode === 'memes' 
                  ? 'bg-yellow-400 text-zinc-955 shadow-md' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ImageIcon size={13} /> Slike & Mimovi ({messages.filter(m => m.imageUrl).length})
            </button>
          </div>
        </div>
      </div>

      {!currentUserProfile && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-300 font-medium">
            <UserIcon size={14} />
            <span>Predstavite se u chatu (ime profila):</span>
          </div>
          <input
            type="text"
            value={guestName}
            onChange={(e) => {
              setGuestName(e.target.value);
              localStorage.setItem('chat-guest-name', e.target.value);
            }}
            placeholder="Vaše ime..."
            className="bg-zinc-900 border border-zinc-800 focus:border-amber-400 rounded-xl px-3 py-1 text-white text-xs focus:outline-none w-44"
          />
        </div>
      )}

      {/* MESSAGES FEED CONTAINER */}
      <div className="bg-zinc-950/50 backdrop-blur-2xl border border-zinc-800/80 rounded-3xl p-4 sm:p-6 min-h-[450px] max-h-[600px] overflow-y-auto space-y-4 shadow-inner scrollbar-thin scrollbar-thumb-zinc-800">
        {filteredMessages.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-center p-8 border border-dashed border-zinc-800 rounded-2xl">
            <Sparkles className="text-yellow-400 mb-3 animate-bounce" size={32} />
            <h3 className="text-sm font-bold text-white uppercase">Još nema poruka</h3>
            <p className="text-xs text-zinc-500 max-w-xs mt-1">
              Budi prvi koji će započeti diskusiju ili podijeliti zanimljiv mim u chatu!
            </p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMe = currentUserProfile?.uid 
              ? msg.userId === currentUserProfile.uid 
              : msg.userName === guestName;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 group ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Author Avatar - Klikabilan za otvaranje profila */}
                <button
                  onClick={() => onSelectUser && onSelectUser(msg.userId)}
                  className="shrink-0 focus:outline-none cursor-pointer"
                  title={`Pogledaj profil ${msg.userName}`}
                >
                  <img
                    src={msg.userPhotoUrl}
                    alt={msg.userName}
                    className="w-9 h-9 rounded-2xl object-cover bg-zinc-900 border border-zinc-800 hover:border-yellow-400 transition shadow-md mt-1"
                    referrerPolicy="no-referrer"
                  />
                </button>

                <div className={`max-w-[82%] sm:max-w-[70%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                  
                  {/* Klikabilno Ime za profil */}
                  <div className={`flex items-center gap-2 text-[10px] text-zinc-400 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <button
                      onClick={() => onSelectUser && onSelectUser(msg.userId)}
                      className="font-extrabold text-zinc-300 hover:text-yellow-400 transition cursor-pointer text-left"
                    >
                      {msg.userName}
                    </button>
                    <span>•</span>
                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {isMe && (
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 p-0.5 ml-1 cursor-pointer"
                        title="Obriši poruku"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>

                  <div 
                    className={`p-3.5 rounded-2xl border transition-all shadow-lg space-y-2 ${
                      isMe 
                        ? 'bg-purple-600/20 border-purple-500/40 text-purple-100 rounded-tr-none' 
                        : 'bg-zinc-900/90 border-zinc-800 text-zinc-100 rounded-tl-none'
                    }`}
                  >
                    {msg.imageUrl && (
                      <div className="rounded-xl overflow-hidden border border-zinc-800 bg-black max-w-full">
                        <img
                          src={msg.imageUrl}
                          alt="Meme attachment"
                          className="max-h-80 w-auto object-contain mx-auto rounded-xl"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    {msg.text && (
                      <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words font-sans">
                        {msg.text}
                      </p>
                    )}
                  </div>

                  <div className={`flex flex-wrap items-center gap-1.5 pt-1 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {msg.reactions && Object.entries(msg.reactions).map(([emoji, rawUserIds]) => {
                      const userIds = (rawUserIds || []) as string[];
                      if (!userIds || userIds.length === 0) return null;
                      const hasMyReaction = userIds.includes(currentUserProfile?.uid || guestName);

                      return (
                        <button
                          key={`react-${emoji}`}
                          onClick={() => handleToggleReaction(msg.id, emoji)}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                            hasMyReaction
                              ? 'bg-yellow-400/20 border-yellow-400/50 text-yellow-300'
                              : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <span>{emoji}</span>
                          <span className="text-[10px] font-mono">{userIds.length}</span>
                        </button>
                      );
                    })}

                    <div className="relative group/picker">
                      <button 
                        className="text-[10px] text-zinc-500 hover:text-yellow-400 px-1.5 py-0.5 rounded-full bg-zinc-900/60 border border-zinc-800 cursor-pointer transition-colors"
                        title="Dodaj reakciju"
                      >
                        + Reakcija
                      </button>

                      <div className="absolute bottom-full mb-1 left-0 hidden group-hover/picker:flex items-center gap-1 bg-zinc-955 border border-zinc-800 p-1.5 rounded-2xl shadow-2xl z-20">
                        {DEFAULT_EMOJIS.map(emoji => (
                          <button
                            key={`btn-em-${emoji}`}
                            onClick={() => handleToggleReaction(msg.id, emoji)}
                            className="hover:scale-125 transition-transform p-1 text-sm cursor-pointer"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800/90 p-3 sm:p-4 rounded-3xl shadow-2xl space-y-3">
        {imageUrlInput && (
          <div className="flex items-center justify-between gap-3 p-2 bg-zinc-900 rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-2">
              <img src={imageUrlInput} alt="Preview" className="w-10 h-10 object-cover rounded-xl border border-zinc-700" />
              <span className="text-xs text-zinc-300 font-bold">Slika/Mim spreman za objavu</span>
            </div>
            <button
              type="button"
              onClick={() => setImageUrlInput('')}
              className="p-1 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <AnimatePresence>
          {isImageInputOpen && !imageUrlInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 bg-zinc-900/90 rounded-2xl border border-zinc-800 space-y-2 overflow-hidden"
            >
              <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
                <span>Priloži sliku / mim:</span>
                <button type="button" onClick={() => setIsImageInputOpen(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                  <X size={14} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center justify-center gap-2 p-2.5 bg-zinc-955 hover:bg-zinc-800 border border-dashed border-zinc-700 rounded-xl cursor-pointer text-xs font-bold text-zinc-300 transition-colors">
                  <Upload size={14} className="text-yellow-400" />
                  <span>{isUploadingImage ? 'Učitavanje...' : 'Odaberi sliku iz računara'}</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>

                <input
                  type="url"
                  placeholder="Ili zalijepi URL slike (http...)"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className="bg-zinc-955 border border-zinc-800 focus:border-yellow-400 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsImageInputOpen(!isImageInputOpen)}
            className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
              imageUrlInput || isImageInputOpen
                ? 'bg-yellow-400 text-zinc-955 border-yellow-300'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-850'
            }`}
            title="Priloži mim ili sliku"
          >
            <ImageIcon size={18} />
          </button>

          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Napiši poruku ili podijeli teoriju..."
            className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-purple-500 rounded-2xl px-4 py-2.5 text-white text-xs sm:text-sm focus:outline-none shadow-inner"
          />

          <button
            type="submit"
            disabled={!inputMessage.trim() && !imageUrlInput}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center gap-2"
          >
            <span>Pošalji</span>
            <Send size={14} />
          </button>
        </div>

      </form>

    </div>
  );
}