export interface Actor {
  id: string;
  name: string;
  characterName?: string;
  photoUrl?: string;
  bio?: string;
  age?: number | string;
  otherInfo?: string;
  performanceRating?: number; // Rated role performance in a specific movie/episode
}

export interface FeaturedMoment {
  id: string;
  title: string;
  startTime: string; // e.g. "01:23:45"
  endTime: string;   // e.g. "01:24:15"
  youtubeUrl?: string; // Optional YouTube video link or embed
  notes?: string;
}

export interface GuestReview {
  id: string;
  voterName: string;
  photoUrl?: string;
  rating: number;
  reviewText: string;
  createdAt?: string;
}

export interface EpisodeHyperlink {
  id: string;
  title: string;
  targetId?: string; // entryId or entryId|seasonNum|episodeNum
  url?: string;
}

export interface Episode {
  id: string;
  episodeNumber: number;
  name: string;
  rating: number;
  imageUrl?: string;
  youtubeUrl?: string;
  overview?: string;
  guestReviews?: GuestReview[];
  actors?: Actor[];
  featuredMoments?: FeaturedMoment[]; // Optional key moments
  releaseYear?: string | number;
  airDate?: string;
  runtime?: string;
  director?: string;
  writer?: string;
  // Custom hyperlink fields
  linkText?: string;
  linkTargetId?: string;
  linkedEntries?: { entryId: string; seasonNum?: number; episodeNum?: number; customTitle?: string }[];
  hyperlinks?: EpisodeHyperlink[];
}

export interface Season {
  seasonNumber: number;
  seasonName?: string; // For Cinematic Universes (e.g. "Phase 1: Early Days" / "Faza 1")
  episodes: Episode[];
}

export interface GuestVote {
  id: string;
  voterName: string;
  rating: number;
  createdAt?: string;
}

export interface RatingEntry {
  id: string;
  type: 'show' | 'movie' | 'universe';
  name: string;
  year: string;
  description: string;
  posterUrl: string;
  bannerUrl: string;
  votesCount?: number;
  guestVotes?: GuestVote[]; // Legacy global guest votes for movies or generic backward compatibility
  movieActors?: Actor[];    // Cast listed for single-movie entries
  movieReviews?: GuestReview[]; // Movie reviews
  movieFeaturedMoments?: FeaturedMoment[]; // Movie clips

  // Custom atmosphere styling / color override
  customThemeColor?: string; // e.g. '#10b981', '#ec4899', '#f59e0b', '#06b6d4', etc.
  customGradient?: string;   // e.g. 'from-pink-950/50 via-zinc-950 to-purple-950/30'

  // Applicable to shows and universes (where "seasons" are categories in universes):
  seasons?: Season[];
  
  // Applicable to movies:
  movieRating?: number;
  movieYoutubeUrl?: string;
  movieDuration?: string;

  // Source metadata for catalog separation
  source?: 'local' | 'imdb';
  imdbId?: string;
}

export type SortKey = 'name' | 'rating' | 'year';
export type SortOrder = 'asc' | 'desc';

export interface TrophyItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

export interface ProjectItem {
  id: string;
  entryId: string;
  entryName: string;
  type: 'show' | 'movie' | 'universe' | 'episode';
  posterUrl?: string;
  seasonNum?: number;
  epNum?: number;
  epName?: string;
  rating: number;
  year?: string | number;
  addedAt?: string;
}

export interface ProjectFolder {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
  items: ProjectItem[];
}

export interface PendingChangeRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: 'add_entry' | 'edit_entry' | 'delete_entry' | 'rating_update';
  entryId?: string;
  entryData?: Partial<RatingEntry>;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  details: string;
}
