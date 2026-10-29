export interface TopArtist {
  spotifyArtistId: string;
  name: string;
  genres: string[];
  rank: number;
  imageUrl: string | null;
}

export interface TopTrack {
  spotifyTrackId: string;
  name: string;
  artistName: string;
  rank: number;
  // Carátula y álbum de origen: de aquí sale el podio de álbumes
  imageUrl: string | null;
  albumSpotifyId: string | null;
  albumName: string | null;
}

export interface MyProfile {
  id: string;
  spotifyId: string;
  displayName: string;
  avatarUrl: string | null;
  topArtists: TopArtist[];
  topTracks: TopTrack[];
  lastSync: string | null;
  province: string | null;
  // "en Sorofy desde marzo"
  createdAt: string;
  tags: string[];
}

export interface UserSummary {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  province: string | null;
  isFollowedByMe: boolean;
}

export interface UserProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  province: string | null;
  followersCount: number;
  followingCount: number;
  isFollowedByMe: boolean;
  trustCount: number;
  topArtists: TopArtist[];
  topTracks: TopTrack[];
}

// Lo que suena ahora en el Spotify de alguien: carátula, progreso y
// duración para pintar el "en directo" (la barra avanza en el cliente)
export interface LiveTrack {
  track: string;
  artist: string;
  spotifyId: string | null;
  imageUrl: string | null;
  progressMs: number | null;
  durationMs: number | null;
}

export interface NowPlaying extends Partial<LiveTrack> {
  playing: boolean;
}

export interface FeedItem {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  nowPlaying: LiveTrack | null;
  // Para quien no escucha nada ahora: lo último que sonó ("hace 2 h")
  lastPlayed: { track: string; artist: string; imageUrl: string | null; playedAt: string } | null;
}

// "Te ha sonado mucho y aún no has dicho nada": tus tops sin nota tuya
export interface UnnotedTrack {
  spotifyTrackId: string;
  name: string;
  artistName: string;
  imageUrl: string | null;
  albumName: string | null;
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
  becauseFollowedGroup: string | null;
  becauseProvince: string | null;
}

// Contexto vivo de Spotify para la ficha; null si el item no es de
// Spotify o la llamada falló (la ficha se muestra igual sin él)
export interface AlbumTrackRow {
  number: number;
  name: string;
  durationMs: number;
  spotifyId: string;
  // La última nota con texto sobre esa canción, como frase en cursiva
  noteHint: { noteId: string; text: string; authorName: string } | null;
}

export interface AlbumExtra {
  releaseYear: string | null;
  totalTracks: number | null;
  totalDurationMin: number;
  tracks: AlbumTrackRow[];
  // Otros discos del mismo artista, para el panel "Más de X"
  moreFromArtist: {
    artistName: string;
    albums: { spotifyId: string; name: string; imageUrl: string | null }[];
  } | null;
}

export interface TrackExtra {
  durationMs: number | null;
  album: {
    spotifyId: string;
    name: string;
    imageUrl: string | null;
    releaseYear: string | null;
  } | null;
}

export interface ArtistExtra {
  albums: { spotifyId: string; name: string; imageUrl: string | null }[];
}

// La ficha de un item: sus datos y todas las notas de la comunidad
export interface MusicItemDetail {
  item: MusicItem;
  notes: { author: NoteAuthor; note: Note }[];
  // Se discrimina por item.type: album/track/artist
  extra: AlbumExtra | TrackExtra | ArtistExtra | null;
  circle: CircleEntry[];
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

// Un eco: el rastro de lo que una nota tuya ha movido. Sin cifras — cada
// fila es un hecho concreto, no un contador.
export interface EcoItem {
  id: string;
  kind: "liked" | "commented" | "discovered" | "followed" | "listaSaved" | "listaAdded";
  createdAt: string;
  hasUnread: boolean;
  actor: { id: string; name: string; avatarUrl: string | null };
  noteId: string | null;
  musicItemId: string | null;
  musicItemName: string | null;
  musicItemImageUrl: string | null;
  quote: string | null;
  // Solo ecos de estanterías: cuál
  listaId: string | null;
  listaTitle: string | null;
  // Solo follows: "Tenéis a X en común"
  commonArtist: string | null;
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
  hasUnread: boolean;
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
  // Solo grupos locales: quién dio de alta la ficha (null en items de Spotify)
  createdByUserId: string | null;
  // Solo grupos locales: si ya sigues sus notas (false en items de Spotify)
  isFollowedByMe: boolean;
  // Solo grupos locales: lo que no falla en ningún pueblo (vacío si no hay)
  repertoire: string[];
  // Solo grupos locales: fotos reales subidas por la comunidad
  photos: GroupPhoto[];
}

export interface GroupPhoto {
  id: string;
  url: string;
  uploadedByUserId: string;
  canRemove: boolean;
}

// "En tu círculo": alguien que sigues ya lo tiene guardado, o ha escrito
// sobre esto. Sin cifras de nadie más.
export interface CircleEntry {
  kind: "saved" | "noted";
  userId: string;
  displayName: string;
  savedAt: string | null;
  noteCount: number | null;
}

// Un item en la estantería del feed: solo lo justo para pintar la carátula
export interface ShelfItem {
  id: string;
  type: "album" | "track" | "artist" | "localGroup";
  name: string;
  artistName: string | null;
  imageUrl: string | null;
  category: string | null;
  province: string | null;
}

export interface Shelf {
  weekly: ShelfItem[];
  recent: ShelfItem[];
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
  repertoire: string[];
  createdAt: string;
}

// Catálogos del formulario de crear grupo local
export interface LocalGroupOptions {
  categories: string[];
  provinces: string[];
}

// Estanterías: colecciones hechas a mano, sin algoritmo ni autoplay
export interface ListaCard {
  id: string;
  title: string;
  mood: string | null;
  curator: { id: string; displayName: string };
  itemCount: number;
  coverImages: string[];
}

export interface ListaItemMusicItem {
  id: string;
  type: "album" | "track" | "artist" | "localGroup";
  spotifyId: string | null;
  name: string;
  artistName: string | null;
  imageUrl: string | null;
}

export interface ListaItemEntry {
  id: string;
  musicItem: ListaItemMusicItem;
  text: string;
  addedBy: { id: string; displayName: string };
  canRemove: boolean;
}

export interface ListaDetail {
  id: string;
  title: string;
  mood: string | null;
  curator: { id: string; displayName: string };
  isMine: boolean;
  isSavedByMe: boolean;
  items: ListaItemEntry[];
}

// ---------- Rutas de escucha («Por dónde empezar») ----------
export interface RutaNode {
  id: string;
  spotifyId: string | null;
  itemType: "album" | "track";
  title: string;
  artist: string | null;
  year: string | null;
  imageUrl: string | null;
  isStart: boolean;
  lead: string | null;
  leadText: string | null;
  edgeLead: string | null;
  edge: string | null;
  why: string | null;
}

export interface RutaBranch {
  label: string;
  bridgeLead: string | null;
  bridge: string | null;
  nodes: RutaNode[];
}

export interface RutaCard {
  id: string;
  title: string;
  intro: string | null;
  artistName: string;
  author: { id: string; displayName: string; avatarUrl: string | null; province: string | null };
  nodeCount: number;
  branchCount: number;
  start: { title: string; imageUrl: string | null; lead: string | null; leadText: string | null; why: string | null } | null;
  strip: { title: string; imageUrl: string | null }[];
  isMine: boolean;
  updatedAt: string;
}

export interface RutaDetail {
  card: RutaCard;
  branches: RutaBranch[];
  done: string[];
  isSaved: boolean;
  forkedFrom: { id: string; title: string; authorName: string } | null;
  artistSpotifyId: string | null;
  answersRequestId: string | null;
}

export interface RutaRequestItem {
  id: string;
  artistName: string;
  artistSpotifyId: string | null;
  createdAt: string;
  isMine: boolean;
  from: { id: string; displayName: string; avatarUrl: string | null };
}
