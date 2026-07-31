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
  year?: string | number;      // Dodano: Godina izlaska epizode
  releaseDate?: string;       // Dodano: Tačan datum izlaska
  imageUrl?: string;
  youtubeUrl?: string;
  overview?: string;
  guestReviews?: GuestReview[];
  actors?: Actor[];
  featuredMoments?: FeaturedMoment[];
  linkText?: string;
  linkTargetId?: string;
}

export interface Season {
  seasonNumber: number;
  seasonName?: string;
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
  guestVotes?: GuestVote[];
  movieActors?: Actor[];
  movieReviews?: GuestReview[];
  movieFeaturedMoments?: FeaturedMoment[];
  seasons?: Season[];
  movieRating?: number;
  movieYoutubeUrl?: string;
  movieDuration?: string;
}

export type SortKey = 'name' | 'rating' | 'year';
export type SortOrder = 'asc' | 'desc';