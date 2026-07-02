export interface TopArtist {
  spotifyArtistId: string;
  name: string;
  genres: string[];
  rank: number;
}

export interface TopTrack {
  spotifyTrackId: string;
  name: string;
  artistName: string;
  rank: number;
}

export interface MyProfile {
  id: string;
  spotifyId: string;
  displayName: string;
  avatarUrl: string | null;
  topArtists: TopArtist[];
  topTracks: TopTrack[];
  lastSync: string | null;
}

export interface UserSummary {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  isFollowedByMe: boolean;
}

export interface UserProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  followers: number;
  following: number;
  isFollowedByMe: boolean;
  topArtists: TopArtist[];
  topTracks: TopTrack[];
}

export interface NowPlaying {
  playing: boolean;
  track?: string;
  artist?: string;
}

export interface FeedItem {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  nowPlaying: { track: string; artist: string } | null;
}

export interface Affinity {
  score: number;
  commonArtists: string[];
  commonTracks: string[];
}

export interface SearchItem {
  id: string;
  name: string;
  artistName: string;
  imageUrl: string | null;
}

export interface SearchResponse {
  albums: SearchItem[];
  tracks: SearchItem[];
}

export interface ChatMessage {
  id: number;
  senderId: string;
  recipientId: string;
  text: string;
  sentAt: string;
}

export interface Conversation {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  lastMessage: {
    text: string;
    sentAt: string;
    fromMe: boolean;
  };
}

export interface Review {
  id: string;
  itemType: "album" | "track";
  spotifyItemId: string;
  itemName: string;
  artistName: string;
  imageUrl: string | null;
  rating: number;
  text: string | null;
  createdAt: string;
  updatedAt: string | null;
}
