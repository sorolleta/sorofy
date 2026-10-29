import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { FeedItem, LiveTrack } from "../types";
import { ripple } from "../ripple";

// Minutos:segundos de una posición en milisegundos
export function fmtTime(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// El progreso avanza solo entre refrescos de la API (cada 30 s), sin
// pasarse de la duración: así la barra se mueve como en Spotify
export function useLiveProgress(track: LiveTrack | null | undefined) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    setElapsed(0);
    if (!track?.durationMs) return;
    const timer = setInterval(() => setElapsed((e) => e + 1000), 1000);
    return () => clearInterval(timer);
  }, [track?.spotifyId, track?.progressMs, track?.durationMs]);
  if (!track?.durationMs) return null;
  const position = Math.min((track.progressMs ?? 0) + elapsed, track.durationMs);
  return { position, duration: track.durationMs, percent: (position / track.durationMs) * 100 };
}

export function LiveEq({ small }: { small?: boolean }) {
  return (
    <span className={`live-eq${small ? " sm" : ""}`} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function Face({ item, className }: { item: FeedItem; className: string }) {
  return item.avatarUrl ? (
    <img className={className} src={item.avatarUrl} alt="" />
  ) : (
    <span className={`${className} avatar-placeholder`}>{item.displayName[0]?.toUpperCase()}</span>
  );
}

function Cover({ track, className }: { track: LiveTrack; className: string }) {
  return track.imageUrl ? (
    <img className={className} src={track.imageUrl} alt="" />
  ) : (
    <span className={`${className} cover-placeholder`}>♪</span>
  );
}

// La canción grande de arriba del feed: quien de tu gente está escuchando
function LiveHero({ item, onNote }: { item: FeedItem; onNote: (t: LiveTrack) => void }) {
  const track = item.nowPlaying!;
  const progress = useLiveProgress(track);
  const firstName = item.displayName.split(" ")[0];
  return (
    <article className="live-card live-hero">
      <Cover track={track} className="live-cover" />
      <div className="live-hero-shade" />
      <div className="live-hero-top">
        <span className="live-badge">
          <span className="live-dot" />
          EN DIRECTO
        </span>
        <LiveEq />
      </div>
      <div className="live-hero-body">
        <Link to={`/gente/${item.userId}`} className="live-who">
          <Face item={item} className="live-avatar" />
          <span className="live-name">{firstName} está escuchando</span>
        </Link>
        <div className="live-track">
          <strong>{track.track}</strong>
          <span>{track.artist}</span>
        </div>
        {progress && (
          <div className="live-hero-prog">
            <div className="live-progress">
              <span className="live-fill" style={{ width: `${progress.percent}%` }} />
            </div>
            <span className="live-time">
              {fmtTime(progress.position)} / {fmtTime(progress.duration)}
            </span>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className="btn btn-primary btn-sm" to={`/chats/${item.userId}`}>
            Escribir a {firstName}
          </Link>
          {track.spotifyId && (
            <button
              className="btn btn-quiet btn-sm"
              data-note-track
              onClick={(e) => {
                ripple(e);
                setTimeout(() => onNote(track), 180);
              }}
            >
              Anotar
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

// Lo de arriba del feed: el primero que escucha en grande y el resto en anillos
export default function LiveNow({ listening, onNote }: { listening: FeedItem[]; onNote: (t: LiveTrack) => void }) {
  const live = listening.filter((i) => i.nowPlaying !== null);
  if (live.length === 0) return null;
  const [hero, ...rest] = live;
  return (
    <>
      <LiveHero item={hero} onNote={onNote} />
      {rest.length > 0 && (
        <section className="live-strip">
          <div className="live-head">
            <span className="live-strip-title">También suena ahora</span>
            <span className="live-count">{rest.length} escuchando</span>
          </div>
          <div className="live-ava-row">
            {rest.map((item) => (
              <Link key={item.userId} to={`/gente/${item.userId}`} className="live-card live-ava">
                <div className="live-ring">
                  <Cover track={item.nowPlaying!} className="live-cover" />
                  <Face item={item} className="live-ava-face" />
                </div>
                <span className="live-name">{item.displayName.split(" ")[0]}</span>
                <div className="live-track">
                  <strong>{item.nowPlaying!.track}</strong>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
