import { useState } from "react";
import { Link } from "react-router-dom";
import type { Note, MusicItem, NoteAuthor } from "../types";
import { soundcloudEmbedUrl, spotifyEmbedUrl, youtubeEmbedUrl } from "./PlatformPlayer";

interface Props {
  note: Note;
  // El feed muestra quién escribió la nota; la bitácora no lo necesita
  author?: NoteAuthor;
  actions?: React.ReactNode;
  // Si la nota llegó por su ancla, el artista del lector que la trajo
  because?: string | null;
  // Si es un grupo de la provincia del lector, cuál
  becauseLocal?: string | null;
}

const TYPE_LABEL: Record<MusicItem["type"], string> = {
  album: "álbum",
  track: "canción",
  artist: "artista",
  localGroup: "grupo local",
};

// La tarjeta destaca el motivo humano (texto o vibe) y deja el formato
// en pequeño: esto es contexto, no un tablón de reseñas
export default function NoteCard({ note, author, actions, because, becauseLocal }: Props) {
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

  return (
    <li className="note-card">
      {author && (
        <p className="note-author">
          {author.avatarUrl ? (
            <img className="avatar avatar-xs" src={author.avatarUrl} alt="" />
          ) : (
            <span className="avatar avatar-xs avatar-placeholder">♪</span>
          )}
          <Link to={`/gente/${author.id}`}>{author.displayName}</Link>
        </p>
      )}
      <div className="note-card-main">
        {/* Carátula y nombre llevan a la ficha del item, con todas las
            notas de la comunidad sobre él */}
        <Link to={`/musica/${note.item.id}`} className="cover-link">
          {note.item.imageUrl ? (
            <img className="cover" src={note.item.imageUrl} alt="" />
          ) : (
            <div
              className="cover cover-placeholder"
              // Sin carátula (grupos locales), el hueco toma el color del vibe
              // de la nota en un degradado tenue; sin vibe, gris neutro
              style={
                note.vibeColor
                  ? {
                      background: `linear-gradient(135deg, ${note.vibeColor}80, ${note.vibeColor}26)`,
                    }
                  : undefined
              }
            >
              ♪
            </div>
          )}
        </Link>
        <div className="note-body">
          {note.text && <p className="note-text">{note.text}</p>}
          {note.vibeLabel && (
            <p>
              <span
                className="vibe-chip"
                style={note.vibeColor ? { background: note.vibeColor } : undefined}
              >
                {note.vibeEmoji && <span>{note.vibeEmoji} </span>}
                {note.vibeLabel}
              </span>
            </p>
          )}
          {/* La recomendación se explica: el ancla que coincide con tus
              artistas manda; si no, la cercanía; genérica en gris si nada */}
          {because ? (
            <p className="note-because">Te llega porque escuchas {because}</p>
          ) : becauseLocal ? (
            <p className="note-because">Cerca de ti · {becauseLocal}</p>
          ) : (
            note.anchorArtistName && (
              <p className="note-anchor muted">Si te gusta {note.anchorArtistName}</p>
            )
          )}
          <p className="note-item muted">
            <Link to={`/musica/${note.item.id}`}>{note.item.name}</Link>
            {note.item.artistName && ` — ${note.item.artistName}`}
            {note.item.type === "localGroup" && note.item.province && ` — ${note.item.province}`}
            <span className="badge">
              {note.item.type === "localGroup"
                ? (note.item.category ?? TYPE_LABEL.localGroup).toLowerCase()
                : TYPE_LABEL[note.item.type]}
            </span>
          </p>
          {/* La música que no está en Spotify se escucha aquí dentro,
              sin sacar a nadie del feed */}
          {(youtubeEmbed || soundcloudUrl || spotifyEmbed) && (
            <p className="platform-actions">
              {spotifyEmbed && (
                <button
                  type="button"
                  className="btn-platform"
                  onClick={() => setPlaying(playing === "spotify" ? null : "spotify")}
                >
                  {playing === "spotify" ? "✕ Cerrar" : "▶ Escuchar"}
                </button>
              )}
              {youtubeEmbed && (
                <button
                  type="button"
                  className="btn-platform"
                  onClick={() => setPlaying(playing === "youtube" ? null : "youtube")}
                >
                  {playing === "youtube" ? "✕ Cerrar vídeo" : "▶ Ver en YouTube"}
                </button>
              )}
              {soundcloudUrl && (
                <button
                  type="button"
                  className="btn-platform"
                  onClick={() => setPlaying(playing === "soundcloud" ? null : "soundcloud")}
                >
                  {playing === "soundcloud" ? "✕ Cerrar audio" : "▶ Escuchar en SoundCloud"}
                </button>
              )}
            </p>
          )}
          <p className="note-date muted">
            {new Date(note.createdAt).toLocaleDateString()}
            {note.updatedAt && " · editada"}
          </p>
        </div>
        {actions && <div className="note-actions">{actions}</div>}
      </div>
      {playing === "spotify" && spotifyEmbed && (
        <div className={`embed-wrap ${note.item.type === "track" ? "spotify" : "spotify-full"}`}>
          <iframe src={spotifyEmbed} title={`Spotify: ${note.item.name}`} allow="encrypted-media" />
        </div>
      )}
      {playing === "youtube" && youtubeEmbed && (
        <div className="embed-wrap video">
          <iframe
            src={youtubeEmbed}
            title={`Vídeo de ${note.item.name}`}
            allow="accelerometer; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      {playing === "soundcloud" && soundcloudUrl && (
        <div className="embed-wrap audio">
          <iframe
            src={soundcloudEmbedUrl(soundcloudUrl)}
            title={`Audio de ${note.item.name}`}
            allow="encrypted-media"
          />
        </div>
      )}
    </li>
  );
}
