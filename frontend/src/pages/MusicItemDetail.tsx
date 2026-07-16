import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { API_URL, api, getMe, getMyUserId } from "../api";
import type {
  AlbumExtra,
  ArtistExtra,
  MusicItemDetail as Detail,
  NoteInteractions,
  TrackExtra,
} from "../types";
import NoteCard from "../components/NoteCard";
import { loadInteractions } from "../components/NoteInteractionsBar";
import PlatformPlayer from "../components/PlatformPlayer";
import { resolveVibe } from "../vibes";

const TYPE_LABEL: Record<string, string> = {
  album: "álbum",
  track: "canción",
  artist: "artista",
  localGroup: "grupo local",
};

// Cada tipo tiñe su cabecera: azul disco, rojo artista, naranja verbena
const HERO_TINT: Record<string, string> = {
  album: "111,168,255",
  track: "111,168,255",
  artist: "225,25,0",
  localGroup: "245,166,35",
};

function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

// La ficha de un item: cabecera inmersiva, la música para escucharla al
// momento y todo lo que la comunidad ha escrito. Sin nota media ni
// rankings a propósito: contexto en orden cronológico, fiel al manifiesto.
export default function MusicItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [interactions, setInteractions] = useState<Map<string, NoteInteractions>>(new Map());
  const [myProvince, setMyProvince] = useState<string | null>(null);
  const [error, setError] = useState("");
  // Solo grupos locales: seguirlos mete sus notas en tu círculo del feed
  const [following, setFollowing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  // El panel de Instagram es una maqueta: solo enseña ejemplos plegados
  const [showIgPosts, setShowIgPosts] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDetail(null);
    setError("");
    api
      .get<Detail>(`/api/music-items/${id}`)
      .then((d) => {
        setDetail(d);
        setFollowing(d.item.isFollowedByMe);
        loadInteractions(d.notes.map((n) => n.note.id)).then(setInteractions).catch(() => {});
      })
      .catch(() => setError("Este item no existe o no se pudo cargar"));
    getMe().then((me) => setMyProvince(me.province)).catch(() => {});
  }, [id]);

  const toggleFollow = async () => {
    if (following) {
      await api.delete(`/api/local-groups/${id}/follow`);
    } else {
      await api.post(`/api/local-groups/${id}/follow`);
    }
    setFollowing(!following);
  };

  // Fotos reales del grupo: en disco, no en un proveedor externo
  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingPhoto(true);
    setPhotoError("");
    try {
      const form = new FormData();
      form.append("file", file);
      await api.upload(`/api/local-groups/${id}/photos`, form);
      setDetail(await api.get<Detail>(`/api/music-items/${id}`));
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "No se pudo subir la foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = async (photoId: string) => {
    await api.delete(`/api/local-groups/photos/${photoId}`);
    setDetail(await api.get<Detail>(`/api/music-items/${id}`));
  };

  if (error) return <p className="error">{error}</p>;
  if (!detail) {
    return (
      <div className="loading-state">
        <span className="spinner" />
        Cargando…
      </div>
    );
  }

  const { item, notes, extra } = detail;
  const albumExtra = item.type === "album" ? (extra as AlbumExtra | null) : null;
  const trackExtra = item.type === "track" ? (extra as TrackExtra | null) : null;
  const artistExtra = item.type === "artist" ? (extra as ArtistExtra | null) : null;

  // De un id de Spotify a la ficha de nuestro MusicItem (se crea si nadie
  // lo trajo antes): así navegan "del álbum" y los discos del artista
  const goToSpotifyItem = (type: string, spotifyId: string) =>
    api
      .get<{ id: string }>(`/api/music-items/resolve?type=${type}&spotifyId=${spotifyId}`)
      .then((r) => navigate(`/musica/${r.id}`))
      .catch(() => {});

  // El formulario de notas vive en /notas; le pasamos el item ya elegido
  const writeNote = () =>
    navigate("/notas", {
      state: {
        noteDraft:
          item.type === "localGroup"
            ? { musicItemId: item.id, name: item.name }
            : {
                itemType: item.type,
                spotifyItemId: item.spotifyId,
                name: item.name,
                artistName: item.artistName,
              },
      },
    });

  // La nube de vibes del panel lateral: cómo lo siente quien lo escucha
  const vibes = notes
    .filter((n) => n.note.vibeLabel && n.note.vibeColor)
    .map((n) => n.note)
    .filter((note, i, all) => all.findIndex((o) => o.vibeLabel === note.vibeLabel) === i)
    .slice(0, 6);

  // "Silvia escribió 3 notas": quién habla de esto, sin cifras públicas
  // de otra cosa que no sea su propia voz
  const voices = [...new Map(notes.map((n) => [n.author.id, n.author])).values()]
    .map((author) => ({
      author,
      count: notes.filter((n) => n.author.id === author.id).length,
    }))
    .slice(0, 4);

  const tint = HERO_TINT[item.type];
  const facts: string[] = [];
  if (albumExtra) {
    if (albumExtra.releaseYear) facts.push(albumExtra.releaseYear);
    if (albumExtra.totalTracks) {
      facts.push(`${albumExtra.totalTracks} ${albumExtra.totalTracks === 1 ? "canción" : "canciones"}`);
    }
    if (albumExtra.totalDurationMin > 0) facts.push(`${albumExtra.totalDurationMin} min`);
  }
  if (trackExtra?.album?.releaseYear) facts.push(trackExtra.album.releaseYear);
  if (trackExtra?.durationMs) facts.push(formatDuration(trackExtra.durationMs));

  return (
    <>
      <header
        className="item-hero"
        style={{
          background: `linear-gradient(180deg, rgba(${tint},0.14) 0%, rgba(${tint},0.04) 55%, transparent 100%)`,
        }}
      >
        <button className="back-link" onClick={() => navigate(-1)}>← Volver</button>
        <div className="album-head">
          {item.imageUrl ? (
            <img
              className={`album-cover-lg${item.type === "artist" ? " is-round" : ""}`}
              src={item.imageUrl}
              alt=""
            />
          ) : (
            <span
              className="album-cover-lg cover-placeholder"
              style={
                item.type === "localGroup"
                  ? { background: `linear-gradient(135deg, rgba(${tint},0.35), rgba(${tint},0.08))` }
                  : undefined
              }
            >
              {item.type === "localGroup" ? "🎺" : "♪"}
            </span>
          )}
          <div className="album-head-info">
            <span className="card-kicker">
              {item.type === "localGroup"
                ? (item.category ?? TYPE_LABEL.localGroup).toLowerCase()
                : TYPE_LABEL[item.type]}
              {item.province && ` · ${item.province}`}
            </span>
            <h1 className="album-title">{item.name}</h1>
            {item.type === "localGroup" && (
              <div className="community-row">
                <span className="badge">Ficha creada por la comunidad</span>
                {item.createdByUserId !== getMyUserId() && (
                  <a
                    className="btn-link"
                    href={`mailto:hola@sorofy.app?subject=${encodeURIComponent(
                      `Somos ${item.name}`,
                    )}`}
                  >
                    ¿Eres de {item.name}? Escríbenos
                  </a>
                )}
              </div>
            )}
            {item.artistName && <p className="album-artist">{item.artistName}</p>}
            {(trackExtra?.album || facts.length > 0) && (
              <p className="album-facts">
                {trackExtra?.album && (
                  <>
                    del álbum{" "}
                    <button
                      className="fact-link"
                      onClick={() => goToSpotifyItem("album", trackExtra.album!.spotifyId)}
                    >
                      {trackExtra.album.name}
                    </button>
                    {facts.length > 0 && " · "}
                  </>
                )}
                {facts.join(" · ")}
              </p>
            )}
            {item.description && <p className="section-sub">{item.description}</p>}
            <div className="profile-actions">
              {item.type === "localGroup" && (
                <button
                  className={`btn btn-ghost btn-sm btn-follow${following ? " is-following" : ""}`}
                  onClick={toggleFollow}
                >
                  {following ? "Siguiendo" : "Seguir"}
                </button>
              )}
              <button className="btn btn-primary btn-sm" onClick={writeNote}>
                Escribir una nota
              </button>
              {item.spotifyId && (
                <a
                  className="btn btn-quiet btn-sm"
                  href={`https://open.spotify.com/${item.type}/${item.spotifyId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir en Spotify
                </a>
              )}
            </div>
          </div>
        </div>

        {item.type === "localGroup" && (
          <div className="photo-strip">
            {item.photos.map((photo) => (
              <div key={photo.id} className="photo-strip-item">
                <img src={`${API_URL}${photo.url}`} alt="" />
                {photo.canRemove && (
                  <button
                    className="photo-strip-remove"
                    onClick={() => removePhoto(photo.id)}
                    aria-label="Quitar foto"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              className="photo-strip-add"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? "Subiendo…" : "+ Añadir foto"}
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={handlePhotoSelected}
            />
          </div>
        )}
        {photoError && <p className="error">{photoError}</p>}

        <PlatformPlayer
          youtubeUrl={item.youtubeUrl}
          soundcloudUrl={item.soundcloudUrl}
          spotifyType={item.type}
          spotifyId={item.spotifyId}
          title={item.name}
        />
      </header>

      <div className="album-cols">
        <div className="side-stack">
          {albumExtra && albumExtra.tracks.length > 0 && (
            <div className="panel tracklist-panel">
              <h3 className="section-title panel-title">Canciones</h3>
              <div className="tracklist">
                {albumExtra.tracks.map((t) => (
                  <div key={t.spotifyId} className="track-row">
                    <span className="track-num">{t.number}</span>
                    <span className="track-name">{t.name}</span>
                    {t.noteHint?.text && (
                      <Link className="track-note-hint" to={`/nota/${t.noteHint.noteId}`}>
                        «{t.noteHint.text.slice(0, 60)}
                        {t.noteHint.text.length > 60 && "…"}» — {t.noteHint.authorName}
                      </Link>
                    )}
                    <span className="track-len">{formatDuration(t.durationMs)}</span>
                  </div>
                ))}
              </div>
              <p className="tracklist-foot">
                Las frases en cursiva son notas de la gente sobre esa canción — sin contadores
                de reproducciones.
              </p>
            </div>
          )}

          <div className="page-head">
            <h2 className="section-title">Notas de la gente</h2>
          </div>
          {notes.length === 0 ? (
            <p className="empty-state">
              {item.type === "localGroup"
                ? "Nadie ha contado aún un recuerdo de este grupo. Sé la primera persona."
                : "Nadie ha escrito todavía sobre esto. Sé la primera persona."}
            </p>
          ) : (
            <>
              <ul className="note-list">
                {notes.map((entry) => (
                  <NoteCard
                    key={entry.note.id}
                    note={entry.note}
                    author={entry.author}
                    interactions={interactions.get(entry.note.id)}
                  />
                ))}
              </ul>
              <div className="empty-state">
                {item.type === "localGroup"
                  ? "¿Qué recuerdo tienes de verlos en directo?"
                  : "¿Tú también lo has vivido?"}
                <button className="btn btn-ghost btn-sm cta-note" onClick={writeNote}>
                  Deja tu nota
                </button>
              </div>
            </>
          )}
        </div>

        <div className="side-stack">
          {vibes.length > 0 && (
            <div className="panel">
              <h3 className="section-title panel-title">Los vibes que le pone la gente</h3>
              <div className="vibe-cloud">
                {vibes.map((note) => {
                  const vibe = resolveVibe(note.vibeColor!);
                  return (
                    <span
                      key={note.id}
                      className="vibe-chip"
                      style={vibe ? { background: vibe.hex, color: vibe.ink } : undefined}
                    >
                      {note.vibeEmoji && <span>{note.vibeEmoji}</span>}
                      {note.vibeLabel}
                    </span>
                  );
                })}
              </div>
              <p className="section-sub">Nada de medias ni estrellas: así lo siente quien lo escucha.</p>
            </div>
          )}

          {detail.circle.length > 0 && (
            <div className="panel" style={{ gap: 12 }}>
              <h3 className="section-title panel-title">En tu círculo</h3>
              {detail.circle.map((c) => (
                <Link key={`${c.kind}-${c.userId}`} to={`/gente/${c.userId}`} className="listening-row">
                  <span className="listening-cover is-avatar">
                    <span className="cover-placeholder">{c.displayName[0]?.toUpperCase() ?? "♪"}</span>
                  </span>
                  <span className="listening-info">
                    <strong>
                      {c.kind === "saved"
                        ? `${c.displayName} lo tiene en su playlist`
                        : `${c.displayName} escribió ${c.noteCount === 1 ? "una nota" : `${c.noteCount} notas`}`}
                    </strong>
                    <span>
                      {c.kind === "saved"
                        ? `desde ${new Date(c.savedAt!).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}`
                        : `sobre ${item.type === "localGroup" ? "este grupo" : item.type === "artist" ? "este artista" : "esto"}`}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}

          {item.type === "localGroup" && item.repertoire.length > 0 && (
            <div className="panel">
              <h3 className="section-title panel-title">Repertorio de siempre</h3>
              <p className="section-sub">Lo que no falla en ningún pueblo, según quien los ha visto tocar.</p>
              <div className="vibe-cloud">
                {item.repertoire.map((song) => (
                  <span key={song} className="tag-chip tag-chip-static">{song}</span>
                ))}
              </div>
            </div>
          )}

          {trackExtra?.album && (
            <div className="panel">
              <h3 className="section-title panel-title">Del álbum</h3>
              <button
                className="listening-row listening-row-btn"
                onClick={() => goToSpotifyItem("album", trackExtra.album!.spotifyId)}
              >
                <span className="listening-cover">
                  {trackExtra.album.imageUrl ? (
                    <img src={trackExtra.album.imageUrl} alt="" />
                  ) : (
                    <span className="cover-placeholder">♪</span>
                  )}
                </span>
                <span className="listening-info">
                  <strong>{trackExtra.album.name}</strong>
                  <span>
                    {item.artistName}
                    {trackExtra.album.releaseYear && ` · ${trackExtra.album.releaseYear}`}
                  </span>
                </span>
              </button>
            </div>
          )}

          {artistExtra && artistExtra.albums.length > 0 && (
            <div className="panel">
              <h3 className="section-title panel-title">Discos</h3>
              <div className="mini-covers">
                {artistExtra.albums.slice(0, 3).map((album) => (
                  <button
                    key={album.spotifyId}
                    className="mini-cover-btn"
                    title={album.name}
                    onClick={() => goToSpotifyItem("album", album.spotifyId)}
                  >
                    {album.imageUrl ? (
                      <img src={album.imageUrl} alt={album.name} />
                    ) : (
                      <span className="cover-placeholder">♪</span>
                    )}
                  </button>
                ))}
              </div>
              <p className="mini-covers-names">
                {artistExtra.albums.slice(0, 3).map((a) => a.name).join(" · ")}
              </p>
            </div>
          )}

          {voices.length > 0 && (
            <div className="panel">
              <h3 className="section-title panel-title">Quién lo cuenta</h3>
              {voices.map(({ author, count }) => (
                <Link key={author.id} to={`/gente/${author.id}`} className="listening-row">
                  <span className="listening-cover is-avatar">
                    {author.avatarUrl ? (
                      <img src={author.avatarUrl} alt="" />
                    ) : (
                      <span className="cover-placeholder">
                        {author.displayName[0]?.toUpperCase() ?? "♪"}
                      </span>
                    )}
                  </span>
                  <span className="listening-info">
                    <strong>{author.displayName}</strong>
                    <span>{count === 1 ? "escribió una nota" : `escribió ${count} notas`}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}

          {item.type === "localGroup" && item.province && item.province === myProvince && (
            <div className="panel">
              <h3 className="section-title panel-title">Cerca de ti</h3>
              <p className="section-sub">
                Este grupo es de tu provincia. Sus notas te llegan con la dedicatoria{" "}
                <em>«Cerca de ti · {item.province}»</em>.
              </p>
            </div>
          )}

          {/* Idea en maqueta (así viene del prototipo): cuando un grupo
              conecte su Instagram, sus publicaciones llegarán como historias
              — con su permiso, no scrapeadas. De momento, ejemplos. */}
          {item.type === "localGroup" && (
            <div className="panel ig-panel">
              <div className="ig-panel-head">
                <h3 className="section-title panel-title">Se alimenta de su Instagram</h3>
                <span className="badge">mock</span>
              </div>
              <p className="section-sub">
                Los grupos cuentan más de sí mismos en Instagram que en cualquier
                ficha. Cuando el grupo conecte su cuenta, sus publicaciones
                llegarán aquí como historias — con su permiso, no scrapeadas.
              </p>
              <button
                className="btn btn-quiet btn-sm ig-toggle"
                onClick={() => setShowIgPosts(!showIgPosts)}
              >
                {showIgPosts ? "Ocultar publicaciones de ejemplo" : "Ver publicaciones de ejemplo"}
              </button>
              {showIgPosts && (
                <div className="ig-posts">
                  <p className="note-text ig-post">
                    «Ensayo del jueves con la persiana a medias. Se nota la escuela.»{" "}
                    <span className="badge">vía Instagram · ejemplo</span>
                  </p>
                  <p className="note-text ig-post">
                    «Hoy cumplimos años de furgoneta. Gracias por bailarnos en cada
                    plaza, aunque llueva.»{" "}
                    <span className="badge">vía Instagram · ejemplo</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
