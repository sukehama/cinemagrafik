import { RatingEntry } from './types';

export function getRatingColorClass(rating: number): string {
  if (rating >= 9.5) {
    return 'bg-sky-500 hover:bg-sky-400 text-white shadow-sm shadow-sky-500/20';
  }
  if (rating >= 9.0) {
    return 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-500/20';
  }
  if (rating >= 8.0) {
    return 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-sm shadow-emerald-500/10';
  }
  if (rating >= 7.0) {
    return 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold shadow-sm shadow-amber-400/20';
  }
  if (rating >= 6.0) {
    return 'bg-orange-500 hover:bg-orange-400 text-white shadow-sm shadow-orange-500/10';
  }
  if (rating >= 4.0) {
    return 'bg-red-500 hover:bg-red-400 text-white shadow-sm shadow-red-500/10';
  }
  if (rating === 0) {
    return 'bg-zinc-800 text-zinc-500 border border-dashed border-zinc-700 hover:bg-zinc-700';
  }
  return 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm shadow-purple-500/10';
}

export function getTierName(rating: number): string {
  if (rating >= 9.5) return 'Absolute Cinema';
  if (rating >= 9.0) return 'Awesome';
  if (rating >= 8.0) return 'Great';
  if (rating >= 7.0) return 'Good';
  if (rating >= 6.0) return 'Average';
  if (rating >= 4.0) return 'Bad';
  return 'Garbage';
}

export function calculatePersonalRating(entry: RatingEntry): number {
  if (entry.type === 'movie') {
    return entry.movieRating ?? 0;
  }
  
  if (!entry.seasons || entry.seasons.length === 0) {
    return 0;
  }
  
  let sum = 0;
  let count = 0;
  
  for (const season of entry.seasons) {
    for (const episode of season.episodes) {
      if (episode.rating > 0) {
        sum += episode.rating;
        count++;
      }
    }
  }
  
  return count > 0 ? parseFloat((sum / count).toFixed(1)) : 0;
}

export function getGuestVotersMap(entry: RatingEntry): Map<string, number[]> {
  const votersMap = new Map<string, number[]>();
  
  // 1. Gather global/legacy guest votes
  if (entry.guestVotes) {
    for (const g of entry.guestVotes) {
      if (g.rating > 0 && g.voterName) {
        const nameKey = g.voterName.trim().toLowerCase();
        if (!votersMap.has(nameKey)) votersMap.set(nameKey, []);
        votersMap.get(nameKey)!.push(g.rating);
      }
    }
  }

  // 2. Gather movie reviews (if movie)
  if (entry.type === 'movie' && entry.movieReviews) {
    for (const r of entry.movieReviews) {
      if (r.rating > 0 && r.voterName) {
        const nameKey = r.voterName.trim().toLowerCase();
        if (!votersMap.has(nameKey)) votersMap.set(nameKey, []);
        votersMap.get(nameKey)!.push(r.rating);
      }
    }
  }

  // 3. Gather episode reviews (if show)
  if (entry.type === 'show' && entry.seasons) {
    for (const s of entry.seasons) {
      for (const ep of s.episodes) {
        if (ep.guestReviews) {
          for (const r of ep.guestReviews) {
            if (r.rating > 0 && r.voterName) {
              const nameKey = r.voterName.trim().toLowerCase();
              if (!votersMap.has(nameKey)) votersMap.set(nameKey, []);
              votersMap.get(nameKey)!.push(r.rating);
            }
          }
        }
      }
    }
  }

  return votersMap;
}

export function calculateTotalVotes(entry: RatingEntry): number {
  const personalRating = calculatePersonalRating(entry);
  const personalHasVote = personalRating > 0;
  
  const votersMap = getGuestVotersMap(entry);
  return (personalHasVote ? 1 : 0) + votersMap.size;
}

export function calculateCombinedAverageRating(entry: RatingEntry): number {
  const personalRating = calculatePersonalRating(entry);
  const personalHasVote = personalRating > 0;
  
  let totalSum = personalHasVote ? personalRating : 0;
  let totalCount = personalHasVote ? 1 : 0;
  
  const votersMap = getGuestVotersMap(entry);
  for (const [_, scores] of votersMap.entries()) {
    if (scores.length > 0) {
      const avgScore = scores.reduce((sum, val) => sum + val, 0) / scores.length;
      totalSum += avgScore;
      totalCount++;
    }
  }
  
  return totalCount > 0 ? parseFloat((totalSum / totalCount).toFixed(1)) : 0;
}

export function calculateAverageRating(entry: RatingEntry): number {
  return calculatePersonalRating(entry);
}

export function getYoutubeEmbedUrl(url: string | undefined): string | null {
  if (!url) return null;
  
  // Handled embed format
  if (url.includes('youtube.com/embed/')) {
    return url;
  }
  
  // Convert watch standard URL
  try {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`;
    }
  } catch (e) {
    console.warn('Error parsing YouTube link:', e);
  }
  return null;
}

export function getCleanYoutubeId(url: string | undefined): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return match[2];
  }
  return null;
}

export interface DynamicColorTheme {
  name: string;
  bgGlow: string;
  text: string;
  border: string;
  badge: string;
  button: string;
  glowShadow: string;
  accentColor: string;
  bgHeader: string;
}

export function getShowDynamicColors(name: string): DynamicColorTheme {
  const normalized = (name || '').trim().toLowerCase();
  
  // Custom hand-crafted visual directions for popular shows
  if (normalized.includes('breaking') || normalized.includes('better call')) {
    return {
      name: 'emerald',
      bgGlow: 'from-emerald-500/10 via-transparent to-transparent',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30 hover:border-emerald-500/60',
      badge: 'bg-emerald-950/70 text-emerald-400 border-emerald-900/50',
      button: 'bg-emerald-550 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/25',
      glowShadow: 'shadow-[0_0_50px_-12px_rgba(16,185,129,0.25)]',
      accentColor: '#10b981',
      bgHeader: 'from-emerald-950/50'
    };
  }
  if (normalized.includes('thrones') || normalized.includes('dragon') || normalized.includes('stranger') || normalized.includes('crown')) {
    return {
      name: 'ruby',
      bgGlow: 'from-red-500/10 via-transparent to-transparent',
      text: 'text-rose-400',
      border: 'border-red-500/30 hover:border-red-500/60',
      badge: 'bg-red-950/70 text-rose-400 border-red-900/50',
      button: 'bg-red-550 hover:bg-red-400 text-zinc-950 shadow-red-500/25',
      glowShadow: 'shadow-[0_0_50px_-12px_rgba(239,68,68,0.25)]',
      accentColor: '#ef4444',
      bgHeader: 'from-red-955/50'
    };
  }
  if (normalized.includes('interstellar') || normalized.includes('avatar') || normalized.includes('sky') || normalized.includes('cyber') || normalized.includes('matrix')) {
    return {
      name: 'sapphire',
      bgGlow: 'from-sky-500/10 via-transparent to-transparent',
      text: 'text-sky-400',
      border: 'border-sky-500/30 hover:border-sky-500/60',
      badge: 'bg-sky-950/70 text-sky-400 border-sky-900/50',
      button: 'bg-sky-550 hover:bg-sky-400 text-zinc-950 shadow-sky-500/25',
      glowShadow: 'shadow-[0_0_50px_-12px_rgba(14,165,233,0.25)]',
      accentColor: '#0ea5e9',
      bgHeader: 'from-sky-950/50'
    };
  }
  if (normalized.includes('dark') || normalized.includes('pulp') || normalized.includes('godfather') || normalized.includes('batman')) {
    return {
      name: 'amber',
      bgGlow: 'from-amber-500/10 via-transparent to-transparent',
      text: 'text-amber-400',
      border: 'border-amber-500/30 hover:border-amber-500/60',
      badge: 'bg-amber-955/70 text-amber-400 border-amber-900/50',
      button: 'bg-amber-400 hover:bg-amber-350 text-zinc-950 shadow-amber-500/25',
      glowShadow: 'shadow-[0_0_50px_-12px_rgba(245,158,11,0.25)]',
      accentColor: '#f59e0b',
      bgHeader: 'from-amber-950/50'
    };
  }

  // Consistent hashing based on name character sums to yield distinctive dynamic themes
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = (name || '').charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % 5;
  const palettes = [
    {
      name: 'emerald',
      bgGlow: 'from-emerald-500/10 via-transparent to-transparent',
      text: 'text-emerald-405',
      border: 'border-emerald-550/35 hover:border-emerald-500/60',
      badge: 'bg-emerald-950/70 text-emerald-400 border-emerald-900/50',
      button: 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/25',
      glowShadow: 'shadow-[0_0_50px_-12px_rgba(16,185,129,0.25)]',
      accentColor: '#10b981',
      bgHeader: 'from-emerald-950/50'
    },
    {
      name: 'ruby',
      bgGlow: 'from-red-500/10 via-transparent to-transparent',
      text: 'text-red-403',
      border: 'border-red-500/30 hover:border-red-500/60',
      badge: 'bg-red-950/70 text-rose-400 border-red-900/50',
      button: 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/25',
      glowShadow: 'shadow-[0_0_50px_-12px_rgba(239,68,68,0.25)]',
      accentColor: '#ef4444',
      bgHeader: 'from-red-955/50'
    },
    {
      name: 'sapphire',
      bgGlow: 'from-sky-500/10 via-transparent to-transparent',
      text: 'text-sky-403',
      border: 'border-sky-500/30 hover:border-sky-500/60',
      badge: 'bg-sky-950/70 text-sky-400 border-sky-900/50',
      button: 'bg-sky-500 hover:bg-sky-405 text-zinc-950 shadow-sky-500/25',
      glowShadow: 'shadow-[0_0_50px_-12px_rgba(14,165,233,0.25)]',
      accentColor: '#0ea5e9',
      bgHeader: 'from-sky-950/50'
    },
    {
      name: 'amber',
      bgGlow: 'from-amber-400/10 via-transparent to-transparent',
      text: 'text-amber-403',
      border: 'border-amber-500/30 hover:border-amber-500/60',
      badge: 'bg-amber-955/70 text-amber-400 border-amber-900/50',
      button: 'bg-amber-400 hover:bg-amber-350 text-zinc-950 shadow-amber-500/25',
      glowShadow: 'shadow-[0_0_50px_-12px_rgba(245,158,11,0.25)]',
      accentColor: '#f59e0b',
      bgHeader: 'from-amber-950/50'
    },
    {
      name: 'amethyst',
      bgGlow: 'from-violet-500/10 via-transparent to-transparent',
      text: 'text-violet-400',
      border: 'border-violet-500/30 hover:border-violet-500/60',
      badge: 'bg-violet-950/70 text-violet-400 border-violet-900/50',
      button: 'bg-violet-500 hover:bg-violet-400 text-white shadow-violet-500/25',
      glowShadow: 'shadow-[0_0_50px_-12px_rgba(139,92,246,0.25)]',
      accentColor: '#8b5cf6',
      bgHeader: 'from-violet-950/50'
    }
  ];
  return palettes[index];
}
