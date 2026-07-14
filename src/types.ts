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
  // Custom hyperlink fields
  linkText?: string;
  linkTargetId?: string;
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

  // Applicable to shows and universes (where "seasons" are categories in universes):
  seasons?: Season[];
  
  // Applicable to movies:
  movieRating?: number;
  movieYoutubeUrl?: string;
  movieDuration?: string;
}

export type SortKey = 'name' | 'rating' | 'year';
export type SortOrder = 'asc' | 'desc';
