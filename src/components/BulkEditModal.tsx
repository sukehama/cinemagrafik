import React, { useState, useEffect } from 'react';
import { RatingEntry, Season, Episode } from '../types';
import { X, Save, AlertCircle, ListCollapse } from 'lucide-react';

interface BulkEditModalProps {
  entry: RatingEntry;
  onClose: () => void;
  onSaveAll: (updatedSeasons: Season[]) => void;
}

export default function BulkEditModal({ entry, onClose, onSaveAll }: BulkEditModalProps) {
  const seasons = entry.seasons || [];
  
  const [selectedSeasonNum, setSelectedSeasonNum] = useState<number>(() => {
    return seasons.length > 0 ? seasons[0].seasonNumber : 1;
  });

  const [localSeasons, setLocalSeasons] = useState<Season[]>(() => JSON.parse(JSON.stringify(seasons)));

  const activeSeason = localSeasons.find(s => s.seasonNumber === selectedSeasonNum);
  const activeEpisodes = activeSeason ? activeSeason.episodes : [];

  useEffect(() => {
    setLocalSeasons(JSON.parse(JSON.stringify(entry.seasons || [])));
  }, [entry]);

  const handleEpisodeChange = (episodeId: string, field: keyof Episode, value: any) => {
    setLocalSeasons(prevSeasons => {
      return prevSeasons.map(s => {
        if (s.seasonNumber === selectedSeasonNum) {
          const updatedEpisodes = s.episodes.map(ep => {
            if (ep.id === episodeId) {
              return {
                ...ep,
                [field]: field === 'rating' ? (isNaN(Number(value)) ? 0 : Number(value)) : value
              };
            }
            return ep;
          });
          return { ...s, episodes: updatedEpisodes };
        }
        return s;
      });
    });
  };

  const handleSave = () => {
    onSaveAll(localSeasons);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-955/85 backdrop-blur-md">
      <div className="relative w-full max-w-5xl bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 text-zinc-300 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        <div className="flex justify-between items-start border-b border-zinc-800 pb-4 mb-4 shrink-0">
          <div>
            <h2 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
              <ListCollapse className="text-yellow-400" size={18} />
              Masovno uređivanje epizoda (Bulk Edit)
            </h2>
            <p className="text-[11px] text-zinc-500 mt-1">
              Uređujte nazive, godine, ocjene i opise svih epizoda u sezoni odjednom.
            </p>
          </div>
          <button onClick={onClose} className="bg-zinc-800 text-zinc-300 hover:text-white p-1.5 rounded-full cursor-pointer">
            <X size={15} />
          </button>
        </div>

        <div className="flex items-center gap-2 bg-zinc-950/40 border border-zinc-850 p-3 rounded-2xl mb-4 shrink-0">
          <span className="text-xs font-bold text-zinc-400 uppercase">Odaberi sezonu:</span>
          <div className="flex flex-wrap gap-1">
            {localSeasons.map((s) => (
              <button
                key={`bulk-tab-s-${s.seasonNumber}`}
                type="button"
                onClick={() => setSelectedSeasonNum(s.seasonNumber)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer ${
                  selectedSeasonNum === s.seasonNumber ? 'bg-yellow-400 text-zinc-955' : 'bg-zinc-900 text-zinc-300'
                }`}
              >
                Sezona {s.seasonNumber}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 min-h-[250px]">
          <table className="w-full text-xs text-zinc-300 border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-[9px] uppercase">
                <th className="py-2.5 px-2 font-bold w-12 text-center">EP</th>
                <th className="py-2.5 px-2 font-bold w-44">NAZIV EPIZODE</th>
                <th className="py-2.5 px-2 font-bold w-24">GODINA</th> {/* DODANA KOLONA GODINA */}
                <th className="py-2.5 px-3 font-bold w-20 text-center">OCJENA</th>
                <th className="py-2.5 px-2 font-bold">OPIS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {activeEpisodes.map((ep) => (
                <tr key={`bulk-row-${ep.id}`}>
                  <td className="py-3 px-2 font-mono font-bold text-center text-zinc-500">E{ep.episodeNumber}</td>
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={ep.name}
                      onChange={(e) => handleEpisodeChange(ep.id, 'name', e.target.value)}
                      className="w-full bg-zinc-955 border border-zinc-800 rounded px-2 py-1 text-xs text-white"
                    />
                  </td>
                  {/* DODANO: Input polje za godinu epizode */}
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={ep.year || ''}
                      onChange={(e) => handleEpisodeChange(ep.id, 'year', e.target.value)}
                      placeholder="2024"
                      className="w-20 bg-zinc-955 border border-zinc-800 rounded px-2 py-1 text-xs text-yellow-400 font-mono"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      min={0.0}
                      max={10.0}
                      step={0.1}
                      value={ep.rating}
                      onChange={(e) => handleEpisodeChange(ep.id, 'rating', Number(e.target.value))}
                      className="w-14 text-center font-mono font-black border rounded px-1.5 py-1 text-xs bg-zinc-955 border-zinc-800 text-yellow-400"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <textarea
                      value={ep.overview || ''}
                      onChange={(e) => handleEpisodeChange(ep.id, 'overview', e.target.value)}
                      rows={1}
                      className="w-full bg-zinc-955 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pt-4 border-t border-zinc-800 flex justify-between items-center shrink-0 mt-3">
          <button type="button" onClick={onClose} className="bg-zinc-800 text-zinc-300 px-4 py-2 rounded-xl text-xs font-bold">
            Otkaži
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="bg-yellow-400 hover:bg-yellow-500 text-zinc-955 font-black text-xs uppercase px-5 py-2.5 rounded-xl shadow-lg cursor-pointer flex items-center gap-1.5"
          >
            <Save size={14} /> Spremi sve izmjene
          </button>
        </div>

      </div>
    </div>
  );
}