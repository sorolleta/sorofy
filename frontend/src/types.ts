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
  trustCount: number;
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

// Una tarjeta del feed de descubrimiento: la nota, quién la escribió y,
// si llegó por su ancla, el artista tuyo que la trajo
export interface FeedEntry {
  author: NoteAuthor;
  note: Note;
  becauseArtist: string | null;
  becauseProvince: string | null;
}

// La ficha de un item: sus datos y todas las notas de la comunidad
export interface MusicItemDetail {
  item: MusicItem;
  notes: { author: NoteAuthor; note: Note }[];
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
  // La música de los grupos locales vive fuera de Spotify
  youtubeUrl: string | null;
  soundcloudUrl: string | null;
  // Solo grupos locales: qué son y de dónde son
  category: string | null;
  province: string | null;
}

export interface Note {
  id: string;
  item: MusicItem;
  text: string | null;
  vibeColor: string | null;
  vibeEmoji: string | null;
  vibeLabel: string | null;
  // "Escúchalo aquí": el audio exacto del que habla la nota (YouTube/SoundCloud)
  listenUrl: string | null;
  // El ancla de recomendación: "si te gusta X, esto te puede gustar"
  anchorArtistSpotifyId: string | null;
  anchorArtistName: string | null;
  createdAt: string;
  updatedAt: string | null;
}

// Estado de lector de una nota: si la marqué, si tiene conversación y,
// SOLO en mis notas, a quién le llega (null en las ajenas: es privado)
export interface NoteInteractions {
  noteId: string;
  likedByMe: boolean;
  hasComments: boolean;
  likedBy: string[] | null;
}

// Un comentario del hilo; likeCount solo viaja en los comentarios propios
export interface NoteCommentData {
  id: string;
  author: NoteAuthor;
  text: string;
  createdAt: string;
  likedByMe: boolean;
  likeCount: number | null;
}

// Hilo de un solo nivel: raíces con sus respuestas colgando
export interface CommentThread {
  root: NoteCommentData;
  replies: NoteCommentData[];
}

export interface LocalGroup {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  youtubeUrl: string | null;
  soundcloudUrl: string | null;
  category: string | null;
  province: string | null;
  createdAt: string;
}

// Catálogos del formulario de crear grupo local
export interface LocalGroupOptions {
  categories: string[];
  provinces: string[];
}
