import { useState } from "react";
import { Link } from "react-router-dom";
import type { Note, MusicItem, NoteAuthor, NoteInteractions } from "../types";
import NoteInteractionsBar from "./NoteInteractionsBar";
import { soundcloudEmbedUrl, spotifyEmbedUrl, youtubeEmbedUrl } from "./PlatformPlayer";
import { resolveVibe } from "../vibes";

interface Props {
  note: Note;
  // El feed muestra quién escribió la nota; la bitácora no lo necesita
  author?: NoteAuthor;
  actions?: React.ReactNode;
  // Si la nota llegó por su ancla, el artista del lector que la trajo
  because?: string | null;
  // Si es un grupo de la provincia del lector, cuál
  becauseLocal?: string | null;
  // Estado de "me llega" y conversación, cargado por lotes en cada página
  interactions?: NoteInteractions;
}

const TYPE_LABEL: Record<MusicItem["type"], string> = {
  album: "álbum",
  track: "canción",
  artist: "artista",
  localGroup: "grupo local",
};

// La tarjeta destaca el motivo humano (texto o vibe) y deja el formato
// en pequeño. Cada tipo tiene su silueta: el artista en grande y circular,
// el álbum con la carátula a todo el ancho, el resto con carátula pequeña.
export default function NoteCard({ note, author, actions, because, becauseLocal, interactions }: Props) {
  // El player embebido se monta solo al pulsar: el feed no carga iframes.
  // El "escúchalo aquí" de la nota manda sobre el enlace del item: apunta
  // al audio exacto del que habla (la versión en directo, el set...)
  const [playing, setPlaying] = useState<"youtube" | "soundcloud" | "spotify" | null>(null);
  const noteYoutube = note.listenUrl ? youtubeEmbedUrl(note.listenUrl) : null;
  const youtubeEmbed = noteYoutube
    ?? (note.item.youtubeUrl ? youtubeEmbedUrl(note.item.youtubeUrl) : null);
  const soundcloudUrl = note.listenUrl?.includes("soundcloud.com")
    ? note.listenUrl
    : note.item.soundcloudUrl;
  const spotifyEmbed = note.item.spotifyId
    ? spotifyEmbedUrl(note.item.type, note.item.spotifyId)
    : null;

  const vibe = note.vibeColor ? resolveVibe(note.vibeColor) : null;
  const isArtistHero = note.item.type === "artist" && Boolean(note.item.imageUrl);
  const isAlbumWide = note.item.type === "album" && Boolean(note.item.imageUrl);

  const badgeLabel =
    note.item.type === "localGroup"
      ? (note.item.category ?? TYPE_LABEL.localGroup).toLowerCase()
      : TYPE_LABEL[note.item.type];

  const title = (
    <>
      {note.item.name}
      {note.item.artistName && ` — ${note.item.artistName}`}
      {note.item.type === "localGroup" && note.item.province && ` — ${note.item.province}`}
    </>
  );

  const date = (
    <span className="note-track-date">
      {new Date(note.createdAt).toLocaleDateString()}
      {note.updatedAt && " · editada"}
    </span>
  );

  return (
    <li className={`note-card${isArtistHero ? " note-card-artist" : ""}`}>
      {author && (
        <div className="note-author">
          {author.avatarUrl ? (
            <img className="note-avatar" src={author.avatarUrl} alt="" />
          ) : (
            <span className="note-avatar avatar-placeholder">
              {author.displayName[0]?.toUpperCase() ?? "♪"}
            </span>
          )}
          <Link className="note-author-name" to={`/gente/${author.id}`}>
            {author.displayName}
          </Link>
        </div>
      )}

      {isArtistHero && (
        <Link to={`/musica/${note.item.id}`} className="artist-hero">
          <span className="card-kicker">artista</span>
          <img className="artist-hero-img" src={note.item.imageUrl!} alt="" />
          <span className="artist-name-xl">{note.item.name}</span>
        </Link>
      )}
      {isAlbumWide && (
        <>
          <span className="card-kicker">álbum</span>
          <Link to={`/musica/${note.item.id}`}>
            <img className="album-cover-xl" src={note.item.imageUrl!} alt="" />
          </Link>
        </>
      )}

      {note.text && <p className="note-text">{note.text}</p>}
      {note.vibeLabel && vibe && (
        <span className="vibe-chip" style={{ background: vibe.hex, color: vibe.ink }}>
          {note.vibeEmoji && <span>{note.vibeEmoji}</span>}
          {note.vibeLabel}
        </span>
      )}

      {/* La recomendación se explica: el ancla que coincide con tus
          artistas manda y es personal; la cercanía y el "si te gusta"
          genérico son un susurro */}
      {because ? (
        <p className="rec-line rec-personal">Te llega porque escuchas {because}</p>
      ) : becauseLocal ? (
        <p className="rec-line rec-generic">Cerca de ti · {becauseLocal}</p>
      ) : (
        note.anchorArtistName && (
          <p className="rec-line rec-generic">Si te gusta {note.anchorArtistName}</p>
        )
      )}

      <div className="note-meta">
        {!isArtistHero && !isAlbumWide && (
          <Link to={`/musica/${note.item.id}`}>
            {note.item.imageUrl ? (
              <img className="note-cover" src={note.item.imageUrl} alt="" />
            ) : (
              <span
                className="note-cover cover-placeholder"
                // Sin carátula (grupos locales), el hueco toma el color del
                // vibe de la nota en un degradado tenue; sin vibe, gris neutro
                style={
                  vibe
                    ? { background: `linear-gradient(135deg, ${vibe.hex}80, ${vibe.hex}26)` }
                    : undefined
                }
              >
                {note.vibeEmoji ?? "♪"}
              </span>
            )}
          </Link>
        )}
        <Link to={`/musica/${note.item.id}`} className="note-track">
          {!isArtistHero && <span className="note-track-title">{title}</span>}
          <span className="note-track-sub">
            {!isArtistHero && <span className="badge">{badgeLabel}</span>}
            {date}
          </span>
        </Link>
        {actions && <div className="note-actions">{actions}</div>}
      </div>

      {/* La música que no está en Spotify se escucha aquí dentro,
          sin sacar a nadie del feed */}
      {(youtubeEmbed || soundcloudUrl || spotifyEmbed) && (
        <div className="listen-row">
          {spotifyEmbed && (
            <button
              type="button"
              className={`btn-listen${playing === "spotify" ? " is-open" : ""}`}
              onClick={() => setPlaying(playing === "spotify" ? null : "spotify")}
            >
              {playing === "spotify" ? "✕ Cerrar" : "▶ Escuchar · Muestra"}
            </button>
          )}
          {youtubeEmbed && (
            <button
              type="button"
              className={`btn-listen${playing === "youtube" ? " is-open" : ""}`}
              onClick={() => setPlaying(playing === "youtube" ? null : "youtube")}
            >
              {playing === "youtube" ? "✕ Cerrar vídeo" : "▶ Ver en YouTube"}
            </button>
          )}
          {soundcloudUrl && (
            <button
              type="button"
              className={`btn-listen${playing === "soundcloud" ? " is-open" : ""}`}
              onClick={() => setPlaying(playing === "soundcloud" ? null : "soundcloud")}
            >
              {playing === "soundcloud" ? "✕ Cerrar audio" : "▶ Escuchar en SoundCloud"}
            </button>
          )}
        </div>
      )}
      {playing === "spotify" && spotifyEmbed && (
        <div className={`player-box ${note.item.type === "track" ? "spotify" : "spotify-full"}`}>
          <iframe src={spotifyEmbed} title={`Spotify: ${note.item.name}`} allow="encrypted-media" />
        </div>
      )}
      {playing === "youtube" && youtubeEmbed && (
        <div className="player-box video">
          <iframe
            src={youtubeEmbed}
            title={`Vídeo de ${note.item.name}`}
            allow="accelerometer; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      {playing === "soundcloud" && soundcloudUrl && (
        <div className="player-box audio">
          <iframe
            src={soundcloudEmbedUrl(soundcloudUrl)}
            title={`Audio de ${note.item.name}`}
            allow="encrypted-media"
          />
        </div>
      )}

      {interactions && <NoteInteractionsBar noteId={note.id} interactions={interactions} />}
    </li>
  );
}
