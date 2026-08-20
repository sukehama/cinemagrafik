import React, { useState, useEffect } from 'react';
import { Key, CheckCircle, AlertCircle, X, ExternalLink, Film, Globe, Sparkles } from 'lucide-react';

interface ApiKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeysUpdated?: () => void;
}

export const ApiKeysModal: React.FC<ApiKeysModalProps> = ({ isOpen, onClose, onKeysUpdated }) => {
  const [omdbKey, setOmdbKey] = useState('');
  const [tmdbKey, setTmdbKey] = useState('');
  const [testingOmdb, setTestingOmdb] = useState(false);
  const [testingTmdb, setTestingTmdb] = useState(false);
  const [omdbStatus, setOmdbStatus] = useState<{ success: boolean; msg: string } | null>(null);
  const [tmdbStatus, setTmdbStatus] = useState<{ success: boolean; msg: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const savedOmdb = localStorage.getItem('omdb_custom_api_key') || '';
      const savedTmdb = localStorage.getItem('tmdb_custom_api_key') || 'eff50b22228a6501f019196665032b7a';
      setOmdbKey(savedOmdb);
      setTmdbKey(savedTmdb);
      setOmdbStatus(null);
      setTmdbStatus(null);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestOmdb = async () => {
    const key = omdbKey.trim();
    if (!key) {
      setOmdbStatus({ success: false, msg: 'Unesite OMDb ključ za testiranje.' });
      return;
    }
    setTestingOmdb(true);
    setOmdbStatus(null);
    try {
      const res = await fetch(`https://www.omdbapi.com/?apikey=${encodeURIComponent(key)}&t=Inception`);
      const data = await res.json();
      if (data.Response === 'True') {
        setOmdbStatus({ success: true, msg: `Ispravan ključ! Povezano na OMDb (${data.Title}, ${data.Year})` });
      } else {
        setOmdbStatus({ success: false, msg: data.Error || 'Nevažeći OMDb ključ.' });
      }
    } catch (e: any) {
      setOmdbStatus({ success: false, msg: 'Greška pri povezivanju na OMDb poslužitelj.' });
    } finally {
      setTestingOmdb(false);
    }
  };

  const handleTestTmdb = async () => {
    const key = tmdbKey.trim();
    if (!key) {
      setTmdbStatus({ success: false, msg: 'Unesite TMDB ključ za testiranje.' });
      return;
    }
    setTestingTmdb(true);
    setTmdbStatus(null);
    try {
      const res = await fetch(`https://api.themoviedb.org/3/movie/550?api_key=${encodeURIComponent(key)}`);
      const data = await res.json();
      if (data.id) {
        setTmdbStatus({ success: true, msg: `Ispravan ključ! TMDB povezan (${data.title || data.original_title})` });
      } else {
        setTmdbStatus({ success: false, msg: data.status_message || 'Nevažeći TMDB ključ.' });
      }
    } catch (e: any) {
      setTmdbStatus({ success: false, msg: 'Greška pri povezivanju na TMDB poslužitelj.' });
    } finally {
      setTestingTmdb(false);
    }
  };

  const handleSave = () => {
    if (omdbKey.trim()) {
      localStorage.setItem('omdb_custom_api_key', omdbKey.trim());
    } else {
      localStorage.removeItem('omdb_custom_api_key');
    }

    if (tmdbKey.trim()) {
      localStorage.setItem('tmdb_custom_api_key', tmdbKey.trim());
    } else {
      localStorage.removeItem('tmdb_custom_api_key');
    }

    setSaveSuccess(true);
    if (onKeysUpdated) onKeysUpdated();
    setTimeout(() => {
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 text-left relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5 text-yellow-400">
            <div className="p-2 rounded-xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400">
              <Key size={20} />
            </div>
            <div>
              <h3 className="font-black text-base uppercase tracking-wider text-white">
                API Ključevi & Integracije
              </h3>
              <p className="text-xs text-zinc-400 font-normal">
                Postavite TMDB i OMDb ključeve za napredne podatke i HD trailere
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-white rounded-xl transition cursor-pointer hover:bg-zinc-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* TMDB Section (The Movie Database) */}
        <div className="space-y-3 p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film size={16} className="text-sky-400" />
              <span className="text-xs font-black text-white uppercase tracking-wider">
                TMDB API Ključ (The Movie Database)
              </span>
            </div>
            <span className="text-[10px] font-bold text-sky-400/90 bg-sky-500/10 px-2 py-0.5 rounded-md">
              Zvanični HD Traileri & Epizode
            </span>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            TMDB omogućava preuzimanje zvaničnih YouTube video isječaka i detaljnih opisa epizoda sa slikama.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Unesite TMDB v3 API ključ (npr. a81b9e...)"
              value={tmdbKey}
              onChange={(e) => setTmdbKey(e.target.value)}
              className="flex-1 px-3.5 py-2.5 bg-zinc-900 border border-zinc-750 focus:border-sky-400 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none font-mono"
            />
            <button
              onClick={handleTestTmdb}
              disabled={testingTmdb || !tmdbKey.trim()}
              className="px-3.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 text-xs font-bold rounded-xl transition cursor-pointer shrink-0"
            >
              {testingTmdb ? 'Testiram...' : 'Testiraj'}
            </button>
          </div>

          {tmdbStatus && (
            <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
              tmdbStatus.success 
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' 
                : 'bg-red-500/15 border border-red-500/30 text-red-300'
            }`}>
              {tmdbStatus.success ? <CheckCircle size={14} className="shrink-0" /> : <AlertCircle size={14} className="shrink-0" />}
              <span>{tmdbStatus.msg}</span>
            </div>
          )}

          <div className="text-[11px] text-zinc-400 pt-1 flex items-center gap-1">
            <span>Besplatni ključ možete dobiti na</span>
            <a
              href="https://www.themoviedb.org/settings/api"
              target="_blank"
              rel="noreferrer"
              className="text-sky-400 hover:underline inline-flex items-center gap-1 font-bold"
            >
              themoviedb.org/settings/api <ExternalLink size={10} />
            </a>
          </div>
        </div>

        {/* OMDb Section (IMDb data) */}
        <div className="space-y-3 p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-yellow-400" />
              <span className="text-xs font-black text-white uppercase tracking-wider">
                OMDb API Ključ (IMDb Pretraga)
              </span>
            </div>
            <span className="text-[10px] font-bold text-yellow-400/90 bg-yellow-500/10 px-2 py-0.5 rounded-md">
              IMDb Ocjene & Glumci
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Unesite OMDb API ključ (npr. a1b2c3d4)"
              value={omdbKey}
              onChange={(e) => setOmdbKey(e.target.value)}
              className="flex-1 px-3.5 py-2.5 bg-zinc-900 border border-zinc-750 focus:border-yellow-400 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none font-mono"
            />
            <button
              onClick={handleTestOmdb}
              disabled={testingOmdb || !omdbKey.trim()}
              className="px-3.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 text-xs font-bold rounded-xl transition cursor-pointer shrink-0"
            >
              {testingOmdb ? 'Testiram...' : 'Testiraj'}
            </button>
          </div>

          {omdbStatus && (
            <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
              omdbStatus.success 
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' 
                : 'bg-red-500/15 border border-red-500/30 text-red-300'
            }`}>
              {omdbStatus.success ? <CheckCircle size={14} className="shrink-0" /> : <AlertCircle size={14} className="shrink-0" />}
              <span>{omdbStatus.msg}</span>
            </div>
          )}

          <div className="text-[11px] text-zinc-400 pt-1 flex items-center gap-1">
            <span>Besplatni ključ (1.000 zahtjeva dnevno):</span>
            <a
              href="https://www.omdbapi.com/apikey.aspx"
              target="_blank"
              rel="noreferrer"
              className="text-yellow-400 hover:underline inline-flex items-center gap-1 font-bold"
            >
              omdbapi.com/apikey.aspx <ExternalLink size={10} />
            </a>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
          <div>
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 animate-fade-in">
                <CheckCircle size={14} /> Ključevi su uspješno sačuvani!
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Zatvori
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-955 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-lg shadow-yellow-400/10 flex items-center gap-1.5"
            >
              <Sparkles size={13} />
              <span>Sačuvaj Ključeve</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
