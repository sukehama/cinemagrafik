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
  const cleanUrl = url.trim();
  
  // Handled embed format already
  if (cleanUrl.includes('youtube.com/embed/')) {
    const embedId = cleanUrl.split('youtube.com/embed/')[1]?.split('?')[0]?.split('&')[0];
    return embedId ? `https://www.youtube.com/embed/${embedId}` : cleanUrl;
  }

  // Convert YouTube Shorts
  if (cleanUrl.includes('youtube.com/shorts/')) {
    const shortsId = cleanUrl.split('youtube.com/shorts/')[1]?.split('?')[0]?.split('&')[0];
    if (shortsId) return `https://www.youtube.com/embed/${shortsId}`;
  }
  
  // Convert watch standard URL or youtu.be
  try {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = cleanUrl.match(regExp);
    if (match && match[2] && match[2].length === 11) {
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
  bgAtmosphere: string;
}

export function getShowDynamicColors(nameOrEntry?: string | RatingEntry | null, overrideColor?: string): DynamicColorTheme {
  let name = '';
  let customColor: string | undefined = overrideColor;
  let customGrad: string | undefined = undefined;

  if (typeof nameOrEntry === 'object' && nameOrEntry !== null) {
    name = nameOrEntry.name || '';
    if (nameOrEntry.customThemeColor) customColor = nameOrEntry.customThemeColor;
    if (nameOrEntry.customGradient) customGrad = nameOrEntry.customGradient;
  } else if (typeof nameOrEntry === 'string') {
    name = nameOrEntry;
  }

  // If a custom color is specified, dynamically construct a dedicated theme
  if (customColor) {
    const hex = customColor;
    return {
      name: 'custom',
      bgGlow: 'from-white/10 via-transparent to-transparent',
      text: 'text-white',
      border: 'border-white/30 hover:border-white/60',
      badge: 'bg-zinc-900/90 text-white border-white/20',
      button: 'text-zinc-955 font-black shadow-lg',
      glowShadow: `shadow-[0_0_50px_-10px_${hex}40]`,
      accentColor: hex,
      bgHeader: 'from-zinc-950/80',
      bgAtmosphere: customGrad || `from-[${hex}]/35 via-zinc-950 to-black`
    };
  }

  const normalized = (name || '').trim().toLowerCase();

  // Consistent hashing based on name character sums to yield distinctive dynamic themes
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = (name || '').charCodeAt(i) + ((hash << 5) - hash);
  }

  const palettes: DynamicColorTheme[] = [
    {
      name: 'emerald',
      bgGlow: 'from-emerald-500/20 via-transparent to-transparent',
      text: 'text-emerald-400',
      border: 'border-emerald-500/35 hover:border-emerald-500/60',
      badge: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60',
      button: 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/25',
      glowShadow: 'shadow-[0_0_50px_-12px_rgba(16,185,129,0.35)]',
      accentColor: '#10b981',
      bgHeader: 'from-emerald-950/70',
      bgAtmosphere: 'from-emerald-950/50 via-zinc-950 to-teal-950/30'
    },
    {
      name: 'crimson',
      bgGlow: 'from-red-500/20 via-transparent to-transparent',
      text: 'text-rose-400',
      border: 'border-red-500/35 hover:border-red-500/60',
      badge: 'bg-red-950/80 text-rose-400 border-red-800/60',
      button: 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/25',
      glowShadow: 'shadow-[0_0_50px_-12px_rgba(244,63,94,0.35)]',
      accentColor: '#f43f5e',
      bgHeader: 'from-rose-950/70',
      bgAtmosphere: 'from-rose-950/50 via-zinc-950 to-red-950/30'
    },
    {
      name: 'electric-sapphire',
      bgGlow: 'from-sky-500/20 via-transparent to-transparent',
      text: 'text-sky-400',
      border: 'border-sky-500/35 hover:border-sky-500/60',
      badge: 'bg-sky-950/80 text-sky-400 border-sky-800/60',
      button: 'bg-sky-500 hover:bg-sky-400 text-zinc-950 shadow-sky-500/25',
      glowShadow: 'shadow-[0_0_50px_-12px_rgba(14,165,233,0.35)]',
      accentColor: '#0ea5e9',
      bgHeader: 'from-sky-950/70',
      bgAtmosphere: 'from-sky-950/50 via-zinc-950 to-blue-950/30'
    },
    {
      name: 'royal-amber',
      bgGlow: 'from-amber-400/20 via-transparent to-transparent',
      text: 'text-amber-400',
      border: 'border-amber-500/35 hover:border-amber-500/60',
      badge: 'bg-amber-950/80 text-amber-400 border-amber-800/60',
      button: 'bg-amber-400 hover:bg-amber-300 text-zinc-950 shadow-amber-500/25',
      glowShadow: 'shadow-[0_0_50px_-12px_rgba(245,158,11,0.35)]',
      accentColor: '#f59e0b',
      bgHeader: 'from-amber-950/70',
      bgAtmosphere: 'from-amber-950/50 via-zinc-950 to-orange-950/30'
    },
    {
      name: 'mystic-amethyst',
      bgGlow: 'from-violet-500/20 via-transparent to-transparent',
      text: 'text-violet-400',
      border: 'border-violet-500/35 hover:border-violet-500/60',
      badge: 'bg-violet-950/80 text-violet-400 border-violet-800/60',
      button: 'bg-violet-500 hover:bg-violet-400 text-white shadow-violet-500/25',
      glowShadow: 'shadow-[0_0_50px_-12px_rgba(139,92,246,0.35)]',
      accentColor: '#8b5cf6',
      bgHeader: 'from-violet-950/70',
      bgAtmosphere: 'from-violet-950/50 via-zinc-950 to-purple-950/30'
    },
    {
      name: 'cyber-cyan',
      bgGlow: 'from-cyan-500/20 via-transparent to-transparent',
      text: 'text-cyan-400',
      border: 'border-cyan-500/35 hover:border-cyan-500/60',
      badge: 'bg-cyan-950/80 text-cyan-400 border-cyan-800/60',
      button: 'bg-cyan-500 hover:bg-cyan-400 text-zinc-950 shadow-cyan-500/25',
      glowShadow: 'shadow-[0_0_50px_-12px_rgba(6,182,212,0.35)]',
      accentColor: '#06b6d4',
      bgHeader: 'from-cyan-950/70',
      bgAtmosphere: 'from-cyan-950/50 via-zinc-950 to-teal-950/30'
    },
    {
      name: 'neon-fuchsia',
      bgGlow: 'from-fuchsia-500/20 via-transparent to-transparent',
      text: 'text-fuchsia-400',
      border: 'border-fuchsia-500/35 hover:border-fuchsia-500/60',
      badge: 'bg-fuchsia-950/80 text-fuchsia-400 border-fuchsia-800/60',
      button: 'bg-fuchsia-500 hover:bg-fuchsia-400 text-white shadow-fuchsia-500/25',
      glowShadow: 'shadow-[0_0_50px_-12px_rgba(217,70,239,0.35)]',
      accentColor: '#d946ef',
      bgHeader: 'from-fuchsia-950/70',
      bgAtmosphere: 'from-fuchsia-950/50 via-zinc-950 to-pink-950/30'
    },
    {
      name: 'volcanic-orange',
      bgGlow: 'from-orange-500/20 via-transparent to-transparent',
      text: 'text-orange-400',
      border: 'border-orange-500/35 hover:border-orange-500/60',
      badge: 'bg-orange-950/80 text-orange-400 border-orange-800/60',
      button: 'bg-orange-500 hover:bg-orange-400 text-zinc-950 shadow-orange-500/25',
      glowShadow: 'shadow-[0_0_50px_-12px_rgba(249,115,22,0.35)]',
      accentColor: '#f97316',
      bgHeader: 'from-orange-950/70',
      bgAtmosphere: 'from-orange-950/50 via-zinc-950 to-amber-950/30'
    },
    {
      name: 'deep-indigo',
      bgGlow: 'from-indigo-500/20 via-transparent to-transparent',
      text: 'text-indigo-400',
      border: 'border-indigo-500/35 hover:border-indigo-500/60',
      badge: 'bg-indigo-950/80 text-indigo-400 border-indigo-800/60',
      button: 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-indigo-500/25',
      glowShadow: 'shadow-[0_0_50px_-12px_rgba(99,102,241,0.35)]',
      accentColor: '#6366f1',
      bgHeader: 'from-indigo-950/70',
      bgAtmosphere: 'from-indigo-950/50 via-zinc-950 to-slate-950/30'
    },
    {
      name: 'lime-spark',
      bgGlow: 'from-lime-500/20 via-transparent to-transparent',
      text: 'text-lime-400',
      border: 'border-lime-500/35 hover:border-lime-500/60',
      badge: 'bg-lime-950/80 text-lime-400 border-lime-800/60',
      button: 'bg-lime-500 hover:bg-lime-400 text-zinc-950 shadow-lime-500/25',
      glowShadow: 'shadow-[0_0_50px_-12px_rgba(132,204,22,0.35)]',
      accentColor: '#84cc16',
      bgHeader: 'from-lime-950/70',
      bgAtmosphere: 'from-lime-950/50 via-zinc-950 to-emerald-950/30'
    },
    {
      name: 'pink-blush',
      bgGlow: 'from-pink-500/20 via-transparent to-transparent',
      text: 'text-pink-400',
      border: 'border-pink-500/35 hover:border-pink-500/60',
      badge: 'bg-pink-950/80 text-pink-400 border-pink-800/60',
      button: 'bg-pink-500 hover:bg-pink-400 text-white shadow-pink-500/25',
      glowShadow: 'shadow-[0_0_50px_-12px_rgba(236,72,153,0.35)]',
      accentColor: '#ec4899',
      bgHeader: 'from-pink-950/70',
      bgAtmosphere: 'from-pink-950/50 via-zinc-950 to-rose-950/30'
    },
    {
      name: 'teal-wave',
      bgGlow: 'from-teal-500/20 via-transparent to-transparent',
      text: 'text-teal-400',
      border: 'border-teal-500/35 hover:border-teal-500/60',
      badge: 'bg-teal-950/80 text-teal-400 border-teal-800/60',
      button: 'bg-teal-500 hover:bg-teal-400 text-zinc-950 shadow-teal-500/25',
      glowShadow: 'shadow-[0_0_50px_-12px_rgba(20,184,166,0.35)]',
      accentColor: '#14b8a6',
      bgHeader: 'from-teal-950/70',
      bgAtmosphere: 'from-teal-950/50 via-zinc-950 to-cyan-950/30'
    }
  ];

  const index = Math.abs(hash) % palettes.length;
  return palettes[index];
}

export interface ThemeAtmosphere {
  gradientCss: string;
  accentGlowColor: string;
  primaryGlowColor: string;
  badgeBorder: string;
  posterBgUrl?: string;
}

export function getEntryAtmosphere(entry?: RatingEntry | null, activeTab: string = 'home'): ThemeAtmosphere {
  if (activeTab === 'univerzumi') {
    return {
      gradientCss: 'from-purple-950/35 via-zinc-950 to-indigo-955/25',
      accentGlowColor: '#a855f7',
      primaryGlowColor: 'rgba(168, 85, 247, 0.12)',
      badgeBorder: 'border-purple-500/30 text-purple-300 bg-purple-500/10',
      posterBgUrl: entry?.bannerUrl || entry?.posterUrl
    };
  }

  if (activeTab === 'glumci' || activeTab === 'baza') {
    return {
      gradientCss: 'from-emerald-950/30 via-zinc-950 to-teal-955/20',
      accentGlowColor: '#10b981',
      primaryGlowColor: 'rgba(16, 185, 129, 0.12)',
      badgeBorder: 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10',
    };
  }

  if (activeTab === 'leaderboard') {
    return {
      gradientCss: 'from-amber-950/30 via-zinc-950 to-yellow-955/20',
      accentGlowColor: '#eab308',
      primaryGlowColor: 'rgba(234, 179, 8, 0.12)',
      badgeBorder: 'border-amber-500/30 text-amber-300 bg-amber-500/10',
    };
  }

  if (activeTab === 'chat') {
    return {
      gradientCss: 'from-cyan-950/30 via-zinc-950 to-blue-955/20',
      accentGlowColor: '#06b6d4',
      primaryGlowColor: 'rgba(6, 182, 212, 0.12)',
      badgeBorder: 'border-cyan-500/30 text-cyan-300 bg-cyan-500/10',
    };
  }

  if (!entry) {
    return {
      gradientCss: 'from-blue-950/40 via-zinc-950 to-indigo-950/25',
      accentGlowColor: '#3b82f6',
      primaryGlowColor: 'rgba(59, 130, 246, 0.15)',
      badgeBorder: 'border-blue-400/30 text-blue-300 bg-blue-400/10',
    };
  }

  // Generate dynamic bespoke theme for this specific entry (every show/movie has unique gradient or custom theme!)
  const dynamicTheme = getShowDynamicColors(entry);

  return {
    gradientCss: dynamicTheme.bgAtmosphere,
    accentGlowColor: dynamicTheme.accentColor,
    primaryGlowColor: `${dynamicTheme.accentColor}30`,
    badgeBorder: dynamicTheme.badge,
    posterBgUrl: entry.bannerUrl || entry.posterUrl
  };
}

