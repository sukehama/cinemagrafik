/**
 * TMDB (The Movie Database) & TVmaze Integration Helper
 * - Uses TMDB API key if provided by the user for official high-res data, direct YouTube trailers, episode stills & plots
 * - TVmaze fallback (free, no key needed) for rich TV episode overviews and stills
 */

export interface TMDBVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official?: boolean;
}

export interface EnrichedEpisodeData {
  episodeNumber: number;
  seasonNumber: number;
  name: string;
  overview?: string;
  imageUrl?: string;
  airDate?: string;
  rating?: number;
  runtime?: number;
  youtubeUrl?: string;
}

export interface EnrichedShowData {
  summary?: string;
  posterUrl?: string;
  bannerUrl?: string;
  genres?: string[];
  episodesBySeason: Record<number, EnrichedEpisodeData[]>;
  officialTrailerUrl?: string;
}

// Clean HTML tags from text
export function cleanHtmlSummary(html: string | undefined | null): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

export const DEFAULT_TMDB_API_KEY = 'eff50b22228a6501f019196665032b7a';

/**
 * Get configured TMDB API key from localStorage or default fallback
 */
export function getTmdbApiKey(providedKey?: string): string {
  if (providedKey && providedKey.trim()) return providedKey.trim();
  if (typeof window !== 'undefined') {
    const key = localStorage.getItem('tmdb_custom_api_key');
    if (key && key.trim()) return key.trim();
  }
  return DEFAULT_TMDB_API_KEY;
}

/**
 * Fetch official TMDB Video Trailer (YouTube embed or watch link) for a movie or TV show
 */
export async function fetchTMDBTrailer(imdbId: string, tmdbKey?: string): Promise<string | null> {
  const key = getTmdbApiKey(tmdbKey);
  if (!key || !imdbId) return null;

  try {
    const findRes = await fetch(
      `https://api.themoviedb.org/3/find/${encodeURIComponent(imdbId)}?api_key=${encodeURIComponent(key)}&external_source=imdb_id`
    );
    if (!findRes.ok) return null;
    const findData = await findRes.json();

    const movieResult = findData.movie_results?.[0];
    const tvResult = findData.tv_results?.[0];

    let tmdbId: number | null = null;
    let type: 'movie' | 'tv' = 'movie';

    if (movieResult?.id) {
      tmdbId = movieResult.id;
      type = 'movie';
    } else if (tvResult?.id) {
      tmdbId = tvResult.id;
      type = 'tv';
    }

    if (!tmdbId) return null;

    const videoRes = await fetch(
      `https://api.themoviedb.org/3/${type}/${tmdbId}/videos?api_key=${encodeURIComponent(key)}`
    );
    if (!videoRes.ok) return null;
    const videoData = await videoRes.json();

    const videos: TMDBVideo[] = videoData.results || [];
    // Prioritize official YouTube trailer or teaser
    const officialTrailer = videos.find(
      (v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser') && v.official
    ) || videos.find(
      (v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
    ) || videos.find((v) => v.site === 'YouTube');

    if (officialTrailer?.key) {
      return `https://www.youtube.com/embed/${officialTrailer.key}`;
    }
  } catch (err) {
    console.warn('TMDB trailer fetch error:', err);
  }

  return null;
}

/**
 * Fetch full season episodes details directly from TMDB
 */
export async function fetchTMDBSeasonEpisodes(
  tmdbShowId: number,
  seasonNumber: number,
  tmdbKey?: string
): Promise<EnrichedEpisodeData[] | null> {
  const key = getTmdbApiKey(tmdbKey);
  if (!key) return null;

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/tv/${tmdbShowId}/season/${seasonNumber}?api_key=${encodeURIComponent(key)}`
    );
    if (!res.ok) return null;
    const data = await res.json();

    if (!Array.isArray(data.episodes)) return null;

    return data.episodes.map((ep: any) => ({
      episodeNumber: ep.episode_number || 1,
      seasonNumber: seasonNumber,
      name: ep.name || `Epizoda ${ep.episode_number}`,
      overview: ep.overview || '',
      imageUrl: ep.still_path ? `https://image.tmdb.org/t/p/w780${ep.still_path}` : undefined,
      airDate: ep.air_date || undefined,
      rating: ep.vote_average ? Number(ep.vote_average.toFixed(1)) : undefined,
      runtime: ep.runtime || undefined
    }));
  } catch (err) {
    console.warn('TMDB Season fetch error:', err);
    return null;
  }
}

/**
 * Find TMDB ID and details for a show from IMDb ID
 */
export async function findTMDBShow(imdbId: string, tmdbKey?: string): Promise<{ id: number; backdropUrl?: string; posterUrl?: string } | null> {
  const key = getTmdbApiKey(tmdbKey);
  if (!key || !imdbId) return null;

  try {
    const findRes = await fetch(
      `https://api.themoviedb.org/3/find/${encodeURIComponent(imdbId)}?api_key=${encodeURIComponent(key)}&external_source=imdb_id`
    );
    if (!findRes.ok) return null;
    const findData = await findRes.json();

    const tvResult = findData.tv_results?.[0];
    const movieResult = findData.movie_results?.[0];
    const item = tvResult || movieResult;

    if (item?.id) {
      return {
        id: item.id,
        backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : undefined,
        posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w780${item.poster_path}` : undefined
      };
    }
  } catch (e) {
    console.warn('findTMDBShow error:', e);
  }

  return null;
}

/**
 * Fetch rich episode details (full plot synopses, episode stills, air dates)
 * Combines TMDB (if key exists) with TVmaze fallback (free, no key).
 */
export async function fetchTVmazeShowData(imdbIdOrTitle: string, tmdbKey?: string): Promise<EnrichedShowData | null> {
  const key = getTmdbApiKey(tmdbKey);

  // 1. If TMDB key is provided and input is an IMDb ID, try TMDB first!
  if (key && imdbIdOrTitle.startsWith('tt')) {
    try {
      const tmdbShow = await findTMDBShow(imdbIdOrTitle, key);
      if (tmdbShow?.id) {
        // Fetch show details from TMDB to see number of seasons
        const showRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbShow.id}?api_key=${encodeURIComponent(key)}`);
        if (showRes.ok) {
          const showData = await showRes.json();
          const seasonsCount = showData.number_of_seasons || showData.seasons?.length || 1;
          const episodesBySeason: Record<number, EnrichedEpisodeData[]> = {};

          for (let s = 1; s <= seasonsCount; s++) {
            const seasonEps = await fetchTMDBSeasonEpisodes(tmdbShow.id, s, key);
            if (seasonEps && seasonEps.length > 0) {
              episodesBySeason[s] = seasonEps;
            }
          }

          if (Object.keys(episodesBySeason).length > 0) {
            return {
              summary: showData.overview || undefined,
              posterUrl: tmdbShow.posterUrl,
              bannerUrl: tmdbShow.backdropUrl,
              episodesBySeason
            };
          }
        }
      }
    } catch (e) {
      console.warn('TMDB full show data fetch error:', e);
    }
  }

  // 2. Fallback to TVmaze (100% Free, NO API Key needed, fast and comprehensive)
  try {
    let showId: number | null = null;

    if (imdbIdOrTitle.startsWith('tt')) {
      try {
        const lookupRes = await fetch(`https://api.tvmaze.com/lookup/shows?imdb=${imdbIdOrTitle}`);
        if (lookupRes.ok) {
          const lookupData = await lookupRes.json();
          if (lookupData && lookupData.id) {
            showId = lookupData.id;
          }
        }
      } catch (e) {}
    }

    if (!showId) {
      const searchRes = await fetch(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(imdbIdOrTitle)}`);
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData && searchData.id) {
          showId = searchData.id;
        }
      }
    }

    if (!showId) return null;

    const epRes = await fetch(`https://api.tvmaze.com/shows/${showId}/episodes`);
    if (!epRes.ok) return null;

    const epData = await epRes.json();
    if (!Array.isArray(epData)) return null;

    const episodesBySeason: Record<number, EnrichedEpisodeData[]> = {};

    for (const ep of epData) {
      const seasonNum = ep.season || 1;
      const epNum = ep.number || 1;
      const cleanSummary = cleanHtmlSummary(ep.summary);
      const epImage = ep.image?.original || ep.image?.medium || undefined;

      if (!episodesBySeason[seasonNum]) {
        episodesBySeason[seasonNum] = [];
      }

      episodesBySeason[seasonNum].push({
        seasonNumber: seasonNum,
        episodeNumber: epNum,
        name: ep.name || `Epizoda ${epNum}`,
        overview: cleanSummary,
        imageUrl: epImage,
        airDate: ep.airdate || undefined,
        rating: ep.rating?.average ? Number(ep.rating.average) : undefined,
        runtime: ep.runtime || undefined
      });
    }

    return {
      episodesBySeason
    };
  } catch (err) {
    console.warn('TVmaze fetch error:', err);
    return null;
  }
}
