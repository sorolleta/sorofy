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

export interface NoteAuthor {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

// Una tarjeta del feed de descubrimiento: la nota y quién la escribió
export interface FeedEntry {
  author: NoteAuthor;
  note: Note;
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

// Los artistas no tienen "artista de": son ellos mismos
export interface SearchArtist {
  id: string;
  name: string;
  imageUrl: string | null;
}

export interface SearchResponse {
  albums: SearchItem[];
  tracks: SearchItem[];
  artists: SearchArtist[];
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

// Cualquier cosa musical sobre la que se escribe: canción, álbum, artista
// de Spotify o grupo local creado por los usuarios (sin spotifyId)
export interface MusicItem {
  id: string;
  type: "album" | "track" | "artist" | "localGroup";
  spotifyId: string | null;
  name: string;
  artistName: string | null;
  imageUrl: string | null;
  description: string | null;
}

export interface Note {
  id: string;
  item: MusicItem;
  text: string | null;
  vibeColor: string | null;
  vibeEmoji: string | null;
  vibeLabel: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface LocalGroup {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}
