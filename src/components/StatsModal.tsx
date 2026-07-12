import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { RatingEntry, Episode } from '../types';
import { getTierName } from '../utils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';
import { X, TrendingUp, AlertTriangle, Flame, Filter } from 'lucide-react';

interface StatsModalProps {
  entry: RatingEntry;
  onClose: () => void;
}

export default function StatsModal({ entry, onClose }: StatsModalProps) {
  const [selectedSeasonFilter, setSelectedSeasonFilter] = useState<number | 'all'>('all');

  // Parse seasons safely
  const seasons = useMemo(() => entry.seasons || [], [entry]);

  // Flattened episodes/staves with custom category labels
  const allEpisodes = useMemo(() => {
    const list: { seasonNum: number; seasonLabel: string; episodeNum: number; ep: Episode }[] = [];
    seasons.forEach(s => {
      const sLabel = entry.type === 'universe' ? (s.seasonName || `Faza ${s.seasonNumber}`) : (s.seasonName || `Sezona ${s.seasonNumber}`);
      (s.episodes || []).forEach(e => {
        list.push({
          seasonNum: s.seasonNumber,
          seasonLabel: sLabel,
          episodeNum: e.episodeNumber,
          ep: e
        });
      });
    });
    return list;
  }, [seasons, entry.type]);

  // Derived statistics summary
  const statsSummary = useMemo(() => {
    if (allEpisodes.length === 0) return null;

    let total = 0;
    let maxEp = allEpisodes[0];
    let minEp = allEpisodes[0];

    allEpisodes.forEach(item => {
      total += item.ep.rating;
      if (item.ep.rating > maxEp.ep.rating) maxEp = item;
      if (item.ep.rating < minEp.ep.rating) minEp = item;
    });

    const average = total / allEpisodes.length;

    return {
      average: parseFloat(average.toFixed(2)),
      totalCount: allEpisodes.length,
      highest: maxEp,
      lowest: minEp,
    };
  }, [allEpisodes]);

  // Chart data configuration
  const chartData = useMemo(() => {
    const filtered = allEpisodes.filter(item => {
      if (selectedSeasonFilter === 'all') return true;
      return item.seasonNum === selectedSeasonFilter;
    });

    return filtered.map(item => {
      const epLabel = entry.type === 'universe' 
        ? `F${item.seasonNum}S${item.episodeNum}`
        : `S${item.seasonNum}E${item.episodeNum}`;
      return {
        key: item.ep.id,
        label: epLabel,
        rating: item.ep.rating,
        title: item.ep.name,
        season: item.seasonNum,
        seasonLabel: item.seasonLabel,
        episode: item.episodeNum,
      };
    });
  }, [allEpisodes, selectedSeasonFilter, entry.type]);

  const getBarColor = (rating: number) => {
    if (rating >= 9.5) return '#0ea5e9'; // sky-500
    if (rating >= 9.0) return '#059669'; // emerald-600
    if (rating >= 8.0) return '#10b981'; // emerald-500
    if (rating >= 7.0) return '#facc15'; // amber-400
    if (rating >= 6.0) return '#f97316'; // orange-505
    if (rating >= 4.0) return '#ef4444'; // red-500
    return '#8b5cf6'; // purple-600
  };

  if (entry.type !== 'show' && entry.type !== 'universe') {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md" id="stats-modal-overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 15 }}
        className="relative w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        id="stats-modal-panel"
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-yellow-400" size={20} />
            <div>
              <h2 className="font-extrabold text-base uppercase tracking-wider text-zinc-100 font-sans">
                {entry.name} — Statistička Analiza i Trendovi
              </h2>
              <p className="text-zinc-500 text-xs mt-0.5">Automatska vizualizacija hronologije i parametara kretanja ocjena</p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="btn-close-stats-modal"
            className="text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal content body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-zinc-300">
          
          {allEpisodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/20">
              <AlertTriangle className="text-yellow-500 mb-3" size={32} />
              <p className="font-semibold text-zinc-350">Nema evidentiranih ocjena za statističku analizu.</p>
              <p className="text-xs text-zinc-650 mt-1">Unesite pojedinačne ocjene i nazive stavki projekta kako biste otključali trend grafikone!</p>
            </div>
          ) : (
            <>
              {/* KPIs indicators */}
              {statsSummary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="stats-kpi-grid">
                  {/* Total counts */}
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/60 shadow-inner flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                        {entry.type === 'universe' ? 'Ukupno Stavki' : 'Ukupno Epizoda'}
                      </span>
                      <span className="text-2xl font-black block text-indigo-400 font-mono mt-1">
                        {statsSummary.totalCount}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-2 block">
                      {entry.type === 'universe' 
                        ? `Raspoređeno u ${seasons.length} faza`
                        : `Raspoređeno u ${seasons.length} sezona`
                      }
                    </span>
                  </div>

                  {/* Rating averages */}
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/60 shadow-inner flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Prosječna Ocjena</span>
                      <span className="text-2xl font-black block text-yellow-450 font-mono mt-1 animate-pulse">
                        {statsSummary.average.toFixed(2)}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 flex items-center gap-1 mt-2">
                      <Flame size={12} className="text-red-500 fill-red-500 animate-bounce" />
                      Nivo: {getTierName(statsSummary.average)}
                    </span>
                  </div>

                  {/* Peak/Max item */}
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/60 shadow-inner flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Vrhunac / Peak</span>
                      <span className="text-2xl font-black block text-emerald-400 font-mono mt-1">
                        {statsSummary.highest.ep.rating.toFixed(1)}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-300 truncate mt-2 block font-semibold text-zinc-400" title={statsSummary.highest.ep.name}>
                      {entry.type === 'universe' ? 'Stavka' : 'Ep.'} {statsSummary.highest.episodeNum} — {statsSummary.highest.ep.name}
                    </span>
                  </div>

                  {/* Lowest item */}
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/60 shadow-inner flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Najniža Ocjena</span>
                      <span className="text-2xl font-black block text-red-400 font-mono mt-1">
                        {statsSummary.lowest.ep.rating.toFixed(1)}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-300 truncate mt-2 block font-semibold text-zinc-400" title={statsSummary.lowest.ep.name}>
                      {entry.type === 'universe' ? 'Stavka' : 'Ep.'} {statsSummary.lowest.episodeNum} — {statsSummary.lowest.ep.name}
                    </span>
                  </div>
                </div>
              )}

              {/* Chart analysis controls */}
              <div className="bg-zinc-950/40 p-5 rounded-2xl border border-zinc-900 space-y-6">
                
                {/* Visualizer filters bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-850 pb-4">
                  <div className="flex items-center gap-2">
                    <Filter className="text-yellow-400" size={16} />
                    <span className="text-xs uppercase font-extrabold text-zinc-400 tracking-wider">
                      {entry.type === 'universe' ? 'Prikazani raspon faza' : 'Prikazani raspon sezona'}
                    </span>
                  </div>

                  {/* Season selector */}
                  <div className="flex flex-wrap items-center gap-2" id="season-analytics-filters">
                    <button
                      type="button"
                      onClick={() => setSelectedSeasonFilter('all')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        selectedSeasonFilter === 'all'
                          ? 'bg-zinc-800 text-yellow-405 border border-zinc-700 font-black shadow-inner'
                          : 'text-zinc-500 hover:text-zinc-300 bg-transparent'
                      }`}
                    >
                      {entry.type === 'universe' ? `Sve Faze (${seasons.length})` : `Sve Sezone (${seasons.length})`}
                    </button>
                    {seasons.map(s => (
                      <button
                        type="button"
                        key={`chart-filter-season-${s.seasonNumber}`}
                        onClick={() => setSelectedSeasonFilter(s.seasonNumber)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          selectedSeasonFilter === s.seasonNumber
                            ? 'bg-zinc-800 text-yellow-500 border border-zinc-700 font-black shadow-inner'
                            : 'text-zinc-550 hover:text-zinc-300 bg-transparent'
                        }`}
                      >
                        {entry.type === 'universe' ? (s.seasonName ? s.seasonName : `Faza ${s.seasonNumber}`) : `S${s.seasonNumber}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recharts BarChart container */}
                <div className="w-full h-80 min-h-[300px]" id="recharts-visual-canvas">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                      <XAxis
                        dataKey="label"
                        stroke="#52525b"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        domain={[0, 10]}
                        ticks={[0, 2, 4, 6, 8, 10]}
                        stroke="#52525b"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: '#18181b', opacity: 0.5 }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg shadow-xl text-xs space-y-1">
                                <p className="font-mono text-[9px] text-zinc-500 font-bold uppercase tracking-wider">{data.seasonLabel}</p>
                                <p className="font-extrabold text-yellow-404 uppercase tracking-wider text-[10px]">{data.label}</p>
                                <p className="font-bold text-zinc-100 italic">"{data.title}"</p>
                                <div className="flex items-center gap-1.5 font-sans font-extrabold text-sm pt-1">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getBarColor(data.rating) }} />
                                  <span className="text-zinc-100">{data.rating.toFixed(1)} / 10</span>
                                  <span className="text-[10px] text-zinc-500 font-medium font-mono">({getTierName(data.rating)})</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="rating" radius={[4, 4, 0, 0]}>
                        {chartData.map((entryItem, index) => (
                          <Cell key={`cell-${index}`} fill={getBarColor(entryItem.rating)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend bar */}
                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] text-zinc-500 bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-zinc-900 leading-relaxed">
                  <span className="font-bold text-zinc-400">Vodič boja:</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-sky-500" /> Cinema (&ge;9.5)</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-600" /> Sjajno (9.0-9.4)</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Odlično (8.0-8.9)</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-yellow-400" /> Dobro (7.0-7.9)</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-orange-500" /> Prosječno (6.0-6.9)</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500" /> Loše (&le;5.9)</span>
                </div>

              </div>
            </>
          )}

        </div>

      </motion.div>
    </div>
  );
}
